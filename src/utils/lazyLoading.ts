/**
 * Lazy loading utilities for Raspberry Pi optimization
 * Implements intelligent preloading strategies and component lazy loading
 */

import { lazy, ComponentType, LazyExoticComponent } from 'react';

export interface LazyLoadOptions {
  /**
   * Delay before starting to load the component (in ms)
   * Useful for components that are not immediately visible
   */
  delay?: number;
  
  /**
   * Whether to preload the component on hover/focus
   */
  preloadOnHover?: boolean;
  
  /**
   * Whether to preload the component when it's likely to be needed
   */
  preloadOnIdle?: boolean;
  
  /**
   * Fallback component to show while loading
   */
  fallback?: ComponentType;
  
  /**
   * Error boundary component for failed loads
   */
  errorBoundary?: ComponentType<{ error: Error; retry: () => void }>;
}

/**
 * Enhanced lazy loading with intelligent preloading for Raspberry Pi
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const {
    delay = 0,
    preloadOnHover = false,
    preloadOnIdle = false,
  } = options;

  // Create the lazy component
  const LazyComponent = lazy(() => {
    if (delay > 0) {
      return new Promise<{ default: T }>(resolve => {
        setTimeout(() => {
          importFn().then(resolve);
        }, delay);
      });
    }
    return importFn();
  });

  // Set up preloading strategies
  if (preloadOnHover || preloadOnIdle) {
    setupPreloading(importFn, { preloadOnHover, preloadOnIdle });
  }

  return LazyComponent;
}

/**
 * Set up intelligent preloading strategies
 */
function setupPreloading(
  importFn: () => Promise<any>,
  options: { preloadOnHover?: boolean; preloadOnIdle?: boolean }
) {
  let isPreloaded = false;
  
  const preload = () => {
    if (!isPreloaded) {
      isPreloaded = true;
      importFn().catch(() => {
        // Reset on error so we can retry
        isPreloaded = false;
      });
    }
  };

  // Preload on hover for interactive elements
  if (options.preloadOnHover && typeof window !== 'undefined') {
    // Add hover listeners to likely trigger elements
    const addHoverListeners = () => {
      const triggers = document.querySelectorAll('[data-preload-on-hover]');
      triggers.forEach(trigger => {
        trigger.addEventListener('mouseenter', preload, { once: true });
        trigger.addEventListener('focus', preload, { once: true });
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addHoverListeners);
    } else {
      addHoverListeners();
    }
  }

  // Preload when browser is idle
  if (options.preloadOnIdle && typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(preload, { timeout: 5000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(preload, 2000);
    }
  }
}

/**
 * Preload strategy manager for Raspberry Pi optimization
 */
export class PreloadManager {
  private preloadQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxConcurrent = 2; // Limit concurrent preloads for Raspberry Pi

  /**
   * Add a component to the preload queue
   */
  addToQueue(importFn: () => Promise<any>, priority: 'high' | 'medium' | 'low' = 'medium') {
    if (priority === 'high') {
      this.preloadQueue.unshift(importFn);
    } else {
      this.preloadQueue.push(importFn);
    }
    
    this.processQueue();
  }

  /**
   * Process the preload queue with concurrency control
   */
  private async processQueue() {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const concurrent: Promise<any>[] = [];

    while (this.preloadQueue.length > 0 && concurrent.length < this.maxConcurrent) {
      const importFn = this.preloadQueue.shift();
      if (importFn) {
        const promise = importFn().catch(error => {
          console.warn('Preload failed:', error);
        });
        concurrent.push(promise);
      }
    }

    if (concurrent.length > 0) {
      await Promise.allSettled(concurrent);
      
      // Continue processing if there are more items
      if (this.preloadQueue.length > 0) {
        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, 100); // Small delay to prevent overwhelming the system
      } else {
        this.isProcessing = false;
      }
    } else {
      this.isProcessing = false;
    }
  }

  /**
   * Preload components based on route or user behavior
   */
  preloadForRoute(route: string) {
    const routePreloadMap: Record<string, Array<() => Promise<any>>> = {
      '/': [
        // Preload likely next components for home page
        () => import('../components/DetailedRanking'),
        () => import('../components/ChickenRace'),
      ],
      '/detailed': [
        // Preload components for detailed view
        () => import('../components/DailyCodeCard'),
        () => import('../components/Sidebar'),
      ],
    };

    const preloads = routePreloadMap[route];
    if (preloads) {
      preloads.forEach(importFn => {
        this.addToQueue(importFn, 'medium');
      });
    }
  }

  /**
   * Adaptive preloading based on device capabilities
   */
  adaptivePreload() {
    if (typeof window === 'undefined') return;

    // Check device capabilities
    const connection = (navigator as any).connection;
    const isSlowConnection = connection && (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.saveData
    );

    // Check memory constraints
    const memory = (performance as any).memory;
    const isLowMemory = memory && memory.usedJSHeapSize > 1024 * 1024 * 1024; // 1GB

    // Adjust preloading strategy based on constraints
    if (isSlowConnection || isLowMemory) {
      this.maxConcurrent = 1; // Reduce concurrent preloads
      console.log('Adaptive preloading: Reduced concurrency due to constraints');
    } else {
      this.maxConcurrent = 2; // Default concurrency
    }
  }
}

// Global preload manager instance
export const globalPreloadManager = new PreloadManager();

/**
 * Hook for component-level preloading control
 */
export function usePreload() {
  return {
    preload: (importFn: () => Promise<any>, priority?: 'high' | 'medium' | 'low') => {
      globalPreloadManager.addToQueue(importFn, priority);
    },
    preloadForRoute: (route: string) => {
      globalPreloadManager.preloadForRoute(route);
    },
  };
}

/**
 * Utility to create lazy-loaded components with optimized loading
 */
export const lazyComponents = {
  // Race components (can be lazy loaded)
  ChickenRace: createLazyComponent(
    () => import('../components/ChickenRace').then(module => ({ default: module.ChickenRace })),
    { preloadOnIdle: true, delay: 100 }
  ),
  
  ChickenRaceFullscreen: createLazyComponent(
    () => import('../components/ChickenRaceFullscreen').then(module => ({ default: module.ChickenRaceFullscreen })),
    { preloadOnHover: true }
  ),

  // Ranking components (can be lazy loaded)
  DetailedRanking: createLazyComponent(
    () => import('../components/DetailedRanking').then(module => ({ default: module.DetailedRanking })),
    { preloadOnIdle: true }
  ),

  LazyDetailedRanking: createLazyComponent(
    () => import('../components/LazyDetailedRanking').then(module => ({ default: module.LazyDetailedRanking })),
    { preloadOnHover: true }
  ),

  // Daily components (can be lazy loaded)
  DailyCodeCard: createLazyComponent(
    () => import('../components/DailyCodeCard').then(module => ({ default: module.DailyCodeCard })),
    { preloadOnIdle: true, delay: 200 }
  ),

  DailyGoalProgress: createLazyComponent(
    () => import('../components/DailyGoalProgress').then(module => ({ default: module.DailyGoalProgress })),
    { preloadOnIdle: true, delay: 300 }
  ),

  // Navigation components (preload on hover)
  Sidebar: createLazyComponent(
    () => import('../components/Sidebar').then(module => ({ default: module.Sidebar })),
    { preloadOnHover: true }
  ),

  LeaderboardSelector: createLazyComponent(
    () => import('../components/LeaderboardSelector').then(module => ({ default: module.LeaderboardSelector })),
    { preloadOnHover: true }
  ),

  // Tooltip components (preload on hover)
  Tooltip: createLazyComponent(
    () => import('../components/Tooltip').then(module => ({ default: module.Tooltip })),
    { preloadOnHover: true, delay: 50 }
  ),

  HoverTooltip: createLazyComponent(
    () => import('../components/HoverTooltip').then(module => ({ default: module.HoverTooltip })),
    { preloadOnHover: true, delay: 50 }
  ),
};

/**
 * Initialize adaptive preloading based on device capabilities
 */
export function initializeAdaptivePreloading() {
  if (typeof window !== 'undefined') {
    // Set up adaptive preloading
    globalPreloadManager.adaptivePreload();
    
    // Re-evaluate on network changes
    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', () => {
        globalPreloadManager.adaptivePreload();
      });
    }
    
    // Re-evaluate on memory pressure
    if ('memory' in performance) {
      setInterval(() => {
        globalPreloadManager.adaptivePreload();
      }, 30000); // Check every 30 seconds
    }
  }
}