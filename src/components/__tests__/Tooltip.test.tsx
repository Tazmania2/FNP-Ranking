import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Tooltip from '../Tooltip';
import type { TooltipContent } from '../../types';

describe('Tooltip Component', () => {
  const mockTooltipContent: TooltipContent = {
    rank: 1,
    points: 1500,
    pointsGainedToday: 250,
    playerName: 'Test Player',
  };

  const defaultProps = {
    isVisible: true,
    position: { x: 50, y: 50 },
    content: mockTooltipContent,
  };

  const renderTooltip = (props?: Record<string, unknown>) =>
    render(
      <div data-testid="tooltip-container" style={{ position: 'relative', width: '400px', height: '320px' }}>
        <Tooltip {...defaultProps} {...props} />
      </div>
    );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders tooltip when visible with content', () => {
    renderTooltip();

    expect(screen.getByText('Test Player')).toBeInTheDocument();
    expect(screen.getByText(/#1/)).toBeInTheDocument();
    expect(
      screen.getByText((text) => text.includes('1500.0'))
    ).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    renderTooltip({ isVisible: false });

    expect(screen.queryByText('Test Player')).not.toBeInTheDocument();
  });

  it('does not render when content is null', () => {
    renderTooltip({ content: null });

    expect(screen.queryByText('Test Player')).not.toBeInTheDocument();
  });

  it('auto-hides after 5 seconds', () => {
    const onClose = vi.fn();
    renderTooltip({ onClose });

    expect(onClose).not.toHaveBeenCalled();

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears timer when component unmounts', () => {
    const onClose = vi.fn();
    const { unmount } = renderTooltip({ onClose });

    unmount();

    // Fast-forward past 5 seconds
    vi.advanceTimersByTime(6000);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('resets timer when visibility changes', () => {
    const onClose = vi.fn();
    const { rerender } = renderTooltip({ onClose });

    // Fast-forward 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Hide and show again
    rerender(
      <div data-testid="tooltip-container" style={{ position: 'relative', width: '400px', height: '320px' }}>
        <Tooltip {...defaultProps} isVisible={false} onClose={onClose} />
      </div>
    );
    rerender(
      <div data-testid="tooltip-container" style={{ position: 'relative', width: '400px', height: '320px' }}>
        <Tooltip {...defaultProps} isVisible={true} onClose={onClose} />
      </div>
    );

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
    renderTooltip({ content, isFixed: true });

    // The value is rendered within the same text node
    expect(
      screen.getByText((text) => text.includes('1234567.0'))
    ).toBeInTheDocument();
    expect(
      screen.getByText((text) => text.includes('12345.0'))
    ).toBeInTheDocument();
  });

  it('truncates long player names', () => {
    const content = {
      ...mockTooltipContent,
      playerName: 'This is a very long player name that should be truncated'
    };
    renderTooltip({ content });

    const playerNameElement = screen.getByText(content.playerName);
    expect(playerNameElement).toHaveClass('truncate');
  });

  it('disables auto-hide when tooltip is fixed', () => {
    const onClose = vi.fn();
    renderTooltip({ onClose, isFixed: true });

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

});