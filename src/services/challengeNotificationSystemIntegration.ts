/**
 * Challenge Notification System Integration
 * 
 * Integrates all error handling and resilience components for the challenge notification system.
 * Provides a unified interface for initializing, monitoring, and managing the entire system.
 */

import { SSEClientService, sseClient } from './sseClientService';
import { challengeNotificationErrorHandler } from './challengeNotificationErrorHandler';
import { challengeNotificationConfig } from './challengeNotificationConfigService';
import { 
  createNotificationError,
  createSSEError,
  createNetworkError,
  logNotificationError
} from '../utils/challengeNotificationErrorUtils';

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical' | 'offline';
  components: {
    sseConnection: 'connected' | 'connecting' | 'disconnected' | 'error';
    errorHandler: 'active' | 'degraded' | 'inactive';
    configuration: 'loaded' | 'error' | 'missing';
  };
  metrics: {
    uptime: number;
    totalErrors: number;
    recentErrors: number;
    degradationLevel: number;
    lastEventReceived?: Date;
  };
  recommendations: string[];
}

export interface SystemEvent {
  type: 'system-started' | 'system-stopped' | 'health-changed' | 
        'component-error' | 'recovery-completed' | 'degradation-changed';
  timestamp: Date;
  data?: any;
}

export class ChallengeNotificationSystemIntegration {
  private isInitialized = false;
  private startTime: Date | null = null;
  private healthCheckInterval: number | null = null;
  private listeners: Set<(event: SystemEvent) => void> = new Set();
  private lastHealthStatus: SystemHealthStatus | null = null;

  /**
   * Initialize the complete challenge notification system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Challenge notification system already initialized');
      return;
    }

    try {
      console.log('Initializing challenge notification system...');
      this.startTime = new Date();

      // Initialize error handler with SSE client
      challengeNotificationErrorHandler.setSSEClient(sseClient);

      // Set up error handler event listeners
      challengeNotificationErrorHandler.onRecoveryEvent((event) => {
        this.handleErrorHandlerEvent(event);
      });

      // Set up configuration change listeners
      challengeNotificationConfig.onConfigChange((event) => {
        this.handleConfigurationChange(event);
      });

      // Attempt to establish SSE connection
      try {
        await sseClient.connect();
        console.log('SSE connection established successfully');
      } catch (error) {
        console.warn('Initial SSE connection failed, will retry automatically:', error);
        // Don't fail initialization if SSE connection fails - error handler will manage retries
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      
      this.notifyListeners({
        type: 'system-started',
        timestamp: new Date(),
        data: { startTime: this.startTime }
      });

      console.log('Challenge notification system initialized successfully');

    } catch (error) {
      const systemError = createNotificationError(
        'system',
        'INITIALIZATION_FAILED',
        `Failed to initialize challenge notification system: ${error instanceof Error ? error.message : String(error)}`,
        { error },
        'critical'
      );
      
      challengeNotificationErrorHandler.handleError(systemError);
      throw error;
    }
  }

  /**
   * Shutdown the challenge notification system
   */
  public shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    console.log('Shutting down challenge notification system...');

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Disconnect SSE client
      sseClient.disconnect();

      // Cleanup error handler
      challengeNotificationErrorHandler.destroy();

      this.isInitialized = false;
      this.startTime = null;

      this.notifyListeners({
        type: 'system-stopped',
        timestamp: new Date()
      });

      console.log('Challenge notification system shut down successfully');

    } catch (error) {
      console.error('Error during system shutdown:', error);
    }
  }

  /**
   * Get current system health status
   */
  public getHealthStatus(): SystemHealthStatus {
    const now = new Date();
    const uptime = this.startTime ? now.getTime() - this.startTime.getTime() : 0;
    
    // Get SSE connection status
    const sseState = sseClient.getConnectionState();
    let sseStatus: SystemHealthStatus['components']['sseConnection'];
    switch (sseState.status) {
      case 'connected':
        sseStatus = 'connected';
        break;
      case 'connecting':
        sseStatus = 'connecting';
        break;
      case 'disconnected':
        sseStatus = 'disconnected';
        break;
      case 'error':
        sseStatus = 'error';
        break;
      default:
        sseStatus = 'disconnected';
    }

    // Get error handler status
    const degradationLevel = challengeNotificationErrorHandler.getDegradationLevel();
    const errorHandlerStatus = degradationLevel === 0 ? 'active' : 
                              degradationLevel < 3 ? 'degraded' : 'inactive';

    // Get configuration status
    let configStatus: SystemHealthStatus['components']['configuration'];
    try {
      challengeNotificationConfig.getConfig();
      configStatus = 'loaded';
    } catch {
      configStatus = 'error';
    }

    // Calculate error metrics
    const errorHistory = challengeNotificationErrorHandler.getErrorHistory();
    const recentErrors = errorHistory.filter(
      error => now.getTime() - error.timestamp.getTime() < 300000 // Last 5 minutes
    ).length;

    // Determine overall health
    let overallHealth: SystemHealthStatus['overall'];
    if (sseStatus === 'error' || configStatus === 'error' || degradationLevel >= 3) {
      overallHealth = 'critical';
    } else if (sseStatus === 'disconnected' || degradationLevel >= 2 || recentErrors > 5) {
      overallHealth = 'degraded';
    } else if (sseStatus === 'connected' && degradationLevel === 0) {
      overallHealth = 'healthy';
    } else {
      overallHealth = 'degraded';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (sseStatus === 'error' || sseStatus === 'disconnected') {
      recommendations.push('Check network connectivity and SSE endpoint availability');
    }
    if (degradationLevel > 0) {
      recommendations.push(`System is in degradation level ${degradationLevel} - some features may be disabled`);
    }
    if (recentErrors > 3) {
      recommendations.push('High error rate detected - monitor system stability');
    }
    if (configStatus === 'error') {
      recommendations.push('Configuration error detected - check notification settings');
    }

    const healthStatus: SystemHealthStatus = {
      overall: overallHealth,
      components: {
        sseConnection: sseStatus,
        errorHandler: errorHandlerStatus,
        configuration: configStatus
      },
      metrics: {
        uptime,
        totalErrors: errorHistory.length,
        recentErrors,
        degradationLevel,
        lastEventReceived: undefined // Would be tracked by notification manager
      },
      recommendations
    };

    return healthStatus;
  }

  /**
   * Force system recovery attempt
   */
  public async forceRecovery(): Promise<boolean> {
    console.log('Forcing system recovery...');

    try {
      // Reset error handler
      challengeNotificationErrorHandler.forceRecovery();

      // Attempt to reconnect SSE
      if (!sseClient.isConnected()) {
        await sseClient.connect();
      }

      // Check if recovery was successful
      const healthStatus = this.getHealthStatus();
      const recovered = healthStatus.overall === 'healthy' || healthStatus.overall === 'degraded';

      if (recovered) {
        this.notifyListeners({
          type: 'recovery-completed',
          timestamp: new Date(),
          data: { healthStatus }
        });
      }

      return recovered;

    } catch (error) {
      const recoveryError = createNotificationError(
        'system',
        'RECOVERY_FAILED',
        `System recovery failed: ${error instanceof Error ? error.message : String(error)}`,
        { error },
        'high'
      );
      
      challengeNotificationErrorHandler.handleError(recoveryError);
      return false;
    }
  }

  /**
   * Add system event listener
   */
  public onSystemEvent(listener: (event: SystemEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get system initialization status
   */
  public isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get system uptime in milliseconds
   */
  public getUptime(): number {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }

  /**
   * Private methods
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = window.setInterval(() => {
      const currentHealth = this.getHealthStatus();
      
      // Check if health status changed significantly
      if (this.hasHealthChanged(currentHealth)) {
        this.notifyListeners({
          type: 'health-changed',
          timestamp: new Date(),
          data: { 
            previousHealth: this.lastHealthStatus,
            currentHealth 
          }
        });
      }
      
      this.lastHealthStatus = currentHealth;
    }, 30000); // Check every 30 seconds
  }

  private hasHealthChanged(currentHealth: SystemHealthStatus): boolean {
    if (!this.lastHealthStatus) {
      return true;
    }

    return (
      this.lastHealthStatus.overall !== currentHealth.overall ||
      this.lastHealthStatus.components.sseConnection !== currentHealth.components.sseConnection ||
      this.lastHealthStatus.metrics.degradationLevel !== currentHealth.metrics.degradationLevel
    );
  }

  private handleErrorHandlerEvent(event: any): void {
    // Forward error handler events as system events
    this.notifyListeners({
      type: 'component-error',
      timestamp: new Date(),
      data: { source: 'errorHandler', event }
    });

    // Check for degradation level changes
    if (event.type === 'degradation-activated') {
      this.notifyListeners({
        type: 'degradation-changed',
        timestamp: new Date(),
        data: { degradationLevel: event.degradationLevel }
      });
    }
  }

  private handleConfigurationChange(event: any): void {
    console.log('Configuration changed:', event);
    
    // Restart SSE connection if URL changed
    if (event.changes.sseConfig?.url) {
      sseClient.disconnect();
      setTimeout(() => {
        sseClient.connect().catch(error => {
          console.error('Failed to reconnect after configuration change:', error);
        });
      }, 1000);
    }
  }

  private notifyListeners(event: SystemEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in system event listener:', error);
      }
    });
  }
}

// Default instance for easy use
export const challengeNotificationSystem = new ChallengeNotificationSystemIntegration();