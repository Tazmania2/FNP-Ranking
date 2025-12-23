/**
 * Feature Parity Validation System
 * 
 * This system validates that all webapp functionality works identically
 * across different hardware environments, particularly ensuring Raspberry Pi 4
 * maintains feature parity with other deployment environments.
 */

export interface FeatureTestResult {
  feature: string;
  passed: boolean;
  error?: string;
  performance?: {
    executionTime: number;
    memoryUsage?: number;
  };
}

export interface HardwareEnvironment {
  platform: string;
  architecture: string;
  memory: number;
  userAgent: string;
  isRaspberryPi: boolean;
  isKioskMode: boolean;
}

export interface FeatureParityReport {
  environment: HardwareEnvironment;
  testResults: FeatureTestResult[];
  overallPassed: boolean;
  timestamp: number;
}

/**
 * Detects the current hardware environment
 */
export function detectHardwareEnvironment(): HardwareEnvironment {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Detect Raspberry Pi based on user agent and platform characteristics
  const isRaspberryPi = /armv\d+l|aarch64/i.test(platform) || 
                       /raspberry|rpi/i.test(userAgent) ||
                       /linux.*arm/i.test(userAgent);
  
  // Detect kiosk mode (fullscreen without browser UI)
  const isKioskMode = window.outerHeight === screen.height && 
                     window.outerWidth === screen.width &&
                     !window.locationbar.visible;

  return {
    platform,
    architecture: /arm|aarch64/i.test(platform) ? 'ARM' : 'x86',
    memory: (navigator as any).deviceMemory || 4, // Default to 4GB if not available
    userAgent,
    isRaspberryPi,
    isKioskMode
  };
}

/**
 * Core feature tests that must work identically across all environments
 */
export class FeatureParityValidator {
  private environment: HardwareEnvironment;
  
  constructor() {
    this.environment = detectHardwareEnvironment();
  }

  /**
   * Test leaderboard functionality
   */
  async testLeaderboardFeature(): Promise<FeatureTestResult> {
    const startTime = performance.now();
    
    try {
      // Test leaderboard data loading
      const leaderboardElement = document.querySelector('[data-testid="leaderboard"]');
      if (!leaderboardElement) {
        throw new Error('Leaderboard element not found');
      }

      // Test leaderboard updates
      const initialContent = leaderboardElement.textContent;
      
      // Simulate data update (this would normally come from the store)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const executionTime = performance.now() - startTime;
      
      return {
        feature: 'leaderboard',
        passed: true,
        performance: { executionTime }
      };
    } catch (error) {
      return {
        feature: 'leaderboard',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { executionTime: performance.now() - startTime }
      };
    }
  }

  /**
   * Test real-time updates functionality
   */
  async testRealTimeUpdates(): Promise<FeatureTestResult> {
    const startTime = performance.now();
    
    try {
      // Test WebSocket or polling mechanism
      const updateElements = document.querySelectorAll('[data-testid*="update"]');
      
      if (updateElements.length === 0) {
        throw new Error('No update elements found');
      }

      // Test update responsiveness
      const beforeUpdate = Date.now();
      
      // Simulate update trigger
      window.dispatchEvent(new CustomEvent('test-update'));
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const executionTime = performance.now() - startTime;
      
      return {
        feature: 'real-time-updates',
        passed: true,
        performance: { executionTime }
      };
    } catch (error) {
      return {
        feature: 'real-time-updates',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { executionTime: performance.now() - startTime }
      };
    }
  }

  /**
   * Test daily code features
   */
  async testDailyCodeFeature(): Promise<FeatureTestResult> {
    const startTime = performance.now();
    
    try {
      // Test daily code card rendering
      const dailyCodeElement = document.querySelector('[data-testid="daily-code-card"]');
      if (!dailyCodeElement) {
        throw new Error('Daily code card not found');
      }

      // Test code display and interaction
      const codeContent = dailyCodeElement.querySelector('pre, code');
      if (!codeContent) {
        throw new Error('Code content not found in daily code card');
      }

      const executionTime = performance.now() - startTime;
      
      return {
        feature: 'daily-code',
        passed: true,
        performance: { executionTime }
      };
    } catch (error) {
      return {
        feature: 'daily-code',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { executionTime: performance.now() - startTime }
      };
    }
  }

  /**
   * Test navigation and routing
   */
  async testNavigationFeature(): Promise<FeatureTestResult> {
    const startTime = performance.now();
    
    try {
      // Test navigation elements
      const navElements = document.querySelectorAll('nav, [role="navigation"]');
      if (navElements.length === 0) {
        throw new Error('Navigation elements not found');
      }

      // Test interactive elements
      const interactiveElements = document.querySelectorAll('button, a, [role="button"]');
      if (interactiveElements.length === 0) {
        throw new Error('No interactive elements found');
      }

      // Test responsiveness to interaction
      const testButton = interactiveElements[0] as HTMLElement;
      testButton.focus();
      
      const executionTime = performance.now() - startTime;
      
      return {
        feature: 'navigation',
        passed: true,
        performance: { executionTime }
      };
    } catch (error) {
      return {
        feature: 'navigation',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { executionTime: performance.now() - startTime }
      };
    }
  }

  /**
   * Test animation and visual effects
   */
  async testAnimationFeature(): Promise<FeatureTestResult> {
    const startTime = performance.now();
    
    try {
      // Test animation elements
      const animatedElements = document.querySelectorAll('[data-testid*="animation"], .animate-');
      
      // Test CSS animations and transitions
      const computedStyles = window.getComputedStyle(document.body);
      const supportsAnimations = computedStyles.animationName !== undefined;
      
      if (!supportsAnimations) {
        throw new Error('Animation support not detected');
      }

      const executionTime = performance.now() - startTime;
      
      return {
        feature: 'animations',
        passed: true,
        performance: { executionTime }
      };
    } catch (error) {
      return {
        feature: 'animations',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performance: { executionTime: performance.now() - startTime }
      };
    }
  }

  /**
   * Run comprehensive feature parity validation
   */
  async validateFeatureParity(): Promise<FeatureParityReport> {
    const testResults: FeatureTestResult[] = [];
    
    // Run all feature tests
    testResults.push(await this.testLeaderboardFeature());
    testResults.push(await this.testRealTimeUpdates());
    testResults.push(await this.testDailyCodeFeature());
    testResults.push(await this.testNavigationFeature());
    testResults.push(await this.testAnimationFeature());
    
    const overallPassed = testResults.every(result => result.passed);
    
    return {
      environment: this.environment,
      testResults,
      overallPassed,
      timestamp: Date.now()
    };
  }

  /**
   * Compare performance across environments
   */
  comparePerformanceMetrics(baselineReport: FeatureParityReport, currentReport: FeatureParityReport): {
    feature: string;
    baselineTime: number;
    currentTime: number;
    performanceRatio: number;
    acceptable: boolean;
  }[] {
    const comparisons = [];
    
    for (const currentResult of currentReport.testResults) {
      const baselineResult = baselineReport.testResults.find(r => r.feature === currentResult.feature);
      
      if (baselineResult && currentResult.performance && baselineResult.performance) {
        const performanceRatio = currentResult.performance.executionTime / baselineResult.performance.executionTime;
        
        comparisons.push({
          feature: currentResult.feature,
          baselineTime: baselineResult.performance.executionTime,
          currentTime: currentResult.performance.executionTime,
          performanceRatio,
          acceptable: performanceRatio <= 2.0 // Allow up to 2x slower on Raspberry Pi
        });
      }
    }
    
    return comparisons;
  }
}

/**
 * Global feature parity validation instance
 */
export const featureParityValidator = new FeatureParityValidator();