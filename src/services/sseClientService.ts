/**
 * SSE Client Service for Challenge Completion Notifications
 * 
 * Manages Server-Sent Events connection to receive real-time challenge completion events
 * from the /api/challenge-events endpoint.
 */

import { challengeNotificationConfig } from './challengeNotificationConfigService';
import { challengeNotificationErrorHandler } from './challengeNotificationErrorHandler';
import { 
  createSSEError, 
  createNetworkError, 
  validateChallengeCompletionEvent,
  safeJSONParse,
  withNotificationErrorHandling 
} from '../utils/challengeNotificationErrorUtils';

export interface ChallengeCompletionEvent {
  id: string;
  playerId: string;
  playerName: string;
  challengeId: string;
  challengeName: string;
  completedAt: string;
  points?: number;
  timestamp: string;
}

export interface SSEEvent {
  id?: string;
  type: string;
  data: any;
  timestamp: string;
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  error?: string;
  connectionId?: string;
}

export interface SSEClientConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatTimeout: number;
}

export interface SSEClient {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  getConnectionState(): ConnectionState;
  onEvent(callback: (event: SSEEvent) => void): void;
  onChallengeCompleted(callback: (event: ChallengeCompletionEvent) => void): void;
  onConnectionStateChange(callback: (state: ConnectionState) => void): void;
  onError(callback: (error: Error) => void): void;
}

/**
 * SSE Client implementation with automatic reconnection and error handling
 */
export class SSEClientService implements SSEClient {
  private eventSource: EventSource | null = null;
  private config: SSEClientConfig;
  private connectionState: ConnectionState;
  private reconnectTimeoutId: number | null = null;
  private heartbeatTimeoutId: number | null = null;
  
  // Event callbacks
  private eventCallbacks: ((event: SSEEvent) => void)[] = [];
  private challengeCompletedCallbacks: ((event: ChallengeCompletionEvent) => void)[] = [];
  private connectionStateCallbacks: ((state: ConnectionState) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];

  constructor(config: Partial<SSEClientConfig> = {}) {
    // Get configuration from the config service
    const notificationConfig = challengeNotificationConfig.getConfig();
    
    this.config = {
      url: notificationConfig.sseConfig.url,
      reconnectInterval: notificationConfig.sseConfig.reconnectInterval,
      maxReconnectAttempts: notificationConfig.sseConfig.maxReconnectAttempts,
      heartbeatTimeout: notificationConfig.sseConfig.heartbeatTimeout,
      ...config
    };

    this.connectionState = {
      status: 'disconnected',
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts
    };

    // Register this SSE client with the error handler
    challengeNotificationErrorHandler.setSSEClient(this);

    // Listen for configuration changes
    challengeNotificationConfig.onConfigChange((event) => {
      if (event.changes.sseConfig) {
        this.updateConfigFromService();
      }
    });
  }

  async connect(): Promise<void> {
    if (this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return; // Already connected or connecting
    }

    this.updateConnectionState({ status: 'connecting' });

    try {
      this.eventSource = new EventSource(this.config.url);
      
      this.setupEventListeners();
      
      // Wait for connection to be established or fail
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000); // 10 second timeout

        const onOpen = () => {
          clearTimeout(timeout);
          this.eventSource?.removeEventListener('open', onOpen);
          this.eventSource?.removeEventListener('error', onError);
          resolve();
        };

        const onError = (error: Event) => {
          clearTimeout(timeout);
          this.eventSource?.removeEventListener('open', onOpen);
          this.eventSource?.removeEventListener('error', onError);
          reject(new Error('Failed to connect to SSE endpoint'));
        };

        this.eventSource?.addEventListener('open', onOpen);
        this.eventSource?.addEventListener('error', onError);
      });

    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.updateConnectionState({ 
      status: 'disconnected',
      reconnectAttempts: 0 
    });
  }

  isConnected(): boolean {
    return this.connectionState.status === 'connected';
  }

  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  onEvent(callback: (event: SSEEvent) => void): void {
    this.eventCallbacks.push(callback);
  }

  onChallengeCompleted(callback: (event: ChallengeCompletionEvent) => void): void {
    this.challengeCompletedCallbacks.push(callback);
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.connectionStateCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.updateConnectionState({ 
        status: 'connected',
        lastConnected: new Date(),
        reconnectAttempts: 0,
        error: undefined
      });
      this.resetHeartbeatTimeout();
    };

    this.eventSource.onerror = (error) => {
      this.handleConnectionError(new Error('SSE connection error'));
    };

    this.eventSource.onmessage = (event) => {
      this.handleMessage(event);
    };

    // Handle specific event types
    this.eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      this.updateConnectionState({ 
        connectionId: data.connectionId 
      });
    });

    this.eventSource.addEventListener('challenge_completed', (event) => {
      this.handleChallengeCompletedEvent(event);
    });

    this.eventSource.addEventListener('heartbeat', (event) => {
      this.resetHeartbeatTimeout();
    });
  }

  private handleMessage(event: MessageEvent): void {
    const wrappedHandler = withNotificationErrorHandling(
      async (event: MessageEvent) => {
        const data = safeJSONParse(event.data, (error) => {
          challengeNotificationErrorHandler.handleError(error);
        });
        
        if (!data) {
          return; // Error already handled by safeJSONParse
        }

        const sseEvent: SSEEvent = {
          id: event.lastEventId,
          type: 'message',
          data,
          timestamp: new Date().toISOString()
        };

        this.notifyEventCallbacks(sseEvent);
      },
      'sse',
      'MESSAGE_PROCESSING_ERROR',
      (error) => challengeNotificationErrorHandler.handleError(error)
    );

    wrappedHandler(event);
  }

  private handleChallengeCompletedEvent(event: MessageEvent): void {
    const wrappedHandler = withNotificationErrorHandling(
      async (event: MessageEvent) => {
        const eventData = safeJSONParse(event.data, (error) => {
          challengeNotificationErrorHandler.handleError(error);
        });
        
        if (!eventData) {
          return; // Error already handled by safeJSONParse
        }
        
        // Validate the event data structure
        const validationErrors = validateChallengeCompletionEvent(eventData.data);
        if (validationErrors.length > 0) {
          // Handle validation errors
          validationErrors.forEach(error => {
            challengeNotificationErrorHandler.handleError(error);
          });
          
          // If there are critical validation errors, skip this event
          const hasCriticalErrors = validationErrors.some(e => e.severity === 'critical' || e.severity === 'high');
          if (hasCriticalErrors) {
            return;
          }
        }

        const challengeEvent: ChallengeCompletionEvent = {
          id: eventData.id,
          playerId: eventData.data.playerId,
          playerName: eventData.data.playerName,
          challengeId: eventData.data.challengeId,
          challengeName: eventData.data.challengeName,
          completedAt: eventData.data.completedAt,
          points: eventData.data.points,
          timestamp: eventData.timestamp
        };

        // Notify general event callbacks
        const sseEvent: SSEEvent = {
          id: event.lastEventId,
          type: 'challenge_completed',
          data: challengeEvent,
          timestamp: challengeEvent.timestamp
        };
        this.notifyEventCallbacks(sseEvent);

        // Notify specific challenge completion callbacks
        this.notifyChallengeCompletedCallbacks(challengeEvent);
      },
      'sse',
      'CHALLENGE_EVENT_PROCESSING_ERROR',
      (error) => challengeNotificationErrorHandler.handleError(error)
    );

    wrappedHandler(event);
  }

  private handleConnectionError(error: Error): void {
    // Increment reconnect attempts before updating state
    const newReconnectAttempts = this.connectionState.reconnectAttempts + 1;
    
    this.updateConnectionState({ 
      status: 'error',
      error: error.message,
      reconnectAttempts: newReconnectAttempts
    });

    // Create and handle the error through the error handler
    const sseError = createSSEError(
      'CONNECTION_ERROR',
      error.message,
      { 
        reconnectAttempts: newReconnectAttempts,
        maxReconnectAttempts: this.config.maxReconnectAttempts
      }
    );
    challengeNotificationErrorHandler.handleError(sseError);

    this.notifyErrorCallbacks(error);

    // Attempt reconnection if within limits
    if (newReconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.updateConnectionState({ status: 'disconnected' });
      
      // Create error for max reconnect attempts exceeded
      const maxAttemptsError = createSSEError(
        'MAX_RECONNECT_ATTEMPTS_EXCEEDED',
        `Maximum reconnection attempts (${this.config.maxReconnectAttempts}) exceeded`,
        { totalAttempts: newReconnectAttempts }
      );
      challengeNotificationErrorHandler.handleError(maxAttemptsError);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
    }

    // Exponential backoff with jitter
    const baseDelay = this.config.reconnectInterval;
    const exponentialDelay = baseDelay * Math.pow(2, this.connectionState.reconnectAttempts - 1);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds

    this.reconnectTimeoutId = window.setTimeout(() => {
      this.connect().catch(() => {
        // Error handling is done in handleConnectionError
      });
    }, delay);
  }

  private resetHeartbeatTimeout(): void {
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId);
    }

    this.heartbeatTimeoutId = window.setTimeout(() => {
      this.handleConnectionError(new Error('Heartbeat timeout'));
    }, this.config.heartbeatTimeout);
  }

  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
    this.notifyConnectionStateCallbacks(this.connectionState);
  }

  private notifyEventCallbacks(event: SSEEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }

  private notifyChallengeCompletedCallbacks(event: ChallengeCompletionEvent): void {
    this.challengeCompletedCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in challenge completed callback:', error);
      }
    });
  }

  private notifyConnectionStateCallbacks(state: ConnectionState): void {
    this.connectionStateCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in connection state callback:', error);
      }
    });
  }

  private notifyErrorCallbacks(error: Error): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (error) {
        console.error('Error in error callback:', error);
      }
    });
  }

  /**
   * Update configuration from the config service
   */
  private updateConfigFromService(): void {
    const notificationConfig = challengeNotificationConfig.getConfig();
    
    const newConfig = {
      url: notificationConfig.sseConfig.url,
      reconnectInterval: notificationConfig.sseConfig.reconnectInterval,
      maxReconnectAttempts: notificationConfig.sseConfig.maxReconnectAttempts,
      heartbeatTimeout: notificationConfig.sseConfig.heartbeatTimeout
    };

    // Check if configuration actually changed
    const configChanged = 
      this.config.url !== newConfig.url ||
      this.config.reconnectInterval !== newConfig.reconnectInterval ||
      this.config.maxReconnectAttempts !== newConfig.maxReconnectAttempts ||
      this.config.heartbeatTimeout !== newConfig.heartbeatTimeout;

    if (configChanged) {
      console.log('SSE configuration updated:', newConfig);
      
      const wasConnected = this.isConnected();
      this.config = newConfig;
      
      // Update connection state limits
      this.connectionState.maxReconnectAttempts = newConfig.maxReconnectAttempts;
      
      // Reconnect if we were connected and URL changed
      if (wasConnected && this.config.url !== newConfig.url) {
        this.disconnect();
        this.connect().catch(error => {
          console.error('Error reconnecting after configuration change:', error);
        });
      }
    }
  }
}

// Default instance for easy use
export const sseClient = new SSEClientService();