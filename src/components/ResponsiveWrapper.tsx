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
      });
    }
  }, [enableAutoDetection, screenSize, displayConfig, isTouch]);

  // Combine responsive classes with custom className
  const combinedClassName = [
    responsiveClasses.container,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={combinedClassName}
      data-screen-size={screenSize}
      data-touch-enabled={isTouch}
      data-layout-density={displayConfig.layoutDensity}
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