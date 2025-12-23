/**
 * Intelligent preloading service for Raspberry Pi optimization
 * Manages resource preloading based on user behavior and system constraints
 */

import { globalPreloadManager } from '../utils/lazyLoading';
import { globalPerformanceMonitor } from '../utils/performanceMonitor';
import { globalResourceOptimizer } from '../utils/resourceOptimizer';

export interface PreloadStrategy {
  name: string;
  condition: () => boolean;
  preloadFn: () => Promise<void>;
  priority: 'high' | 'medium' | 'low';
  delay?: number;
}

export class PreloadingService {
  private strategies: PreloadStrategy[] = [];
  private isInitialized = false;
  private preloadedResources = new Set<string>();

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize preloading strategies for the application
   */
  private initializeStrategies() {
    this.strategies = [
      // Critical components - preload immediately
      {
        name: 'critical-ui',
        condition: () => true,
        preloadFn: async () => {
          await Promise.all([
            import('../components/ErrorDisplay'),
            import('../components/LoadingDisplay'),
            import('../components/LoadingSkeleton'),
          ]);
        },
        priority: 'high',
      },

      // Race components - preload when performance is good
      {
        name: 'race-components',
        condition: () => {
          const metrics = globalPerformanceMonitor.getMetrics();
          return metrics.memoryUsage < 1024 && metrics.frameRate > 45; // Good performance
        },
        preloadFn: async () => {
          await Promise.all([
            import('../components/ChickenRace'),
            import('../components/Tooltip'),
            import('../components/HoverTooltip'),
          ]);
        },
        priority: 'medium',
        delay: 1000,
      },

      // Ranking components - preload on idle
      {
        name: 'ranking-components',
        condition: () => {
          const metrics = globalPerformanceMonitor.getMetrics();
          return metrics.memoryUsage < 1536 && metrics.cpuUsage < 70; // Moderate performance
        },
        preloadFn: async () => {
          await Promise.all([
            import('../components/DetailedRanking'),
            import('../components/LazyDetailedRanking'),
          ]);
        },
        priority: 'medium',
        delay: 2000,
      },

      // Navigation components - preload on user interaction hints
      {
        name: 'navigation-components',
        condition: () => {
          const metrics = globalPerformanceMonitor.getMetrics();
          return metrics.memoryUsage < 1536; // Only if memory allows
        },
        preloadFn: async () => {
          await Promise.all([
            import('../components/Sidebar'),
            import('../components/LeaderboardSelector'),
          ]);
        },
        priority: 'low',
        delay: 3000,
      },

      // Daily components - preload when system is idle
      {
        name: 'daily-components',
        condition: () => {
          const metrics = globalPerformanceMonitor.getMetrics();
          return metrics.memoryUsage < 1200 && metrics.cpuUsage < 50; // System is idle
        },
        preloadFn: async () => {
          await Promise.all([
            import('../components/DailyCodeCard'),
            import('../components/DailyGoalProgress'),
          ]);
        },
        priority: 'low',
        delay: 5000,
      },

      // Fullscreen components - preload only when resources are abundant
      {
        name: 'fullscreen-components',
        condition: () => {
          const metrics = globalPerformanceMonitor.getMetrics();
          return metrics.memoryUsage < 800 && metrics.frameRate > 50; // Excellent performance
        },
        preloadFn: async () => {
          await import('../components/ChickenRaceFullscreen');
        },
        priority: 'low',
        delay: 10000,
      },
    ];
  }

  /**
   * Initialize the preloading service
   */
  async initialize() {
    if (this.isInitialized) return;

    console.log('Initializing intelligent preloading service...');
    
    // Start with critical components
    await this.executeCriticalPreloads();
    
    // Set up adaptive preloading
    this.setupAdaptivePreloading();
    
    // Set up user behavior tracking
    this.setupUserBehaviorTracking();
    
    this.isInitialized = true;
    console.log('Preloading service initialized');
  }

  /**
   * Execute critical preloads immediately
   */
  private async executeCriticalPreloads() {
    const criticalStrategies = this.strategies.filter(s => s.priority === 'high');
    
    for (const strategy of criticalStrategies) {
      if (strategy.condition()) {
        try {
          await strategy.preloadFn();
          this.preloadedResources.add(strategy.name);
          console.log(`Preloaded critical resources: ${strategy.name}`);
        } catch (error) {
          console.warn(`Failed to preload critical resources: ${strategy.name}`, error);
        }
      }
    }
  }

  /**
   * Set up adaptive preloading based on system performance
   */
  private setupAdaptivePreloading() {
    const checkAndPreload = () => {
      const metrics = globalPerformanceMonitor.getMetrics();
      
      // Skip preloading if system is under stress
      if (metrics.memoryUsage > 1800 || metrics.cpuUsage > 90) {
        console.log('Skipping preloading due to system stress');
        return;
      }

      // Execute strategies based on conditions
      this.strategies.forEach(strategy => {
        if (this.preloadedResources.has(strategy.name)) return;
        
        if (strategy.condition()) {
          const delay = strategy.delay || 0;
          
          setTimeout(() => {
            globalPreloadManager.addToQueue(
              strategy.preloadFn,
              strategy.priority
            );
            this.preloadedResources.add(strategy.name);
            console.log(`Queued preload: ${strategy.name}`);
          }, delay);
        }
      });
    };

    // Check periodically
    setInterval(checkAndPreload, 5000); // Every 5 seconds
    
    // Check on performance changes
    globalResourceOptimizer.onAlert(() => {
      // Re-evaluate preloading strategies when performance changes
      setTimeout(checkAndPreload, 1000);
    });
  }

  /**
   * Set up user behavior tracking for predictive preloading
   */
  private setupUserBehaviorTracking() {
    if (typeof window === 'undefined') return;

    // Track mouse movements for hover predictions
    let hoverTimeout: NodeJS.Timeout;
    document.addEventListener('mousemove', (event) => {
      clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        this.predictivePreload(event.target as Element);
      }, 500);
    });

    // Track clicks for navigation predictions
    document.addEventListener('click', (event) => {
      this.handleUserInteraction(event.target as Element);
    });

    // Track scroll for content predictions
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.handleScrollBehavior();
      }, 200);
    });

    // Track visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handlePageVisible();
      }
    });
  }

  /**
   * Predictive preloading based on user hover behavior
   */
  private predictivePreload(element: Element | null) {
    if (!element) return;

    // Check if hovering over elements that might trigger navigation
    const isNavigationElement = element.closest('[data-navigation]') ||
                               element.closest('button') ||
                               element.closest('a') ||
                               element.closest('[role="button"]');

    if (isNavigationElement) {
      // Preload navigation components
      if (!this.preloadedResources.has('navigation-components')) {
        globalPreloadManager.addToQueue(
          () => import('../components/Sidebar'),
          'medium'
        );
      }
    }

    // Check if hovering over race-related elements
    const isRaceElement = element.closest('[data-race]') ||
                         element.closest('.chicken-race') ||
                         element.textContent?.toLowerCase().includes('race');

    if (isRaceElement) {
      // Preload race components
      if (!this.preloadedResources.has('race-components')) {
        globalPreloadManager.addToQueue(
          () => import('../components/ChickenRace'),
          'medium'
        );
      }
    }
  }

  /**
   * Handle user interactions for preloading
   */
  private handleUserInteraction(element: Element | null) {
    if (!element) return;

    // Track interaction patterns
    const interactionType = element.tagName.toLowerCase();
    
    switch (interactionType) {
      case 'button':
        // User is actively interacting, preload likely next components
        this.preloadForActiveUser();
        break;
      
      case 'a':
        // Navigation likely, preload navigation components
        this.preloadNavigationComponents();
        break;
      
      default:
        // General interaction, moderate preloading
        this.preloadMediumPriorityComponents();
        break;
    }
  }

  /**
   * Handle scroll behavior for content preloading
   */
  private handleScrollBehavior() {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // If user is scrolling down significantly, they're engaged
    const scrollPercentage = scrollPosition / (documentHeight - windowHeight);
    
    if (scrollPercentage > 0.3) {
      // User is engaged, preload more content
      this.preloadForEngagedUser();
    }
  }

  /**
   * Handle page becoming visible (tab focus)
   */
  private handlePageVisible() {
    // User returned to the page, refresh preloading strategies
    setTimeout(() => {
      this.setupAdaptivePreloading();
    }, 1000);
  }

  /**
   * Preload components for active users
   */
  private preloadForActiveUser() {
    const metrics = globalPerformanceMonitor.getMetrics();
    
    if (metrics.memoryUsage < 1400) {
      globalPreloadManager.addToQueue(
        () => import('../components/DetailedRanking'),
        'high'
      );
      
      globalPreloadManager.addToQueue(
        () => import('../components/ChickenRace'),
        'high'
      );
    }
  }

  /**
   * Preload navigation components
   */
  private preloadNavigationComponents() {
    globalPreloadManager.addToQueue(
      () => import('../components/Sidebar'),
      'high'
    );
    
    globalPreloadManager.addToQueue(
      () => import('../components/LeaderboardSelector'),
      'medium'
    );
  }

  /**
   * Preload medium priority components
   */
  private preloadMediumPriorityComponents() {
    const metrics = globalPerformanceMonitor.getMetrics();
    
    if (metrics.memoryUsage < 1200 && metrics.cpuUsage < 60) {
      globalPreloadManager.addToQueue(
        () => import('../components/DailyCodeCard'),
        'medium'
      );
    }
  }

  /**
   * Preload components for engaged users
   */
  private preloadForEngagedUser() {
    const metrics = globalPerformanceMonitor.getMetrics();
    
    if (metrics.memoryUsage < 1000) {
      // User is engaged and system has resources
      globalPreloadManager.addToQueue(
        () => import('../components/ChickenRaceFullscreen'),
        'low'
      );
      
      globalPreloadManager.addToQueue(
        () => import('../components/DailyGoalProgress'),
        'low'
      );
    }
  }

  /**
   * Get preloading status for debugging
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      preloadedResources: Array.from(this.preloadedResources),
      strategiesCount: this.strategies.length,
      queueStatus: globalPreloadManager,
    };
  }

  /**
   * Force preload specific components (for testing)
   */
  forcePreload(componentNames: string[]) {
    const componentMap: Record<string, () => Promise<any>> = {
      'ChickenRace': () => import('../components/ChickenRace'),
      'DetailedRanking': () => import('../components/DetailedRanking'),
      'Sidebar': () => import('../components/Sidebar'),
      'DailyCodeCard': () => import('../components/DailyCodeCard'),
      'Tooltip': () => import('../components/Tooltip'),
    };

    componentNames.forEach(name => {
      const importFn = componentMap[name];
      if (importFn) {
        globalPreloadManager.addToQueue(importFn, 'high');
        this.preloadedResources.add(name);
      }
    });
  }
}

// Global preloading service instance
export const globalPreloadingService = new PreloadingService();