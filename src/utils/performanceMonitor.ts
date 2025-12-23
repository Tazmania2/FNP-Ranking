/**
 * Performance monitoring utilities for Raspberry Pi optimization
 * Tracks memory, CPU, and frame rate for resource-constrained environments
 */

export interface PerformanceMetrics {
  memoryUsage: number; // in MB
  cpuUsage: number; // percentage estimate
  frameRate: number; // FPS
  networkLatency: number; // in ms
  loadTime: number; // in ms
  renderTime: number; // in ms
  frameDrops: number;
  networkRequests: number;
  cacheHitRate: number; // percentage
}

export interface PerformanceThresholds {
  maxMemoryUsage: number; // 2GB for Raspberry Pi 4
  minFrameRate: number; // 30 FPS
  maxInputLatency: number; // 200ms
  maxLoadTime: number; // 10 seconds
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private observers: PerformanceObserver[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private networkRequestCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxMemoryUsage: 2048, // 2GB in MB
      minFrameRate: 30,
      maxInputLatency: 200,
      maxLoadTime: 10000,
      ...thresholds,
    };

    this.metrics = {
      memoryUsage: 0,
      cpuUsage: 0,
      frameRate: 0,
      networkLatency: 0,
      loadTime: 0,
      renderTime: 0,
      frameDrops: 0,
      networkRequests: 0,
      cacheHitRate: 0,
    };

    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor navigation timing
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.setupNavigationObserver();
      this.setupResourceObserver();
      this.setupMeasureObserver();
    }

    // Start frame rate monitoring
    this.startFrameRateMonitoring();
  }

  private setupNavigationObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.loadTime = navEntry.loadEventEnd - navEntry.fetchStart;
          }
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Navigation observer not supported:', error);
    }
  }

  private setupResourceObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'resource') {
            this.networkRequestCount++;
            this.metrics.networkRequests = this.networkRequestCount;
          }
        });
      });
      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }
  }

  private setupMeasureObserver(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('render')) {
            this.metrics.renderTime = entry.duration;
          }
        });
      });
      observer.observe({ entryTypes: ['measure'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Measure observer not supported:', error);
    }
  }

  private startFrameRateMonitoring(): void {
    if (typeof window === 'undefined') return;

    const measureFrameRate = (timestamp: number) => {
      if (this.lastFrameTime > 0) {
        const delta = timestamp - this.lastFrameTime;
        this.frameCount++;
        
        // Calculate FPS over the last second
        if (this.frameCount >= 60) {
          this.metrics.frameRate = Math.round(1000 / (delta / this.frameCount));
          this.frameCount = 0;
        }
      }
      this.lastFrameTime = timestamp;
      requestAnimationFrame(measureFrameRate);
    };

    requestAnimationFrame(measureFrameRate);
  }

  /**
   * Get current memory usage estimate
   * Uses performance.memory API when available
   */
  getMemoryUsage(): number {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      // Convert bytes to MB
      this.metrics.memoryUsage = Math.round(memory.usedJSHeapSize / (1024 * 1024));
      return this.metrics.memoryUsage;
    }
    return 0;
  }

  /**
   * Estimate CPU usage based on frame timing
   */
  getCPUUsage(): number {
    const targetFrameTime = 1000 / 60; // 16.67ms for 60fps
    const actualFrameTime = this.lastFrameTime > 0 ? 
      performance.now() - this.lastFrameTime : targetFrameTime;
    
    // Rough CPU usage estimate based on frame timing
    this.metrics.cpuUsage = Math.min(100, (actualFrameTime / targetFrameTime) * 100);
    return this.metrics.cpuUsage;
  }

  /**
   * Record cache hit for cache hit rate calculation
   */
  recordCacheHit(): void {
    this.cacheHits++;
    this.updateCacheHitRate();
  }

  /**
   * Record cache miss for cache hit rate calculation
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
    this.updateCacheHitRate();
  }

  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.getMemoryUsage();
    this.getCPUUsage();
    return { ...this.metrics };
  }

  /**
   * Check if current performance meets thresholds
   */
  isPerformanceOptimal(): boolean {
    const metrics = this.getMetrics();
    return (
      metrics.memoryUsage <= this.thresholds.maxMemoryUsage &&
      metrics.frameRate >= this.thresholds.minFrameRate &&
      metrics.loadTime <= this.thresholds.maxLoadTime
    );
  }

  /**
   * Get performance alerts for current state
   */
  getPerformanceAlerts(): string[] {
    const alerts: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      alerts.push(`High memory usage: ${metrics.memoryUsage}MB (limit: ${this.thresholds.maxMemoryUsage}MB)`);
    }

    if (metrics.frameRate < this.thresholds.minFrameRate) {
      alerts.push(`Low frame rate: ${metrics.frameRate}fps (minimum: ${this.thresholds.minFrameRate}fps)`);
    }

    if (metrics.loadTime > this.thresholds.maxLoadTime) {
      alerts.push(`Slow load time: ${metrics.loadTime}ms (limit: ${this.thresholds.maxLoadTime}ms)`);
    }

    return alerts;
  }

  /**
   * Trigger automatic optimizations based on current performance
   */
  triggerOptimizations(): void {
    const metrics = this.getMetrics();

    // Memory optimization
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      this.triggerMemoryOptimization();
    }

    // Frame rate optimization
    if (metrics.frameRate < this.thresholds.minFrameRate) {
      this.triggerFrameRateOptimization();
    }
  }

  private triggerMemoryOptimization(): void {
    // Force garbage collection if available
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }

    // Clear performance entries to free memory
    if (typeof performance !== 'undefined' && performance.clearResourceTimings) {
      performance.clearResourceTimings();
    }

    // Dispatch custom event for app-level optimizations
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance:memory-pressure', {
        detail: { memoryUsage: this.metrics.memoryUsage }
      }));
    }
  }

  private triggerFrameRateOptimization(): void {
    // Dispatch custom event for frame rate optimization
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('performance:low-framerate', {
        detail: { frameRate: this.metrics.frameRate }
      }));
    }
  }

  /**
   * Clean up observers and monitoring
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const globalPerformanceMonitor = new PerformanceMonitor();

// Performance measurement utilities
export const measurePerformance = {
  /**
   * Measure execution time of a function
   */
  time: <T>(name: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    performance.mark(`${name}-start`);
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  },

  /**
   * Measure async function execution time
   */
  timeAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    performance.mark(`${name}-start`);
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    return result;
  },

  /**
   * Mark a performance point
   */
  mark: (name: string): void => {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  },

  /**
   * Measure between two marks
   */
  measure: (name: string, startMark: string, endMark: string): void => {
    if (typeof performance !== 'undefined') {
      performance.measure(name, startMark, endMark);
    }
  }
};