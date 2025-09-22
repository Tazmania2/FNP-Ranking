import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ChickenRace } from '../ChickenRace';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import type { Player, Leaderboard } from '../../types';

// Mock data
const mockLeaderboard: Leaderboard = {
  _id: 'test-leaderboard',
  title: 'Integration Test Leaderboard',
  description: 'Test leaderboard for integration testing',
  principalType: 0,
  operation: {
    type: 1,
    achievement_type: 1,
    item: 'points',
    sort: -1
  },
  period: {
    type: 1,
    timeAmount: 1,
    timeScale: 1
  }
};

const mockPlayers: Player[] = [
  {
    _id: 'player1',
    player: 'player1',
    name: 'Integration Alice',
    position: 1,
    total: 150,
    move: 'up'
  },
  {
    _id: 'player2',
    player: 'player2',
    name: 'Integration Bob',
    position: 2,
    total: 120,
    move: 'same'
  },
  {
    _id: 'player3',
    player: 'player3',
    name: 'Integration Charlie',
    position: 3,
    total: 90,
    move: 'down'
  }
];

// Integration test component that uses the store
const ChickenRaceWithStore: React.FC = () => {
  const { players, currentLeaderboard, loading } = useLeaderboardStore();
  
  return (
    <ChickenRace
      players={players}
      leaderboardTitle={currentLeaderboard?.title || 'Default Title'}
      isLoading={loading.currentLeaderboard}
    />
  );
};

describe('ChickenRace Integration Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useLeaderboardStore.getState().resetStore();
  });

  describe('Store Integration', () => {
    it('renders with data from leaderboard store', () => {
      // Set up store data
      const store = useLeaderboardStore.getState();
      store.setCurrentLeaderboard(mockLeaderboard);
      store.setPlayers(mockPlayers);
      store.setLoading('currentLeaderboard', false);

      render(<ChickenRaceWithStore />);

      // Verify leaderboard title from store
      expect(screen.getByText('Integration Test Leaderboard')).toBeInTheDocument();
      
      // Verify players from store
      expect(screen.getByText('Integration Alice')).toBeInTheDocument();
      expect(screen.getByText('Integration Bob')).toBeInTheDocument();
      expect(screen.getByText('Integration Charlie')).toBeInTheDocument();

      // Verify race info shows correct player count
      expect(screen.getByText('🏆 3 Racers')).toBeInTheDocument();
      expect(screen.getByText('Leader: Integration Alice')).toBeInTheDocument();
    });

    it('shows loading state when store is loading', () => {
      // Set loading state in store
      const store = useLeaderboardStore.getState();
      store.setLoading('currentLeaderboard', true);

      render(<ChickenRaceWithStore />);

      expect(screen.getByText('Loading chicken race...')).toBeInTheDocument();
    });

    it('handles empty store data gracefully', () => {
      // Store is empty by default after reset
      render(<ChickenRaceWithStore />);

      expect(screen.getByText('No players in this race yet')).toBeInTheDocument();
      // The empty state doesn't show the title, so we just verify the empty message
    });

    it('updates when store data changes', () => {
      const store = useLeaderboardStore.getState();
      
      // Initial render with no data
      const { rerender } = render(<ChickenRaceWithStore />);
      expect(screen.getByText('No players in this race yet')).toBeInTheDocument();

      // Update store with data
      store.setCurrentLeaderboard(mockLeaderboard);
      store.setPlayers(mockPlayers);
      store.setLoading('currentLeaderboard', false);

      // Re-render to reflect store changes
      rerender(<ChickenRaceWithStore />);

      // Should now show players
      expect(screen.getByText('Integration Alice')).toBeInTheDocument();
      expect(screen.queryByText('No players in this race yet')).not.toBeInTheDocument();
    });
  });

  describe('Real-world Scenarios', () => {
    it('handles large number of players', () => {
      const manyPlayers: Player[] = Array.from({ length: 20 }, (_, i) => ({
        _id: `player${i + 1}`,
        player: `player${i + 1}`,
        name: `Player ${i + 1}`,
        position: i + 1,
        total: 200 - (i * 5),
        move: 'same'
      }));

      render(
        <ChickenRace
          players={manyPlayers}
          leaderboardTitle="Large Race"
          isLoading={false}
        />
      );

      expect(screen.getByText('🏆 20 Racers')).toBeInTheDocument();
      expect(screen.getByText('Leader: Player 1')).toBeInTheDocument();
      
      // Should show point spread (200 - 105 = 95)
      expect(screen.getByText('95')).toBeInTheDocument();
    });

    it('handles players with identical scores', () => {
      const tiedPlayers: Player[] = [
        {
          _id: 'player1',
          player: 'player1',
          name: 'Tied Player 1',
          position: 1,
          total: 100,
        },
        {
          _id: 'player2',
          player: 'player2',
          name: 'Tied Player 2',
          position: 1, // Same position
          total: 100, // Same score
        },
        {
          _id: 'player3',
          player: 'player3',
          name: 'Third Place',
          position: 3,
          total: 80,
        }
      ];

      const { container } = render(
        <ChickenRace
          players={tiedPlayers}
          leaderboardTitle="Tied Race"
          isLoading={false}
        />
      );

      // Both tied players should be rendered
      expect(screen.getByText('Tied Player 1')).toBeInTheDocument();
      expect(screen.getByText('Tied Player 2')).toBeInTheDocument();
      expect(screen.getByText('Third Place')).toBeInTheDocument();

      // Check that tied players have similar horizontal positions
      const chickenContainers = container.querySelectorAll('.chicken-container');
      expect(chickenContainers).toHaveLength(3);
    });

    it('handles edge case with single player', () => {
      const singlePlayer: Player[] = [
        {
          _id: 'solo',
          player: 'solo',
          name: 'Solo Runner',
          position: 1,
          total: 50,
        }
      ];

      render(
        <ChickenRace
          players={singlePlayer}
          leaderboardTitle="Solo Race"
          isLoading={false}
        />
      );

      expect(screen.getByText('Solo Runner')).toBeInTheDocument();
      expect(screen.getByText('🏆 1 Racers')).toBeInTheDocument();
      expect(screen.getByText('Leader: Solo Runner')).toBeInTheDocument();
      
      // Point spread should be 0 (50 - 50 = 0)
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Performance Considerations', () => {
    it('renders efficiently with frequent updates', () => {
      const store = useLeaderboardStore.getState();
      store.setCurrentLeaderboard(mockLeaderboard);
      store.setLoading('currentLeaderboard', false);

      const { rerender } = render(<ChickenRaceWithStore />);

      // Simulate multiple rapid updates
      for (let i = 0; i < 5; i++) {
        const updatedPlayers = mockPlayers.map(player => ({
          ...player,
          total: player.total + Math.floor(Math.random() * 10)
        }));
        
        store.setPlayers(updatedPlayers);
        rerender(<ChickenRaceWithStore />);
      }

      // Should still render correctly after multiple updates
      expect(screen.getByText('Integration Test Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('🏆 3 Racers')).toBeInTheDocument();
    });
  });
});