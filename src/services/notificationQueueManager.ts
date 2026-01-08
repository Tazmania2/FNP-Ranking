/**
 * Notification Queue Manager
 * 
 * Manages the display queue for challenge completion notifications.
 * Ensures sequential display without overlap and handles queue size limits.
 */

import type { ChallengeCompletionEvent } from './sseClientService';
import { challengeNotificationConfig } from './challengeNotificationConfigService';
import { challengeNotificationErrorHandler } from './challengeNotificationErrorHandler';
import { createNotificationError } from '../utils/challengeNotificationErrorUtils';

export interface NotificationQueueState {
  currentNotification: ChallengeCompletionEvent | null;
  queuedNotifications: ChallengeCompletionEvent[];
  isDisplaying: boolean;
  queueSize: number;
  maxQueueSize: number;
}

export interface QueueManagerEvents {
  'notification-ready': (notification: ChallengeCompletionEvent) => void;
  'notification-dismissed': (notification: ChallengeCompletionEvent) => void;
  'queue-overflow': (droppedNotification: ChallengeCompletionEvent) => void;
  'queue-state-changed': (state: NotificationQueueState) => void;
}

export class NotificationQueueManager {
  private queue: ChallengeCompletionEvent[] = [];
  private currentNotification: ChallengeCompletionEvent | null = null;
  private isDisplaying: boolean = false;
  private listeners: Map<keyof QueueManagerEvents, Set<Function>> = new Map();
  private processedEventIds: Set<string> = new Set();
  private readonly maxProcessedIds = 1000; // Prevent memory leaks

  constructor() {
    // Initialize event listener maps
    this.listeners.set('notification-ready', new Set());
    this.listeners.set('notification-dismissed', new Set());
    this.listeners.set('queue-overflow', new Set());
    this.listeners.set('queue-state-changed', new Set());
  }

  /**
   * Add a notification to the queue
   */
  public enqueue(notification: ChallengeCompletionEvent): void {
    try {
      // Check for duplicate events
      if (this.processedEventIds.has(notification.id)) {
        console.log('Duplicate notification ignored:', notification.id);
        return;
      }

      // Add to processed IDs
      this.processedEventIds.add(notification.id);
      
      // Clean up old processed IDs to prevent memory leaks
      if (this.processedEventIds.size > this.maxProcessedIds) {
        const idsArray = Array.from(this.processedEventIds);
        const toRemove = idsArray.slice(0, this.processedEventIds.size - this.maxProcessedIds);
        toRemove.forEach(id => this.processedEventIds.delete(id));
      }

      const config = challengeNotificationConfig.getConfig();
      const maxQueueSize = config.maxQueueSize;

      // Check if we should notify for this challenge
      if (!challengeNotificationConfig.shouldNotifyForChallenge(
        notification.challengeId,
        notification.challengeId
      )) {
        console.log('Notification filtered out by configuration:', notification.challengeName);
        return;
      }

      // Handle queue overflow
      if (this.queue.length >= maxQueueSize) {
        const droppedNotification = this.queue.shift()!;
        this.emit('queue-overflow', droppedNotification);
        
        console.warn('Notification queue overflow, dropped notification:', droppedNotification.id);
        
        // Log overflow error
        const overflowError = createNotificationError(
          'system',
          'QUEUE_OVERFLOW',
          `Notification queue overflow, dropped notification: ${droppedNotification.challengeName}`,
          { droppedNotification, queueSize: this.queue.length, maxQueueSize },
          'medium'
        );
        challengeNotificationErrorHandler.handleError(overflowError);
      }

      // Add to queue
      this.queue.push(notification);
      console.log('Notification enqueued:', notification.challengeName, 'Queue size:', this.queue.length);

      // Emit state change
      this.emitStateChange();

      // Process queue if not currently displaying
      if (!this.isDisplaying) {
        this.processNext();
      }

    } catch (error) {
      const queueError = createNotificationError(
        'system',
        'ENQUEUE_ERROR',
        `Failed to enqueue notification: ${error instanceof Error ? error.message : String(error)}`,
        { notification, error },
        'high'
      );
      challengeNotificationErrorHandler.handleError(queueError);
    }
  }

  /**
   * Get the next notification from the queue
   */
  public dequeue(): ChallengeCompletionEvent | null {
    const notification = this.queue.shift() || null;
    if (notification) {
      console.log('Notification dequeued:', notification.challengeName, 'Remaining:', this.queue.length);
      this.emitStateChange();
    }
    return notification;
  }

  /**
   * Clear all notifications from the queue
   */
  public clear(): void {
    const clearedCount = this.queue.length;
    this.queue = [];
    this.currentNotification = null;
    this.isDisplaying = false;
    
    console.log('Notification queue cleared, removed', clearedCount, 'notifications');
    this.emitStateChange();
  }

  /**
   * Get current queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Get current queue state
   */
  public getState(): NotificationQueueState {
    const config = challengeNotificationConfig.getConfig();
    
    return {
      currentNotification: this.currentNotification,
      queuedNotifications: [...this.queue],
      isDisplaying: this.isDisplaying,
      queueSize: this.queue.length,
      maxQueueSize: config.maxQueueSize
    };
  }

  /**
   * Check if currently displaying a notification
   */
  public isCurrentlyDisplaying(): boolean {
    return this.isDisplaying;
  }

  /**
   * Get current notification being displayed
   */
  public getCurrentNotification(): ChallengeCompletionEvent | null {
    return this.currentNotification;
  }

  /**
   * Mark current notification as dismissed and process next
   */
  public dismissCurrent(): void {
    if (this.currentNotification) {
      const dismissedNotification = this.currentNotification;
      console.log('Notification dismissed:', dismissedNotification.challengeName);
      
      this.emit('notification-dismissed', dismissedNotification);
      
      this.currentNotification = null;
      this.isDisplaying = false;
      
      this.emitStateChange();
      
      // Process next notification after a brief delay
      setTimeout(() => {
        this.processNext();
      }, 100);
    }
  }

  /**
   * Process the next notification in the queue
   */
  private processNext(): void {
    if (this.isDisplaying || this.queue.length === 0) {
      return;
    }

    try {
      const nextNotification = this.dequeue();
      if (nextNotification) {
        this.currentNotification = nextNotification;
        this.isDisplaying = true;
        
        console.log('Processing notification:', nextNotification.challengeName);
        
        this.emit('notification-ready', nextNotification);
        this.emitStateChange();
      }
    } catch (error) {
      const processError = createNotificationError(
        'system',
        'PROCESS_ERROR',
        `Failed to process next notification: ${error instanceof Error ? error.message : String(error)}`,
        { error, queueSize: this.queue.length },
        'high'
      );
      challengeNotificationErrorHandler.handleError(processError);
      
      // Try to recover by clearing the current state
      this.isDisplaying = false;
      this.currentNotification = null;
      this.emitStateChange();
    }
  }

  /**
   * Add event listener
   */
  public on<K extends keyof QueueManagerEvents>(
    event: K,
    listener: QueueManagerEvents[K]
  ): () => void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    }
    return () => {};
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof QueueManagerEvents>(
    event: K,
    listener: QueueManagerEvents[K]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit<K extends keyof QueueManagerEvents>(
    event: K,
    ...args: Parameters<QueueManagerEvents[K]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          (listener as Function)(...args);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Emit state change event
   */
  private emitStateChange(): void {
    this.emit('queue-state-changed', this.getState());
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): {
    queueState: NotificationQueueState;
    processedEventIds: number;
    listenerCounts: Record<string, number>;
  } {
    const listenerCounts: Record<string, number> = {};
    this.listeners.forEach((listeners, event) => {
      listenerCounts[event] = listeners.size;
    });

    return {
      queueState: this.getState(),
      processedEventIds: this.processedEventIds.size,
      listenerCounts
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.clear();
    this.listeners.clear();
    this.processedEventIds.clear();
  }
}

// Export singleton instance
export const notificationQueueManager = new NotificationQueueManager();