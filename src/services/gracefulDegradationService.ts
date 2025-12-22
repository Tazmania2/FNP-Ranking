/**
 * Graceful Degradation Service for Raspberry Pi deployment
 * Implements resource-aware feature prioritization and automatic recovery
 */

export interface ResourceConstraints {
  memoryUsage: number; // Percentage (0-100)
  cpuUsage: number; // Percentage (0-100)
  networkLatency: number; // Milliseconds
  isLowPowerMode: boolean;
}

export interface FeaturePriority {
  level: 1 | 2 | 3 | 4; // 1 = Critical, 4 = Optional
  name: string;
  enabled: boolean;
  fallbackBehavior?: () => void;
}

export interface DegradationConfig {
  memoryThresholds: {
    warning: number; // 70%
    critical: number; // 85%
    emergency: number; // 95%
  };
  cpuThresholds: {
    warning: number; // 60%
    critical: number; // 80%
    emergency: number; // 95%
  };
  networkThresholds: {
    slow: number; // 1000ms
    verySlow: number; // 3000ms
    timeout: number; // 10000ms
  };
}

export class GracefulDegradationService {
  private config: DegradationConfig;
  private features: Map<string, FeaturePriority>;
  private currentConstraints: ResourceConstraints;
  private degradationLevel: 0 | 1 | 2 | 3 = 0; // 0 = Normal, 3 = Emergency
  private listeners: Set<(level: number) => void> = new Set();

  constructor(config?: Partial<DegradationConfig>) {
    this.config = {
      memoryThresholds: {
        warning: 70,
        critical: 85,
        emergency: 95
      },
      cpuThresholds: {
        warning: 60,
        critical: 80,
        emergency: 95
      },
      networkThresholds: {
        slow: 1000,
        verySlow: 3000,
        timeout: 10000
      },
      ...config
    };

    this.features = new Map();
    this.currentConstraints = {
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      isLowPowerMode: false
    };

    this.initializeFeatures();
  }

  private initializeFeatures(): void {
    // Priority Level 1: Core leaderboard display and basic navigation
    this.features.set('leaderboard-display', {
      level: 1,
      name: 'Leaderboard Display',
      enabled: true
    });

    this.features.set('basic-navigation', {
      level: 1,
      name: 'Basic Navigation',
      enabled: true
    });

    this.features.set('error-handling', {
      level: 1,
      name: 'Error Handling',
      enabled: true
    });

    // Priority Level 2: Real-time updates and animations
    this.features.set('real-time-updates', {
      level: 2,
      name: 'Real-time Updates',
      enabled: true,
      fallbackBehavior: () => this.enableManualRefresh()
    });

    this.features.set('basic-animations', {
      level: 2,
      name: 'Basic Animations',
      enabled: true,
      fallbackBehavior: () => this.disableAnimations()
    });

    // Priority Level 3: Advanced animations and visual effects
    this.features.set('chicken-race-animations', {
      level: 3,
      name: 'Chicken Race Animations',
      enabled: true,
      fallbackBehavior: () => this.useStaticPositions()
    });

    this.features.set('tooltips', {
      level: 3,
      name: 'Interactive Tooltips',
      enabled: true,
      fallbackBehavior: () => this.useStaticInfo()
    });

    this.features.set('auto-cycling', {
      level: 3,
      name: 'Auto-cycling Leaderboards',
      enabled: true,
      fallbackBehavior: () => this.disableAutoCycling()
    });

    // Priority Level 4: Non-essential UI enhancements
    this.features.set('visual-effects', {
      level: 4,
      name: 'Visual Effects',
      enabled: true,
      fallbackBehavior: () => this.disableVisualEffects()
    });

    this.features.set('advanced-tooltips', {
      level: 4,
      name: 'Advanced Tooltips',
      enabled: true,
      fallbackBehavior: () => this.simplifyTooltips()
    });
  }

  /**
   * Update current resource constraints and adjust features accordingly
   */
  public updateResourceConstraints(constraints: Partial<ResourceConstraints>): void {
    this.currentConstraints = { ...this.currentConstraints, ...constraints };
    this.evaluateDegradationLevel();
    this.adjustFeatures();
  }

  /**
   * Get current degradation level
   */
  public getDegradationLevel(): number {
    return this.degradationLevel;
  }

  /**
   * Check if a feature is currently enabled
   */
  public isFeatureEnabled(featureName: string): boolean {
    const feature = this.features.get(featureName);
    return feature ? feature.enabled : false;
  }

  /**
   * Get all features with their current status
   */
  public getFeatureStatus(): Record<string, FeaturePriority> {
    const status: Record<string, FeaturePriority> = {};
    this.features.forEach((feature, name) => {
      status[name] = { ...feature };
    });
    return status;
  }

  /**
   * Add a listener for degradation level changes
   */
  public onDegradationChange(listener: (level: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Force a specific degradation level (for testing)
   */
  public forceDegradationLevel(level: 0 | 1 | 2 | 3): void {
    this.degradationLevel = level;
    this.adjustFeatures();
    this.notifyListeners();
  }

  /**
   * Get current resource usage summary
   */
  public getResourceSummary(): {
    constraints: ResourceConstraints;
    degradationLevel: number;
    disabledFeatures: string[];
    recommendations: string[];
  } {
    const disabledFeatures: string[] = [];
    this.features.forEach((feature, name) => {
      if (!feature.enabled) {
        disabledFeatures.push(name);
      }
    });

    const recommendations = this.generateRecommendations();

    return {
      constraints: { ...this.currentConstraints },
      degradationLevel: this.degradationLevel,
      disabledFeatures,
      recommendations
    };
  }

  private evaluateDegradationLevel(): void {
    const { memoryUsage, cpuUsage, networkLatency, isLowPowerMode } = this.currentConstraints;
    const { memoryThresholds, cpuThresholds, networkThresholds } = this.config;

    let newLevel: 0 | 1 | 2 | 3 = 0;

    // Check emergency conditions
    if (
      memoryUsage >= memoryThresholds.emergency ||
      cpuUsage >= cpuThresholds.emergency ||
      isLowPowerMode
    ) {
      newLevel = 3;
    }
    // Check critical conditions
    else if (
      memoryUsage >= memoryThresholds.critical ||
      cpuUsage >= cpuThresholds.critical ||
      networkLatency >= networkThresholds.timeout
    ) {
      newLevel = 2;
    }
    // Check warning conditions
    else if (
      memoryUsage >= memoryThresholds.warning ||
      cpuUsage >= cpuThresholds.warning ||
      networkLatency >= networkThresholds.verySlow
    ) {
      newLevel = 1;
    }

    if (newLevel !== this.degradationLevel) {
      this.degradationLevel = newLevel;
      this.notifyListeners();
    }
  }

  private adjustFeatures(): void {
    this.features.forEach((feature, name) => {
      const shouldEnable = feature.level <= (4 - this.degradationLevel);
      
      if (feature.enabled && !shouldEnable) {
        // Disable feature and run fallback
        feature.enabled = false;
        if (feature.fallbackBehavior) {
          try {
            feature.fallbackBehavior();
          } catch (error) {
            console.warn(`Failed to execute fallback for ${name}:`, error);
          }
        }
      } else if (!feature.enabled && shouldEnable && this.degradationLevel < 2) {
        // Re-enable feature when conditions improve (but not in critical/emergency)
        feature.enabled = true;
      }
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.degradationLevel);
      } catch (error) {
        console.warn('Error in degradation listener:', error);
      }
    });
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const { memoryUsage, cpuUsage, networkLatency } = this.currentConstraints;

    if (memoryUsage > this.config.memoryThresholds.warning) {
      recommendations.push('Consider closing other applications to free memory');
    }

    if (cpuUsage > this.config.cpuThresholds.warning) {
      recommendations.push('System is under high CPU load - some features may be disabled');
    }

    if (networkLatency > this.config.networkThresholds.slow) {
      recommendations.push('Network connection is slow - real-time updates may be delayed');
    }

    if (this.degradationLevel > 0) {
      recommendations.push(`Performance mode active (level ${this.degradationLevel}) - some features disabled`);
    }

    return recommendations;
  }

  // Fallback behavior implementations
  private enableManualRefresh(): void {
    // Disable automatic polling, show manual refresh button
    console.log('Fallback: Enabled manual refresh mode');
  }

  private disableAnimations(): void {
    // Disable CSS animations and transitions
    console.log('Fallback: Disabled animations');
    document.documentElement.style.setProperty('--animation-duration', '0s');
  }

  private useStaticPositions(): void {
    // Show static leaderboard instead of animated chicken race
    console.log('Fallback: Using static leaderboard positions');
  }

  private useStaticInfo(): void {
    // Show player info inline instead of tooltips
    console.log('Fallback: Using static player information display');
  }

  private disableAutoCycling(): void {
    // Stop automatic leaderboard switching
    console.log('Fallback: Disabled auto-cycling leaderboards');
  }

  private disableVisualEffects(): void {
    // Remove visual enhancements like shadows, gradients
    console.log('Fallback: Disabled visual effects');
    document.documentElement.classList.add('reduced-effects');
  }

  private simplifyTooltips(): void {
    // Use basic tooltips instead of rich content
    console.log('Fallback: Simplified tooltips');
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.listeners.clear();
    this.features.clear();
  }
}