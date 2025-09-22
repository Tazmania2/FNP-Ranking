import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Sidebar } from '../Sidebar';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import type { Player, Leaderboard } from '../../types';

// Mock data
const mockLeaderboard: Leaderboard = {
  _id: 'integration-test-leaderboard',
  title: 'Integration Test Championship',
  description: 'Testing integration with store',
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
};

const mockPlayers: Player[] = [
  {
    _id: 'integration-player-1',
    player: 'integration-player-1',
    name: 'Store Test Player 1',
    position: 1,
    total: 3000,
    previous_position: 2,
    move: 'up',
  },
  {
    _id: 'integration-player-2',
    player: 'integration-player-2',
    name: 'Store Test Player 2',
    position: 2,
    total: 2500,
    previous_position: 1,
    move: 'down',
  },
  {
    _id: 'integration-player-3',
    player: 'integration-player-3',
    name: 'Store Test Player 3',
    position: 3,
    total: 2000,
  },
];

// Component that uses the store and renders Sidebar
const SidebarWithStore: React.FC = () => {
  const currentLeaderboard = useLeaderboardStore((state) => state.currentLeaderboard);
  const players = useLeaderboardStore((state) => state.players);
  const loading = useLeaderboardStore((state) => state.loading);

  return (
    <Sidebar
      topPlayers={players}
      currentLeaderboard={currentLeaderboard}
      totalPlayers={players.length}
      isLoading={loading.currentLeaderboard}
    />
  );
};

describe('Sidebar Integration Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useLeaderboardStore.getState().resetStore();
  });

  describe('Store Integration', () => {
    it('renders correctly when connected to leaderboard store', () => {
      const { setCurrentLeaderboard, setPlayers } = useLeaderboardStore.getState();

      // Set up store data
      act(() => {
        setCurrentLeaderboard(mockLeaderboard);
        setPlayers(mockPlayers);
      });

      render(<SidebarWithStore />);

      // Verify content from store is displayed
      expect(screen.getByText('Integration Test Championship')).toBeInTheDocument();
      expect(screen.getByText('Store Test Player 1')).toBeInTheDocument();
      expect(screen.getByText('Store Test Player 2')).toBeInTheDocument();
      expect(screen.getByText('Store Test Player 3')).toBeInTheDocument();
      expect(screen.getByText('Showing top 5 of 3 players')).toBeInTheDocument();
    });

    it('updates when store data changes', () => {
      const { setCurrentLeaderboard, setPlayers } = useLeaderboardStore.getState();

      // Initial render with empty data
      render(<SidebarWithStore />);
      expect(screen.getByText('No players found')).toBeInTheDocument();

      // Update store with data
      act(() => {
        setCurrentLeaderboard(mockLeaderboard);
        setPlayers(mockPlayers);
      });

      // Verify updated content
      expect(screen.queryByText('No players found')).not.toBeInTheDocument();
      expect(screen.getByText('Store Test Player 1')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Championship')).toBeInTheDocument();
    });

    it('shows loading state when store loading is true', () => {
      const { setLoading } = useLeaderboardStore.getState();

      // Set loading state
      act(() => {
        setLoading('currentLeaderboard', true);
      });

      render(<SidebarWithStore />);

      // Should show loading skeleton
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });

    it('handles player position changes from store updates', () => {
      const { setCurrentLeaderboard, setPlayers } = useLeaderboardStore.getState();

      // Initial setup
      act(() => {
        setCurrentLeaderboard(mockLeaderboard);
        setPlayers(mockPlayers);
      });

      render(<SidebarWithStore />);

      // Verify initial positions
      expect(screen.getByText('Store Test Player 1')).toBeInTheDocument();
      expect(screen.getByText('↗️ +1')).toBeInTheDocument(); // Player 1 moved up

      // Update players with new positions
      const updatedPlayers: Player[] = [
        {
          ...mockPlayers[1], // Player 2 now in first
          position: 1,
          previous_position: 2,
          move: 'up',
        },
        {
          ...mockPlayers[0], // Player 1 now in second
          position: 2,
          previous_position: 1,
          move: 'down',
        },
        {
          ...mockPlayers[2], // Player 3 stays same
          position: 3,
        },
      ];

      act(() => {
        setPlayers(updatedPlayers);
      });

      // Verify position changes are reflected
      const player2Element = screen.getByText('Store Test Player 2');
      const player1Element = screen.getByText('Store Test Player 1');
      
      expect(player2Element).toBeInTheDocument();
      expect(player1Element).toBeInTheDocument();
      
      // Check for movement indicators
      expect(screen.getByText('↗️ +1')).toBeInTheDocument(); // Player 2 moved up
      expect(screen.getByText('↘️ -1')).toBeInTheDocument(); // Player 1 moved down
    });

    it('handles empty leaderboard from store', () => {
      const { setPlayers } = useLeaderboardStore.getState();

      // Set empty players array
      act(() => {
        setPlayers([]);
      });

      render(<SidebarWithStore />);

      // Should show empty state
      expect(screen.getByText('No players found')).toBeInTheDocument();
      expect(screen.getByText('🐔')).toBeInTheDocument();
      expect(screen.getByText('Showing top 5 of 0 players')).toBeInTheDocument();
    });

    it('handles large player lists from store', () => {
      const { setCurrentLeaderboard, setPlayers } = useLeaderboardStore.getState();

      // Create a large list of players (more than 5)
      const largePlayers: Player[] = Array.from({ length: 10 }, (_, index) => ({
        _id: `large-player-${index + 1}`,
        player: `large-player-${index + 1}`,
        name: `Large Player ${index + 1}`,
        position: index + 1,
        total: 1000 - (index * 100),
      }));

      act(() => {
        setCurrentLeaderboard(mockLeaderboard);
        setPlayers(largePlayers);
      });

      render(<SidebarWithStore />);

      // Should only show top 5 players
      expect(screen.getByText('Large Player 1')).toBeInTheDocument();
      expect(screen.getByText('Large Player 2')).toBeInTheDocument();
      expect(screen.getByText('Large Player 3')).toBeInTheDocument();
      expect(screen.getByText('Large Player 4')).toBeInTheDocument();
      expect(screen.getByText('Large Player 5')).toBeInTheDocument();
      
      // Should not show players beyond top 5
      expect(screen.queryByText('Large Player 6')).not.toBeInTheDocument();
      expect(screen.queryByText('Large Player 10')).not.toBeInTheDocument();

      // Should show correct total count
      expect(screen.getByText('Showing top 5 of 10 players')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('handles store errors gracefully', () => {
      const { setCurrentLeaderboard, setPlayers, setError } = useLeaderboardStore.getState();

      // Set up data and then an error
      act(() => {
        setCurrentLeaderboard(mockLeaderboard);
        setPlayers(mockPlayers);
        setError({
          type: 'network',
          message: 'Network error occurred',
          retryable: true,
          timestamp: Date.now(),
        });
      });

      render(<SidebarWithStore />);

      // Should still render the sidebar with available data
      expect(screen.getByText('Store Test Player 1')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Championship')).toBeInTheDocument();
    });
  });
});