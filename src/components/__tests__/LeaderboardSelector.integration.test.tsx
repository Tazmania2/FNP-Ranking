import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeaderboardSelector } from '../LeaderboardSelector';
import { appStoreActions } from '../../store/appStore';
import type { Leaderboard } from '../../types';

// Mock leaderboards for integration testing
const mockLeaderboards: Leaderboard[] = [
  {
    _id: 'lb1',
    title: 'Weekly Challenge',
    description: 'Weekly leaderboard for challenges',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 7,
      timeScale: 1,
    },
  },
  {
    _id: 'lb2',
    title: 'Monthly Competition',
    description: 'Monthly leaderboard for competitions',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 30,
      timeScale: 1,
    },
  },
];

describe('LeaderboardSelector Integration Tests', () => {
  beforeEach(() => {
    // Clean up any existing state
    appStoreActions.cleanup();
    
    // Initialize with mock leaderboards
    appStoreActions.initializeApp(mockLeaderboards);
  });

  it('should integrate with real store and switch leaderboards', async () => {
    render(<LeaderboardSelector />);

    // Should show the first leaderboard by default
    expect(screen.getByText('Weekly Challenge')).toBeInTheDocument();

    // Open dropdown
    const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
    fireEvent.click(dropdownButton);

    // Select different leaderboard
    const monthlyOption = screen.getByRole('option', { name: /monthly competition/i });
    fireEvent.click(monthlyOption);

    // Should update to show the new leaderboard
    await waitFor(() => {
      expect(screen.getByText('Monthly Competition')).toBeInTheDocument();
    });
  });

  it('should enable and disable auto-cycling with real store', async () => {
    render(<LeaderboardSelector />);

    // Auto-cycle should be disabled by default
    const autoCycleButton = screen.getByRole('button', { name: /auto cycle/i });
    expect(autoCycleButton).toHaveClass('bg-gray-100');

    // Enable auto-cycling
    fireEvent.click(autoCycleButton);

    // Should show enabled state
    await waitFor(() => {
      expect(autoCycleButton).toHaveClass('bg-green-100');
    });

    // Should show status indicator
    expect(screen.getByText('1 of 2')).toBeInTheDocument();

    // Disable auto-cycling
    fireEvent.click(autoCycleButton);

    // Should return to disabled state
    await waitFor(() => {
      expect(autoCycleButton).toHaveClass('bg-gray-100');
    });

    // Status indicator should be hidden
    expect(screen.queryByText('1 of 2')).not.toBeInTheDocument();
  });

  it('should show countdown timer when auto-cycling is enabled', async () => {
    render(<LeaderboardSelector />);

    // Enable auto-cycling
    const autoCycleButton = screen.getByRole('button', { name: /auto cycle/i });
    fireEvent.click(autoCycleButton);

    // Should show countdown timer
    await waitFor(() => {
      expect(screen.getByText(/\d+:\d+/)).toBeInTheDocument();
    });
  });

  it('should handle single leaderboard scenario', () => {
    // Clean up and initialize with single leaderboard
    appStoreActions.cleanup();
    appStoreActions.initializeApp([mockLeaderboards[0]]);

    render(<LeaderboardSelector />);

    // Should show the leaderboard
    expect(screen.getByText('Weekly Challenge')).toBeInTheDocument();

    // Should not show auto-cycle button
    expect(screen.queryByRole('button', { name: /auto cycle/i })).not.toBeInTheDocument();
  });

  it('should call onLeaderboardChange callback', async () => {
    const onLeaderboardChange = vi.fn();
    
    render(<LeaderboardSelector onLeaderboardChange={onLeaderboardChange} />);

    // Open dropdown and select different leaderboard
    const dropdownButton = screen.getByRole('button', { name: /weekly challenge/i });
    fireEvent.click(dropdownButton);

    const monthlyOption = screen.getByRole('option', { name: /monthly competition/i });
    fireEvent.click(monthlyOption);

    // Should call the callback
    await waitFor(() => {
      expect(onLeaderboardChange).toHaveBeenCalledWith('lb2');
    });
  });
});