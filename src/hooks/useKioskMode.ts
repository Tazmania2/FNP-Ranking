import { useState, useEffect, useCallback } from 'react';
import { globalKioskModeManager, type KioskModeConfig } from '../utils/kioskModeManager';

/**
 * React hook for kiosk mode management and Firefox compatibility
 */
export const useKioskMode = () => {
  const [config, setConfig] = useState<KioskModeConfig | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize kiosk mode detection
  useEffect(() => {
    const initializeKioskMode = () => {
      try {
        const detectedConfig = globalKioskModeManager.detectKioskMode();
        setConfig(detectedConfig);
        
        // Apply optimizations if in kiosk mode
        if (detectedConfig.isKioskMode || detectedConfig.isFullscreen) {
          globalKioskModeManager.applyKioskOptimizations();
        }
        
        setIsInitialized(true);
        console.log('🖥️ Kiosk mode initialized:', detectedConfig);
      } catch (error) {
        console.error('Failed to initialize kiosk mode:', error);
        setIsInitialized(true);
      }
    };

    initializeKioskMode();

    // Listen for changes
    const handleKioskModeChange = () => {
      const updatedConfig = globalKioskModeManager.detectKioskMode();
      setConfig(updatedConfig);
    };

    globalKioskModeManager.addChangeListener(handleKioskModeChange);

    // Cleanup
    return () => {
      globalKioskModeManager.removeChangeListener(handleKioskModeChange);
      globalKioskModeManager.removeKioskOptimizations();
    };
  }, []);

  // Request fullscreen
  const requestFullscreen = useCallback(async (element?: HTMLElement): Promise<boolean> => {
    try {
      const success = await globalKioskModeManager.requestFullscreen(element);
      if (success) {
        // Config will be updated automatically via change listener
        console.log('🖥️ Fullscreen requested successfully');
      }
      return success;
    } catch (error) {
      console.error('Failed to request fullscreen:', error);
      return false;
    }
  }, []);

  // Exit fullscreen
  const exitFullscreen = useCallback(async (): Promise<boolean> => {
    try {
      const success = await globalKioskModeManager.exitFullscreen();
      if (success) {
        // Config will be updated automatically via change listener
        console.log('🖥️ Fullscreen exited successfully');
      }
      return success;
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      return false;
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(async (element?: HTMLElement): Promise<boolean> => {
    if (config?.isFullscreen) {
      return await exitFullscreen();
    } else {
      return await requestFullscreen(element);
    }
  }, [config?.isFullscreen, exitFullscreen, requestFullscreen]);

  // Check if optimizations should be applied
  const shouldOptimizeForKiosk = config?.isKioskMode || config?.isFullscreen || false;

  // Get optimization recommendations
  const getOptimizationRecommendations = useCallback(() => {
    if (!config) return [];

    const recommendations = [];

    if (config.isKioskMode || config.isFullscreen) {
      recommendations.push('Kiosk mode detected - optimizations applied');
    }

    if (config.browserInfo.isFirefox) {
      recommendations.push('Firefox detected - using Firefox-specific optimizations');
    }

    if (config.inputCapabilities.touchSupported) {
      recommendations.push('Touch input detected - touch targets optimized');
    }

    if (!config.displayInfo.isFullscreenCapable) {
      recommendations.push('Fullscreen API not supported - using alternative methods');
    }

    return recommendations;
  }, [config]);

  return {
    // State
    config,
    isInitialized,
    isKioskMode: config?.isKioskMode || false,
    isFullscreen: config?.isFullscreen || false,
    isFirefox: config?.browserInfo.isFirefox || false,
    shouldOptimizeForKiosk,

    // Actions
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,

    // Utilities
    getOptimizationRecommendations,

    // Raw manager access (for advanced use cases)
    kioskManager: globalKioskModeManager,
  };
};