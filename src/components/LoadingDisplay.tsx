import React from 'react';
import type { LoadingState } from '../types';

interface LoadingDisplayProps {
  /** Loading state object */
  loading: LoadingState;
  /** Custom loading message */
  message?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Style variant */
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  /** Whether to show loading message */
  showMessage?: boolean;
  /** Custom CSS classes */
  className?: string;
}

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

/**
 * Animated spinner component
 */
const Spinner: React.FC<LoadingIndicatorProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div
      className={`
        animate-spin rounded-full border-2 border-gray-300 border-t-blue-600
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
};

/**
 * Animated dots component
 */
const Dots: React.FC<LoadingIndicatorProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-1 h-1',
    medium: 'w-2 h-2',
    large: 'w-3 h-3',
  };

  const gapClasses = {
    small: 'space-x-1',
    medium: 'space-x-2',
    large: 'space-x-3',
  };

  return (
    <div className={`flex items-center ${gapClasses[size]} ${className}`} role="status" aria-label="Loading">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`
            bg-blue-600 rounded-full animate-pulse
            ${sizeClasses[size]}
          `}
          style={{
            animationDelay: `${index * 0.2}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  );
};

/**
 * Pulsing indicator component
 */
const Pulse: React.FC<LoadingIndicatorProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <div
      className={`
        bg-blue-600 rounded-full animate-pulse
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label="Loading"
    />
  );
};

/**
 * Skeleton loading component for chicken race area
 */
const ChickenRaceSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading chicken race">
      <div className="bg-gradient-to-r from-green-100 to-blue-100 rounded-lg p-8 min-h-[300px] relative">
        {/* Simulated chickens */}
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="absolute w-12 h-12 bg-yellow-200 rounded-full"
            style={{
              left: `${10 + index * 15}%`,
              top: `${30 + (index % 3) * 20}%`,
            }}
          />
        ))}
        
        {/* Simulated finish line */}
        <div className="absolute right-4 top-4 bottom-4 w-2 bg-gray-200 rounded" />
        
        {/* Loading text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white bg-opacity-80 rounded-lg p-4 flex items-center space-x-3">
            <Spinner size="medium" />
            <span className="text-gray-600 font-medium">Loading race data...</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton loading component for sidebar
 */
const SidebarSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading sidebar">
      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        {/* Header */}
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        
        {/* Player list */}
        {[1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-yellow-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Get loading message based on loading state
 */
const getLoadingMessage = (loading: LoadingState): string => {
  if (loading.leaderboards) {
    return 'Loading leaderboards...';
  }
  if (loading.switchingLeaderboard) {
    return 'Switching leaderboard...';
  }
  if (loading.currentLeaderboard) {
    return 'Updating race data...';
  }
  return 'Loading...';
};

/**
 * Main loading display component
 */
export const LoadingDisplay: React.FC<LoadingDisplayProps> = ({
  loading,
  message,
  size = 'medium',
  variant = 'spinner',
  showMessage = true,
  className = '',
}) => {
  const isLoading = Object.values(loading).some(Boolean);
  
  if (!isLoading) {
    return null;
  }

  const loadingMessage = message || getLoadingMessage(loading);

  const renderIndicator = () => {
    switch (variant) {
      case 'dots':
        return <Dots size={size} />;
      case 'pulse':
        return <Pulse size={size} />;
      case 'skeleton':
        return loading.switchingLeaderboard ? <ChickenRaceSkeleton /> : <SidebarSkeleton />;
      default:
        return <Spinner size={size} />;
    }
  };

  if (variant === 'skeleton') {
    return <div className={className}>{renderIndicator()}</div>;
  }

  return (
    <div className={`flex items-center justify-center space-x-3 ${className}`}>
      {renderIndicator()}
      {showMessage && (
        <span className="text-gray-600 font-medium">
          {loadingMessage}
        </span>
      )}
    </div>
  );
};

/**
 * Inline loading indicator for small spaces
 */
export const InlineLoading: React.FC<Omit<LoadingIndicatorProps, 'variant'>> = (props) => {
  return <Spinner {...props} />;
};

/**
 * Overlay loading component that covers the entire area
 */
export const OverlayLoading: React.FC<{
  loading: LoadingState;
  message?: string;
  className?: string;
}> = ({ loading, message, className = '' }) => {
  const isLoading = Object.values(loading).some(Boolean);
  
  if (!isLoading) {
    return null;
  }

  const loadingMessage = message || getLoadingMessage(loading);

  return (
    <div
      className={`
        absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10
        ${className}
      `}
    >
      <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-4">
        <Spinner size="large" />
        <span className="text-gray-700 font-medium text-lg">
          {loadingMessage}
        </span>
      </div>
    </div>
  );
};

/**
 * Loading state for individual components
 */
export const ComponentLoading: React.FC<{
  isLoading: boolean;
  message?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}> = ({ isLoading, message = 'Loading...', variant = 'spinner', size = 'medium', className = '' }) => {
  if (!isLoading) {
    return null;
  }

  const renderIndicator = () => {
    switch (variant) {
      case 'dots':
        return <Dots size={size} />;
      case 'pulse':
        return <Pulse size={size} />;
      default:
        return <Spinner size={size} />;
    }
  };

  return (
    <div className={`flex items-center justify-center space-x-3 p-4 ${className}`}>
      {renderIndicator()}
      <span className="text-gray-600">{message}</span>
    </div>
  );
};