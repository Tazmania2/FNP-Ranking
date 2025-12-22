/**
 * Frame rate monitoring and automatic quality adjustment
 * Optimized for Raspberry Pi 4 performance management
 */

export interface FrameRateMetrics {
  currentFPS: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameDrops: number;
  isStable: boolean;
  qualityLevel: 'high' | 'medium' | 'low';
}

export interface QualitySettings {
  animationComplexity: number; // 1-10
  enableShadows: boolean;
  enableFilters: boolean;
  enableTransitions: boolean;
  maxAnimations: number;
  targetFPS: number;
}

/**
 * Frame rate monitor with automatic quality adjustment
 */
export class FrameRateMonitor {
  private frameCount = 0;
  private lastFrameTime = 0;
  private frameHistory: number[] = [];
  private isMonitoring = false;
  private animationId: number | null = null;
  private qualitySettings: QualitySettings;
  private callbacks: Array<(metrics: FrameRateMetrics) => void> = [];
  private performanceObserver: PerformanceObserver | null = null;

  // Configuration
  private readonly maxHistorySize = 60; // Keep 60 frames of history
  private readonly targetFPS = 30; // Target 30 FPS for Raspberry Pi
  private readonly minStableFPS = 25; // Minimum for stable performance
  private readonly qualityAdjustmentThreshold = 5; // Frames below target before adjustment

  constructor(initialQuality: Partial<QualitySettings> = {}) {
    this.qualitySettings = {
      animationComplexity: 5,
      enableShadows: true,
      enableFilters: true,
      enableTransitions: true,
      maxAnimations: 10,
      targetFPS: this.targetFPS,
      ...initialQuality
    };

    this.initializePerformanceObserver();
  }

  private initializePerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure' && entry.name.includes('frame')) {
            // Track frame timing from performance measures
            const fps = entry.duration > 0 ? 1000 / entry.duration : 0;
            this.recordFrame(fps);
          }
        });
      });

      this.performanceObserver.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('Performance observer initialization failed:', error);
    }
  }

  /**
   * Start monitoring frame rate
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.frameHistory = [];

    this.monitorFrame();
  }

  /**
   * Stop monitoring frame rate
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }

  private monitorFrame = (timestamp: number = performance.now()): void => {
    if (!this.isMonitoring) return;

    if (this.lastFrameTime > 0) {
      const deltaTime = timestamp - this.lastFrameTime;
      const fps = deltaTime > 0 ? 1000 / deltaTime : 0;
      
      this.recordFrame(fps);
    }

    this.lastFrameTime = timestamp;
    this.frameCount++;

    // Continue monitoring
    this.animationId = requestAnimationFrame(this.monitorFrame);
  };

  private recordFrame(fps: number): void {
    // Add to history
    this.frameHistory.push(fps);
    
    // Maintain history size
    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory.shift();
    }

    // Check if quality adjustment is needed
    this.checkQualityAdjustment();

    // Notify callbacks
    const metrics = this.getMetrics();
    this.callbacks.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.warn('Frame rate callback error:', error);
      }
    });
  }

  private checkQualityAdjustment(): void {
    if (this.frameHistory.length < 10) return; // Need some history

    const recentFrames = this.frameHistory.slice(-10);
    const belowTargetCount = recentFrames.filter(fps => fps < this.targetFPS).length;
    const averageRecent = recentFrames.reduce((sum, fps) => sum + fps, 0) / recentFrames.length;

    // Reduce quality if performance is poor
    if (belowTargetCount >= this.qualityAdjustmentThreshold || averageRecent < this.minStableFPS) {
      this.reduceQuality();
    }
    // Increase quality if performance is consistently good
    else if (belowTargetCount === 0 && averageRecent > this.targetFPS + 5) {
      this.increaseQuality();
    }
  }

  private reduceQuality(): void {
    let adjusted = false;

    // Reduce animation complexity
    if (this.qualitySettings.animationComplexity > 1) {
      this.qualitySettings.animationComplexity--;
      adjusted = true;
    }

    // Disable filters
    if (this.qualitySettings.enableFilters) {
      this.qualitySettings.enableFilters = false;
      adjusted = true;
    }

    // Disable shadows
    if (this.qualitySettings.enableShadows) {
      this.qualitySettings.enableShadows = false;
      adjusted = true;
    }

    // Reduce max animations
    if (this.qualitySettings.maxAnimations > 3) {
      this.qualitySettings.maxAnimations = Math.max(3, this.qualitySettings.maxAnimations - 2);
      adjusted = true;
    }

    // Disable transitions as last resort
    if (this.qualitySettings.enableTransitions && this.qualitySettings.animationComplexity <= 2) {
      this.qualitySettings.enableTransitions = false;
      adjusted = true;
    }

    if (adjusted) {
      console.log('Quality reduced due to poor performance:', this.qualitySettings);
      this.dispatchQualityChange();
    }
  }

  private increaseQuality(): void {
    let adjusted = false;

    // Increase animation complexity (conservatively)
    if (this.qualitySettings.animationComplexity < 7) {
      this.qualitySettings.animationComplexity++;
      adjusted = true;
    }

    // Re-enable transitions
    if (!this.qualitySettings.enableTransitions && this.qualitySettings.animationComplexity >= 3) {
      this.qualitySettings.enableTransitions = true;
      adjusted = true;
    }

    // Re-enable shadows (conservatively)
    if (!this.qualitySettings.enableShadows && this.qualitySettings.animationComplexity >= 5) {
      this.qualitySettings.enableShadows = true;
      adjusted = true;
    }

    // Increase max animations
    if (this.qualitySettings.maxAnimations < 15) {
      this.qualitySettings.maxAnimations = Math.min(15, this.qualitySettings.maxAnimations + 1);
      adjusted = true;
    }

    // Re-enable filters (very conservatively)
    if (!this.qualitySettings.enableFilters && this.qualitySettings.animationComplexity >= 6) {
      this.qualitySettings.enableFilters = true;
      adjusted = true;
    }

    if (adjusted) {
      console.log('Quality increased due to good performance:', this.qualitySettings);
      this.dispatchQualityChange();
    }
  }

  private dispatchQualityChange(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('frameRate:qualityChange', {
        detail: { qualitySettings: this.qualitySettings }
      }));
    }
  }

  /**
   * Get current frame rate metrics
   */
  getMetrics(): FrameRateMetrics {
    if (this.frameHistory.length === 0) {
      return {
        currentFPS: 0,
        averageFPS: 0,
        minFPS: 0,
        maxFPS: 0,
        frameDrops: 0,
        isStable: false,
        qualityLevel: 'medium'
      };
    }

    const currentFPS = this.frameHistory[this.frameHistory.length - 1] || 0;
    const averageFPS = this.frameHistory.reduce((sum, fps) => sum + fps, 0) / this.frameHistory.length;
    const minFPS = Math.min(...this.frameHistory);
    const maxFPS = Math.max(...this.frameHistory);
    const frameDrops = this.frameHistory.filter(fps => fps < this.targetFPS * 0.8).length;
    const isStable = frameDrops < this.frameHistory.length * 0.1; // Less than 10% drops

    // Determine quality level
    let qualityLevel: 'high' | 'medium' | 'low' = 'medium';
    if (averageFPS >= this.targetFPS && isStable) {
      qualityLevel = 'high';
    } else if (averageFPS < this.minStableFPS || !isStable) {
      qualityLevel = 'low';
    }

    return {
      currentFPS,
      averageFPS,
      minFPS,
      maxFPS,
      frameDrops,
      isStable,
      qualityLevel
    };
  }

  /**
   * Get current quality settings
   */
  getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }

  /**
   * Manually set quality settings
   */
  setQualitySettings(settings: Partial<QualitySettings>): void {
    this.qualitySettings = { ...this.qualitySettings, ...settings };
    this.dispatchQualityChange();
  }

  /**
   * Add callback for frame rate updates
   */
  onMetricsUpdate(callback: (metrics: FrameRateMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Force a quality adjustment based on external performance data
   */
  adjustQualityForPerformance(performanceScore: number): void {
    if (performanceScore < 30) {
      // Poor performance - reduce quality significantly
      this.qualitySettings.animationComplexity = Math.max(1, this.qualitySettings.animationComplexity - 2);
      this.qualitySettings.enableFilters = false;
      this.qualitySettings.enableShadows = false;
      this.qualitySettings.maxAnimations = Math.max(3, this.qualitySettings.maxAnimations - 3);
    } else if (performanceScore > 80) {
      // Good performance - allow higher quality
      this.qualitySettings.animationComplexity = Math.min(8, this.qualitySettings.animationComplexity + 1);
      this.qualitySettings.maxAnimations = Math.min(15, this.qualitySettings.maxAnimations + 2);
    }

    this.dispatchQualityChange();
  }

  /**
   * Reset to default quality settings
   */
  resetQuality(): void {
    this.qualitySettings = {
      animationComplexity: 5,
      enableShadows: true,
      enableFilters: true,
      enableTransitions: true,
      maxAnimations: 10,
      targetFPS: this.targetFPS
    };
    this.dispatchQualityChange();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.callbacks = [];
  }
}

// Global frame rate monitor instance
export const globalFrameRateMonitor = new FrameRateMonitor({
  // Conservative settings for Raspberry Pi 4
  animationComplexity: 4,
  enableShadows: false,
  enableFilters: false,
  enableTransitions: true,
  maxAnimations: 8,
  targetFPS: 30
});