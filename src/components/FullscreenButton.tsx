import React, { useState } from 'react';
import { useKioskModeContext } from './KioskModeProvider';

interface FullscreenButtonProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'icon' | 'text' | 'both';
  position?: 'fixed' | 'relative';
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

/**
 * FullscreenButton - Optimized for Firefox kiosk mode
 */
export const FullscreenButton: React.FC<FullscreenButtonProps> = ({
  className = '',
  size = 'medium',
  variant = 'both',
  position = 'relative',
  onFullscreenChange,
}) => {
  const kioskMode = useKioskModeContext();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleFullscreen = async () => {
    if (isToggling) return;

    setIsToggling(true);
    try {
      const wasFullscreen = kioskMode.isFullscreen;
      const success = await kioskMode.toggleFullscreen();
      
      if (success && onFullscreenChange) {
        onFullscreenChange(!wasFullscreen);
      }
    } catch (error) {
      console.error('Failed to toggle fullscreen:', error);
    } finally {
      setIsToggling(false);
    }
  };

  // Don't render if fullscreen API is not supported
  if (!kioskMode.config?.displayInfo.isFullscreenCapable) {
    return null;
  }

  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-10 h-10 text-base',
    large: 'w-12 h-12 text-lg',
  };

  const positionClasses = position === 'fixed' 
    ? 'fixed top-4 right-4 z-50' 
    : 'relative';

  const baseClasses = `
    ${sizeClasses[size]}
    ${positionClasses}
    flex items-center justify-center
    bg-white/20 hover:bg-white/30
    backdrop-blur-sm
    rounded-lg
    transition-all duration-200
    border border-white/20
    text-white
    cursor-pointer
    touch-target
    ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `;

  const FullscreenIcon = () => (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {kioskMode.isFullscreen ? (
        // Exit fullscreen icon
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
        />
      ) : (
        // Enter fullscreen icon
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
        />
      )}
    </svg>
  );

  const buttonText = kioskMode.isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen';

  return (
    <button
      onClick={handleToggleFullscreen}
      disabled={isToggling}
      className={baseClasses}
      aria-label={buttonText}
      title={buttonText}
    >
      {variant === 'icon' && <FullscreenIcon />}
      
      {variant === 'text' && (
        <span className="font-medium">
          {kioskMode.isFullscreen ? 'Exit' : 'Fullscreen'}
        </span>
      )}
      
      {variant === 'both' && (
        <>
          <FullscreenIcon />
          <span className="ml-2 font-medium hidden sm:inline">
            {kioskMode.isFullscreen ? 'Exit' : 'Fullscreen'}
          </span>
        </>
      )}
      
      {isToggling && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
};

export default FullscreenButton;