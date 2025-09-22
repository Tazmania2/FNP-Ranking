import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Tooltip from '../Tooltip';
import type { TooltipContent } from '../../types';

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

describe('Tooltip Component', () => {
  const mockTooltipContent: TooltipContent = {
    rank: 1,
    points: 1500,
    pointsGainedToday: 250,
    playerName: 'Test Player',
  };

  const defaultProps = {
    isVisible: true,
    position: { x: 100, y: 100 },
    content: mockTooltipContent,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders tooltip when visible with content', () => {
    render(<Tooltip {...defaultProps} />);

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    // Use regex to handle different locale formatting
    expect(screen.getByText(/1[,.]500/)).toBeInTheDocument();
    expect(screen.getByText(/\+250/)).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<Tooltip {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Test Player')).not.toBeInTheDocument();
  });

  it('does not render when content is null', () => {
    render(<Tooltip {...defaultProps} content={null} />);

    expect(screen.queryByText('Test Player')).not.toBeInTheDocument();
  });

  it('displays correct position styling', () => {
    const { container } = render(<Tooltip {...defaultProps} />);
    const tooltipContainer = container.querySelector('.tooltip-container');

    expect(tooltipContainer).toHaveStyle({
      left: '100px',
      top: '100px',
    });
  });

  it('shows leader crown for rank 1', () => {
    render(<Tooltip {...defaultProps} />);

    expect(screen.getByText('👑')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();
  });

  it('shows trophy for top 3 ranks', () => {
    const content = { ...mockTooltipContent, rank: 2 };
    render(<Tooltip {...defaultProps} content={content} />);

    expect(screen.getByText('🏆')).toBeInTheDocument();
    expect(screen.getByText('Top 3')).toBeInTheDocument();
  });

  it('shows fire icon for positive points gained', () => {
    render(<Tooltip {...defaultProps} />);

    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('On Fire')).toBeInTheDocument();
  });

  it('displays negative points gained correctly', () => {
    const content = { ...mockTooltipContent, pointsGainedToday: -50 };
    render(<Tooltip {...defaultProps} content={content} />);

    expect(screen.getByText('-50')).toBeInTheDocument();
    expect(screen.getByText('↘️')).toBeInTheDocument();
  });

  it('displays zero points gained correctly', () => {
    const content = { ...mockTooltipContent, pointsGainedToday: 0 };
    render(<Tooltip {...defaultProps} content={content} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('➡️')).toBeInTheDocument();
  });

  it('auto-hides after 5 seconds', () => {
    const onClose = vi.fn();
    render(<Tooltip {...defaultProps} onClose={onClose} />);

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears timer when component unmounts', () => {
    const onClose = vi.fn();
    const { unmount } = render(<Tooltip {...defaultProps} onClose={onClose} />);

    unmount();

    // Fast-forward past 5 seconds
    vi.advanceTimersByTime(6000);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets timer when visibility changes', () => {
    const onClose = vi.fn();
    const { rerender } = render(<Tooltip {...defaultProps} onClose={onClose} />);

    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Hide and show again
    rerender(<Tooltip {...defaultProps} isVisible={false} onClose={onClose} />);
    rerender(<Tooltip {...defaultProps} isVisible={true} onClose={onClose} />);

    // Fast-forward 3 more seconds (should not trigger yet)
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward 2 more seconds (total 5 from last show)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('formats large numbers correctly', () => {
    const content = { 
      ...mockTooltipContent, 
      points: 1234567,
      pointsGainedToday: 12345 
    };
    render(<Tooltip {...defaultProps} content={content} />);

    // Use regex to handle different locale formatting
    expect(screen.getByText(/1[,.]234[,.]567/)).toBeInTheDocument();
    expect(screen.getByText(/\+12[,.]345/)).toBeInTheDocument();
  });

  it('truncates long player names', () => {
    const content = { 
      ...mockTooltipContent, 
      playerName: 'This is a very long player name that should be truncated' 
    };
    render(<Tooltip {...defaultProps} content={content} />);

    const playerNameElement = screen.getByText(content.playerName);
    expect(playerNameElement).toHaveClass('truncate');
  });
});