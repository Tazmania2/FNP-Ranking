/**
 * Initialize Raspberry Pi optimizations on app startup
 * Automatically detects ARM architecture and applies appropriate optimizations
 */

import { globalPerformanceMonitor } from './performanceMonitor';
import { globalResourceOptimizer } from './resourceOptimizer';
import { globalRaspberryPiProfiler } from './raspberryPiProfiler';

export interface RaspberryPiOptimizationConfig {
  enableAutoOptimization: boolean;
  enablePerformanceMonitoring: boolean;
  enableResourceOptimization: boolean;
  enableARMSpecificOptimizations: boolean;
  monitoringInterval: number; // in milliseconds
  performanceThresholds: {
    maxMemoryUsage: number; // in MB
    minFrameRate: number; // FPS
    maxLoadTime: number; // in ms
    maxNetworkLatency: number; // in ms
  };
}

const DEFAULT_CONFIG: RaspberryPiOptimizationConfig = {
  enableAutoOptimization: true,
  enablePerformanceMonitoring: true,
  enableResourceOptimization: true,
  enableARMSpecificOptimizations: true,
  monitoringInterval: 5000, // 5 seconds
  performanceThresholds: {
    maxMemoryUsage: 1536, // 1.5GB for Raspberry Pi 4
    minFrameRate: 25, // Minimum acceptable FPS on ARM
    maxLoadTime: 10000, // 10 seconds max load time
    maxNetworkLatency: 1000, // 1 second max network latency
  },
};

export class RaspberryPiOptimizationManager {
  private config: RaspberryPiOptimizationConfig;
  private isInitialized = false;
  private isARMDevice = false;
  private optimizationListeners: (() => void)[] = [];

  constructor(config?: Partial<RaspberryPiOptimizationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detectARMArchitecture();
  }

  private detectARMArchitecture(): void {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform?.toLowerCase() || '';
    
    // Check for ARM indicators
    this.isARMDevice = 
      userAgent.includes('arm') ||
      userAgent.includes('aarch64') ||
      platform.includes('arm') ||
      platform.includes('linux') ||
      // Check for Raspberry Pi specific indicators
      userAgent.includes('raspbian') ||
      userAgent.includes('raspberry');

    console.log(`🔍 ARM device detection: ${this.isARMDevice ? 'ARM device detected' : 'Non-ARM device'}`);
  }

  /**
   * Initialize all Raspberry Pi optimizations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Raspberry Pi optimizations already initialized');
      return;
    }

    console.log('🚀 Initializing Raspberry Pi optimizations...');

    try {
      // Step 1: Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        await this.initializePerformanceMonitoring();
      }

      // Step 2: Initialize resource optimization
      if (this.config.enableResourceOptimization) {
        await this.initializeResourceOptimization();
      }

      // Step 3: Apply ARM-specific optimizations
      if (this.config.enableARMSpecificOptimizations && this.isARMDevice) {
        await this.initializeARMOptimizations();
      }

      // Step 4: Set up event listeners
      this.setupEventListeners();

      // Step 5: Start auto-optimization if enabled
      if (this.config.enableAutoOptimization) {
        this.startAutoOptimization();
      }

      this.isInitialized = true;
      console.log('✅ Raspberry Pi optimizations initialized successfully');

      // Run initial performance analysis
      if (this.isARMDevice) {
        setTimeout(() => this.runInitialAnalysis(), 2000);
      }

    } catch (error) {
      console.error('❌ Failed to initialize Raspberry Pi optimizations:', error);
      throw error;
    }
  }

  private async initializePerformanceMonitoring(): Promise<void> {
    console.log('📊 Initializing performance monitoring...');
    
    // Performance monitoring is automatically initialized with the global instance
    // Just verify it's working
    const metrics = globalPerformanceMonitor.getMetrics();
    console.log('Performance monitoring active:', {
      memoryUsage: `${metrics.memoryUsage}MB`,
      frameRate: `${metrics.frameRate}fps`,
      loadTime: `${metrics.loadTime}ms`,
    });
  }

  private async initializeResourceOptimization(): Promise<void> {
    console.log('🔧 Initializing resource optimization...');
    
    // Start resource monitoring with ARM-optimized interval
    const interval = this.isARMDevice ? this.config.monitoringInterval * 2 : this.config.monitoringInterval;
    globalResourceOptimizer.startMonitoring(interval);

    // Set up alert handling
    globalResourceOptimizer.onAlert((alert) => {
      console.warn(`Resource Alert [${alert.severity}]:`, alert.message);
      
      // Apply immediate optimizations for critical alerts
      if (alert.severity === 'critical') {
        this.applyEmergencyOptimizations();
      }
    });
  }

  private async initializeARMOptimizations(): Promise<void> {
    console.log('🔧 Applying ARM-specific optimizations...');

    // Apply CSS optimizations for ARM
    this.applyARMCSSOptimizations();

    // Optimize animation settings
    this.optimizeAnimationsForARM();

    // Set up hardware acceleration
    this.enableHardwareAcceleration();

    // Optimize network settings
    this.optimizeNetworkForARM();

    // Apply memory management optimizations
    this.optimizeMemoryManagement();
  }

  private applyARMCSSOptimizations(): void {
    // Add ARM-specific CSS optimizations
    const style = document.createElement('style');
    style.textContent = `
      /* ARM-specific optimizations */
      * {
        /* Optimize for ARM GPU */
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
        /* Reduce repaints on ARM */
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
      }
      
      /* Optimize animations for ARM */
      @media (prefers-reduced-motion: no-preference) {
        .chicken-race-animation {
          /* Use transform instead of position changes */
          will-change: transform;
          /* Enable hardware acceleration */
          transform: translateZ(0);
        }
      }
      
      /* ARM-specific responsive optimizations */
      @media screen and (max-width: 1920px) {
        body {
          /* Optimize font rendering for ARM */
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeSpeed;
        }
      }
      
      /* Reduce complexity for ARM devices */
      .complex-animation {
        animation-duration: 0.3s !important;
        animation-timing-function: ease-out !important;
      }
    `;
    document.head.appendChild(style);
  }

  private optimizeAnimationsForARM(): void {
    // Reduce animation complexity on ARM devices
    const reduceAnimations = () => {
      const animatedElements = document.querySelectorAll('[class*="animate"], [class*="transition"]');
      animatedElements.forEach(element => {
        const el = element as HTMLElement;
        el.style.animationDuration = '0.2s';
        el.style.transitionDuration = '0.2s';
      });
    };

    // Apply immediately and on DOM changes
    reduceAnimations();
    
    // Set up mutation observer for dynamic content
    const observer = new MutationObserver(reduceAnimations);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  private enableHardwareAcceleration(): void {
    // Enable hardware acceleration for key elements
    const accelerateElement = (selector: string) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const el = element as HTMLElement;
        el.style.willChange = 'transform';
        el.style.transform = 'translateZ(0)';
      });
    };

    // Apply to common animated elements
    setTimeout(() => {
      accelerateElement('.chicken-race-container');
      accelerateElement('.tooltip');
      accelerateElement('.ranking-item');
      accelerateElement('.progress-bar');
    }, 1000);
  }

  private optimizeNetworkForARM(): void {
    // Set up service worker for aggressive caching on ARM devices
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker registered for ARM optimization'))
        .catch(error => console.warn('Service Worker registration failed:', error));
    }

    // Optimize fetch requests for ARM
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const options = {
        ...init,
        // Add ARM-specific optimizations
        cache: 'force-cache',
        priority: 'low',
      };
      
      return originalFetch(input, options);
    };
  }

  private optimizeMemoryManagement(): void {
    // Set up aggressive garbage collection for ARM devices
    const performGC = () => {
      if ('gc' in window) {
        try {
          (window as any).gc();
        } catch (error) {
          // GC not available
        }
      }
      
      // Clear performance entries to free memory
      if (performance.clearResourceTimings) {
        performance.clearResourceTimings();
      }
    };

    // Perform GC every 30 seconds on ARM devices
    setInterval(performGC, 30000);

    // Perform GC on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        performGC();
      }
    });
  }

  private setupEventListeners(): void {
    // Listen for performance optimization events
    window.addEventListener('raspberry-pi:reduce-animations', () => {
      this.optimizeAnimationsForARM();
    });

    window.addEventListener('raspberry-pi:optimize-network', () => {
      this.optimizeNetworkForARM();
    });

    window.addEventListener('performance:memory-pressure', () => {
      this.applyEmergencyOptimizations();
    });

    window.addEventListener('performance:low-framerate', () => {
      this.optimizeAnimationsForARM();
    });
  }

  private startAutoOptimization(): void {
    console.log('🔄 Starting auto-optimization...');
    
    setInterval(() => {
      const metrics = globalPerformanceMonitor.getMetrics();
      
      // Check if optimizations are needed
      if (this.shouldOptimize(metrics)) {
        this.applyAutoOptimizations(metrics);
      }
    }, this.config.monitoringInterval);
  }

  private shouldOptimize(metrics: any): boolean {
    return (
      metrics.memoryUsage > this.config.performanceThresholds.maxMemoryUsage ||
      metrics.frameRate < this.config.performanceThresholds.minFrameRate ||
      metrics.loadTime > this.config.performanceThresholds.maxLoadTime ||
      metrics.networkLatency > this.config.performanceThresholds.maxNetworkLatency
    );
  }

  private applyAutoOptimizations(metrics: any): void {
    console.log('🔧 Applying auto-optimizations based on metrics:', metrics);
    
    if (metrics.memoryUsage > this.config.performanceThresholds.maxMemoryUsage) {
      this.optimizeMemoryManagement();
    }
    
    if (metrics.frameRate < this.config.performanceThresholds.minFrameRate) {
      this.optimizeAnimationsForARM();
    }
    
    if (metrics.networkLatency > this.config.performanceThresholds.maxNetworkLatency) {
      this.optimizeNetworkForARM();
    }
  }

  private applyEmergencyOptimizations(): void {
    console.warn('🚨 Applying emergency optimizations...');
    
    // Disable all animations
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    `;
    document.head.appendChild(style);
    
    // Force garbage collection
    this.optimizeMemoryManagement();
    
    // Reduce update frequency
    window.dispatchEvent(new CustomEvent('emergency-mode:reduce-updates'));
  }

  private async runInitialAnalysis(): Promise<void> {
    console.log('🔍 Running initial performance analysis...');
    
    try {
      const profile = await globalRaspberryPiProfiler.runComprehensiveAnalysis();
      const report = globalRaspberryPiProfiler.generatePerformanceReport();
      
      console.log('📊 Performance Analysis Complete');
      console.log('Hardware:', profile.hardware);
      console.log('Performance:', profile.performance);
      
      // Apply recommended optimizations
      if (profile.optimizations?.recommended.length > 0) {
        console.log('🔧 Applying recommended optimizations...');
        const results = await globalRaspberryPiProfiler.applyARMOptimizations();
        results.forEach(result => {
          if (result.success) {
            console.log(`✅ ${result.description}: ${result.improvement.toFixed(1)}% improvement`);
          } else {
            console.warn(`❌ ${result.description}`);
          }
        });
      }
      
      // Store report for debugging
      (window as any).__raspberryPiPerformanceReport = report;
      
    } catch (error) {
      console.error('❌ Initial analysis failed:', error);
    }
  }

  /**
   * Get current optimization status
   */
  getOptimizationStatus(): {
    isInitialized: boolean;
    isARMDevice: boolean;
    config: RaspberryPiOptimizationConfig;
    performanceMetrics: any;
  } {
    return {
      isInitialized: this.isInitialized,
      isARMDevice: this.isARMDevice,
      config: this.config,
      performanceMetrics: globalPerformanceMonitor.getMetrics(),
    };
  }

  /**
   * Manually trigger optimization analysis
   */
  async runOptimizationAnalysis(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Optimization manager not initialized');
    }
    
    await this.runInitialAnalysis();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    globalResourceOptimizer.stopMonitoring();
    globalPerformanceMonitor.destroy();
    this.optimizationListeners.forEach(cleanup => cleanup());
    this.isInitialized = false;
  }
}

// Global optimization manager instance
export const globalRaspberryPiOptimizationManager = new RaspberryPiOptimizationManager();

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      globalRaspberryPiOptimizationManager.initialize().catch(console.error);
    });
  } else {
    // DOM is already ready
    globalRaspberryPiOptimizationManager.initialize().catch(console.error);
  }
}