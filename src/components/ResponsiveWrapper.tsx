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
 * Determines the appropriate TV scaling class based on screen dimensions
 * Uses CSS transform: scale() for reliable scaling regardless of CSS framework
 */
function getTVScaleClass(width: number, height: number): string | null {
  const aspectRatio = width / height;
  
  // Ultra-wide displays (aspect ratio > 2.5, like 3840x1229 = 3.12)
  if (width >= 3840 && aspectRatio > 2.5) {
    return 'tv-scale-ultrawide';
  }
  
  // Standard 4K displays (3840x2160)
  if (width >= 3840) {
    return 'tv-scale-4k';
  }
  
  // 1440p displays (2560x1440)
  if (width >= 2560) {
    return 'tv-scale-1440p';
  }
  
  // 1080p displays (1920x1080)
  if (width >= 1920) {
    return 'tv-scale-1080p';
  }
  
  // No scaling needed for smaller displays
  return null;
}

/**
 * ResponsiveWrapper component that provides responsive design context
 * and automatically configures display settings for kiosk deployment
 * 
 * Uses CSS transform: scale() for TV displays to ensure consistent scaling
 * regardless of what CSS framework (Tailwind, etc.) is used for styling.
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
      
      // Initialize display manager (sets CSS variables for components that use them)
      globalDisplayManager.detectAndConfigure();
      
      const { screenWidth, screenHeight, scaleFactor, layoutDensity, pixelDensity } = displayConfig;
      
      // Log configuration for debugging
      console.log('🖥️ Responsive display configured:', {
        screenSize,
        scaleFactor,
        touchEnabled: isTouch,
        layoutDensity,
        dimensions: `${screenWidth}x${screenHeight}`,
        pixelRatio: pixelDensity,
      });

      // Determine if this is a TV/large display that needs transform scaling
      const tvScaleClass = getTVScaleClass(screenWidth, screenHeight);
      
      if (tvScaleClass) {
        console.log(`📺 TV display detected (${screenWidth}x${screenHeight}) - applying ${tvScaleClass}`);
        
        // Add TV display base class and specific scale class
        document.body.classList.add('tv-display', tvScaleClass);
        
        // Set the scale factor CSS variable for the transform
        const scaleFactorMap: Record<string, number> = {
          'tv-scale-1080p': 1.3,
          'tv-scale-1440p': 1.5,
          'tv-scale-4k': 1.8,
          'tv-scale-ultrawide': 2.0,
        };
        
        const cssScaleFactor = scaleFactorMap[tvScaleClass] || 1.5;
        document.documentElement.style.setProperty('--tv-scale-factor', cssScaleFactor.toString());
        
        console.log(`✅ Applied TV scaling: ${cssScaleFactor}x via CSS transform`);
      } else {
        console.log('🖥️ Standard display - no transform scaling needed');
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