/**
 * Performance optimizations and resource management utilities
 * for challenge completion notification system
 */

/**
 * Memory-managed event store with automatic cleanup and performance optimizations
 */
export class OptimizedEventStore {
  private events: Map<string, any> = new Map();
  private readonly maxAge: number;
  private readonly maxEvents: number;
  private lastCleanup: number = Date.now();
  private readonly cleanupInterval: number = 30000; // 30 seconds
  private readonly batchSize: number = 50; // Process events in batches

  constructor(maxAge: number = 5 * 60 * 1000, maxEvents: number = 100) {
    this.maxAge = maxAge;
    this.maxEvents = maxEvents;
  }

  addEvent(event: any): void {
    // Add event with timestamp for efficient cleanup
    this.events.set(event.id, {
      ...event,
      addedAt: Date.now()
    });
    
    // Trigger cleanup if needed (throttled)
    this.conditionalCleanup();
  }

  getRecentEvents(since?: Date): any[] {
    const cutoff = since || new Date(Date.now() - this.maxAge);
    const cutoffTime = cutoff.getTime();
    
    const recentEvents: any[] = [];
    
    // Efficient iteration with early termination
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp.getTime() >= cutoffTime) {
        recentEvents.push(event);
      }
    }
    
    // Sort by timestamp (most recent first) - only if needed
    if (recentEvents.length > 1) {
      recentEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    
    return recentEvents;
  }

  /**
   * Conditional cleanup - only run if enough time has passed
   */
  private conditionalCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup();
      this.lastCleanup = now;
    }
  }

  /**
   * Optimized cleanup with batching for large datasets
   */
  cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.maxAge;
    
    // Batch cleanup for better performance
    const entriesToDelete: string[] = [];
    let processedCount = 0;
    
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp.getTime() < cutoff) {
        entriesToDelete.push(id);
      }
      
      // Process in batches to avoid blocking
      processedCount++;
      if (processedCount >= this.batchSize) {
        break;
      }
    }
    
    // Remove old events
    entriesToDelete.forEach(id => this.events.delete(id));
    
    // Limit total events if still over limit
    if (this.events.size > this.maxEvents) {
      this.limitEventCount();
    }
  }

  /**
   * Efficiently limit event count by keeping most recent
   */
  private limitEventCount(): void {
    if (this.events.size <= this.maxEvents) {
      return;
    }
    
    // Convert to array and sort by timestamp
    const sortedEvents = Array.from(this.events.entries())
      .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Clear and rebuild with only the most recent events
    this.events.clear();
    for (let i = 0; i < this.maxEvents && i < sortedEvents.length; i++) {
      const [id, event] = sortedEvents[i];
      this.events.set(id, event);
    }
  }

  size(): number {
    return this.events.size;
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats(): { eventCount: number; estimatedMemoryKB: number; lastCleanup: Date } {
    // Rough estimation of memory usage
    const avgEventSize = 500; // bytes per event (rough estimate)
    const estimatedMemoryKB = (this.events.size * avgEventSize) / 1024;
    
    return {
      eventCount: this.events.size,
      estimatedMemoryKB: Math.round(estimatedMemoryKB * 100) / 100,
      lastCleanup: new Date(this.lastCleanup)
    };
  }

  /**
   * Force cleanup for testing or emergency situations
   */
  forceCleanup(): void {
    this.cleanup();
    this.lastCleanup = Date.now();
  }
}

/**
 * Connection persistence manager for handling browser visibility changes
 */
export class ConnectionPersistenceManager {
  private isVisible: boolean = true;
  private visibilityChangeHandlers: (() => void)[] = [];
  private pageHideHandlers: (() => void)[] = [];
  private pageShowHandlers: (() => void)[] = [];

  constructor() {
    this.setupVisibilityHandlers();
  }

  private setupVisibilityHandlers(): void {
    if (typeof document !== 'undefined') {
      // Handle visibility change
      document.addEventListener('visibilitychange', () => {
        this.isVisible = !document.hidden;
        this.notifyVisibilityChangeHandlers();
      });

      // Handle page hide/show events
      window.addEventListener('pagehide', () => {
        this.isVisible = false;
        this.notifyPageHideHandlers();
      });

      window.addEventListener('pageshow', () => {
        this.isVisible = true;
        this.notifyPageShowHandlers();
      });

      // Handle focus/blur for additional persistence
      window.addEventListener('focus', () => {
        if (document.visibilityState === 'visible') {
          this.isVisible = true;
          this.notifyVisibilityChangeHandlers();
        }
      });

      window.addEventListener('blur', () => {
        // Don't immediately mark as invisible on blur
        // Wait for visibility change event for more accurate detection
      });
    }
  }

  onVisibilityChange(handler: () => void): void {
    this.visibilityChangeHandlers.push(handler);
  }

  onPageHide(handler: () => void): void {
    this.pageHideHandlers.push(handler);
  }

  onPageShow(handler: () => void): void {
    this.pageShowHandlers.push(handler);
  }

  private notifyVisibilityChangeHandlers(): void {
    this.visibilityChangeHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Error in visibility change handler:', error);
      }
    });
  }

  private notifyPageHideHandlers(): void {
    this.pageHideHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Error in page hide handler:', error);
      }
    });
  }

  private notifyPageShowHandlers(): void {
    this.pageShowHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Error in page show handler:', error);
      }
    });
  }

  isPageVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get visibility state for debugging
   */
  getVisibilityState(): {
    isVisible: boolean;
    documentHidden: boolean;
    visibilityState: string;
  } {
    return {
      isVisible: this.isVisible,
      documentHidden: typeof document !== 'undefined' ? document.hidden : false,
      visibilityState: typeof document !== 'undefined' ? document.visibilityState : 'unknown'
    };
  }
}

/**
 * High-frequency event processor with throttling and batching
 */
export class HighFrequencyEventProcessor {
  private eventQueue: any[] = [];
  private isProcessing: boolean = false;
  private readonly batchSize: number;
  private readonly processingDelay: number;
  private processingTimeoutId: number | null = null;

  constructor(batchSize: number = 10, processingDelay: number = 100) {
    this.batchSize = batchSize;
    this.processingDelay = processingDelay;
  }

  /**
   * Add event to processing queue with automatic batching
   */
  addEvent(event: any, processor: (events: any[]) => void): void {
    this.eventQueue.push({ event, processor });
    
    // Schedule processing if not already scheduled
    if (!this.isProcessing && this.processingTimeoutId === null) {
      this.scheduleProcessing();
    }
  }

  private scheduleProcessing(): void {
    this.processingTimeoutId = window.setTimeout(() => {
      this.processBatch();
    }, this.processingDelay);
  }

  private processBatch(): void {
    if (this.eventQueue.length === 0) {
      this.processingTimeoutId = null;
      return;
    }

    this.isProcessing = true;
    
    // Process events in batches
    const batch = this.eventQueue.splice(0, this.batchSize);
    
    // Group by processor function for efficient processing
    const processorGroups = new Map<Function, any[]>();
    
    batch.forEach(({ event, processor }) => {
      if (!processorGroups.has(processor)) {
        processorGroups.set(processor, []);
      }
      processorGroups.get(processor)!.push(event);
    });

    // Process each group
    processorGroups.forEach((events, processor) => {
      try {
        processor(events);
      } catch (error) {
        console.error('Error processing event batch:', error);
      }
    });

    this.isProcessing = false;
    this.processingTimeoutId = null;

    // Schedule next batch if there are more events
    if (this.eventQueue.length > 0) {
      this.scheduleProcessing();
    }
  }

  /**
   * Get processing statistics
   */
  getStats(): { queueLength: number; isProcessing: boolean; batchSize: number } {
    return {
      queueLength: this.eventQueue.length,
      isProcessing: this.isProcessing,
      batchSize: this.batchSize
    };
  }

  /**
   * Clear the event queue
   */
  clear(): void {
    this.eventQueue = [];
    if (this.processingTimeoutId) {
      clearTimeout(this.processingTimeoutId);
      this.processingTimeoutId = null;
    }
    this.isProcessing = false;
  }
}

/**
 * Serverless function performance optimizer
 */
export class ServerlessPerformanceOptimizer {
  private static instance: ServerlessPerformanceOptimizer;
  private warmupData: Map<string, any> = new Map();
  private lastActivity: number = Date.now();

  static getInstance(): ServerlessPerformanceOptimizer {
    if (!ServerlessPerformanceOptimizer.instance) {
      ServerlessPerformanceOptimizer.instance = new ServerlessPerformanceOptimizer();
    }
    return ServerlessPerformanceOptimizer.instance;
  }

  /**
   * Warm up function with pre-computed data
   */
  warmup(key: string, data: any): void {
    this.warmupData.set(key, {
      data,
      timestamp: Date.now()
    });
    this.lastActivity = Date.now();
  }

  /**
   * Get warmed up data if available and fresh
   */
  getWarmupData(key: string, maxAge: number = 60000): any | null {
    const entry = this.warmupData.get(key);
    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > maxAge) {
      this.warmupData.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Optimize response for serverless environment
   */
  optimizeResponse(data: any): any {
    // Remove unnecessary fields for smaller payload
    if (Array.isArray(data)) {
      return data.map(item => this.stripUnnecessaryFields(item));
    }
    
    return this.stripUnnecessaryFields(data);
  }

  private stripUnnecessaryFields(item: any): any {
    if (!item || typeof item !== 'object') {
      return item;
    }

    // Remove internal fields that don't need to be sent to client
    const { addedAt, internalId, debugInfo, ...cleanItem } = item;
    return cleanItem;
  }

  /**
   * Check if function is likely cold start
   */
  isColdStart(): boolean {
    const timeSinceLastActivity = Date.now() - this.lastActivity;
    return timeSinceLastActivity > 300000; // 5 minutes
  }

  /**
   * Update activity timestamp
   */
  recordActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): {
    warmupDataCount: number;
    lastActivity: Date;
    isColdStart: boolean;
  } {
    return {
      warmupDataCount: this.warmupData.size,
      lastActivity: new Date(this.lastActivity),
      isColdStart: this.isColdStart()
    };
  }
}

/**
 * Resource monitor for tracking memory and performance
 */
export class ResourceMonitor {
  private memorySnapshots: Array<{ timestamp: number; usage: any }> = [];
  private readonly maxSnapshots: number = 50;

  /**
   * Take a memory snapshot
   */
  takeMemorySnapshot(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      this.memorySnapshots.push({
        timestamp: Date.now(),
        usage: {
          rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
          external: Math.round(usage.external / 1024 / 1024 * 100) / 100 // MB
        }
      });

      // Limit snapshots to prevent memory growth
      if (this.memorySnapshots.length > this.maxSnapshots) {
        this.memorySnapshots.shift();
      }
    }
  }

  /**
   * Get memory usage trend
   */
  getMemoryTrend(): {
    current: any;
    trend: 'increasing' | 'decreasing' | 'stable';
    snapshots: Array<{ timestamp: number; usage: any }>;
  } {
    if (this.memorySnapshots.length < 2) {
      return {
        current: this.memorySnapshots[0]?.usage || null,
        trend: 'stable',
        snapshots: this.memorySnapshots
      };
    }

    const recent = this.memorySnapshots.slice(-5); // Last 5 snapshots
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const heapDiff = last.usage.heapUsed - first.usage.heapUsed;
    const threshold = 1; // 1MB threshold
    
    let trend: 'increasing' | 'decreasing' | 'stable';
    if (heapDiff > threshold) {
      trend = 'increasing';
    } else if (heapDiff < -threshold) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      current: last.usage,
      trend,
      snapshots: this.memorySnapshots
    };
  }

  /**
   * Check if memory usage is concerning
   */
  isMemoryUsageConcerning(): boolean {
    const trend = this.getMemoryTrend();
    if (!trend.current) {
      return false;
    }

    // Consider concerning if heap usage > 100MB or increasing trend with high usage
    return trend.current.heapUsed > 100 || 
           (trend.trend === 'increasing' && trend.current.heapUsed > 50);
  }
}