import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { DetailedRanking } from '../DetailedRanking';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import type { Player, Leaderboard } from '../../types';

// Mock the store
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

const createTestPlayer = (id: number, overrides: Partial<Player> = {}): Player => ({
  _id: `integration-player-${id}`,
  player: `integration-player-${id}`,
  name: `Integration Player ${id}`,
  position: id,
  total: 2000 - (id * 100),
  previous_position: id + 1,
  previous_total: 1900 - (id * 100),
  move: 'up',
  ...overrides,
});

const testPlayers: Player[] = [
  createTestPlayer(1, { name: 'Alpha Leader', total: 2500, move: 'up' }),
  createTestPlayer(2, { name: 'Beta Runner', total: 2200, move: 'down' }),
  createTestPlayer(3, { name: 'Gamma Steady', total: 1900, move: 'same' }),
  createTestPlayer(4, { name: 'Delta Climber', total: 1600, move: 'up' }),
  createTestPlayer(5, { name: 'Epsilon Competitor', total: 1300, move: 'down' }),
];

// Component that uses the store
const DetailedRankingWithStore: React.FC = () => {
  const players = useLeaderboardStore((state) => state.players);
  const currentLeaderboard = useLeaderboardStore((state) => state.currentLeaderboard);
  const loading = useLeaderboardStore((state) => state.loading.currentLeaderboard);

  return (
    <DetailedRanking
      players={players}
      currentLeaderboard={currentLeaderboard}
      isLoading={loading}
    />
  );
};

describe('DetailedRanking Integration Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    useLeaderboardStore.getState().resetStore();
  });

  describe('Store Integration', () => {
    it('displays players from the store', () => {
      // Set up store state
      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(testPlayers);

      render(<DetailedRankingWithStore />);

      // Verify players from store are displayed
      expect(screen.getByText('Alpha Leader')).toBeInTheDocument();
      expect(screen.getByText('Beta Runner')).toBeInTheDocument();
      expect(screen.getByText('Gamma Steady')).toBeInTheDocument();
      expect(screen.getByText('Integration Test Championship - 5 players')).toBeInTheDocument();
    });

    it('shows loading state when store indicates loading', () => {
      // Set loading state in store
      useLeaderboardStore.getState().setLoading('currentLeaderboard', true);
      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(testPlayers);

      render(<DetailedRankingWithStore />);

      // Should show loading skeleton
      expect(screen.queryByText('Alpha Leader')).not.toBeInTheDocument();
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });

    it('updates display when store data changes', async () => {
      // Initial render with store data
      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(testPlayers);

      render(<DetailedRankingWithStore />);

      expect(screen.getByText('Alpha Leader')).toBeInTheDocument();

      // Update store with new players
      const updatedPlayers: Player[] = [
        createTestPlayer(1, { name: 'New Champion', total: 3000 }),
        createTestPlayer(2, { name: 'Updated Runner', total: 2800 }),
      ];

      useLeaderboardStore.getState().setPlayers(updatedPlayers);

      await waitFor(() => {
        expect(screen.getByText('New Champion')).toBeInTheDocument();
        expect(screen.getByText('Updated Runner')).toBeInTheDocument();
        expect(screen.queryByText('Alpha Leader')).not.toBeInTheDocument();
      });
    });

    it('handles empty store state gracefully', () => {
      // Render with empty store
      render(<DetailedRankingWithStore />);

      expect(screen.getByText('No players available')).toBeInTheDocument();
      expect(screen.getByText('🐔')).toBeInTheDocument();
    });

    it('handles null leaderboard in store', () => {
      // Set players but no leaderboard
      useLeaderboardStore.getState().setPlayers(testPlayers);

      render(<DetailedRankingWithStore />);

      expect(screen.getByText('📊 Complete Rankings')).toBeInTheDocument();
      expect(screen.queryByText('Integration Test Championship')).not.toBeInTheDocument();
      expect(screen.getByText('Alpha Leader')).toBeInTheDocument();
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('handles large dataset efficiently', () => {
      // Create large dataset
      const largePlayerSet = Array.from({ length: 100 }, (_, i) =>
        createTestPlayer(i + 1, {
          name: `Player ${i + 1}`,
          total: 10000 - (i * 50),
        })
      );

      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(largePlayerSet);

      render(<DetailedRankingWithStore />);

      // Should show pagination
      expect(screen.getByText('Showing 1-20 of 100 players')).toBeInTheDocument();
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.getByText('Player 20')).toBeInTheDocument();
      expect(screen.queryByText('Player 21')).not.toBeInTheDocument();
    });

    it('maintains search state during store updates', async () => {
      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(testPlayers);

      render(<DetailedRankingWithStore />);

      // Perform search
      const searchInput = screen.getByPlaceholderText('Search players by name, position, or points...');
      fireEvent.change(searchInput, { target: { value: 'Alpha' } });

      await waitFor(() => {
        expect(screen.getByText('Alpha Leader')).toBeInTheDocument();
        expect(screen.queryByText('Beta Runner')).not.toBeInTheDocument();
      });

      // Update store with additional players that match search
      const updatedPlayers = [
        ...testPlayers,
        createTestPlayer(6, { name: 'Alpha Newcomer', total: 1000 }),
      ];

      useLeaderboardStore.getState().setPlayers(updatedPlayers);

      await waitFor(() => {
        expect(screen.getByText('Alpha Leader')).toBeInTheDocument();
        expect(screen.getByText('Alpha Newcomer')).toBeInTheDocument();
        expect(screen.queryByText('Beta Runner')).not.toBeInTheDocument();
      });
    });

    it('handles rapid store updates without breaking', async () => {
      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);

      render(<DetailedRankingWithStore />);

      // Simulate rapid updates
      const updates = [
        testPlayers.slice(0, 2),
        testPlayers.slice(0, 3),
        testPlayers.slice(0, 4),
        testPlayers,
      ];

      for (const update of updates) {
        useLeaderboardStore.getState().setPlayers(update);
        await waitFor(() => {
          expect(screen.getByText(`📊 Complete Rankings`)).toBeInTheDocument();
        });
      }

      // Final state should show all players
      expect(screen.getByText('Integration Test Championship - 5 players')).toBeInTheDocument();
      expect(screen.getByText('Alpha Leader')).toBeInTheDocument();
      expect(screen.getByText('Epsilon Competitor')).toBeInTheDocument();
    });
  });

  describe('Performance and User Experience', () => {
    it('maintains sort state during data updates', async () => {
      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(testPlayers);

      render(<DetailedRankingWithStore />);

      // Sort by name
      const nameHeader = screen.getByText('Player Name');
      fireEvent.click(nameHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Alpha Leader'); // First alphabetically
      });

      // Update store data
      const updatedPlayers = testPlayers.map(player => ({
        ...player,
        total: player.total + 100, // Increase all scores
      }));

      useLeaderboardStore.getState().setPlayers(updatedPlayers);

      await waitFor(() => {
        // Sort should be maintained (still sorted by name)
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('Alpha Leader');
      });
    });

    it('handles pagination correctly with store updates', async () => {
      // Create dataset that requires pagination
      const largeDataset = Array.from({ length: 50 }, (_, i) =>
        createTestPlayer(i + 1, {
          name: `Player ${String(i + 1).padStart(2, '0')}`,
          total: 5000 - (i * 50),
        })
      );

      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(largeDataset);

      render(<DetailedRankingWithStore />);

      // Navigate to page 2
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Showing 21-40 of 50 players')).toBeInTheDocument();
        expect(screen.getByText('Player 21')).toBeInTheDocument();
      });

      // Update store with fewer players
      const reducedDataset = largeDataset.slice(0, 25);
      useLeaderboardStore.getState().setPlayers(reducedDataset);

      await waitFor(() => {
        // Should automatically adjust pagination
        expect(screen.getByText('Showing 21-25 of 25 players')).toBeInTheDocument();
      });
    });

    it('provides smooth user experience during loading transitions', async () => {
      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(testPlayers);

      render(<DetailedRankingWithStore />);

      // Verify initial content
      expect(screen.getByText('Alpha Leader')).toBeInTheDocument();

      // Simulate loading state
      useLeaderboardStore.getState().setLoading('currentLeaderboard', true);

      await waitFor(() => {
        // Should show loading state
        expect(screen.queryByText('Alpha Leader')).not.toBeInTheDocument();
      });

      // Complete loading
      useLeaderboardStore.getState().setLoading('currentLeaderboard', false);

      await waitFor(() => {
        // Should return to normal state
        expect(screen.getByText('Alpha Leader')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles malformed player data gracefully', () => {
      const malformedPlayers: Player[] = [
        // Missing some optional fields
        {
          _id: 'malformed-1',
          player: 'malformed-1',
          name: 'Incomplete Player',
          position: 1,
          total: 1000,
          // No previous_position, previous_total, move
        },
        // With all fields
        createTestPlayer(2, { name: 'Complete Player' }),
      ];

      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(malformedPlayers);

      render(<DetailedRankingWithStore />);

      expect(screen.getByText('Incomplete Player')).toBeInTheDocument();
      expect(screen.getByText('Complete Player')).toBeInTheDocument();
      // Should not crash or show errors
    });

    it('handles extremely large numbers correctly', () => {
      const playersWithLargeNumbers: Player[] = [
        createTestPlayer(1, { 
          name: 'Billion Point Player', 
          total: 1000000000,
          position: 1 
        }),
        createTestPlayer(2, { 
          name: 'Million Point Player', 
          total: 1000000,
          position: 2 
        }),
      ];

      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(playersWithLargeNumbers);

      render(<DetailedRankingWithStore />);

      expect(screen.getByText('1.000.000.000')).toBeInTheDocument();
      expect(screen.getByText('1.000.000')).toBeInTheDocument();
    });

    it('handles duplicate positions correctly', () => {
      const playersWithDuplicatePositions: Player[] = [
        createTestPlayer(1, { name: 'Tied Player A', position: 1, total: 1000 }),
        createTestPlayer(2, { name: 'Tied Player B', position: 1, total: 1000 }),
        createTestPlayer(3, { name: 'Third Place', position: 3, total: 800 }),
      ];

      useLeaderboardStore.getState().setCurrentLeaderboard(mockLeaderboard);
      useLeaderboardStore.getState().setPlayers(playersWithDuplicatePositions);

      render(<DetailedRankingWithStore />);

      expect(screen.getByText('Tied Player A')).toBeInTheDocument();
      expect(screen.getByText('Tied Player B')).toBeInTheDocument();
      expect(screen.getByText('Third Place')).toBeInTheDocument();
      
      // Both tied players should show position 1
      const positionBadges = screen.getAllByText('1');
      expect(positionBadges).toHaveLength(2);
    });
  });
});