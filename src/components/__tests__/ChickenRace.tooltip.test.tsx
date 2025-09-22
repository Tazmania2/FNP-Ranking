import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import ChickenRace from '../ChickenRace';
import type { Player } from '../../types';

// Mock the UI store
const mockShowTooltip = vi.fn();
const mockHideTooltip = vi.fn();
const mockUpdateTooltipPosition = vi.fn();

vi.mock('../../store/uiStore', () => ({
  useUIStore: () => ({
    tooltips: {
      playerId: 'player1',
      isVisible: true,
      position: { x: 100, y: 100 },
      content: {
        rank: 1,
        points: 1500,
        pointsGainedToday: 250,
        playerName: 'Alice',
      },
    },
    showTooltip: mockShowTooltip,
    hideTooltip: mockHideTooltip,
    updateTooltipPosition: mockUpdateTooltipPosition,
  }),
}));

describe('ChickenRace Tooltip Integration', () => {
  const mockPlayers: Player[] = [
    {
      _id: 'player1',
      player: 'player1',
      name: 'Alice',
      position: 1,
      total: 1500,
      previous_total: 1250,
    },
    {
      _id: 'player2',
      player: 'player2',
      name: 'Bob',
      position: 2,
      total: 1200,
      previous_total: 1300,
    },
  ];

  const defaultProps = {
    players: mockPlayers,
    leaderboardTitle: 'Test Leaderboard',
    isLoading: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders tooltip when hovering over chicken', async () => {
    render(<ChickenRace {...defaultProps} />);

    // Find a chicken element (should have chicken emoji)
    const chickenElements = screen.getAllByText('🐔');
    expect(chickenElements.length).toBeGreaterThan(0);

    // Hover over the first chicken
    fireEvent.mouseEnter(chickenElements[0]);

    // Should show tooltip content - check for tooltip-specific Alice
    const aliceElements = screen.getAllByText('Alice');
    const tooltipAlice = aliceElements.find(el => el.closest('.tooltip-content'));
    expect(tooltipAlice).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText(/1[,.]500/)).toBeInTheDocument();
  });

  it('hides tooltip when mouse leaves chicken', async () => {
    render(<ChickenRace {...defaultProps} />);

    const chickenElements = screen.getAllByText('🐔');
    
    // Hover over chicken
    fireEvent.mouseEnter(chickenElements[0]);
    
    // Mouse leave
    fireEvent.mouseLeave(chickenElements[0]);

    // Tooltip should be hidden (mocked store still shows it, but hideTooltip should be called)
    expect(mockHideTooltip).toHaveBeenCalled();
  });

  it('displays correct tooltip content for different players', () => {
    render(<ChickenRace {...defaultProps} />);

    // The tooltip content is mocked, but we can verify the component structure
    const aliceElements = screen.getAllByText('Alice');
    const tooltipAlice = aliceElements.find(el => el.closest('.tooltip-content'));
    expect(tooltipAlice).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument(); // Rank 1 shows leader
    expect(screen.getByText('👑')).toBeInTheDocument(); // Crown for leader
  });

  it('shows tooltip with correct positioning', () => {
    const { container } = render(<ChickenRace {...defaultProps} />);

    const tooltipContainer = container.querySelector('.tooltip-container');
    expect(tooltipContainer).toBeInTheDocument();
    expect(tooltipContainer).toHaveStyle({
      left: '100px',
      top: '100px',
    });
  });

  it('does not show tooltips when loading', () => {
    render(<ChickenRace {...defaultProps} isLoading={true} />);

    // Should show loading state instead
    expect(screen.getByText('Loading chicken race...')).toBeInTheDocument();
    
    // Should not show tooltip content
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('handles empty players list gracefully', () => {
    render(<ChickenRace {...defaultProps} players={[]} />);

    expect(screen.getByText('No players in this race yet')).toBeInTheDocument();
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });

  it('calls hideTooltip when tooltip should auto-hide', () => {
    render(<ChickenRace {...defaultProps} />);

    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // The tooltip component should handle auto-hiding
    expect(mockHideTooltip).toHaveBeenCalled();
  });

  it('shows performance indicators correctly', () => {
    render(<ChickenRace {...defaultProps} />);

    // Should show leader crown
    expect(screen.getByText('👑')).toBeInTheDocument();
    expect(screen.getByText('Leader')).toBeInTheDocument();

    // Should show "On Fire" for positive gains
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('On Fire')).toBeInTheDocument();
  });

  it('formats points correctly in tooltip', () => {
    render(<ChickenRace {...defaultProps} />);

    // Should format numbers with commas (use regex for locale flexibility)
    expect(screen.getByText(/1[,.]500/)).toBeInTheDocument();
    expect(screen.getByText(/\+250/)).toBeInTheDocument();
  });

  it('shows correct movement indicator for positive gains', () => {
    render(<ChickenRace {...defaultProps} />);

    expect(screen.getByText('↗️')).toBeInTheDocument();
  });

  it('positions chickens correctly for tooltip interaction', () => {
    const { container } = render(<ChickenRace {...defaultProps} />);

    const chickenContainers = container.querySelectorAll('.chicken-container');
    expect(chickenContainers.length).toBe(mockPlayers.length);

    // Each chicken should be positioned and have hover handlers
    chickenContainers.forEach((chicken) => {
      expect(chicken).toHaveStyle({ cursor: 'pointer' });
      expect(chicken).toHaveStyle({ position: 'absolute' });
    });
  });

  it('maintains tooltip visibility during hover', async () => {
    render(<ChickenRace {...defaultProps} />);

    const chickenElements = screen.getAllByText('🐔');
    
    // Start hovering
    fireEvent.mouseEnter(chickenElements[0]);
    
    // Wait a bit but don't leave
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    // Tooltip should still be visible (content still shows) - check tooltip content specifically
    const tooltipAlice = screen.getAllByText('Alice').find(el => 
      el.closest('.tooltip-content')
    );
    expect(tooltipAlice).toBeInTheDocument();
    
    // Only after leaving should it hide
    fireEvent.mouseLeave(chickenElements[0]);
    expect(mockHideTooltip).toHaveBeenCalled();
  });
});