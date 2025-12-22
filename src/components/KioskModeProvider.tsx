import React, { createContext, useContext, useEffect, useState } from 'react';
import { useKioskMode } from '../hooks/useKioskMode';
import type { KioskModeConfig } from '../utils/kioskModeManager';
import '../styles/kiosk.css';

interface KioskModeContextType {
  config: KioskModeConfig | null;
  isInitialized: boolean;
  isKioskMode: boolean;
  isFullscreen: boolean;
  isFirefox: boolean;
  shouldOptimizeForKiosk: boolean;
  requestFullscreen: (_element?: HTMLElement) => Promise<boolean>;
  exitFullscreen: () => Promise<boolean>;
  toggleFullscreen: (_element?: HTMLElement) => Promise<boolean>;
  getOptimizationRecommendations: () => string[];
}

const KioskModeContext = createContext<KioskModeContextType | null>(null);

interface KioskModeProviderProps {
  children: React.ReactNode;
  enableAutoOptimization?: boolean;
  showLoadingScreen?: boolean;
  showErrorScreen?: boolean;
}

/**
 * KioskModeProvider - Provides kiosk mode context and optimizations
 */
export const KioskModeProvider: React.FC<KioskModeProviderProps> = ({
  children,
  enableAutoOptimization = true,
  showLoadingScreen = true,
  showErrorScreen = true,
}) => {
  const kioskMode = useKioskMode();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Apply CSS classes based on kiosk mode state
  useEffect(() => {
    const { isKioskMode, isFullscreen, shouldOptimizeForKiosk, config } = kioskMode;

    if (!enableAutoOptimization) return;

    // Apply base kiosk mode class
    if (shouldOptimizeForKiosk) {
      document.body.classList.add('kiosk-mode');
    } else {
      document.body.classList.remove('kiosk-mode');
    }

    // Apply fullscreen class
    if (isFullscreen) {
      document.body.classList.add('kiosk-fullscreen');
    } else {
      document.body.classList.remove('kiosk-fullscreen');
    }

    // Apply touch optimization class
    if (config?.inputCapabilities.touchSupported) {
      document.body.classList.add('kiosk-touch-optimized');
    } else {
      document.body.classList.remove('kiosk-touch-optimized');
    }

    // Set CSS custom properties for kiosk mode
    if (shouldOptimizeForKiosk && config) {
      const root = document.documentElement;
      
      // Set display-based scaling
      const scaleFactor = Math.min(
        config.displayInfo.width / 1920,
        config.displayInfo.height / 1080
      );
      const clampedScale = Math.max(0.8, Math.min(2.0, scaleFactor));
      
      root.style.setProperty('--kiosk-scale-factor', clampedScale.toString());
      root.style.setProperty('--kiosk-display-width', `${config.displayInfo.width}px`);
      root.style.setProperty('--kiosk-display-height', `${config.displayInfo.height}px`);
      
      // Touch target sizing
      if (config.inputCapabilities.touchSupported) {
        const touchTargetSize = Math.max(44, Math.round(44 * clampedScale));
        root.style.setProperty('--kiosk-touch-target-min', `${touchTargetSize}px`);
        root.style.setProperty('--kiosk-touch-spacing', `${Math.round(8 * clampedScale)}px`);
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('kiosk-mode', 'kiosk-fullscreen', 'kiosk-touch-optimized');
    };
  }, [kioskMode.shouldOptimizeForKiosk, kioskMode.isFullscreen, kioskMode.config, enableAutoOptimization]);

  // Error boundary for kiosk mode
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (kioskMode.shouldOptimizeForKiosk && showErrorScreen) {
        setHasError(true);
        setErrorMessage(event.message || 'An unexpected error occurred');
        console.error('Kiosk mode error:', event);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (kioskMode.shouldOptimizeForKiosk && showErrorScreen) {
        setHasError(true);
        setErrorMessage(event.reason?.message || 'An unexpected error occurred');
        console.error('Kiosk mode unhandled rejection:', event);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [kioskMode.shouldOptimizeForKiosk, showErrorScreen]);

  // Loading screen
  if (!kioskMode.isInitialized && showLoadingScreen && kioskMode.shouldOptimizeForKiosk) {
    return (
      <div className="kiosk-loading">
        <div className="kiosk-loading-content">
          <div className="kiosk-loading-spinner"></div>
          <h2>Initializing Kiosk Mode...</h2>
          <p>Optimizing for {kioskMode.isFirefox ? 'Firefox' : 'your browser'}</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (hasError && showErrorScreen && kioskMode.shouldOptimizeForKiosk) {
    return (
      <div className="kiosk-error">
        <div className="kiosk-error-content">
          <h1>⚠️ System Error</h1>
          <p>{errorMessage}</p>
          <p>The application encountered an error and needs to restart.</p>
          <button
            className="kiosk-error-button"
            onClick={() => {
              setHasError(false);
              setErrorMessage('');
              window.location.reload();
            }}
          >
            Restart Application
          </button>
        </div>
      </div>
    );
  }

  const contextValue: KioskModeContextType = {
    config: kioskMode.config,
    isInitialized: kioskMode.isInitialized,
    isKioskMode: kioskMode.isKioskMode,
    isFullscreen: kioskMode.isFullscreen,
    isFirefox: kioskMode.isFirefox,
    shouldOptimizeForKiosk: kioskMode.shouldOptimizeForKiosk,
    requestFullscreen: kioskMode.requestFullscreen,
    exitFullscreen: kioskMode.exitFullscreen,
    toggleFullscreen: kioskMode.toggleFullscreen,
    getOptimizationRecommendations: kioskMode.getOptimizationRecommendations,
  };

  return (
    <KioskModeContext.Provider value={contextValue}>
      {children}
    </KioskModeContext.Provider>
  );
};

/**
 * Hook to use kiosk mode context
 */
export const useKioskModeContext = (): KioskModeContextType => {
  const context = useContext(KioskModeContext);
  if (!context) {
    throw new Error('useKioskModeContext must be used within a KioskModeProvider');
  }
  return context;
};

/**
 * HOC to wrap components with kiosk mode optimization
 */
export const withKioskMode = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { enableKioskOptimization?: boolean }> => {
  return ({ enableKioskOptimization = true, ...props }) => {
    const kioskMode = useKioskModeContext();
    
    const componentProps = {
      ...props,
      kioskMode: enableKioskOptimization ? kioskMode : null,
    } as P;

    return <Component {...componentProps} />;
  };
};