import React, { useEffect, useRef } from 'react';
import { useResponsiveDesign } from '../hooks/useResponsiveDesign';
import { globalDisplayManager } from '../utils/responsiveDisplayManager';

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  enableAutoDetection?: boolean;
  customBreakpoints?: {
    small?: number;
    medium?: number;
    large?: number;
    xlarge?: number;
    xxlarge?: number;
  };
}

/**
 * ResponsiveWrapper component that provides responsive design context
 * and automatically configures display settings for kiosk deployment
 */
export const ResponsiveWrapper: React.FC<ResponsiveWrapperProps> = ({
  children,
  className = '',
  enableAutoDetection = true,
  customBreakpoints,
}) => {
  const initRef = useRef(false);
  
  const {
    displayConfig,
    screenSize,
    responsiveClasses,
    isTouch,
  } = useResponsiveDesign(customBreakpoints);

  // Initialize responsive display manager on mount
  useEffect(() => {
    if (!initRef.current && enableAutoDetection) {
      initRef.current = true;
      
      // Initialize display manager
      globalDisplayManager.detectAndConfigure();
      
      // Log configuration for debugging
      console.log('🖥️ Responsive display configured:', {
        screenSize,
        scaleFactor: displayConfig.scaleFactor,
        touchEnabled: isTouch,
        layoutDensity: displayConfig.layoutDensity,
        dimensions: `${displayConfig.screenWidth}x${displayConfig.screenHeight}`,
        pixelRatio: displayConfig.pixelDensity,
        estimatedDiagonal: displayConfig.screenWidth >= 1920 ? 'TV-sized display detected' : 'Monitor-sized display',
      });

      // Add TV-specific optimizations
      if (displayConfig.scaleFactor >= 2.0) {
        console.log('📺 TV display detected - applying kiosk optimizations');
        document.body.classList.add('tv-display');
        
        // Disable text selection for kiosk mode
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        // Optimize for viewing distance
        document.documentElement.style.setProperty('--tv-viewing-distance-factor', '1.2');
      }

      // Emergency check - if we're on a large display but scaling is too small, force it
      if (displayConfig.screenWidth >= 1920 && displayConfig.scaleFactor < 1.8) {
        console.warn('🚨 Large display with insufficient scaling detected, applying emergency scaling');
        const emergencyScale = displayConfig.screenWidth >= 3840 ? 3.0 : 2.0;
        
        // Apply emergency scaling directly
        document.documentElement.style.setProperty('--responsive-scale-factor', emergencyScale.toString());
        document.documentElement.style.setProperty('--responsive-font-size', `${16 * emergencyScale}px`);
        document.documentElement.style.setProperty('--responsive-touch-target', `${44 * emergencyScale}px`);
        document.documentElement.style.setProperty('--responsive-spacing-unit', `${8 * emergencyScale}px`);
        
        document.body.classList.add('tv-display');
        document.body.classList.add(emergencyScale >= 2.6 ? 'scale-xxxlarge' : 'scale-xxlarge');
      }
    }
  }, [enableAutoDetection, screenSize, displayConfig, isTouch]);

  // Combine responsive classes with custom className
  const combinedClassName = [
    responsiveClasses.container,
    className,
  ].filter(Boolean).join(' ');

  // Add debug information for development
  const debugInfo = process.env.NODE_ENV === 'development' ? {
    'data-debug-scale': displayConfig.scaleFactor,
    'data-debug-screen-size': screenSize,
    'data-debug-dimensions': `${displayConfig.screenWidth}x${displayConfig.screenHeight}`,
  } : {};

  return (
    <div 
      className={combinedClassName}
      data-screen-size={screenSize}
      data-touch-enabled={isTouch}
      data-layout-density={displayConfig.layoutDensity}
      {...debugInfo}
      style={{
        '--current-scale-factor': displayConfig.scaleFactor,
        '--current-font-size': `${displayConfig.preferredFontSize}px`,
        '--current-touch-target': `${displayConfig.touchTargetSize}px`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

export default ResponsiveWrapper;