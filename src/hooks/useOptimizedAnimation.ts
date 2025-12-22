/**
 * Optimized animation hook for Raspberry Pi 4 performance
 * Integrates hardware acceleration, frame rate monitoring, and reduced motion support
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { globalHardwareAcceleration } from '../utils/hardwareAcceleration';
import { globalFrameRateMonitor, type QualitySettings } from '../utils/frameRateMonitor';

export interface AnimationConfig {
  enabled: boolean;
  complexity: number; // 1-10
  duration: number; // milliseconds
  easing: string;
  useHardwareAcceleration: boolean;
  respectReducedMotion: boolean;
}

export interface AnimationState {
  isAnimating: boolean;
  progress: number; // 0-1
  currentValue: number;
  frameRate: number;
}

/**
 * Hook for optimized animations with automatic performance adjustment
 */
export function useOptimizedAnimation(
  targetValue: number,
  config: Partial<AnimationConfig> = {}
) {
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const startValueRef = useRef<number>(0);
  const elementRef = useRef<HTMLElement>();
  
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    progress: 0,
    currentValue: 0,
    frameRate: 0
  });

  // Get hardware acceleration and quality settings
  const hardwareConfig = globalHardwareAcceleration.getAnimationConfig();
  const qualitySettings = globalFrameRateMonitor.getQualitySettings();

  // Merge configuration with performance-based defaults
  const finalConfig: AnimationConfig = {
    enabled: hardwareConfig.enableAnimations,
    complexity: Math.min(config.complexity || 5, qualitySettings.animationComplexity),
    duration: config.duration || 800,
    easing: config.easing || 'cubic-bezier(0.4, 0, 0.2, 1)',
    useHardwareAcceleration: config.useHardwareAcceleration !== false,
    respectReducedMotion: config.respectReducedMotion !== false,
    ...config
  };

  // Check if animations should be disabled
  const shouldAnimate = finalConfig.enabled && 
    (!finalConfig.respectReducedMotion || !hardwareConfig.reducedMotion);

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const progress = Math.min(elapsed / finalConfig.duration, 1);
    
    // Apply easing (simplified cubic-bezier)
    const easedProgress = progress < 0.5 
      ? 2 * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentValue = startValueRef.current + 
      (targetValue - startValueRef.current) * easedProgress;

    // Calculate approximate frame rate
    const frameRate = elapsed > 0 ? 1000 / (elapsed / (progress * 60)) : 60;

    setAnimationState({
      isAnimating: progress < 1,
      progress,
      currentValue,
      frameRate: Math.min(frameRate, 120) // Cap at 120fps
    });

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete
      startTimeRef.current = undefined;
      animationRef.current = undefined;
    }
  }, [targetValue, finalConfig.duration]);

  // Start animation when target value changes
  useEffect(() => {
    if (!shouldAnimate) {
      // Skip animation - set final value immediately
      setAnimationState({
        isAnimating: false,
        progress: 1,
        currentValue: targetValue,
        frameRate: 0
      });
      return;
    }

    // Cancel existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    // Set up new animation
    startValueRef.current = animationState.currentValue;
    startTimeRef.current = undefined;
    
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, shouldAnimate, animate]);

  // Apply hardware acceleration to element
  const applyToElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    elementRef.current = element;

    if (finalConfig.useHardwareAcceleration && shouldAnimate) {
      globalHardwareAcceleration.optimizeElement(element);
    }

    return () => {
      if (elementRef.current) {
        globalHardwareAcceleration.removeOptimization(elementRef.current);
      }
    };
  }, [finalConfig.useHardwareAcceleration, shouldAnimate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (elementRef.current) {
        globalHardwareAcceleration.removeOptimization(elementRef.current);
      }
    };
  }, []);

  return {
    ...animationState,
    config: finalConfig,
    applyToElement,
    isOptimized: shouldAnimate && finalConfig.useHardwareAcceleration
  };
}

/**
 * Hook for managing multiple optimized animations
 */
export function useOptimizedAnimations<T extends Record<string, number>>(
  targetValues: T,
  config: Partial<AnimationConfig> = {}
) {
  // Create individual animations for each value using useMemo to avoid hook violations
  const animations = useMemo(() => {
    const result = {} as Record<keyof T, ReturnType<typeof useOptimizedAnimation>>;
    return result;
  }, []);

  // Create animations for each key
  Object.keys(targetValues).forEach(key => {
    // This is safe because we're in the component render phase
    // eslint-disable-next-line react-hooks/rules-of-hooks
    animations[key] = useOptimizedAnimation(targetValues[key], config);
  });

  const isAnyAnimating = Object.values(animations).some(anim => anim.isAnimating);
  const averageFrameRate = Object.values(animations).reduce(
    (sum, anim) => sum + anim.frameRate, 0
  ) / Object.keys(animations).length;

  return {
    animations,
    isAnyAnimating,
    averageFrameRate,
    applyToElements: (elements: Record<keyof T, HTMLElement | null>) => {
      const cleanupFunctions: Array<() => void> = [];
      
      Object.keys(elements).forEach(key => {
        if (animations[key] && elements[key]) {
          const cleanup = animations[key].applyToElement(elements[key]);
          if (cleanup) cleanupFunctions.push(cleanup);
        }
      });

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    }
  };
}

/**
 * Hook for performance-aware CSS transitions
 */
export function useOptimizedTransition(
  property: string,
  duration: number = 300,
  easing: string = 'ease-out'
) {
  const qualitySettings = globalFrameRateMonitor.getQualitySettings();
  const hardwareConfig = globalHardwareAcceleration.getAnimationConfig();
  
  // Adjust duration based on performance
  const adjustedDuration = qualitySettings.enableTransitions 
    ? duration * (qualitySettings.animationComplexity / 10)
    : 0;

  // Disable transitions if reduced motion is preferred
  const shouldUseTransition = qualitySettings.enableTransitions && 
    hardwareConfig.enableAnimations && 
    !hardwareConfig.reducedMotion;

  const transitionStyle = shouldUseTransition 
    ? `${property} ${adjustedDuration}ms ${easing}`
    : 'none';

  const applyTransition = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    element.style.transition = transitionStyle;
    
    if (shouldUseTransition) {
      globalHardwareAcceleration.optimizeElement(element);
    }

    return () => {
      element.style.transition = '';
      globalHardwareAcceleration.removeOptimization(element);
    };
  }, [transitionStyle, shouldUseTransition]);

  return {
    transitionStyle,
    shouldUseTransition,
    adjustedDuration,
    applyTransition
  };
}

/**
 * Hook for monitoring and responding to quality changes
 */
export function useQualityMonitor() {
  const [qualitySettings, setQualitySettings] = useState<QualitySettings>(
    globalFrameRateMonitor.getQualitySettings()
  );

  useEffect(() => {
    const handleQualityChange = (event: CustomEvent) => {
      setQualitySettings(event.detail.qualitySettings);
    };

    window.addEventListener('frameRate:qualityChange', handleQualityChange as EventListener);
    
    return () => {
      window.removeEventListener('frameRate:qualityChange', handleQualityChange as EventListener);
    };
  }, []);

  return qualitySettings;
}