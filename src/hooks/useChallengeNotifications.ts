/**
 * React hook for integrating challenge completion notifications
 * 
 * Manages the complete notification system lifecycle including:
 * - SSE connection management
 * - Notification queue processing
 * - Popup display coordination
 * - Error handling and recovery
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { sseClient, type ChallengeCompletionEvent, type ConnectionState } from '../services/sseClientService';
import { notificationQueueManager, type NotificationQueueState } from '../services/notificationQueueManager';
import { challengeNotificationSystem, type SystemHealthStatus } from '../services/challengeNotificationSystemIntegration';
import { challengeNotificationErrorHandler } from '../services/challengeNotificationErrorHandler';
import { createNotificationError } from '../utils/challengeNotificationErrorUtils';

export interface NotificationSystemState {
  // Connection state
  connectionState: ConnectionState;
  isConnected: boolean;
  
  // Queue state
  queueState: NotificationQueueState;
  
  // Current notification
  currentNotification: ChallengeCompletionEvent | null;
  
  // System health
  systemHealth: SystemHealthStatus;
  
  // Error state
  hasErrors: boolean;
  lastError: string | null;
  
  // Initialization state
  isInitialized: boolean;
  isInitializing: boolean;
}

export interface NotificationSystemActions {
  // System control
  initialize: () => Promise<void>;
  shutdown: () => void;
  forceRecovery: () => Promise<boolean>;
  
  // Notification control
  dismissCurrentNotification: () => void;
  clearQueue: () => void;
  
  // Connection control
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Error handling
  clearErrors: () => void;
}

export interface UseChallengeNotificationsResult {
  state: NotificationSystemState;
  actions: NotificationSystemActions;
}

/**
 * Main hook for challenge notification system integration
 */
export function useChallengeNotifications(): UseChallengeNotificationsResult {
  // State management
  const [connectionState, setConnectionState] = useState<ConnectionState>(() => 
    sseClient.getConnectionState()
  );
  const [queueState, setQueueState] = useState<NotificationQueueState>(() => 
    notificationQueueManager.getState()
  );
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus>(() => 
    challengeNotificationSystem.getHealthStatus()
  );
  const [currentNotification, setCurrentNotification] = useState<ChallengeCompletionEvent | null>(null);
  const [hasErrors, setHasErrors] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  // Refs for cleanup
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Initialize the notification system
  const initialize = useCallback(async () => {
    if (isInitialized || isInitializing) {
      return;
    }

    setIsInitializing(true);
    setHasErrors(false);
    setLastError(null);

    try {
      console.log('Initializing challenge notification system...');
      
      // Initialize the integrated system
      await challengeNotificationSystem.initialize();
      
      // Set up SSE event listeners
      const sseEventCallback = (event: any) => {
        if (event.type === 'challenge-completed' && event.data) {
          console.log('Challenge completion event received:', event.data);
          notificationQueueManager.enqueue(event.data);
        }
      };
      sseClient.onEvent(sseEventCallback);
      cleanupFunctions.current.push(() => {
        // Note: SSE client doesn't provide unsubscribe, cleanup handled by disconnect
      });

      // Set up SSE connection state listeners
      const connectionStateCallback = (state: ConnectionState) => {
        setConnectionState(state);
      };
      sseClient.onConnectionStateChange(connectionStateCallback);
      cleanupFunctions.current.push(() => {
        // Note: SSE client doesn't provide unsubscribe, cleanup handled by disconnect
      });

      // Set up queue manager listeners
      const unsubscribeNotificationReady = notificationQueueManager.on('notification-ready', (notification) => {
        setCurrentNotification(notification);
      });
      cleanupFunctions.current.push(() => unsubscribeNotificationReady());

      const unsubscribeNotificationDismissed = notificationQueueManager.on('notification-dismissed', () => {
        setCurrentNotification(null);
      });
      cleanupFunctions.current.push(() => unsubscribeNotificationDismissed());

      const unsubscribeQueueStateChanged = notificationQueueManager.on('queue-state-changed', (state) => {
        setQueueState(state);
      });
      cleanupFunctions.current.push(() => unsubscribeQueueStateChanged());

      // Set up system health monitoring
      const unsubscribeSystemEvents = challengeNotificationSystem.onSystemEvent((event) => {
        console.log('System event:', event);
        
        if (event.type === 'component-error') {
          setHasErrors(true);
          setLastError(event.data?.error?.message || 'System error occurred');
        }
        
        // Update system health
        setSystemHealth(challengeNotificationSystem.getHealthStatus());
      });
      cleanupFunctions.current.push(unsubscribeSystemEvents);

      // Set up error handler listeners
      const errorHandlerCallback = (event: any) => {
        if (event.type === 'error-detected') {
          setHasErrors(true);
          setLastError(event.error?.message || 'Unknown error');
        } else if (event.type === 'recovery-succeeded') {
          setHasErrors(false);
          setLastError(null);
        }
      };
      challengeNotificationErrorHandler.onRecoveryEvent(errorHandlerCallback);
      cleanupFunctions.current.push(() => {
        // Note: Error handler doesn't provide unsubscribe, cleanup handled by destroy
      });

      setIsInitialized(true);
      console.log('Challenge notification system initialized successfully');

    } catch (error) {
      const initError = createNotificationError(
        'system',
        'INITIALIZATION_FAILED',
        `Failed to initialize notification system: ${error instanceof Error ? error.message : String(error)}`,
        { error },
        'critical'
      );
      
      challengeNotificationErrorHandler.handleError(initError);
      setHasErrors(true);
      setLastError(error instanceof Error ? error.message : String(error));
      
      throw error;
    } finally {
      setIsInitializing(false);
    }
  }, [isInitialized, isInitializing]);

  // Shutdown the notification system
  const shutdown = useCallback(() => {
    console.log('Shutting down challenge notification system...');
    
    // Clean up all listeners
    cleanupFunctions.current.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    });
    cleanupFunctions.current = [];

    // Shutdown the integrated system
    challengeNotificationSystem.shutdown();
    
    // Reset state
    setIsInitialized(false);
    setCurrentNotification(null);
    setHasErrors(false);
    setLastError(null);
    
    console.log('Challenge notification system shut down');
  }, []);

  // Force system recovery
  const forceRecovery = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Forcing system recovery...');
      const recovered = await challengeNotificationSystem.forceRecovery();
      
      if (recovered) {
        setHasErrors(false);
        setLastError(null);
        setSystemHealth(challengeNotificationSystem.getHealthStatus());
      }
      
      return recovered;
    } catch (error) {
      console.error('Force recovery failed:', error);
      return false;
    }
  }, []);

  // Dismiss current notification
  const dismissCurrentNotification = useCallback(() => {
    if (currentNotification) {
      notificationQueueManager.dismissCurrent();
    }
  }, [currentNotification]);

  // Clear notification queue
  const clearQueue = useCallback(() => {
    notificationQueueManager.clear();
  }, []);

  // Connect to SSE
  const connect = useCallback(async () => {
    try {
      await sseClient.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }, []);

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    sseClient.disconnect();
  }, []);

  // Clear errors
  const clearErrors = useCallback(() => {
    setHasErrors(false);
    setLastError(null);
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    initialize().catch(error => {
      console.error('Auto-initialization failed:', error);
    });

    // Cleanup on unmount
    return () => {
      shutdown();
    };
  }, [initialize, shutdown]);

  // Update system health periodically
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const healthCheckInterval = setInterval(() => {
      setSystemHealth(challengeNotificationSystem.getHealthStatus());
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [isInitialized]);

  // Prepare state object
  const state: NotificationSystemState = {
    connectionState,
    isConnected: connectionState.status === 'connected',
    queueState,
    currentNotification,
    systemHealth,
    hasErrors,
    lastError,
    isInitialized,
    isInitializing
  };

  // Prepare actions object
  const actions: NotificationSystemActions = {
    initialize,
    shutdown,
    forceRecovery,
    dismissCurrentNotification,
    clearQueue,
    connect,
    disconnect,
    clearErrors
  };

  return {
    state,
    actions
  };
}

/**
 * Simplified hook for just displaying notifications
 */
export function useNotificationDisplay() {
  const { state, actions } = useChallengeNotifications();
  
  return {
    currentNotification: state.currentNotification,
    isConnected: state.isConnected,
    hasErrors: state.hasErrors,
    dismissNotification: actions.dismissCurrentNotification,
    clearErrors: actions.clearErrors
  };
}

/**
 * Hook for notification system status monitoring
 */
export function useNotificationSystemStatus() {
  const { state, actions } = useChallengeNotifications();
  
  return {
    systemHealth: state.systemHealth,
    connectionState: state.connectionState,
    queueState: state.queueState,
    isInitialized: state.isInitialized,
    hasErrors: state.hasErrors,
    lastError: state.lastError,
    forceRecovery: actions.forceRecovery,
    clearErrors: actions.clearErrors
  };
}