import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { 
  LoadingDisplay, 
  InlineLoading, 
  OverlayLoading, 
  ComponentLoading 
} from '../LoadingDisplay';
import type { LoadingState } from '../../types';

describe('LoadingDisplay', () => {
  const emptyLoadingState: LoadingState = {
    leaderboards: false,
    currentLeaderboard: false,
    switchingLeaderboard: false,
  };

  const leaderboardsLoadingState: LoadingState = {
    leaderboards: true,
    currentLeaderboard: false,
    switchingLeaderboard: false,
  };

  const currentLeaderboardLoadingState: LoadingState = {
    leaderboards: false,
    currentLeaderboard: true,
    switchingLeaderboard: false,
  };

  const switchingLeaderboardState: LoadingState = {
    leaderboards: false,
    currentLeaderboard: false,
    switchingLeaderboard: true,
  };

  describe('Basic Rendering', () => {
    it('should not render when no loading states are active', () => {
      const { container } = render(
        <LoadingDisplay loading={emptyLoadingState} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render spinner and message when loading', () => {
      render(
        <LoadingDisplay loading={leaderboardsLoadingState} />
      );

      expect(screen.getByText('Loading leaderboards...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should use custom message when provided', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          message="Custom loading message"
        />
      );

      expect(screen.getByText('Custom loading message')).toBeInTheDocument();
    });

    it('should hide message when showMessage is false', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          showMessage={false}
        />
      );

      expect(screen.queryByText('Loading leaderboards...')).not.toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Loading Messages', () => {
    it('should show correct message for leaderboards loading', () => {
      render(
        <LoadingDisplay loading={leaderboardsLoadingState} />
      );

      expect(screen.getByText('Loading leaderboards...')).toBeInTheDocument();
    });

    it('should show correct message for current leaderboard loading', () => {
      render(
        <LoadingDisplay loading={currentLeaderboardLoadingState} />
      );

      expect(screen.getByText('Updating race data...')).toBeInTheDocument();
    });

    it('should show correct message for switching leaderboard', () => {
      render(
        <LoadingDisplay loading={switchingLeaderboardState} />
      );

      expect(screen.getByText('Switching leaderboard...')).toBeInTheDocument();
    });

    it('should prioritize leaderboards loading message', () => {
      const multipleLoadingState: LoadingState = {
        leaderboards: true,
        currentLeaderboard: true,
        switchingLeaderboard: true,
      };

      render(
        <LoadingDisplay loading={multipleLoadingState} />
      );

      expect(screen.getByText('Loading leaderboards...')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render spinner variant by default', () => {
      render(
        <LoadingDisplay loading={leaderboardsLoadingState} />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should render dots variant', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          variant="dots"
        />
      );

      const dotsContainer = screen.getByRole('status');
      expect(dotsContainer).toBeInTheDocument();
      // Check for multiple dots
      const dots = dotsContainer.querySelectorAll('div');
      expect(dots).toHaveLength(3);
    });

    it('should render pulse variant', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          variant="pulse"
        />
      );

      const pulse = screen.getByRole('status');
      expect(pulse).toHaveClass('animate-pulse');
    });

    it('should render skeleton variant for switching leaderboard', () => {
      render(
        <LoadingDisplay 
          loading={switchingLeaderboardState} 
          variant="skeleton"
        />
      );

      expect(screen.getByLabelText('Loading chicken race')).toBeInTheDocument();
      expect(screen.getByText('Loading race data...')).toBeInTheDocument();
    });

    it('should render skeleton variant for other loading states', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          variant="skeleton"
        />
      );

      expect(screen.getByLabelText('Loading sidebar')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size classes', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          size="small"
        />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('should apply medium size classes by default', () => {
      render(
        <LoadingDisplay loading={leaderboardsLoadingState} />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-6', 'h-6');
    });

    it('should apply large size classes', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          size="large"
        />
      );

      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('w-8', 'h-8');
    });
  });

  describe('Custom Classes', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('InlineLoading', () => {
  it('should render spinner with correct size', () => {
    render(<InlineLoading size="small" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4', 'animate-spin');
  });

  it('should apply custom className', () => {
    render(<InlineLoading className="custom-inline" />);

    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-inline');
  });
});

describe('OverlayLoading', () => {
  it('should not render when no loading states are active', () => {
    const { container } = render(
      <OverlayLoading loading={emptyLoadingState} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render overlay with loading content', () => {
    render(
      <OverlayLoading loading={leaderboardsLoadingState} />
    );

    expect(screen.getByText('Loading leaderboards...')).toBeInTheDocument();
    
    const overlay = screen.getByText('Loading leaderboards...').closest('div');
    expect(overlay?.parentElement).toHaveClass('absolute', 'inset-0', 'bg-white', 'bg-opacity-80');
  });

  it('should use custom message', () => {
    render(
      <OverlayLoading 
        loading={leaderboardsLoadingState} 
        message="Custom overlay message"
      />
    );

    expect(screen.getByText('Custom overlay message')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <OverlayLoading 
        loading={leaderboardsLoadingState} 
        className="custom-overlay"
      />
    );

    expect(container.firstChild).toHaveClass('custom-overlay');
  });
});

describe('ComponentLoading', () => {
  it('should not render when isLoading is false', () => {
    const { container } = render(
      <ComponentLoading isLoading={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render when isLoading is true', () => {
    render(
      <ComponentLoading isLoading={true} />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should use custom message', () => {
    render(
      <ComponentLoading 
        isLoading={true} 
        message="Component loading..."
      />
    );

    expect(screen.getByText('Component loading...')).toBeInTheDocument();
  });

  it('should render different variants', () => {
    const { rerender } = render(
      <ComponentLoading 
        isLoading={true} 
        variant="dots"
      />
    );

    let indicator = screen.getByRole('status');
    expect(indicator.querySelectorAll('div')).toHaveLength(3);

    rerender(
      <ComponentLoading 
        isLoading={true} 
        variant="pulse"
      />
    );

    indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('animate-pulse');

    rerender(
      <ComponentLoading 
        isLoading={true} 
        variant="spinner"
      />
    );

    indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('animate-spin');
  });

  it('should apply different sizes', () => {
    const { rerender } = render(
      <ComponentLoading 
        isLoading={true} 
        size="small"
      />
    );

    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4');

    rerender(
      <ComponentLoading 
        isLoading={true} 
        size="large"
      />
    );

    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ComponentLoading 
        isLoading={true} 
        className="custom-component"
      />
    );

    expect(container.firstChild).toHaveClass('custom-component');
  });
});

describe('Skeleton Components', () => {
  describe('ChickenRaceSkeleton', () => {
    it('should render chicken race skeleton with animated elements', () => {
      render(
        <LoadingDisplay 
          loading={switchingLeaderboardState} 
          variant="skeleton"
        />
      );

      const skeleton = screen.getByLabelText('Loading chicken race');
      expect(skeleton).toHaveClass('animate-pulse');
      expect(screen.getByText('Loading race data...')).toBeInTheDocument();
      
      // Check for simulated chickens
      const chickens = skeleton.querySelectorAll('.bg-yellow-200');
      expect(chickens.length).toBeGreaterThan(0);
      
      // Check for finish line
      const finishLine = skeleton.querySelector('.bg-gray-200');
      expect(finishLine).toBeInTheDocument();
    });
  });

  describe('SidebarSkeleton', () => {
    it('should render sidebar skeleton with player list', () => {
      render(
        <LoadingDisplay 
          loading={leaderboardsLoadingState} 
          variant="skeleton"
        />
      );

      const skeleton = screen.getByLabelText('Loading sidebar');
      expect(skeleton).toHaveClass('animate-pulse');
      
      // Check for simulated player avatars
      const avatars = skeleton.querySelectorAll('.bg-yellow-200');
      expect(avatars).toHaveLength(5); // Should have 5 player placeholders
      
      // Check for header placeholder
      const header = skeleton.querySelector('.bg-gray-200');
      expect(header).toBeInTheDocument();
    });
  });
});

describe('Accessibility', () => {
  it('should have proper ARIA labels for loading indicators', () => {
    render(
      <LoadingDisplay loading={leaderboardsLoadingState} />
    );

    const loadingIndicator = screen.getByRole('status');
    expect(loadingIndicator).toHaveAttribute('aria-label', 'Loading');
  });

  it('should have proper ARIA labels for skeleton components', () => {
    render(
      <LoadingDisplay 
        loading={switchingLeaderboardState} 
        variant="skeleton"
      />
    );

    expect(screen.getByLabelText('Loading chicken race')).toBeInTheDocument();
  });

  it('should have proper ARIA labels for dots variant', () => {
    render(
      <LoadingDisplay 
        loading={leaderboardsLoadingState} 
        variant="dots"
      />
    );

    const dotsIndicator = screen.getByRole('status');
    expect(dotsIndicator).toHaveAttribute('aria-label', 'Loading');
  });
});