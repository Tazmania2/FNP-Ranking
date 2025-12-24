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
      maxTouchTargetSize: 120, // Increased maximum for very large displays
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
    
    // Improved estimation of diagonal in inches
    // Use different DPI assumptions based on display size
    let assumedDPI = 96; // Default for desktop monitors
    
    // For very high resolution displays, assume higher DPI (likely monitors)
    if (width >= 2560 && pixelRatio >= 2) {
      assumedDPI = 220; // High-DPI monitor (like Retina)
    } else if (width >= 2560 && pixelRatio >= 1.5) {
      assumedDPI = 150; // Medium high-DPI monitor
    } else if (width >= 1920 && pixelRatio === 1) {
      // Large resolution with low pixel ratio likely indicates TV
      assumedDPI = 72; // TV displays typically have lower DPI
    } else if (pixelRatio >= 1.5) {
      assumedDPI = 150; // High-DPI monitor
    }
    
    const diagonal = Math.sqrt(
      Math.pow(physicalWidth / assumedDPI, 2) + Math.pow(physicalHeight / assumedDPI, 2)
    );

    // Additional heuristics for TV detection
    const aspectRatio = width / height;
    const isLikelyTV = (
      width >= 1920 && 
      pixelRatio === 1 && 
      (aspectRatio >= 1.7 && aspectRatio <= 1.8) // 16:9 or similar TV aspect ratio
    );

    // If it looks like a TV, assume larger diagonal
    const estimatedDiagonal = isLikelyTV ? Math.max(diagonal, 32) : diagonal;

    // Debug logging for development and production (temporarily for debugging)
    console.log('🖥️ Display detection:', {
      width, height, pixelRatio, assumedDPI,
      diagonal: diagonal.toFixed(1),
      estimatedDiagonal: estimatedDiagonal.toFixed(1),
      isLikelyTV,
      aspectRatio: (width / height).toFixed(2)
    });

    return {
      width,
      height,
      diagonal: estimatedDiagonal > 8 ? estimatedDiagonal : undefined,
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

    if (diagonal && diagonal > 15) {
      // Use diagonal size if available - more aggressive scaling for TV displays
      if (diagonal >= 50) {
        scaleFactor = 2.8;  // Very large TVs (50"+)
        layoutDensity = 'spacious';
      } else if (diagonal >= 40) {
        scaleFactor = 2.4;  // Large TVs (40-49")
        layoutDensity = 'spacious';
      } else if (diagonal >= 32) {
        scaleFactor = 2.0;  // Medium TVs (32-39")
        layoutDensity = 'spacious';
      } else if (diagonal >= 24) {
        scaleFactor = 1.6;  // Large monitors (24-31")
        layoutDensity = 'normal';
      } else if (diagonal >= 16) {
        scaleFactor = 1.3;  // Standard monitors (16-23")
        layoutDensity = 'normal';
      } else {
        scaleFactor = 1.0;  // Small displays (12-15")
        layoutDensity = 'compact';
      }
    } else {
      // Fallback to width-based calculation - more aggressive for high resolutions
      if (width >= 3840) {
        scaleFactor = 3.0;  // 4K+ displays
        layoutDensity = 'spacious';
      } else if (width >= 2560) {
        scaleFactor = 2.4;  // 1440p+ displays
        layoutDensity = 'spacious';
      } else if (width >= 1920) {
        scaleFactor = 2.0;  // 1080p displays
        layoutDensity = 'spacious';
      } else if (width >= 1440) {
        scaleFactor = 1.6;  // Large laptop displays
        layoutDensity = 'normal';
      } else if (width >= 1024) {
        scaleFactor = 1.3;  // Standard laptop displays
        layoutDensity = 'normal';
      } else {
        scaleFactor = 1.0;  // Small displays
        layoutDensity = 'compact';
      }
    }

    // Emergency fallback for ultra-high resolution displays that might be missed
    if (width >= 3840 && scaleFactor < 2.5) {
      console.warn('🚨 Ultra-high resolution detected, forcing aggressive scaling');
      scaleFactor = 3.0;
      layoutDensity = 'spacious';
    } else if (width >= 1920 && scaleFactor < 1.8) {
      console.warn('🚨 Large display detected, forcing TV-appropriate scaling');
      scaleFactor = 2.0;
      layoutDensity = 'spacious';
    }

    // Calculate touch target size
    const baseTouchSize = this.layoutConfig.minTouchTargetSize;
    const maxTouchSize = this.layoutConfig.maxTouchTargetSize;
    const touchTargetSize = Math.min(
      Math.max(baseTouchSize * scaleFactor, baseTouchSize),
      maxTouchSize
    );

    // Calculate font size
    const preferredFontSize = Math.round(this.layoutConfig.baseFontSize * scaleFactor);

    console.log('🎯 Calculated config:', {
      width, height, diagonal: diagonal?.toFixed(1),
      scaleFactor, layoutDensity, preferredFontSize, touchTargetSize
    });

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
    
    console.log('🎨 Applying global styles with config:', {
      scaleFactor: config.scaleFactor,
      fontSize: config.preferredFontSize,
      touchTarget: config.touchTargetSize,
      layoutDensity: config.layoutDensity
    });
    
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

    // Force immediate style recalculation
    document.body.offsetHeight; // Trigger reflow
    
    console.log('✅ Applied CSS classes:', {
      responsive: 'responsive-display',
      layout: `layout-${config.layoutDensity}`,
      scale: `scale-${this.getScaleCategory(config.scaleFactor)}`,
      touch: config.touchEnabled ? 'touch-enabled' : 'mouse-enabled'
    });
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
    if (scaleFactor >= 2.6) return 'xxxlarge';  // 50"+ TVs
    if (scaleFactor >= 2.2) return 'xxlarge';   // 40"+ TVs
    if (scaleFactor >= 1.8) return 'xlarge';    // 33-40" displays
    if (scaleFactor >= 1.4) return 'large';     // 25-32" displays
    if (scaleFactor >= 1.15) return 'medium';   // 16-24" displays
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

// Development utility for testing different screen sizes
export const simulateScreenSize = (width: number, height: number): DisplayConfig => {
  if (process.env.NODE_ENV === 'development') {
    // Temporarily override window dimensions for testing
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    
    // @ts-ignore - Override for testing
    window.innerWidth = width;
    // @ts-ignore - Override for testing  
    window.innerHeight = height;
    
    const config = globalDisplayManager.recalculate();
    
    // Restore original dimensions
    // @ts-ignore
    window.innerWidth = originalInnerWidth;
    // @ts-ignore
    window.innerHeight = originalInnerHeight;
    
    console.log(`🧪 Simulated ${width}x${height} - Scale: ${config.scaleFactor}, Size: ${config.screenWidth >= 2560 ? 'xxlarge' : config.screenWidth >= 1920 ? 'xlarge' : 'large'}`);
    
    return config;
  }
  return globalDisplayManager.getCurrentConfig() || globalDisplayManager.detectAndConfigure();
};

// Emergency manual scaling override for debugging
export const forceScaling = (scaleFactor: number): void => {
  console.log(`🔧 Forcing scale factor to ${scaleFactor}x`);
  
  const root = document.documentElement;
  root.style.setProperty('--responsive-scale-factor', scaleFactor.toString());
  root.style.setProperty('--responsive-font-size', `${16 * scaleFactor}px`);
  root.style.setProperty('--responsive-touch-target', `${44 * scaleFactor}px`);
  root.style.setProperty('--responsive-spacing-unit', `${8 * scaleFactor}px`);
  root.style.setProperty('--responsive-border-radius', `${8 * scaleFactor}px`);
  
  // Add appropriate scale class
  document.body.classList.remove('scale-small', 'scale-medium', 'scale-large', 'scale-xlarge', 'scale-xxlarge', 'scale-xxxlarge');
  
  if (scaleFactor >= 2.6) {
    document.body.classList.add('scale-xxxlarge');
  } else if (scaleFactor >= 2.2) {
    document.body.classList.add('scale-xxlarge');
  } else if (scaleFactor >= 1.8) {
    document.body.classList.add('scale-xlarge');
  } else if (scaleFactor >= 1.4) {
    document.body.classList.add('scale-large');
  } else if (scaleFactor >= 1.15) {
    document.body.classList.add('scale-medium');
  } else {
    document.body.classList.add('scale-small');
  }
  
  // Force TV optimizations for large scales
  if (scaleFactor >= 2.0) {
    document.body.classList.add('tv-display');
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
  }
  
  // Trigger reflow
  document.body.offsetHeight;
  
  console.log(`✅ Applied ${scaleFactor}x scaling manually`);
};

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.forceScaling = forceScaling;
  // @ts-ignore
  window.simulateScreenSize = simulateScreenSize;
  // @ts-ignore
  window.recalculateResponsive = recalculateResponsiveLayout;
}