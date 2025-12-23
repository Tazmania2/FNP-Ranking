/**
 * Automatic Error Recovery Service for Raspberry Pi deployment
 * Implements intelligent error recovery and retry mechanisms
 */

import type { ApiError } from '../types';

export interface RecoveryStrategy {
  name: string;
  canHandle: (error: ApiError) => boolean;
  recover: (error: ApiError, context: RecoveryContext) => Promise<boolean>;
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
}

export interface RecoveryContext {
  attemptCount: number;
  lastAttemptTime: number;
  originalRequest?: {
    url: string;
    method: string;
    data?: any;
  };
  userNotified: boolean;
}

export interface RecoveryConfig {
  maxGlobalRetries: number;
  globalTimeout: number;
  enableUserNotifications: boolean;
  enableAutomaticFallbacks: boolean;
  networkCheckInterval: number;
}

export class AutomaticErrorRecoveryService {
  private config: RecoveryConfig;
  private strategies: RecoveryStrategy[];
  private activeRecoveries: Map<string, RecoveryContext>;
  private networkStatus: 'online' | 'offline' | 'slow' = 'online';
  private networkCheckTimer?: number;
  private listeners: Set<(event: RecoveryEvent) => void> = new Set();

  constructor(config?: Partial<RecoveryConfig>) {
    this.config = {
      maxGlobalRetries: 3,
      globalTimeout: 30000,
      enableUserNotifications: true,
      enableAutomaticFallbacks: true,
      networkCheckInterval: 5000,
      ...config
    };

    this.strategies = [];
    this.activeRecoveries = new Map();
    
    this.initializeStrategies();
    this.startNetworkMonitoring();
  }

  private initializeStrategies(): void {
    // Network connectivity recovery
    this.strategies.push({
      name: 'network-reconnection',
      canHandle: (error) => error.type === 'network' && 
        (error.message.includes('ECONNREFUSED') || 
         error.message.includes('ETIMEDOUT') ||
         error.message.includes('Network connection failed')),
      recover: this.recoverNetworkConnection.bind(this),
      maxRetries: 5,
      backoffMultiplier: 2,
      initialDelay: 1000
    });

    // Rate limit recovery
    this.strategies.push({
      name: 'rate-limit-backoff',
      canHandle: (error) => error.type === 'network' && 
        error.message.includes('Rate limit'),
      recover: this.recoverFromRateLimit.bind(this),
      maxRetries: 3,
      backoffMultiplier: 3,
      initialDelay: 5000
    });

    // Authentication recovery
    this.strategies.push({
      name: 'auth-refresh',
      canHandle: (error) => error.type === 'auth',
      recover: this.recoverAuthentication.bind(this),
      maxRetries: 2,
      backoffMultiplier: 1,
      initialDelay: 1000
    });

    // Timeout recovery
    this.strategies.push({
      name: 'timeout-retry',
      canHandle: (error) => error.type === 'network' && 
        error.message.includes('timeout'),
      recover: this.recoverFromTimeout.bind(this),
      maxRetries: 3,
      backoffMultiplier: 1.5,
      initialDelay: 2000
    });

    // Generic fallback recovery
    this.strategies.push({
      name: 'generic-fallback',
      canHandle: () => true, // Handles any error as last resort
      recover: this.genericFallbackRecovery.bind(this),
      maxRetries: 1,
      backoffMultiplier: 1,
      initialDelay: 1000
    });
  }

  /**
   * Attempt to recover from an error automatically
   */
  public async attemptRecovery(
    error: ApiError, 
    requestId: string,
    originalRequest?: any
  ): Promise<boolean> {
    const context: RecoveryContext = this.activeRecoveries.get(requestId) || {
      attemptCount: 0,
      lastAttemptTime: 0,
      originalRequest,
      userNotified: false
    };

    // Check global retry limits
    if (context.attemptCount >= this.config.maxGlobalRetries) {
      this.notifyRecoveryEvent({
        type: 'recovery-failed',
        requestId,
        error,
        reason: 'Max retries exceeded'
      });
      return false;
    }

    // Find appropriate recovery strategy
    const strategy = this.strategies.find(s => s.canHandle(error));
    if (!strategy) {
      this.notifyRecoveryEvent({
        type: 'recovery-failed',
        requestId,
        error,
        reason: 'No recovery strategy available'
      });
      return false;
    }

    // Check strategy-specific retry limits
    if (context.attemptCount >= strategy.maxRetries) {
      this.notifyRecoveryEvent({
        type: 'recovery-failed',
        requestId,
        error,
        reason: `Strategy ${strategy.name} max retries exceeded`
      });
      return false;
    }

    // Calculate delay with exponential backoff
    const delay = strategy.initialDelay * Math.pow(strategy.backoffMultiplier, context.attemptCount);
    
    // Update context
    context.attemptCount++;
    context.lastAttemptTime = Date.now();
    this.activeRecoveries.set(requestId, context);

    this.notifyRecoveryEvent({
      type: 'recovery-started',
      requestId,
      error,
      strategy: strategy.name,
      attemptCount: context.attemptCount,
      delay
    });

    // Wait for backoff delay
    await this.sleep(delay);

    try {
      // Attempt recovery
      const success = await Promise.race([
        strategy.recover(error, context),
        this.createTimeoutPromise(this.config.globalTimeout)
      ]);

      if (success) {
        this.activeRecoveries.delete(requestId);
        this.notifyRecoveryEvent({
          type: 'recovery-succeeded',
          requestId,
          error,
          strategy: strategy.name,
          attemptCount: context.attemptCount
        });
        return true;
      } else {
        // Recovery failed, will retry if within limits
        this.notifyRecoveryEvent({
          type: 'recovery-attempt-failed',
          requestId,
          error,
          strategy: strategy.name,
          attemptCount: context.attemptCount
        });
        return this.attemptRecovery(error, requestId, originalRequest);
      }
    } catch (recoveryError) {
      this.notifyRecoveryEvent({
        type: 'recovery-error',
        requestId,
        error,
        strategy: strategy.name,
        recoveryError: recoveryError as Error
      });
      return this.attemptRecovery(error, requestId, originalRequest);
    }
  }

  /**
   * Get current recovery status for a request
   */
  public getRecoveryStatus(requestId: string): RecoveryContext | null {
    return this.activeRecoveries.get(requestId) || null;
  }

  /**
   * Cancel recovery attempts for a request
   */
  public cancelRecovery(requestId: string): void {
    this.activeRecoveries.delete(requestId);
    this.notifyRecoveryEvent({
      type: 'recovery-cancelled',
      requestId
    });
  }

  /**
   * Add event listener for recovery events
   */
  public onRecoveryEvent(listener: (event: RecoveryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): 'online' | 'offline' | 'slow' {
    return this.networkStatus;
  }

  // Recovery strategy implementations
  private async recoverNetworkConnection(error: ApiError, context: RecoveryContext): Promise<boolean> {
    // Check if network is available
    const isOnline = await this.checkNetworkConnectivity();
    if (!isOnline) {
      return false;
    }

    // If we have original request, retry it
    if (context.originalRequest) {
      try {
        // This would typically make the actual API call
        // For now, we simulate success based on network status
        return this.networkStatus === 'online';
      } catch {
        return false;
      }
    }

    return this.networkStatus === 'online';
  }

  private async recoverFromRateLimit(error: ApiError, context: RecoveryContext): Promise<boolean> {
    // Rate limit recovery - just wait longer
    const additionalDelay = 10000 * context.attemptCount; // Increase delay each time
    await this.sleep(additionalDelay);
    
    // Check if we can make requests again
    return this.networkStatus !== 'offline';
  }

  private async recoverAuthentication(error: ApiError, context: RecoveryContext): Promise<boolean> {
    // In a real implementation, this would refresh auth tokens
    // For now, we simulate auth recovery
    try {
      // Simulate auth refresh
      await this.sleep(1000);
      return true; // Assume auth can be recovered
    } catch {
      return false;
    }
  }

  private async recoverFromTimeout(error: ApiError, context: RecoveryContext): Promise<boolean> {
    // For timeout errors, check network and retry with longer timeout
    const isOnline = await this.checkNetworkConnectivity();
    if (!isOnline) {
      return false;
    }

    // Simulate retry with longer timeout
    return this.networkStatus !== 'offline';
  }

  private async genericFallbackRecovery(error: ApiError, context: RecoveryContext): Promise<boolean> {
    // Generic fallback - try to continue with cached data or degraded functionality
    if (this.config.enableAutomaticFallbacks) {
      // Notify that we're falling back to cached/offline mode
      this.notifyRecoveryEvent({
        type: 'fallback-activated',
        requestId: 'generic',
        error,
        reason: 'Using cached data or degraded functionality'
      });
      return true; // Consider fallback as successful recovery
    }
    
    return false;
  }

  // Network monitoring
  private startNetworkMonitoring(): void {
    this.networkCheckTimer = window.setInterval(() => {
      this.checkNetworkConnectivity();
    }, this.config.networkCheckInterval);
  }

  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        this.networkStatus = latency > 2000 ? 'slow' : 'online';
        return true;
      } else {
        this.networkStatus = 'offline';
        return false;
      }
    } catch {
      this.networkStatus = 'offline';
      return false;
    }
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createTimeoutPromise(timeout: number): Promise<boolean> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Recovery timeout')), timeout);
    });
  }

  private notifyRecoveryEvent(event: RecoveryEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.warn('Error in recovery event listener:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    if (this.networkCheckTimer) {
      clearInterval(this.networkCheckTimer);
    }
    this.activeRecoveries.clear();
    this.listeners.clear();
  }
}

// Event types for recovery notifications
export interface RecoveryEvent {
  type: 'recovery-started' | 'recovery-succeeded' | 'recovery-failed' | 
        'recovery-attempt-failed' | 'recovery-error' | 'recovery-cancelled' | 
        'fallback-activated';
  requestId: string;
  error?: ApiError;
  strategy?: string;
  attemptCount?: number;
  delay?: number;
  reason?: string;
  recoveryError?: Error;
}