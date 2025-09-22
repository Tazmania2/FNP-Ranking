import React, { Suspense, lazy } from 'react';
import type { Player, Leaderboard } from '../types';

// Lazy load the DetailedRanking component
const DetailedRankingComponent = lazy(() => 
  import('./DetailedRanking').then(module => ({ default: module.DetailedRanking }))
);

interface LazyDetailedRankingProps {
  players: Player[];
  currentLeaderboard: Leaderboard | null;
  isLoading?: boolean;
}

// Loading skeleton for DetailedRanking
const DetailedRankingSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-4 sm:mb-6">
        <div className="h-6 sm:h-8 bg-gray-200 rounded mb-2 w-48"></div>
        <div className="h-4 bg-gray-200 rounded mb-4 w-64"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>

      {/* Mobile cards skeleton */}
      <div className="block sm:hidden space-y-3">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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

      {/* Desktop table skeleton */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              {['Position', 'Avatar', 'Player Name', 'Points', 'Movement'].map((header) => (
                <th key={header} className="text-left py-3 px-2 lg:px-4">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, index) => (
              <tr key={index} className="border-b border-gray-100">
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

      {/* Pagination skeleton */}
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
  </div>
);

// Error boundary for lazy loading
class DetailedRankingErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DetailedRanking lazy loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Failed to load detailed ranking
            </h3>
            <p className="text-gray-600 mb-4">
              There was an error loading the detailed ranking component.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const LazyDetailedRanking: React.FC<LazyDetailedRankingProps> = (props) => {
  return (
    <DetailedRankingErrorBoundary>
      <Suspense fallback={<DetailedRankingSkeleton />}>
        <DetailedRankingComponent {...props} />
      </Suspense>
    </DetailedRankingErrorBoundary>
  );
};

export default LazyDetailedRanking;