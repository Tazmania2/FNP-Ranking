/**
 * Feature Parity Service
 * 
 * Provides integration of feature parity validation into the application
 * for automated testing and monitoring of cross-platform compatibility.
 */

import { featureParityValidator, type FeatureParityReport } from '../utils/featureParityValidator';

export interface FeatureParityConfig {
  enableAutoValidation: boolean;
  validationInterval: number; // in milliseconds
  performanceThreshold: number; // maximum acceptable performance ratio
  reportingEnabled: boolean;
}

export class FeatureParityService {
  private config: FeatureParityConfig;
  private validationTimer?: NodeJS.Timeout;
  private lastReport?: FeatureParityReport;

  constructor(config: Partial<FeatureParityConfig> = {}) {
    this.config = {
      enableAutoValidation: false,
      validationInterval: 300000, // 5 minutes
      performanceThreshold: 2.0,
      reportingEnabled: true,
      ...config
    };
  }

  /**
   * Start automatic feature parity validation
   */
  startAutoValidation(): void {
    if (!this.config.enableAutoValidation) {
      return;
    }

    this.stopAutoValidation(); // Clear any existing timer

    this.validationTimer = setInterval(async () => {
      try {
        await this.runValidation();
      } catch (error) {
        console.warn('Feature parity validation failed:', error);
      }
    }, this.config.validationInterval);

    // Run initial validation
    this.runValidation().catch(error => {
      console.warn('Initial feature parity validation failed:', error);
    });
  }

  /**
   * Stop automatic feature parity validation
   */
  stopAutoValidation(): void {
    if (this.validationTimer) {
      clearInterval(this.validationTimer);
      this.validationTimer = undefined;
    }
  }

  /**
   * Run feature parity validation manually
   */
  async runValidation(): Promise<FeatureParityReport> {
    const report = await featureParityValidator.validateFeatureParity();
    this.lastReport = report;

    if (this.config.reportingEnabled) {
      this.logValidationResults(report);
    }

    // Check for performance issues
    this.checkPerformanceThresholds(report);

    return report;
  }

  /**
   * Get the last validation report
   */
  getLastReport(): FeatureParityReport | undefined {
    return this.lastReport;
  }

  /**
   * Check if the current environment is performing within acceptable limits
   */
  isPerformanceAcceptable(): boolean {
    if (!this.lastReport) {
      return true; // No data available, assume acceptable
    }

    return this.lastReport.testResults.every(result => {
      if (!result.performance) return true;
      
      // Check if execution time is reasonable (< 5 seconds for any feature)
      return result.performance.executionTime < 5000;
    });
  }

  /**
   * Get performance recommendations based on current environment
   */
  getPerformanceRecommendations(): string[] {
    if (!this.lastReport) {
      return [];
    }

    const recommendations: string[] = [];
    const env = this.lastReport.environment;

    if (env.isRaspberryPi) {
      recommendations.push('Running on Raspberry Pi - consider enabling performance optimizations');
      
      if (env.memory <= 4) {
        recommendations.push('Limited memory detected - enable memory optimization features');
      }
    }

    if (env.isKioskMode) {
      recommendations.push('Kiosk mode detected - fullscreen optimizations are active');
    }

    // Check for slow features
    const slowFeatures = this.lastReport.testResults.filter(result => 
      result.performance && result.performance.executionTime > 2000
    );

    if (slowFeatures.length > 0) {
      recommendations.push(`Slow features detected: ${slowFeatures.map(f => f.feature).join(', ')}`);
    }

    return recommendations;
  }

  /**
   * Log validation results to console
   */
  private logValidationResults(report: FeatureParityReport): void {
    const { environment, testResults, overallPassed } = report;
    
    console.group('🔍 Feature Parity Validation Report');
    console.log('Environment:', {
      platform: environment.platform,
      isRaspberryPi: environment.isRaspberryPi,
      isKioskMode: environment.isKioskMode,
      memory: `${environment.memory}GB`
    });
    
    console.log(`Overall Status: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const time = result.performance ? `${result.performance.executionTime.toFixed(2)}ms` : 'N/A';
      console.log(`${status} ${result.feature}: ${time}${result.error ? ` - ${result.error}` : ''}`);
    });
    
    console.groupEnd();
  }

  /**
   * Check performance thresholds and warn if exceeded
   */
  private checkPerformanceThresholds(report: FeatureParityReport): void {
    const slowFeatures = report.testResults.filter(result => 
      result.performance && result.performance.executionTime > 3000
    );

    if (slowFeatures.length > 0) {
      console.warn('⚠️ Performance Warning: Some features are running slowly:', 
        slowFeatures.map(f => `${f.feature} (${f.performance!.executionTime.toFixed(2)}ms)`));
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FeatureParityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart auto validation if it was running
    if (this.validationTimer) {
      this.startAutoValidation();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): FeatureParityConfig {
    return { ...this.config };
  }
}

/**
 * Global feature parity service instance
 */
export const featureParityService = new FeatureParityService();

/**
 * Initialize feature parity monitoring for development
 */
export function initializeFeatureParityMonitoring(): void {
  // Only enable in development or when explicitly requested
  const isDevelopment = import.meta.env.DEV;
  const enableMonitoring = localStorage.getItem('enableFeatureParityMonitoring') === 'true';
  
  if (isDevelopment || enableMonitoring) {
    featureParityService.updateConfig({
      enableAutoValidation: true,
      validationInterval: 600000, // 10 minutes in development
      reportingEnabled: true
    });
    
    featureParityService.startAutoValidation();
    
    console.log('🔍 Feature parity monitoring enabled');
  }
}