import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { 
  ErrorDisplay, 
  CompactErrorDisplay, 
  FloatingErrorDisplay, 
  BannerErrorDisplay 
} from '../ErrorDisplay';
import type { ApiError } from '../../types';

describe('ErrorDisplay', () => {
  const mockOnRetry = vi.fn();
  const mockOnDismiss = vi.fn();

  const networkError: ApiError = {
    type: 'network',
    message: 'Network connection failed',
    retryable: true,
    timestamp: Date.now() - 60000, // 1 minute ago
  };

  const authError: ApiError = {
    type: 'auth',
    message: 'Authentication failed',
    retryable: false,
    timestamp: Date.now() - 30000, // 30 seconds ago
  };

  const validationError: ApiError = {
    type: 'validation',
    message: 'Resource not found',
    retryable: false,
    timestamp: Date.now() - 5000, // 5 seconds ago
  };

  const configError: ApiError = {
    type: 'config',
    message: 'Configuration error',
    retryable: false,
    timestamp: Date.now() - 1000, // 1 second ago
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should not render when error is null', () => {
      const { container } = render(
        <ErrorDisplay error={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render error message and icon', () => {
      render(
        <ErrorDisplay error={networkError} />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
      expect(screen.getByText('🌐')).toBeInTheDocument();
    });

    it('should display formatted timestamp', () => {
      render(
        <ErrorDisplay error={networkError} />
      );

      expect(screen.getByText(/1 minute ago/)).toBeInTheDocument();
    });
  });

  describe('Error Types', () => {
    it('should display network error correctly', () => {
      render(
        <ErrorDisplay error={networkError} />
      );

      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('🌐')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
    });

    it('should display authentication error correctly', () => {
      render(
        <ErrorDisplay error={authError} />
      );

      expect(screen.getByText('Authentication Error')).toBeInTheDocument();
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText(/Authentication failed/)).toBeInTheDocument();
    });

    it('should display validation error correctly', () => {
      render(
        <ErrorDisplay error={validationError} />
      );

      expect(screen.getByText('Data Error')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText(/could not be found/)).toBeInTheDocument();
    });

    it('should display configuration error correctly', () => {
      render(
        <ErrorDisplay error={configError} />
      );

      expect(screen.getByText('Configuration Error')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
      expect(screen.getByText(/Configuration error/)).toBeInTheDocument();
    });
  });

  describe('Special Error Messages', () => {
    it('should handle rate limit error message', () => {
      const rateLimitError: ApiError = {
        type: 'network',
        message: 'Rate limit exceeded',
        retryable: true,
        timestamp: Date.now(),
      };

      render(
        <ErrorDisplay error={rateLimitError} />
      );

      expect(screen.getByText(/Too many requests/)).toBeInTheDocument();
    });

    it('should handle timeout error message', () => {
      const timeoutError: ApiError = {
        type: 'network',
        message: 'Connection timeout occurred',
        retryable: true,
        timestamp: Date.now(),
      };

      render(
        <ErrorDisplay error={timeoutError} />
      );

      expect(screen.getByText(/Connection timed out/)).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should show retry button for retryable errors', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toBeInTheDocument();
    });

    it('should not show retry button for non-retryable errors', () => {
      render(
        <ErrorDisplay 
          error={authError} 
          onRetry={mockOnRetry}
        />
      );

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when showRetry is false', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onRetry={mockOnRetry}
          showRetry={false}
        />
      );

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should show dismiss button by default', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss error');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss error');
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should not show dismiss button when showDismiss is false', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onDismiss={mockOnDismiss}
          showDismiss={false}
        />
      );

      expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
    });

    it('should not show dismiss button when onDismiss is not provided', () => {
      render(
        <ErrorDisplay error={networkError} />
      );

      expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      const { container } = render(
        <ErrorDisplay error={networkError} size="small" />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('text-sm', 'p-3');
    });

    it('should apply medium size classes by default', () => {
      const { container } = render(
        <ErrorDisplay error={networkError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('text-base', 'p-4');
    });

    it('should apply large size classes', () => {
      const { container } = render(
        <ErrorDisplay error={networkError} size="large" />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('text-lg', 'p-6');
    });
  });

  describe('Position Variants', () => {
    it('should apply inline position classes by default', () => {
      const { container } = render(
        <ErrorDisplay error={networkError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('relative');
    });

    it('should apply floating position classes', () => {
      const { container } = render(
        <ErrorDisplay error={networkError} position="floating" />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
    });

    it('should apply banner position classes', () => {
      const { container } = render(
        <ErrorDisplay error={networkError} position="banner" />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('w-full');
    });
  });

  describe('Error Type Styling', () => {
    it('should apply network error styling', () => {
      const { container } = render(
        <ErrorDisplay error={networkError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
    });

    it('should apply auth error styling', () => {
      const { container } = render(
        <ErrorDisplay error={authError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
    });

    it('should apply validation error styling', () => {
      const { container } = render(
        <ErrorDisplay error={validationError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');
    });

    it('should apply config error styling', () => {
      const { container } = render(
        <ErrorDisplay error={configError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('bg-purple-50', 'border-purple-200', 'text-purple-800');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <ErrorDisplay error={networkError} />
      );

      const errorDiv = screen.getByRole('alert');
      expect(errorDiv).toHaveAttribute('aria-live', 'polite');
    });

    it('should have accessible retry button', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onRetry={mockOnRetry}
        />
      );

      const retryButton = screen.getByText('Try Again');
      expect(retryButton).toHaveAttribute('type', 'button');
    });

    it('should have accessible dismiss button', () => {
      render(
        <ErrorDisplay 
          error={networkError} 
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss error');
      expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss error');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should show "just now" for very recent errors', () => {
      const recentError: ApiError = {
        ...networkError,
        timestamp: Date.now() - 30000, // 30 seconds ago
      };

      render(
        <ErrorDisplay error={recentError} />
      );

      expect(screen.getByText(/just now/)).toBeInTheDocument();
    });

    it('should show minutes for errors within an hour', () => {
      const minutesAgoError: ApiError = {
        ...networkError,
        timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
      };

      render(
        <ErrorDisplay error={minutesAgoError} />
      );

      expect(screen.getByText(/5 minutes ago/)).toBeInTheDocument();
    });

    it('should show time for older errors', () => {
      const oldError: ApiError = {
        ...networkError,
        timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      };

      render(
        <ErrorDisplay error={oldError} />
      );

      // Should show time format (not testing exact time due to timezone differences)
      expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();
    });
  });
});

describe('Error Display Variants', () => {
  const networkError: ApiError = {
    type: 'network',
    message: 'Network error',
    retryable: true,
    timestamp: Date.now(),
  };

  describe('CompactErrorDisplay', () => {
    it('should render with small size and inline position', () => {
      const { container } = render(
        <CompactErrorDisplay error={networkError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('text-sm', 'p-3', 'relative');
    });
  });

  describe('FloatingErrorDisplay', () => {
    it('should render with floating position', () => {
      const { container } = render(
        <FloatingErrorDisplay error={networkError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('fixed', 'top-4', 'right-4', 'z-50');
    });
  });

  describe('BannerErrorDisplay', () => {
    it('should render with banner position', () => {
      const { container } = render(
        <BannerErrorDisplay error={networkError} />
      );

      const errorDiv = container.firstChild as HTMLElement;
      expect(errorDiv).toHaveClass('w-full');
    });
  });
});