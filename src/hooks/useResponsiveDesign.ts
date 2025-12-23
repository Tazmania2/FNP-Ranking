import { useState, useEffect, useCallback, useMemo } from 'react';

// Display configuration interface
export interface DisplayConfig {
  screenWidth: number;
  screenHeight: number;
  pixelDensity: number;
  scaleFactor: number;
  touchEnabled: boolean;
  preferredFontSize: number;
  touchTargetSize: number;
  layoutDensity: 'compact' | 'normal' | 'spacious';
}

// Breakpoint definitions for different screen sizes (12" to 40"+)
export interface Breakpoints {
  small: number;    // 12-15" displays
  medium: number;   // 16-24" displays  
  large: number;    // 25-32" displays
  xlarge: number;   // 33-40" displays
  xxlarge: number;  // 40"+ displays
}

// Default breakpoints based on typical display sizes
const DEFAULT_BREAKPOINTS: Breakpoints = {
  small: 768,    // ~12-15" displays
  medium: 1024,  // ~16-24" displays
  large: 1440,   // ~25-32" displays
  xlarge: 1920,  // ~33-40" displays
  xxlarge: 2560, // 40"+ displays
};

// Touch target size recommendations (in pixels) - larger for TV displays
const TOUCH_TARGET_SIZES = {
  small: 44,    // Minimum recommended
  medium: 56,   // Comfortable for medium displays
  large: 72,    // Large displays - increased
  xlarge: 88,   // TV displays - much larger
};

// Font scale factors for different screen sizes - more aggressive for TV displays
const FONT_SCALE_FACTORS = {
  small: 1.0,    // Base size for smaller displays
  medium: 1.3,   // Larger for medium displays
  large: 1.6,    // Much larger for big displays
  xlarge: 2.0,   // Very large for TV displays
  xxlarge: 2.4,  // Largest for huge TV displays
};

export type ScreenSize = keyof Breakpoints;

export interface ResponsiveDesignHook {
  // Current display state
  displayConfig: DisplayConfig;
  screenSize: ScreenSize;
  isTouch: boolean;
  
  // Responsive utilities
  getScaledValue: (baseValue: number) => number;
  getTouchTargetSize: () => number;
  getFontScale: () => number;
  getLayoutDensity: () => 'compact' | 'normal' | 'spacious';
  
  // Breakpoint utilities
  isSmallScreen: boolean;
  isMediumScreen: boolean;
  isLargeScreen: boolean;
  isXLargeScreen: boolean;
  isXXLargeScreen: boolean;
  
  // Dynamic CSS classes
  responsiveClasses: {
    container: string;
    text: string;
    spacing: string;
    touchTarget: string;
  };
}

/**
 * Hook for responsive design management across different display sizes
 * Optimized for Raspberry Pi kiosk deployment on 12" to 40"+ displays
 */
export const useResponsiveDesign = (
  customBreakpoints?: Partial<Breakpoints>
): ResponsiveDesignHook => {
  const breakpoints = useMemo(() => ({
    ...DEFAULT_BREAKPOINTS,
    ...customBreakpoints,
  }), [customBreakpoints]);

  const [displayConfig, setDisplayConfig] = useState<DisplayConfig>(() => {
    // Initialize with safe defaults for SSR
    if (typeof window === 'undefined') {
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

    // Initialize with current window dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    
    return {
      screenWidth: width,
      screenHeight: height,
      pixelDensity: pixelRatio,
      scaleFactor: calculateScaleFactor(width, breakpoints),
      touchEnabled: detectTouchCapability(),
      preferredFontSize: calculateFontSize(width, breakpoints),
      touchTargetSize: calculateTouchTargetSize(width, breakpoints),
      layoutDensity: calculateLayoutDensity(width, breakpoints),
    };
  });

  // Determine current screen size category
  const screenSize = useMemo((): ScreenSize => {
    const width = displayConfig.screenWidth;
    if (width >= breakpoints.xxlarge) return 'xxlarge';
    if (width >= breakpoints.xlarge) return 'xlarge';
    if (width >= breakpoints.large) return 'large';
    if (width >= breakpoints.medium) return 'medium';
    return 'small';
  }, [displayConfig.screenWidth, breakpoints]);

  // Breakpoint boolean flags
  const isSmallScreen = screenSize === 'small';
  const isMediumScreen = screenSize === 'medium';
  const isLargeScreen = screenSize === 'large';
  const isXLargeScreen = screenSize === 'xlarge';
  const isXXLargeScreen = screenSize === 'xxlarge';

  // Update display configuration when window resizes
  const updateDisplayConfig = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    setDisplayConfig({
      screenWidth: width,
      screenHeight: height,
      pixelDensity: pixelRatio,
      scaleFactor: calculateScaleFactor(width, breakpoints),
      touchEnabled: detectTouchCapability(),
      preferredFontSize: calculateFontSize(width, breakpoints),
      touchTargetSize: calculateTouchTargetSize(width, breakpoints),
      layoutDensity: calculateLayoutDensity(width, breakpoints),
    });
  }, [breakpoints]);

  // Set up resize listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Throttle resize events for performance
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateDisplayConfig, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Initial update
    updateDisplayConfig();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, [updateDisplayConfig]);

  // Utility functions
  const getScaledValue = useCallback((baseValue: number): number => {
    return Math.round(baseValue * displayConfig.scaleFactor);
  }, [displayConfig.scaleFactor]);

  const getTouchTargetSize = useCallback((): number => {
    return displayConfig.touchTargetSize;
  }, [displayConfig.touchTargetSize]);

  const getFontScale = useCallback((): number => {
    return FONT_SCALE_FACTORS[screenSize];
  }, [screenSize]);

  const getLayoutDensity = useCallback(() => {
    return displayConfig.layoutDensity;
  }, [displayConfig.layoutDensity]);

  // Generate responsive CSS classes
  const responsiveClasses = useMemo(() => {
    const density = displayConfig.layoutDensity;
    const size = screenSize;

    return {
      container: `responsive-container responsive-${size} density-${density}`,
      text: `responsive-text text-scale-${size}`,
      spacing: `responsive-spacing spacing-${density}`,
      touchTarget: `touch-target touch-${displayConfig.touchEnabled ? 'enabled' : 'disabled'}`,
    };
  }, [displayConfig, screenSize]);

  return {
    displayConfig,
    screenSize,
    isTouch: displayConfig.touchEnabled,
    getScaledValue,
    getTouchTargetSize,
    getFontScale,
    getLayoutDensity,
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    isXLargeScreen,
    isXXLargeScreen,
    responsiveClasses,
  };
};

// Helper functions

function calculateScaleFactor(width: number, breakpoints: Breakpoints): number {
  if (width >= breakpoints.xxlarge) return 2.4;  // 40"+ displays - much more aggressive
  if (width >= breakpoints.xlarge) return 2.0;   // 33-40" displays - more aggressive
  if (width >= breakpoints.large) return 1.6;    // 25-32" displays - increased
  if (width >= breakpoints.medium) return 1.3;   // 16-24" displays - increased
  return 1.0; // 12-15" displays
}

function calculateFontSize(width: number, breakpoints: Breakpoints): number {
  const baseFontSize = 16;
  const scaleFactor = calculateScaleFactor(width, breakpoints);
  return Math.round(baseFontSize * scaleFactor);
}

function calculateTouchTargetSize(width: number, breakpoints: Breakpoints): number {
  if (width >= breakpoints.xxlarge) return TOUCH_TARGET_SIZES.xlarge;
  if (width >= breakpoints.xlarge) return TOUCH_TARGET_SIZES.xlarge;
  if (width >= breakpoints.large) return TOUCH_TARGET_SIZES.large;
  if (width >= breakpoints.medium) return TOUCH_TARGET_SIZES.medium;
  return TOUCH_TARGET_SIZES.small;
}

function calculateLayoutDensity(width: number, breakpoints: Breakpoints): 'compact' | 'normal' | 'spacious' {
  if (width >= breakpoints.xlarge) return 'spacious';  // Large displays can afford more space
  if (width >= breakpoints.medium) return 'normal';    // Medium displays use normal spacing
  return 'compact'; // Small displays need compact layout
}

function detectTouchCapability(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for touch capability
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - Legacy IE support
    navigator.msMaxTouchPoints > 0
  );
}

export default useResponsiveDesign;