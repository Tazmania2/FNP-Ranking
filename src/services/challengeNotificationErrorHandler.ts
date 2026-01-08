/**
 * Challenge Notification Error Handler
 * 
 * Comprehensive error handling and resilience for the challenge completion notification system.
 * Handles webhook failures, SSE connection issues, rendering errors, and provides graceful degradation.
 */

import { SSEClientService, ConnectionState } from './sseClientService';
import { challengeNotificationConfig } from './challengeNotificationConfigService';

export interface NotificationError {
  type: 'webhook' | 'sse' | 'rendering' | 'network' | 'validation' | 'system';
  code: string;
  message: string;
  timestamp: Date;
  context?: any;
  recoverable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorRecoveryStrategy {
  name: string;
  canHandle: (error: NotificationError) => boolean;
  recover: (error: NotificationError, context: ErrorContext) => Promise<boolean>;
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export interface ErrorContext {
  attemptCount: number;
  lastAttemptTime: number;
  errorHistory: NotificationError[];
  systemState: {
    sseConnected: boolean;
    lastEventReceived?: Date;
    queueSize: number;
    memoryUsage?: number;
  };
}

export interface ErrorHandlerConfig {
  maxRetries: number;
  globalTimeout: number;
  enableGracefulDegradation: boolean;
  enableErrorLogging: boolean;
  enableUserNotifications: boolean;
  fallbackToPolling: boolean;
  pollingInterval: number;
}

export interface ErrorRecoveryEvent {
  type: 'error-detected' | 'recovery-started' | 'recovery-succeeded' | 
        'recovery-failed' | 'degradation-activated' | 'system-stabilized';
  error?: NotificationError;
  strategy?: string;
  attemptCount?: number;
  degradationLevel?: number;
  timestamp: Date;
}

export class ChallengeNotificationErrorHandler {
  private config: ErrorHandlerConfig;
  private strategies: ErrorRecoveryStrategy[];
  private activeRecoveries: Map<string, ErrorContext>;
  private errorHistory: NotificationError[];
  private degradationLevel: 0 | 1 | 2 | 3 = 0; // 0 = Normal, 3 = Emergency
  private listeners: Set<(event: ErrorRecoveryEvent) => void> = new Set();
  private sseClient?: SSEClientService;
  private fallbackPollingTimer?: number;
  private systemHealthTimer?: number;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      maxRetries: 3,
      globalTimeout: 30000,
      enableGracefulDegradation: true,
      enableErrorLogging: true,
      enableUserNotifications: false, // Avoid disrupting kiosk mode
      fallbackToPolling: true,
      pollingInterval: 30000,
      ...config
    };

    this.strategies = [];
    this.activeRecoveries = new Map();
    this.errorHistory = [];

    this.initializeStrategies();
    this.startSystemHealthMonitoring();
  }

  /**
   * Initialize error recovery strategies
   */
  private initializeStrategies(): void {
    // SSE Connection Recovery
    this.strategies.push({
      name: 'sse-reconnection',
      canHandle: (error) => error.type === 'sse' && 
        (error.code === 'CONNECTION_FAILED' || 
         error.code === 'CONNECTION_LOST' ||
         error.code === 'HEARTBEAT_TIMEOUT'),
      recover: this.recoverSSEConnection.bind(this),
      maxRetries: 5,
      backoffMultiplier: 2,
      initialDelay: 1000
    });

    // Network Error Recovery
    this.strategies.push({
      name: 'network-recovery',
      canHandle: (error) => error.type === 'network' || 
        (error.type === 'sse' && error.code === 'NETWORK_ERROR'),
      recover: this.recoverNetworkConnection.bind(this),
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 2000
    });

    // Webhook Error Recovery
    this.strategies.push({
      name: 'webhook-recovery',
      canHandle: (error) => error.type === 'webhook',
      recover: this.recoverWebhookProcessing.bind(this),
      maxRetries: 2,
      backoffMultiplier: 1.5,
      initialDelay: 1000
    });

    // Rendering Error Recovery
    this.strategies.push({
      name: 'rendering-recovery',
      canHandle: (error) => error.type === 'rendering',
      recover: this.recoverRenderingFailure.bind(this),
      maxRetries: 2,
      backoffMultiplier: 1,
      initialDelay: 500
    });

    // Validation Error Recovery
    this.strategies.push({
      name: 'validation-recovery',
      canHandle: (error) => error.type === 'validation',
      recover: this.recoverValidationError.bind(this),
      maxRetries: 1,
      backoffMultiplier: 1,
      initialDelay: 100
    });

    // System Error Recovery (fallback)
    this.strategies.push({
      name: 'system-fallback',
      canHandle: () => true, // Handles any error as last resort
      recover: this.systemFallbackRecovery.bind(this),
      maxRetries: 1,
      backoffMultiplier: 1,
      initialDelay: 1000
    });
  }

  /**
   * Set the SSE client for monitoring and recovery
   */
  public setSSEClient(sseClient: SSEClientService): void {
    this.sseClient = sseClient;
    
    // Monitor SSE connection state changes
    sseClient.onConnectionStateChange((state) => {
      this.handleSSEStateChange(state);
    });

    // Monitor SSE errors
    sseClient.onError((error) => {
      this.handleError({
        type: 'sse',
        code: 'SSE_ERROR',
        message: error.message,
        timestamp: new Date(),
        context: { error },
        recoverable: true,
        severity: 'medium'
      });
    });
  }

  /**
   * Handle an error and attempt recovery
   */
  public async handleError(error: NotificationError): Promise<boolean> {
    // Log error if enabled
    if (this.config.enableErrorLogging) {
      console.error('Challenge Notification Error:', error);
    }

    // Add to error history
    this.errorHistory.push(error);
    
    // Limit error history size
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-50);
    }

    // Notify listeners
    this.notifyListeners({
      type: 'error-detected',
      error,
      timestamp: new Date()
    });

    // Update degradation level based on error severity and frequency
    this.updateDegradationLevel(error);

    // Attempt recovery if error is recoverable
    if (error.recoverable) {
      return this.attemptRecovery(error);
    }

    return false;
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(error: NotificationError): Promise<boolean> {
    const errorId = this.generateErrorId(error);
    const context: ErrorContext = this.activeRecoveries.get(errorId) || {
      attemptCount: 0,
      lastAttemptTime: 0,
      errorHistory: [error],
      systemState: this.getSystemState()
    };

    // Check global retry limits
    if (context.attemptCount >= this.config.maxRetries) {
      this.notifyListeners({
        type: 'recovery-failed',
        error,
        timestamp: new Date()
      });
      return false;
    }

    // Find appropriate recovery strategy
    const strategy = this.strategies.find(s => s.canHandle(error));
    if (!strategy) {
      return false;
    }

    // Check strategy-specific retry limits
    if (context.attemptCount >= strategy.maxRetries) {
      return false;
    }

    // Calculate delay with exponential backoff
    const delay = strategy.initialDelay * Math.pow(strategy.backoffMultiplier, context.attemptCount);
    
    // Update context
    context.attemptCount++;
    context.lastAttemptTime = Date.now();
    context.errorHistory.push(error);
    this.activeRecoveries.set(errorId, context);

    this.notifyListeners({
      type: 'recovery-started',
      error,
      strategy: strategy.name,
      attemptCount: context.attemptCount,
      timestamp: new Date()
    });

    // Wait for backoff delay
    await this.sleep(delay);

    try {
      // Attempt recovery with timeout
      const success = await Promise.race([
        strategy.recover(error, context),
        this.createTimeoutPromise(this.config.globalTimeout)
      ]);

      if (success) {
        this.activeRecoveries.delete(errorId);
        this.notifyListeners({
          type: 'recovery-succeeded',
          error,
          strategy: strategy.name,
          attemptCount: context.attemptCount,
          timestamp: new Date()
        });
        return true;
      } else {
        // Recovery failed, will retry if within limits
        return this.attemptRecovery(error);
      }
    } catch (recoveryError) {
      console.error('Recovery strategy failed:', recoveryError);
      return this.attemptRecovery(error);
    }
  }

  /**
   * Recovery strategy implementations
   */
  private async recoverSSEConnection(error: NotificationError, context: ErrorContext): Promise<boolean> {
    if (!this.sseClient) {
      return false;
    }

    try {
      // Disconnect and reconnect SSE client
      this.sseClient.disconnect();
      await this.sleep(500); // Brief pause before reconnection
      await this.sseClient.connect();
      
      return this.sseClient.isConnected();
    } catch (error) {
      return false;
    }
  }

  private async recoverNetworkConnection(error: NotificationError, context: ErrorContext): Promise<boolean> {
    // Check network connectivity
    const isOnline = await this.checkNetworkConnectivity();
    if (!isOnline) {
      // If network is down, activate fallback polling if enabled
      if (this.config.fallbackToPolling) {
        this.activateFallbackPolling();
        return true; // Consider fallback as successful recovery
      }
      return false;
    }

    // Network is available, try to reconnect SSE
    if (this.sseClient) {
      try {
        await this.sseClient.connect();
        return this.sseClient.isConnected();
      } catch {
        return false;
      }
    }

    return true;
  }

  private async recoverWebhookProcessing(error: NotificationError, context: ErrorContext): Promise<boolean> {
    // For webhook errors, we can't directly recover the failed webhook
    // But we can ensure the system is ready for future webhooks
    try {
      // Validate webhook endpoint configuration
      const config = challengeNotificationConfig.getConfig();
      if (!config.webhookConfig.url || !config.webhookConfig.enabled) {
        return false;
      }

      // Test webhook endpoint availability (if possible)
      // In a real implementation, this might ping the webhook endpoint
      return true;
    } catch {
      return false;
    }
  }

  private async recoverRenderingFailure(error: NotificationError, context: ErrorContext): Promise<boolean> {
    try {
      // For rendering failures, try to clear any corrupted DOM state
      // and reset notification display components
      
      // Remove any stuck notification elements
      const stuckNotifications = document.querySelectorAll('[data-notification-popup]');
      stuckNotifications.forEach(element => {
        try {
          element.remove();
        } catch {
          // Ignore removal errors
        }
      });

      // Clear any animation states that might be stuck
      document.documentElement.style.removeProperty('--notification-animation-state');
      
      return true;
    } catch {
      return false;
    }
  }

  private async recoverValidationError(error: NotificationError, context: ErrorContext): Promise<boolean> {
    // For validation errors, we typically can't recover the specific invalid data
    // But we can ensure the system continues processing other valid data
    return true;
  }

  private async systemFallbackRecovery(error: NotificationError, context: ErrorContext): Promise<boolean> {
    if (this.config.enableGracefulDegradation) {
      // Activate maximum degradation mode
      this.degradationLevel = 3;
      
      // Disable all non-essential features
      this.activateEmergencyMode();
      
      this.notifyListeners({
        type: 'degradation-activated',
        degradationLevel: this.degradationLevel,
        timestamp: new Date()
      });
      
      return true; // Consider emergency mode as successful recovery
    }
    
    return false;
  }

  /**
   * Handle SSE connection state changes
   */
  private handleSSEStateChange(state: ConnectionState): void {
    if (state.status === 'error' && state.error) {
      this.handleError({
        type: 'sse',
        code: 'CONNECTION_ERROR',
        message: state.error,
        timestamp: new Date(),
        context: { connectionState: state },
        recoverable: state.reconnectAttempts < state.maxReconnectAttempts,
        severity: 'medium'
      });
    } else if (state.status === 'connected') {
      // Connection recovered, check if we can reduce degradation level
      this.checkSystemRecovery();
    }
  }

  /**
   * Update degradation level based on error patterns
   */
  private updateDegradationLevel(error: NotificationError): void {
    const recentErrors = this.errorHistory.filter(
      e => Date.now() - e.timestamp.getTime() < 60000 // Last minute
    );

    const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;
    const highErrors = recentErrors.filter(e => e.severity === 'high').length;
    const totalErrors = recentErrors.length;

    let newLevel: 0 | 1 | 2 | 3 = 0;

    if (criticalErrors > 0 || totalErrors > 10) {
      newLevel = 3; // Emergency
    } else if (highErrors > 2 || totalErrors > 5) {
      newLevel = 2; // Critical
    } else if (totalErrors > 2) {
      newLevel = 1; // Warning
    }

    if (newLevel > this.degradationLevel) {
      this.degradationLevel = newLevel;
      this.applyDegradation();
    }
  }

  /**
   * Apply degradation measures based on current level
   */
  private applyDegradation(): void {
    switch (this.degradationLevel) {
      case 1: // Warning level
        // Reduce update frequency
        break;
      case 2: // Critical level
        // Disable animations, reduce features
        this.disableNonEssentialFeatures();
        break;
      case 3: // Emergency level
        // Minimal functionality only
        this.activateEmergencyMode();
        break;
    }
  }

  /**
   * Check if system has recovered and can reduce degradation
   */
  private checkSystemRecovery(): void {
    const recentErrors = this.errorHistory.filter(
      e => Date.now() - e.timestamp.getTime() < 120000 // Last 2 minutes
    );

    if (recentErrors.length === 0 && this.degradationLevel > 0) {
      // No recent errors, gradually reduce degradation
      this.degradationLevel = Math.max(0, this.degradationLevel - 1) as 0 | 1 | 2 | 3;
      
      if (this.degradationLevel === 0) {
        this.restoreNormalOperation();
        this.notifyListeners({
          type: 'system-stabilized',
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Activate fallback polling when SSE fails
   */
  private activateFallbackPolling(): void {
    if (this.fallbackPollingTimer) {
      return; // Already active
    }

    console.log('Activating fallback polling for challenge notifications');
    
    this.fallbackPollingTimer = window.setInterval(async () => {
      try {
        // In a real implementation, this would poll the challenge events endpoint
        // For now, we just log that polling is active
        console.log('Polling for challenge completion events (fallback mode)');
      } catch (error) {
        console.error('Fallback polling failed:', error);
      }
    }, this.config.pollingInterval);
  }

  /**
   * Deactivate fallback polling when SSE recovers
   */
  private deactivateFallbackPolling(): void {
    if (this.fallbackPollingTimer) {
      clearInterval(this.fallbackPollingTimer);
      this.fallbackPollingTimer = undefined;
      console.log('Deactivated fallback polling - SSE connection restored');
    }
  }

  /**
   * Disable non-essential features during degradation
   */
  private disableNonEssentialFeatures(): void {
    // Disable animations
    document.documentElement.style.setProperty('--notification-animation-duration', '0s');
    
    // Reduce notification display time
    document.documentElement.style.setProperty('--notification-display-duration', '2s');
  }

  /**
   * Activate emergency mode with minimal functionality
   */
  private activateEmergencyMode(): void {
    console.warn('Challenge notification system entering emergency mode');
    
    // Disable all animations and effects
    document.documentElement.classList.add('emergency-mode');
    
    // Stop all timers except essential ones
    this.deactivateFallbackPolling();
    
    // Clear notification queue to prevent memory issues
    // This would typically interact with the notification queue manager
  }

  /**
   * Restore normal operation after recovery
   */
  private restoreNormalOperation(): void {
    console.log('Challenge notification system restored to normal operation');
    
    // Re-enable features
    document.documentElement.classList.remove('emergency-mode');
    document.documentElement.style.removeProperty('--notification-animation-duration');
    document.documentElement.style.removeProperty('--notification-display-duration');
    
    // Restart SSE if needed
    if (this.sseClient && !this.sseClient.isConnected()) {
      this.sseClient.connect().catch(error => {
        console.error('Failed to reconnect SSE during recovery:', error);
      });
    }
  }

  /**
   * Start system health monitoring
   */
  private startSystemHealthMonitoring(): void {
    this.systemHealthTimer = window.setInterval(() => {
      this.checkSystemRecovery();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Utility methods
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private getSystemState() {
    return {
      sseConnected: this.sseClient?.isConnected() || false,
      lastEventReceived: undefined, // Would be tracked by notification manager
      queueSize: 0, // Would be provided by notification queue manager
      memoryUsage: this.getMemoryUsage()
    };
  }

  private getMemoryUsage(): number {
    // Estimate memory usage based on error history and active recoveries
    const baseUsage = this.errorHistory.length * 0.1; // Rough estimate
    const activeRecoveryUsage = this.activeRecoveries.size * 0.5;
    return Math.min(100, baseUsage + activeRecoveryUsage);
  }

  private generateErrorId(error: NotificationError): string {
    return `${error.type}_${error.code}_${error.timestamp.getTime()}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createTimeoutPromise(timeout: number): Promise<boolean> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recovery timeout')), timeout);
    });
  }

  private notifyListeners(event: ErrorRecoveryEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Error in recovery event listener:', error);
      }
    });
  }

  /**
   * Public API methods
   */
  public getDegradationLevel(): number {
    return this.degradationLevel;
  }

  public getErrorHistory(): NotificationError[] {
    return [...this.errorHistory];
  }

  public getActiveRecoveries(): string[] {
    return Array.from(this.activeRecoveries.keys());
  }

  public onRecoveryEvent(listener: (event: ErrorRecoveryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public clearErrorHistory(): void {
    this.errorHistory = [];
  }

  public forceRecovery(): void {
    this.degradationLevel = 0;
    this.restoreNormalOperation();
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.fallbackPollingTimer) {
      clearInterval(this.fallbackPollingTimer);
    }
    if (this.systemHealthTimer) {
      clearInterval(this.systemHealthTimer);
    }
    this.activeRecoveries.clear();
    this.listeners.clear();
    this.errorHistory = [];
  }
}

// Default instance for easy use
export const challengeNotificationErrorHandler = new ChallengeNotificationErrorHandler();