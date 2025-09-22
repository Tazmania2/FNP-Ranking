import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Sidebar } from '../Sidebar';
import type { Player, Leaderboard } from '../../types';

// Mock data for testing
const mockLeaderboard: Leaderboard = {
  _id: 'test-leaderboard-1',
  title: 'Test Championship',
  description: 'A test leaderboard for unit testing',
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
    _id: 'player-1',
    player: 'player-1',
    name: 'Alice Champion',
    position: 1,
    total: 1500,
    previous_position: 2,
    previous_total: 1400,
    move: 'up',
  },
  {
    _id: 'player-2',
    player: 'player-2',
    name: 'Bob Runner',
    position: 2,
    total: 1200,
    previous_position: 1,
    previous_total: 1300,
    move: 'down',
  },
  {
    _id: 'player-3',
    player: 'player-3',
    name: 'Charlie Steady',
    position: 3,
    total: 1000,
    previous_position: 3,
    previous_total: 950,
    move: 'same',
  },
  {
    _id: 'player-4',
    player: 'player-4',
    name: 'Diana Climber',
    position: 4,
    total: 800,
  },
  {
    _id: 'player-5',
    player: 'player-5',
    name: 'Eve Competitor',
    position: 5,
    total: 600,
  },
  {
    _id: 'player-6',
    player: 'player-6',
    name: 'Frank Extra',
    position: 6,
    total: 400,
  },
];

describe('Sidebar Component', () => {
  describe('Basic Rendering', () => {
    it('renders the sidebar with header and title', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={10}
        />
      );

      expect(screen.getAllByText('🏆 Top Players')).toHaveLength(2); // Mobile and desktop headers
      expect(screen.getAllByText('Test Championship')).toHaveLength(2); // Mobile and desktop
      expect(screen.getAllByText('Showing top 5 of 10 players')).toHaveLength(2); // Mobile and desktop
    });

    it('renders without leaderboard title when currentLeaderboard is null', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers}
          currentLeaderboard={null}
          totalPlayers={5}
        />
      );

      expect(screen.getAllByText('🏆 Top Players')).toHaveLength(2); // Mobile and desktop headers
      expect(screen.queryByText('Test Championship')).not.toBeInTheDocument();
      expect(screen.getAllByText('Showing top 5 of 5 players')).toHaveLength(2); // Mobile and desktop
    });
  });

  describe('Player Display', () => {
    it('displays top 5 players only', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={6}
        />
      );

      // Should show first 5 players
      expect(screen.getByText('Alice Champion')).toBeInTheDocument();
      expect(screen.getByText('Bob Runner')).toBeInTheDocument();
      expect(screen.getByText('Charlie Steady')).toBeInTheDocument();
      expect(screen.getByText('Diana Climber')).toBeInTheDocument();
      expect(screen.getByText('Eve Competitor')).toBeInTheDocument();

      // Should not show 6th player
      expect(screen.queryByText('Frank Extra')).not.toBeInTheDocument();
    });

    it('displays player positions correctly', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 3)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={3}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays player names and points', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 2)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={2}
        />
      );

      expect(screen.getByText('Alice Champion')).toBeInTheDocument();
      expect(screen.getByText('1.5K')).toBeInTheDocument(); // 1500 formatted
      expect(screen.getByText('Bob Runner')).toBeInTheDocument();
      expect(screen.getByText('1.2K')).toBeInTheDocument(); // 1200 formatted
    });

    it('displays chicken avatars for each player', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 3)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={3}
        />
      );

      // Check for chicken emojis (they should be present as text content)
      const chickenElements = screen.getAllByText(/[🐔🐓🐤🐣🥚]/u);
      expect(chickenElements).toHaveLength(3);
    });
  });

  describe('Movement Indicators', () => {
    it('shows up movement indicator correctly', () => {
      render(
        <Sidebar
          topPlayers={[mockPlayers[0]]} // Alice with 'up' movement
          currentLeaderboard={mockLeaderboard}
          totalPlayers={1}
        />
      );

      expect(screen.getByText('↗️ +1')).toBeInTheDocument();
    });

    it('shows down movement indicator correctly', () => {
      render(
        <Sidebar
          topPlayers={[mockPlayers[1]]} // Bob with 'down' movement
          currentLeaderboard={mockLeaderboard}
          totalPlayers={1}
        />
      );

      expect(screen.getByText('↘️ -1')).toBeInTheDocument();
    });

    it('shows same position indicator correctly', () => {
      render(
        <Sidebar
          topPlayers={[mockPlayers[2]]} // Charlie with 'same' movement
          currentLeaderboard={mockLeaderboard}
          totalPlayers={1}
        />
      );

      expect(screen.getByText('➡️ No change')).toBeInTheDocument();
    });

    it('does not show movement indicator when no previous position', () => {
      render(
        <Sidebar
          topPlayers={[mockPlayers[3]]} // Diana without previous_position
          currentLeaderboard={mockLeaderboard}
          totalPlayers={1}
        />
      );

      expect(screen.queryByText(/↗️|↘️|➡️/)).not.toBeInTheDocument();
    });
  });

  describe('Points Formatting', () => {
    it('formats large numbers correctly', () => {
      const playersWithLargeNumbers: Player[] = [
        {
          _id: 'player-million',
          player: 'player-million',
          name: 'Million Player',
          position: 1,
          total: 1500000,
        },
        {
          _id: 'player-thousand',
          player: 'player-thousand',
          name: 'Thousand Player',
          position: 2,
          total: 2500,
        },
        {
          _id: 'player-small',
          player: 'player-small',
          name: 'Small Player',
          position: 3,
          total: 150,
        },
      ];

      render(
        <Sidebar
          topPlayers={playersWithLargeNumbers}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={3}
        />
      );

      expect(screen.getByText('1.5M')).toBeInTheDocument(); // 1,500,000
      expect(screen.getByText('2.5K')).toBeInTheDocument(); // 2,500
      expect(screen.getByText('150')).toBeInTheDocument(); // 150
    });
  });

  describe('Position Badge Styling', () => {
    it('applies correct CSS classes for different positions', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 4)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={4}
        />
      );

      // Check that position badges are rendered
      const position1 = screen.getByText('1');
      const position2 = screen.getByText('2');
      const position3 = screen.getByText('3');
      const position4 = screen.getByText('4');

      expect(position1).toHaveClass('bg-yellow-500'); // Gold
      expect(position2).toHaveClass('bg-gray-400'); // Silver
      expect(position3).toHaveClass('bg-amber-600'); // Bronze
      expect(position4).toHaveClass('bg-blue-500'); // Default
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no players', () => {
      render(
        <Sidebar
          topPlayers={[]}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={0}
        />
      );

      expect(screen.getByText('No players found')).toBeInTheDocument();
      expect(screen.getByText('🐔')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('displays loading skeleton when isLoading is true', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={5}
          isLoading={true}
        />
      );

      // Should show loading skeleton instead of content
      expect(screen.queryByText('Alice Champion')).not.toBeInTheDocument();
      
      // Check for loading animation class by finding the element with animate-pulse class
      const loadingElement = document.querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement).toHaveClass('animate-pulse');
    });
  });

  describe('Real-time Updates', () => {
    it('updates display when topPlayers prop changes', () => {
      const { rerender } = render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 2)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={2}
        />
      );

      expect(screen.getByText('Alice Champion')).toBeInTheDocument();
      expect(screen.getByText('Bob Runner')).toBeInTheDocument();

      // Update with different players
      const updatedPlayers: Player[] = [
        {
          _id: 'player-new',
          player: 'player-new',
          name: 'New Leader',
          position: 1,
          total: 2000,
        },
      ];

      rerender(
        <Sidebar
          topPlayers={updatedPlayers}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={1}
        />
      );

      expect(screen.getByText('New Leader')).toBeInTheDocument();
      expect(screen.queryByText('Alice Champion')).not.toBeInTheDocument();
    });

    it('updates total players count when prop changes', () => {
      const { rerender } = render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 3)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={10}
        />
      );

      expect(screen.getAllByText('Showing top 5 of 10 players')).toHaveLength(2); // Mobile and desktop

      rerender(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 3)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={25}
        />
      );

      expect(screen.getAllByText('Showing top 5 of 25 players')).toHaveLength(2); // Mobile and desktop
    });
  });

  describe('Accessibility', () => {
    it('includes proper title attributes for chicken avatars', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 2)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={2}
        />
      );

      expect(screen.getByTitle("Alice Champion's chicken")).toBeInTheDocument();
      expect(screen.getByTitle("Bob Runner's chicken")).toBeInTheDocument();
    });

    it('has proper semantic structure', () => {
      render(
        <Sidebar
          topPlayers={mockPlayers.slice(0, 3)}
          currentLeaderboard={mockLeaderboard}
          totalPlayers={3}
        />
      );

      // Check for proper headings (both mobile and desktop)
      const headings = screen.getAllByRole('heading', { level: 2 });
      expect(headings).toHaveLength(2); // Mobile and desktop headers
      expect(headings[0]).toHaveTextContent('🏆 Top Players');
      expect(headings[1]).toHaveTextContent('🏆 Top Players');
    });
  });
});