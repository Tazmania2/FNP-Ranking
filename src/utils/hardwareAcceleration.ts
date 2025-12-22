/**
 * Hardware acceleration detection and utilization utilities
 * Optimized for Raspberry Pi 4 ARM CPU performance
 */

export interface HardwareAccelerationCapabilities {
  webgl: boolean;
  webgl2: boolean;
  css3d: boolean;
  cssTransforms: boolean;
  cssFilters: boolean;
  available: boolean;
  score: number; // 0-100 capability score
}

export interface AccelerationConfig {
  preferWebGL: boolean;
  fallbackToCSS: boolean;
  enableFilters: boolean;
  maxComplexity: number; // 1-10 scale
}

/**
 * Detect available hardware acceleration capabilities
 */
export function detectHardwareAcceleration(): HardwareAccelerationCapabilities {
  if (typeof window === 'undefined') {
    return {
      webgl: false,
      webgl2: false,
      css3d: false,
      cssTransforms: false,
      cssFilters: false,
      available: false,
      score: 0
    };
  }

  let webgl = false;
  let webgl2 = false;
  let css3d = false;
  let cssTransforms = false;
  let cssFilters = false;

  try {
    // Test WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    webgl = !!gl;
    
    if (gl) {
      // Test WebGL2 support
      const gl2 = canvas.getContext('webgl2');
      webgl2 = !!gl2;
    }
  } catch (error) {
    console.warn('WebGL detection failed:', error);
  }

  try {
    // Test CSS 3D transforms
    const testElement = document.createElement('div');
    testElement.style.transform = 'translate3d(0,0,0)';
    css3d = testElement.style.transform !== '';
    
    // Test CSS transforms
    testElement.style.transform = 'translateX(0)';
    cssTransforms = testElement.style.transform !== '';
    
    // Test CSS filters
    testElement.style.filter = 'blur(0px)';
    cssFilters = testElement.style.filter !== '';
  } catch (error) {
    console.warn('CSS capability detection failed:', error);
  }

  // Calculate capability score
  let score = 0;
  if (webgl2) score += 40;
  else if (webgl) score += 30;
  if (css3d) score += 25;
  if (cssTransforms) score += 20;
  if (cssFilters) score += 15;

  const available = webgl || css3d || cssTransforms;

  return {
    webgl,
    webgl2,
    css3d,
    cssTransforms,
    cssFilters,
    available,
    score
  };
}

/**
 * Get optimal acceleration configuration based on capabilities
 */
export function getOptimalAccelerationConfig(
  capabilities: HardwareAccelerationCapabilities
): AccelerationConfig {
  // Conservative settings for Raspberry Pi 4
  const baseConfig: AccelerationConfig = {
    preferWebGL: false,
    fallbackToCSS: true,
    enableFilters: false,
    maxComplexity: 3
  };

  if (capabilities.score >= 70) {
    // High capability system
    return {
      preferWebGL: capabilities.webgl2,
      fallbackToCSS: true,
      enableFilters: capabilities.cssFilters,
      maxComplexity: 7
    };
  } else if (capabilities.score >= 40) {
    // Medium capability system (typical Raspberry Pi 4)
    return {
      preferWebGL: capabilities.webgl,
      fallbackToCSS: true,
      enableFilters: false,
      maxComplexity: 5
    };
  } else if (capabilities.score >= 20) {
    // Low capability system
    return {
      preferWebGL: false,
      fallbackToCSS: capabilities.css3d,
      enableFilters: false,
      maxComplexity: 3
    };
  }

  // Very low capability - minimal acceleration
  return {
    ...baseConfig,
    maxComplexity: 1
  };
}

/**
 * Apply hardware acceleration optimizations to an element
 */
export function applyHardwareAcceleration(
  element: HTMLElement,
  config: AccelerationConfig
): void {
  if (!element) return;

  const style = element.style;

  // Enable hardware acceleration hints
  if (config.preferWebGL || config.fallbackToCSS) {
    style.willChange = 'transform';
    style.backfaceVisibility = 'hidden';
    style.perspective = '1000px';
    
    // Force layer creation for hardware acceleration
    if (config.fallbackToCSS) {
      style.transform = style.transform || 'translateZ(0)';
    }
  }

  // Optimize for performance
  style.pointerEvents = style.pointerEvents || 'auto';
  
  // Disable expensive operations on low-end hardware
  if (config.maxComplexity <= 3) {
    style.textShadow = 'none';
    style.boxShadow = 'none';
  }
  
  if (!config.enableFilters) {
    style.filter = 'none';
  }
}

/**
 * Remove hardware acceleration optimizations
 */
export function removeHardwareAcceleration(element: HTMLElement): void {
  if (!element) return;

  const style = element.style;
  style.willChange = '';
  style.backfaceVisibility = '';
  style.perspective = '';
  
  // Remove forced layer creation
  if (style.transform === 'translateZ(0)') {
    style.transform = '';
  }
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    return false;
  }
}

/**
 * Get animation configuration based on capabilities and preferences
 */
export function getAnimationConfig(capabilities: HardwareAccelerationCapabilities) {
  const reducedMotion = prefersReducedMotion();
  const config = getOptimalAccelerationConfig(capabilities);
  
  return {
    enableAnimations: !reducedMotion,
    maxFPS: capabilities.score >= 50 ? 60 : 30,
    complexity: reducedMotion ? 1 : config.maxComplexity,
    useTransforms: config.fallbackToCSS,
    enableFilters: config.enableFilters && !reducedMotion,
    reducedMotion
  };
}

// Global hardware acceleration manager
class HardwareAccelerationManager {
  private capabilities: HardwareAccelerationCapabilities;
  private config: AccelerationConfig;
  private animationConfig: ReturnType<typeof getAnimationConfig>;

  constructor() {
    this.capabilities = detectHardwareAcceleration();
    this.config = getOptimalAccelerationConfig(this.capabilities);
    this.animationConfig = getAnimationConfig(this.capabilities);
    
    console.log('Hardware Acceleration Capabilities:', this.capabilities);
    console.log('Optimal Configuration:', this.config);
    console.log('Animation Configuration:', this.animationConfig);
  }

  getCapabilities() {
    return this.capabilities;
  }

  getConfig() {
    return this.config;
  }

  getAnimationConfig() {
    return this.animationConfig;
  }

  optimizeElement(element: HTMLElement) {
    applyHardwareAcceleration(element, this.config);
  }

  removeOptimization(element: HTMLElement) {
    removeHardwareAcceleration(element);
  }

  // Update configuration based on performance metrics
  updateConfig(performanceScore: number) {
    if (performanceScore < 30) {
      // Reduce complexity for poor performance
      this.config.maxComplexity = Math.max(1, this.config.maxComplexity - 1);
      this.config.enableFilters = false;
      this.animationConfig.complexity = Math.max(1, this.animationConfig.complexity - 1);
      this.animationConfig.maxFPS = 30;
    } else if (performanceScore > 70) {
      // Increase complexity for good performance
      const originalConfig = getOptimalAccelerationConfig(this.capabilities);
      this.config.maxComplexity = Math.min(originalConfig.maxComplexity, this.config.maxComplexity + 1);
      this.animationConfig.complexity = Math.min(originalConfig.maxComplexity, this.animationConfig.complexity + 1);
    }
  }
}

export const globalHardwareAcceleration = new HardwareAccelerationManager();