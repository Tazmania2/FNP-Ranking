/**
 * Enhanced SSE Client Service with Performance Optimizations and Connection Persistence
 * 
 * Extends the base SSE client with:
 * - Browser tab visibility awareness
 * - Connection persistence across page lifecycle events
 * - Memory management and resource optimization
 * - High-frequency event handling
 */

import { SSEClientService, ConnectionState, SSEEvent, ChallengeCompletionEvent } from './sseClientService';
import { challengeNotificationConfig } from './challengeNotificationConfigService';

/**
 * Enhanced connection state with visibility tracking
 */
interface EnhancedConnectionState extends ConnectionState {
  isPageVisible: boolean;
  pausedDueToVisibility: boolean;
  lastVisibilityChange: Date | null;
  connectionPersistenceEnabled: boolean;
}

/**
 * Performance metrics for monitoring
 */
interface PerformanceMetrics {
  eventProcessingRate: number; // events per second
  averageReconnectTime: number; // milliseconds
  memoryUsage: number; // estimated KB
  connectionUptime: number; // milliseconds
  visibilityChangeCount: number;
}

/**
 * Enhanced SSE Client with performance optimizations and connection persistence
 */
export class EnhancedSSEClientService extends SSEClientService {
  private enhancedConnectionState: EnhancedConnectionState;
  private visibilityChangeCount: number = 0;
  private eventProcessingCount: number = 0;
  private eventProcessingStartTime: number = Date.now();
  private reconnectTimes: number[] = [];
  private connectionStartTime: number | null = null;
  private eventBuffer: SSEEvent[] = [];
  private readonly maxBufferSize: number = 100;
  
  // Visibility and persistence management
  private visibilityCheckInterval: number | null = null;
  private connectionPersistenceTimeout: number | null = null;
  private readonly visibilityCheckFrequency: number = 5000; // 5 seconds
  private readonly connectionPersistenceDelay: number = 2000; // 2 seconds

  constructor(config: any = {}) {
    super(config);
    
    this.enhancedConnectionState = {
      ...this.getConnectionState(),
      isPageVisible: !document.hidden,
      pausedDueToVisibility: false,
      lastVisibilityChange: null,
      connectionPersistenceEnabled: true
    };

    this.setupVisibilityHandlers();
    this.startPerformanceMonitoring();
  }

  /**
   * Setup browser visibility and page lifecycle event handlers
   */
  private setupVisibilityHandlers(): void {
    // Handle visibility change events
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // Handle page lifecycle events
    window.addEventListener('pagehide', () => {
      this.handlePageHide();
    });

    window.addEventListener('pageshow', () => {
      this.handlePageShow();
    });

    // Handle focus/blur for additional persistence
    window.addEventListener('focus', () => {
      if (!document.hidden) {
        this.handlePageBecameVisible();
      }
    });

    // Handle beforeunload for cleanup
    window.addEventListener('beforeunload', () => {
      this.handlePageUnload();
    });
  }

  /**
   * Handle visibility change with connection persistence logic
   */
  private handleVisibilityChange(): void {
    const wasVisible = this.enhancedConnectionState.isPageVisible;
    const isNowVisible = !document.hidden;
    
    this.enhancedConnectionState.isPageVisible = isNowVisible;
    this.enhancedConnectionState.lastVisibilityChange = new Date();
    this.visibilityChangeCount++;

    if (wasVisible && !isNowVisible) {
      // Page became hidden
      this.handlePageBecameHidden();
    } else if (!wasVisible && isNowVisible) {
      // Page became visible
      this.handlePageBecameVisible();
    }

    this.updateEnhancedConnectionState();
  }

  /**
   * Handle page becoming hidden with connection persistence
   */
  private handlePageBecameHidden(): void {
    if (!this.enhancedConnectionState.connectionPersistenceEnabled) {
      return;
    }

    // Don't immediately disconnect - use a delay to handle quick visibility changes
    if (this.connectionPersistenceTimeout) {
      clearTimeout(this.connectionPersistenceTimeout);
    }

    this.connectionPersistenceTimeout = window.setTimeout(() => {
      if (!this.enhancedConnectionState.isPageVisible && this.isConnected()) {
        console.log('Page hidden for extended period, pausing SSE connection');
        this.enhancedConnectionState.pausedDueToVisibility = true;
        this.updateEnhancedConnectionState();
        
        // Optionally disconnect to save resources
        // this.disconnect();
      }
    }, this.connectionPersistenceDelay);
  }

  /**
   * Handle page becoming visible with connection restoration
   */
  private handlePageBecameVisible(): void {
    // Clear any pending persistence timeout
    if (this.connectionPersistenceTimeout) {
      clearTimeout(this.connectionPersistenceTimeout);
      this.connectionPersistenceTimeout = null;
    }

    if (this.enhancedConnectionState.pausedDueToVisibility) {
      console.log('Page became visible, resuming SSE connection');
      this.enhancedConnectionState.pausedDueToVisibility = false;
      
      // Reconnect if not connected
      if (!this.isConnected()) {
        this.connect().catch(error => {
          console.error('Failed to reconnect after page became visible:', error);
        });
      }
    }

    this.updateEnhancedConnectionState();
  }

  /**
   * Handle page hide event
   */
  private handlePageHide(): void {
    console.log('Page hide event detected');
    this.enhancedConnectionState.pausedDueToVisibility = true;
    this.updateEnhancedConnectionState();
  }

  /**
   * Handle page show event
   */
  private handlePageShow(): void {
    console.log('Page show event detected');
    this.enhancedConnectionState.isPageVisible = true;
    this.enhancedConnectionState.pausedDueToVisibility = false;
    this.enhancedConnectionState.lastVisibilityChange = new Date();
    
    // Ensure connection is active
    if (!this.isConnected()) {
      this.connect().catch(error => {
        console.error('Failed to reconnect on page show:', error);
      });
    }
    
    this.updateEnhancedConnectionState();
  }

  /**
   * Handle page unload for cleanup
   */
  private handlePageUnload(): void {
    this.cleanup();
  }

  /**
   * Enhanced connect method with performance tracking
   */
  async connect(): Promise<void> {
    const connectStartTime = Date.now();
    this.connectionStartTime = connectStartTime;
    
    try {
      await super.connect();
      
      // Track reconnection time
      const reconnectTime = Date.now() - connectStartTime;
      this.reconnectTimes.push(reconnectTime);
      
      // Keep only recent reconnect times for average calculation
      if (this.reconnectTimes.length > 10) {
        this.reconnectTimes.shift();
      }
      
      this.enhancedConnectionState.pausedDueToVisibility = false;
      this.updateEnhancedConnectionState();
      
    } catch (error) {
      console.error('Enhanced SSE connection failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced disconnect with cleanup
   */
  disconnect(): void {
    this.cleanup();
    super.disconnect();
    this.connectionStartTime = null;
    this.updateEnhancedConnectionState();
  }

  /**
   * Override event handling to include buffering and performance tracking
   */
  onEvent(callback: (event: SSEEvent) => void): void {
    super.onEvent((event: SSEEvent) => {
      // Track event processing
      this.eventProcessingCount++;
      
      // Buffer events if page is not visible (optional optimization)
      if (!this.enhancedConnectionState.isPageVisible && this.eventBuffer.length < this.maxBufferSize) {
        this.eventBuffer.push(event);
        return;
      }
      
      // Process buffered events when page becomes visible
      if (this.enhancedConnectionState.isPageVisible && this.eventBuffer.length > 0) {
        const bufferedEvents = [...this.eventBuffer];
        this.eventBuffer = [];
        
        // Process buffered events first
        bufferedEvents.forEach(bufferedEvent => {
          try {
            callback(bufferedEvent);
          } catch (error) {
            console.error('Error processing buffered event:', error);
          }
        });
      }
      
      // Process current event
      try {
        callback(event);
      } catch (error) {
        console.error('Error processing current event:', error);
      }
    });
  }

  /**
   * Get enhanced connection state
   */
  getEnhancedConnectionState(): EnhancedConnectionState {
    return { ...this.enhancedConnectionState };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const processingDuration = (now - this.eventProcessingStartTime) / 1000; // seconds
    const eventProcessingRate = processingDuration > 0 ? this.eventProcessingCount / processingDuration : 0;
    
    const averageReconnectTime = this.reconnectTimes.length > 0 
      ? this.reconnectTimes.reduce((sum, time) => sum + time, 0) / this.reconnectTimes.length 
      : 0;
    
    const connectionUptime = this.connectionStartTime 
      ? now - this.connectionStartTime 
      : 0;
    
    // Estimate memory usage (rough calculation)
    const estimatedMemoryUsage = (
      this.eventBuffer.length * 500 + // 500 bytes per buffered event
      this.reconnectTimes.length * 8 + // 8 bytes per reconnect time
      1000 // base overhead
    ) / 1024; // Convert to KB

    return {
      eventProcessingRate: Math.round(eventProcessingRate * 100) / 100,
      averageReconnectTime: Math.round(averageReconnectTime),
      memoryUsage: Math.round(estimatedMemoryUsage * 100) / 100,
      connectionUptime,
      visibilityChangeCount: this.visibilityChangeCount
    };
  }

  /**
   * Enable or disable connection persistence
   */
  setConnectionPersistence(enabled: boolean): void {
    this.enhancedConnectionState.connectionPersistenceEnabled = enabled;
    this.updateEnhancedConnectionState();
  }

  /**
   * Check if connection is paused due to visibility
   */
  isPausedDueToVisibility(): boolean {
    return this.enhancedConnectionState.pausedDueToVisibility;
  }

  /**
   * Get visibility state
   */
  getVisibilityState(): 'visible' | 'hidden' {
    return this.enhancedConnectionState.isPageVisible ? 'visible' : 'hidden';
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Periodic visibility check (fallback)
    this.visibilityCheckInterval = window.setInterval(() => {
      const currentVisibility = !document.hidden;
      if (currentVisibility !== this.enhancedConnectionState.isPageVisible) {
        console.log('Visibility state mismatch detected, correcting...');
        this.handleVisibilityChange();
      }
    }, this.visibilityCheckFrequency);
  }

  /**
   * Update enhanced connection state and notify listeners
   */
  private updateEnhancedConnectionState(): void {
    // Update base connection state
    const baseState = this.getConnectionState();
    this.enhancedConnectionState = {
      ...this.enhancedConnectionState,
      ...baseState
    };
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
    }
    
    if (this.connectionPersistenceTimeout) {
      clearTimeout(this.connectionPersistenceTimeout);
      this.connectionPersistenceTimeout = null;
    }
    
    // Clear event buffer
    this.eventBuffer = [];
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.eventProcessingCount = 0;
    this.eventProcessingStartTime = Date.now();
    this.reconnectTimes = [];
    this.visibilityChangeCount = 0;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): {
    enhancedState: EnhancedConnectionState;
    performanceMetrics: PerformanceMetrics;
    bufferInfo: { size: number; maxSize: number };
    timers: { visibilityCheck: boolean; persistenceTimeout: boolean };
  } {
    return {
      enhancedState: this.getEnhancedConnectionState(),
      performanceMetrics: this.getPerformanceMetrics(),
      bufferInfo: {
        size: this.eventBuffer.length,
        maxSize: this.maxBufferSize
      },
      timers: {
        visibilityCheck: this.visibilityCheckInterval !== null,
        persistenceTimeout: this.connectionPersistenceTimeout !== null
      }
    };
  }
}

// Export enhanced client instance
export const enhancedSSEClient = new EnhancedSSEClientService();