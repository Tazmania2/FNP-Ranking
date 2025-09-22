import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'race' | 'sidebar' | 'ranking' | 'selector';
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'race', 
  className = '' 
}) => {
  const baseClasses = 'animate-pulse';
  
  switch (variant) {
    case 'race':
      return (
        <div className={`${baseClasses} ${className}`}>
          {/* Race Title Skeleton */}
          <div className="text-center mb-3 lg:mb-4">
            <div className="h-6 sm:h-8 bg-gray-200 rounded mb-2 mx-auto w-64"></div>
            <div className="h-4 bg-gray-200 rounded mx-auto w-48"></div>
          </div>

          {/* Race Track Skeleton */}
          <div className="relative w-full h-64 sm:h-80 lg:h-96 bg-gray-200 rounded-lg border-2 sm:border-4 border-gray-300">
            {/* Chicken placeholders */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${15 + (i * 10)}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-300 rounded-full mb-1"></div>
                  <div className="w-16 h-4 bg-gray-300 rounded"></div>
                  <div className="w-6 h-6 bg-gray-300 rounded-full mt-1"></div>
                </div>
              </div>
            ))}
            
            {/* Info overlays */}
            <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-gray-300 rounded-lg p-2 sm:p-3 w-24 h-12"></div>
            <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 bg-gray-300 rounded-lg p-2 sm:p-3 w-20 h-10"></div>
          </div>

          {/* Stats Skeleton */}
          <div className="mt-3 lg:mt-4 grid grid-cols-3 gap-2 sm:gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg p-2 sm:p-4">
                <div className="h-6 sm:h-8 bg-gray-300 rounded mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'sidebar':
      return (
        <div className={`${baseClasses} bg-white rounded-lg shadow-lg p-4 sm:p-6 ${className}`}>
          {/* Header */}
          <div className="mb-4">
            <div className="h-6 bg-gray-200 rounded mb-2 w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>

          {/* Top players list */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1 w-20"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
            ))}
          </div>
        </div>
      );

    case 'ranking':
      return (
        <div className={`${baseClasses} bg-white rounded-lg shadow-lg p-4 sm:p-6 ${className}`}>
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="h-6 sm:h-8 bg-gray-200 rounded mb-2 w-48"></div>
            <div className="h-4 bg-gray-200 rounded mb-4 w-64"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>

          {/* Mobile cards */}
          <div className="block sm:hidden space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="w-6 h-6 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <th key={i} className="text-left py-3 px-2 lg:px-4">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-3 lg:py-4 px-2 lg:px-4">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4">
                      <div className="w-6 h-6 bg-gray-200 rounded"></div>
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4">
                      <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                    </td>
                    <td className="py-3 lg:py-4 px-2 lg:px-4">
                      <div className="h-4 bg-gray-200 rounded w-12 mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      );

    case 'selector':
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="flex items-center space-x-2">
            <div className="h-10 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      );

    default:
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </div>
      );
  }
};

// Shimmer effect for enhanced loading animation
export const ShimmerSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-gray-200 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"></div>
  </div>
);

// Pulse skeleton for simple loading states
export const PulseSkeleton: React.FC<{ 
  width?: string; 
  height?: string; 
  className?: string;
  rounded?: boolean;
}> = ({ 
  width = 'w-full', 
  height = 'h-4', 
  className = '', 
  rounded = true 
}) => (
  <div className={`animate-pulse bg-gray-200 ${width} ${height} ${rounded ? 'rounded' : ''} ${className}`}></div>
);

export default LoadingSkeleton;