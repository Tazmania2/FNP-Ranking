/**
 * Resource usage alerts and automatic optimization triggers
 * Manages performance optimization for Raspberry Pi deployment
 */

import { globalPerformanceMonitor, PerformanceMetrics } from './performanceMonitor';

export interface OptimizationStrategy {
  name: string;
  priority: number;
  condition: (metrics: PerformanceMetrics) => boolean;
  action: () => void;
  description: string;
}

export interface ResourceAlert {
  type: 'memory' | 'cpu' | 'framerate' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  metrics: PerformanceMetrics;
}

export class ResourceOptimizer {
  private strategies: OptimizationStrategy[] = [];
  private alerts: ResourceAlert[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private alertCallbacks: ((alert: ResourceAlert) => void)[] = [];

  constructor() {
    this.initializeOptimizationStrategies();
  }

  private initializeOptimizationStrategies(): void {
    this.strategies = [
      {
        name: 'memory-cleanup',
        priority: 1,
        condition: (metrics) => metrics.memoryUsage > 1536, // 1.5GB threshold
        action: () => this.performMemoryCleanup(),
        description: 'Clear caches and trigger garbage collection when memory usage is high',
      },
      {
        name: 'reduce-animation-quality',
        priority: 2,
        condition: (metrics) => metrics.frameRate < 25,
        action: () => this.reduceAnimationQuality(),
        description: 'Reduce animation quality when frame rate drops below 25fps',
      },
      {
        name: 'throttle-updates',
        priority: 3,
        condition: (metrics) => metrics.cpuUsage > 80,
        action: () => this.throttleUpdates(),
        description: 'Reduce update frequency when CPU usage is high',
      },
      {
        name: 'optimize-network-requests',
        priority: 4,
        condition: (metrics) => metrics.networkLatency > 1000,
        action: () => this.optimizeNetworkRequests(),
        description: 'Increase caching and reduce request frequency for slow networks',
      },
      {
        name: 'emergency-mode',
        priority: 5,
        condition: (metrics) => metrics.memoryUsage > 1800, // 1.8GB critical threshold
        action: () => this.activateEmergencyMode(),
        description: 'Activate emergency mode to prevent system crashes',
      },
    ];

    // Sort strategies by priority
    this.strategies.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Start monitoring resource usage and applying optimizations
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkAndOptimize();
    }, intervalMs);

    console.log('Resource optimizer started monitoring');
  }

  /**
   * Stop monitoring resource usage
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    this.isMonitoring = false;
    console.log('Resource optimizer stopped monitoring');
  }

  /**
   * Check current performance and apply optimizations if needed
   */
  checkAndOptimize(): void {
    const metrics = globalPerformanceMonitor.getMetrics();
    
    // Generate alerts
    this.generateAlerts(metrics);
    
    // Apply optimization strategies
    this.applyOptimizations(metrics);
  }

  private generateAlerts(metrics: PerformanceMetrics): void {
    const alerts: ResourceAlert[] = [];

    // Memory alerts
    if (metrics.memoryUsage > 1800) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Critical memory usage: ${metrics.memoryUsage}MB (90% of 2GB limit)`,
        timestamp: Date.now(),
        metrics,
      });
    } else if (metrics.memoryUsage > 1536) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${metrics.memoryUsage}MB (75% of 2GB limit)`,
        timestamp: Date.now(),
        metrics,
      });
    } else if (metrics.memoryUsage > 1024) {
      alerts.push({
        type: 'memory',
        severity: 'medium',
        message: `Elevated memory usage: ${metrics.memoryUsage}MB (50% of 2GB limit)`,
        timestamp: Date.now(),
        metrics,
      });
    }

    // Frame rate alerts
    if (metrics.frameRate < 15) {
      alerts.push({
        type: 'framerate',
        severity: 'critical',
        message: `Critical frame rate: ${metrics.frameRate}fps (below 15fps)`,
        timestamp: Date.now(),
        metrics,
      });
    } else if (metrics.frameRate < 25) {
      alerts.push({
        type: 'framerate',
        severity: 'high',
        message: `Low frame rate: ${metrics.frameRate}fps (below 25fps)`,
        timestamp: Date.now(),
        metrics,
      });
    } else if (metrics.frameRate < 30) {
      alerts.push({
        type: 'framerate',
        severity: 'medium',
        message: `Suboptimal frame rate: ${metrics.frameRate}fps (below 30fps target)`,
        timestamp: Date.now(),
        metrics,
      });
    }

    // CPU alerts
    if (metrics.cpuUsage > 90) {
      alerts.push({
        type: 'cpu',
        severity: 'critical',
        message: `Critical CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics,
      });
    } else if (metrics.cpuUsage > 80) {
      alerts.push({
        type: 'cpu',
        severity: 'high',
        message: `High CPU usage: ${metrics.cpuUsage.toFixed(1)}%`,
        timestamp: Date.now(),
        metrics,
      });
    }

    // Network alerts
    if (metrics.networkLatency > 2000) {
      alerts.push({
        type: 'network',
        severity: 'high',
        message: `High network latency: ${metrics.networkLatency}ms`,
        timestamp: Date.now(),
        metrics,
      });
    }

    // Store and notify about new alerts
    alerts.forEach(alert => {
      this.alerts.push(alert);
      this.notifyAlert(alert);
    });

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  private applyOptimizations(metrics: PerformanceMetrics): void {
    for (const strategy of this.strategies) {
      if (strategy.condition(metrics)) {
        console.log(`Applying optimization strategy: ${strategy.name}`);
        try {
          strategy.action();
        } catch (error) {
          console.error(`Failed to apply optimization ${strategy.name}:`, error);
        }
      }
    }
  }

  private performMemoryCleanup(): void {
    // Clear performance entries
    if (typeof performance !== 'undefined' && performance.clearResourceTimings) {
      performance.clearResourceTimings();
    }

    // Dispatch memory cleanup event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('resource-optimizer:memory-cleanup', {
        detail: { timestamp: Date.now() }
      }));
    }

    // Force garbage collection if available (Chrome DevTools)
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as any).gc();
      } catch (error) {
        // Ignore if gc is not available
      }
    }
  }

  private reduceAnimationQuality(): void {
    // Dispatch animation quality reduction event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('resource-optimizer:reduce-animations', {
        detail: { 
          timestamp: Date.now(),
          reason: 'low-framerate'
        }
      }));
    }
  }

  private throttleUpdates(): void {
    // Dispatch update throttling event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('resource-optimizer:throttle-updates', {
        detail: { 
          timestamp: Date.now(),
          reason: 'high-cpu'
        }
      }));
    }
  }

  private optimizeNetworkRequests(): void {
    // Dispatch network optimization event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('resource-optimizer:optimize-network', {
        detail: { 
          timestamp: Date.now(),
          reason: 'high-latency'
        }
      }));
    }
  }

  private activateEmergencyMode(): void {
    console.warn('Activating emergency mode due to critical resource usage');
    
    // Dispatch emergency mode event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('resource-optimizer:emergency-mode', {
        detail: { 
          timestamp: Date.now(),
          reason: 'critical-memory'
        }
      }));
    }

    // Perform aggressive cleanup
    this.performMemoryCleanup();
    this.reduceAnimationQuality();
    this.throttleUpdates();
  }

  private notifyAlert(alert: ResourceAlert): void {
    console.warn(`Resource Alert [${alert.severity.toUpperCase()}]:`, alert.message);
    
    // Notify registered callbacks
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  /**
   * Register callback for resource alerts
   */
  onAlert(callback: (alert: ResourceAlert) => void): () => void {
    this.alertCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(count: number = 10): ResourceAlert[] {
    return this.alerts.slice(-count);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: ResourceAlert['severity']): ResourceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get current optimization status
   */
  getOptimizationStatus(): {
    isMonitoring: boolean;
    activeStrategies: string[];
    recentAlerts: ResourceAlert[];
    currentMetrics: PerformanceMetrics;
  } {
    const metrics = globalPerformanceMonitor.getMetrics();
    const activeStrategies = this.strategies
      .filter(strategy => strategy.condition(metrics))
      .map(strategy => strategy.name);

    return {
      isMonitoring: this.isMonitoring,
      activeStrategies,
      recentAlerts: this.getRecentAlerts(5),
      currentMetrics: metrics,
    };
  }
}

// Global resource optimizer instance
export const globalResourceOptimizer = new ResourceOptimizer();