import type { DisplayConfig } from '../hooks/useResponsiveDesign';

export interface DisplayDimensions {
  width: number;
  height: number;
  diagonal?: number; // Screen diagonal in inches (if available)
}

export interface ResponsiveLayoutConfig {
  minTouchTargetSize: number;
  maxTouchTargetSize: number;
  baseFontSize: number;
  lineHeight: number;
  spacingUnit: number;
  borderRadius: number;
}

/**
 * Responsive Display Manager
 * Handles automatic display detection and configuration for kiosk deployment
 */
export class ResponsiveDisplayManager {
  private static instance: ResponsiveDisplayManager;
  private currentConfig: DisplayConfig | null = null;
  private layoutConfig: ResponsiveLayoutConfig;

  private constructor() {
    this.layoutConfig = {
      minTouchTargetSize: 44,  // WCAG minimum
      maxTouchTargetSize: 72,  // Maximum for very large displays
      baseFontSize: 16,
      lineHeight: 1.5,
      spacingUnit: 8,
      borderRadius: 8,
    };
  }

  public static getInstance(): ResponsiveDisplayManager {
    if (!ResponsiveDisplayManager.instance) {
      ResponsiveDisplayManager.instance = new ResponsiveDisplayManager();
    }
    return ResponsiveDisplayManager.instance;
  }

  /**
   * Automatically detect and configure display settings
   */
  public detectAndConfigure(): DisplayConfig {
    if (typeof window === 'undefined') {
      return this.getDefaultConfig();
    }

    const dimensions = this.getDisplayDimensions();
    const config = this.calculateOptimalConfig(dimensions);
    
    this.currentConfig = config;
    this.applyGlobalStyles(config);
    
    return config;
  }

  /**
   * Get current display dimensions
   */
  private getDisplayDimensions(): DisplayDimensions {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Try to estimate diagonal size based on pixel density and dimensions
    const pixelRatio = window.devicePixelRatio || 1;
    const physicalWidth = width / pixelRatio;
    const physicalHeight = height / pixelRatio;
    
    // Rough estimation of diagonal in inches (assuming ~96 DPI)
    const diagonal = Math.sqrt(
      Math.pow(physicalWidth / 96, 2) + Math.pow(physicalHeight / 96, 2)
    );

    return {
      width,
      height,
      diagonal: diagonal > 10 ? diagonal : undefined, // Only if reasonable estimate
    };
  }

  /**
   * Calculate optimal configuration based on display dimensions
   */
  private calculateOptimalConfig(dimensions: DisplayDimensions): DisplayConfig {
    const { width, height, diagonal } = dimensions;
    const pixelRatio = window.devicePixelRatio || 1;

    // Determine scale factor based on screen size
    let scaleFactor = 1.0;
    let layoutDensity: 'compact' | 'normal' | 'spacious' = 'normal';

    if (diagonal) {
      // Use diagonal size if available
      if (diagonal >= 40) {
        scaleFactor = 1.8;
        layoutDensity = 'spacious';
      } else if (diagonal >= 32) {
        scaleFactor = 1.5;
        layoutDensity = 'spacious';
      } else if (diagonal >= 24) {
        scaleFactor = 1.3;
        layoutDensity = 'normal';
      } else if (diagonal >= 16) {
        scaleFactor = 1.1;
        layoutDensity = 'normal';
      } else {
        scaleFactor = 1.0;
        layoutDensity = 'compact';
      }
    } else {
      // Fallback to width-based calculation
      if (width >= 2560) {
        scaleFactor = 1.8;
        layoutDensity = 'spacious';
      } else if (width >= 1920) {
        scaleFactor = 1.5;
        layoutDensity = 'spacious';
      } else if (width >= 1440) {
        scaleFactor = 1.3;
        layoutDensity = 'normal';
      } else if (width >= 1024) {
        scaleFactor = 1.1;
        layoutDensity = 'normal';
      } else {
        scaleFactor = 1.0;
        layoutDensity = 'compact';
      }
    }

    // Calculate touch target size
    const baseTouchSize = this.layoutConfig.minTouchTargetSize;
    const touchTargetSize = Math.min(
      Math.max(baseTouchSize * scaleFactor, this.layoutConfig.minTouchTargetSize),
      this.layoutConfig.maxTouchTargetSize
    );

    // Calculate font size
    const preferredFontSize = Math.round(this.layoutConfig.baseFontSize * scaleFactor);

    return {
      screenWidth: width,
      screenHeight: height,
      pixelDensity: pixelRatio,
      scaleFactor,
      touchEnabled: this.detectTouchCapability(),
      preferredFontSize,
      touchTargetSize,
      layoutDensity,
    };
  }

  /**
   * Apply global CSS custom properties for responsive design
   */
  private applyGlobalStyles(config: DisplayConfig): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    
    // Set CSS custom properties
    root.style.setProperty('--responsive-scale-factor', config.scaleFactor.toString());
    root.style.setProperty('--responsive-font-size', `${config.preferredFontSize}px`);
    root.style.setProperty('--responsive-touch-target', `${config.touchTargetSize}px`);
    root.style.setProperty('--responsive-spacing-unit', `${this.layoutConfig.spacingUnit * config.scaleFactor}px`);
    root.style.setProperty('--responsive-border-radius', `${this.layoutConfig.borderRadius * config.scaleFactor}px`);
    root.style.setProperty('--responsive-line-height', this.layoutConfig.lineHeight.toString());

    // Layout density specific properties
    const densityMultiplier = this.getDensityMultiplier(config.layoutDensity);
    root.style.setProperty('--responsive-density-multiplier', densityMultiplier.toString());
    root.style.setProperty('--responsive-padding', `${this.layoutConfig.spacingUnit * config.scaleFactor * densityMultiplier}px`);
    root.style.setProperty('--responsive-margin', `${this.layoutConfig.spacingUnit * config.scaleFactor * densityMultiplier}px`);

    // Touch-specific properties
    if (config.touchEnabled) {
      root.style.setProperty('--responsive-interaction-mode', 'touch');
      root.style.setProperty('--responsive-hover-delay', '0ms');
    } else {
      root.style.setProperty('--responsive-interaction-mode', 'mouse');
      root.style.setProperty('--responsive-hover-delay', '150ms');
    }

    // Add responsive class to body
    document.body.classList.add('responsive-display');
    document.body.classList.add(`layout-${config.layoutDensity}`);
    document.body.classList.add(`scale-${this.getScaleCategory(config.scaleFactor)}`);
    
    if (config.touchEnabled) {
      document.body.classList.add('touch-enabled');
    } else {
      document.body.classList.add('mouse-enabled');
    }
  }

  /**
   * Get density multiplier for spacing calculations
   */
  private getDensityMultiplier(density: 'compact' | 'normal' | 'spacious'): number {
    switch (density) {
      case 'compact': return 0.75;
      case 'spacious': return 1.5;
      default: return 1.0;
    }
  }

  /**
   * Get scale category for CSS classes
   */
  private getScaleCategory(scaleFactor: number): string {
    if (scaleFactor >= 1.6) return 'xxlarge';
    if (scaleFactor >= 1.4) return 'xlarge';
    if (scaleFactor >= 1.2) return 'large';
    if (scaleFactor >= 1.05) return 'medium';
    return 'small';
  }

  /**
   * Detect touch capability
   */
  private detectTouchCapability(): boolean {
    if (typeof window === 'undefined') return false;
    
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - Legacy support
      navigator.msMaxTouchPoints > 0
    );
  }

  /**
   * Get default configuration for SSR or fallback
   */
  private getDefaultConfig(): DisplayConfig {
    return {
      screenWidth: 1024,
      screenHeight: 768,
      pixelDensity: 1,
      scaleFactor: 1,
      touchEnabled: false,
      preferredFontSize: 16,
      touchTargetSize: 44,
      layoutDensity: 'normal',
    };
  }

  /**
   * Get current configuration
   */
  public getCurrentConfig(): DisplayConfig | null {
    return this.currentConfig;
  }

  /**
   * Update layout configuration
   */
  public updateLayoutConfig(config: Partial<ResponsiveLayoutConfig>): void {
    this.layoutConfig = { ...this.layoutConfig, ...config };
    
    // Re-apply configuration if we have a current config
    if (this.currentConfig) {
      const newConfig = this.calculateOptimalConfig(this.getDisplayDimensions());
      this.currentConfig = newConfig;
      this.applyGlobalStyles(newConfig);
    }
  }

  /**
   * Force recalculation and reapplication of responsive settings
   */
  public recalculate(): DisplayConfig {
    return this.detectAndConfigure();
  }
}

// Export singleton instance
export const globalDisplayManager = ResponsiveDisplayManager.getInstance();

// Utility functions for external use
export const adaptLayout = (dimensions: DisplayDimensions): DisplayConfig => {
  return globalDisplayManager.detectAndConfigure();
};

export const getCurrentDisplayConfig = (): DisplayConfig | null => {
  return globalDisplayManager.getCurrentConfig();
};

export const recalculateResponsiveLayout = (): DisplayConfig => {
  return globalDisplayManager.recalculate();
};