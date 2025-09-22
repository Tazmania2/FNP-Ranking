import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChickenRace } from '../ChickenRace';
import type { Player } from '../../types';

// Mock data
const mockPlayers: Player[] = [
  {
    _id: '1',
    player: 'player1',
    name: 'Alice',
    position: 1,
    total: 100,
    move: 'up'
  },
  {
    _id: '2',
    player: 'player2',
    name: 'Bob',
    position: 2,
    total: 85,
    move: 'same'
  },
  {
    _id: '3',
    player: 'player3',
    name: 'Charlie',
    position: 3,
    total: 70,
    move: 'down'
  },
  {
    _id: '4',
    player: 'player4',
    name: 'Diana',
    position: 4,
    total: 70, // Tied with Charlie
    move: 'same'
  }
];

const mockTiedPlayers: Player[] = [
  {
    _id: '1',
    player: 'player1',
    name: 'Alice',
    position: 1,
    total: 100,
  },
  {
    _id: '2',
    player: 'player2',
    name: 'Bob',
    position: 1, // Tied for first
    total: 100,
  },
  {
    _id: '3',
    player: 'player3',
    name: 'Charlie',
    position: 3,
    total: 80,
  }
];

describe('ChickenRace Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('renders loading state correctly', () => {
      render(
        <ChickenRace
          players={[]}
          leaderboardTitle="Test Leaderboard"
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading chicken race...')).toBeInTheDocument();
      expect(screen.getByText('🐔')).toBeInTheDocument();
    });

    it('renders empty state when no players', () => {
      render(
        <ChickenRace
          players={[]}
          leaderboardTitle="Test Leaderboard"
          isLoading={false}
        />
      );

      expect(screen.getByText('No players in this race yet')).toBeInTheDocument();
      expect(screen.getByText('🏁')).toBeInTheDocument();
    });

    it('renders leaderboard title correctly', () => {
      render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Championship Race"
          isLoading={false}
        />
      );

      expect(screen.getByText('Championship Race')).toBeInTheDocument();
      expect(screen.getByText('🏁 Chicken Race Championship 🏁')).toBeInTheDocument();
    });
  });

  describe('Player Rendering', () => {
    it('renders all players as chickens', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      // Check that all player names are rendered
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
      expect(screen.getByText('Diana')).toBeInTheDocument();

      // Check that all position badges are rendered by counting chicken containers
      const chickenContainers = container.querySelectorAll('.chicken-container');
      expect(chickenContainers).toHaveLength(4);
      
      // Check specific position badges within chicken containers
      const positionBadges = container.querySelectorAll('.chicken-container .bg-blue-600');
      expect(positionBadges).toHaveLength(4);
    });

    it('displays chicken sprites for all players', () => {
      render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      // Should have 4 chicken emojis (one per player)
      const chickens = screen.getAllByText('🐔');
      expect(chickens).toHaveLength(4);
    });

    it('shows correct player information in race info overlay', () => {
      render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      expect(screen.getByText('🏆 4 Racers')).toBeInTheDocument();
      expect(screen.getByText('Leader: Alice')).toBeInTheDocument();
    });
  });

  describe('Positioning Logic', () => {
    it('positions first place player furthest right', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      const chickenContainers = container.querySelectorAll('.chicken-container');
      
      // Find Alice's container (position 1)
      const aliceContainer = Array.from(chickenContainers).find(container => 
        container.textContent?.includes('Alice')
      ) as HTMLElement;
      
      expect(aliceContainer).toBeTruthy();
      
      // Alice should have the highest x position (furthest right)
      const aliceStyle = aliceContainer.style.left;
      expect(aliceStyle).toBeTruthy();
      
      // Extract percentage value
      const aliceX = parseFloat(aliceStyle.replace('%', ''));
      expect(aliceX).toBeGreaterThan(70); // Should be towards the right side
    });

    it('handles tied scores by positioning at same horizontal location', () => {
      const { container } = render(
        <ChickenRace
          players={mockTiedPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      const chickenContainers = container.querySelectorAll('.chicken-container');
      
      // Find Alice and Bob containers (both position 1)
      const aliceContainer = Array.from(chickenContainers).find(container => 
        container.textContent?.includes('Alice')
      ) as HTMLElement;
      
      const bobContainer = Array.from(chickenContainers).find(container => 
        container.textContent?.includes('Bob')
      ) as HTMLElement;
      
      expect(aliceContainer).toBeTruthy();
      expect(bobContainer).toBeTruthy();
      
      // Both should have similar x positions (tied)
      const aliceX = parseFloat(aliceContainer.style.left.replace('%', ''));
      const bobX = parseFloat(bobContainer.style.left.replace('%', ''));
      
      expect(Math.abs(aliceX - bobX)).toBeLessThan(5); // Should be very close horizontally
    });
  });

  describe('Animations', () => {
    it('applies animation transforms to chickens', async () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      // Fast-forward time to trigger animations
      vi.advanceTimersByTime(100);

      // Check that chickens have initial transform styles
      const chickenContainers = container.querySelectorAll('.chicken-container');
      expect(chickenContainers.length).toBeGreaterThan(0);
      
      // All chickens should have transform styles applied
      chickenContainers.forEach(container => {
        const element = container as HTMLElement;
        expect(element.style.transform).toContain('translate');
      });
    }, 1000);

    it('includes smooth transitions for position changes', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      const chickenContainers = container.querySelectorAll('.chicken-container');
      
      // Check that transition styles are applied
      chickenContainers.forEach(container => {
        const element = container as HTMLElement;
        expect(element.style.transition).toContain('ease-in-out');
      });
    });
  });

  describe('Interactions', () => {
    it('handles chicken hover events', async () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      const chickenContainers = container.querySelectorAll('.chicken-container');
      const firstChicken = chickenContainers[0] as HTMLElement;
      
      // Test hover in
      fireEvent.mouseEnter(firstChicken);
      
      // Test hover out
      fireEvent.mouseLeave(firstChicken);
      
      // Should not throw errors
      expect(firstChicken).toBeInTheDocument();
    });

    it('applies hover scale effect on chicken sprites', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      const chickenSprites = container.querySelectorAll('.chicken-sprite');
      
      chickenSprites.forEach(sprite => {
        expect(sprite).toHaveClass('hover:scale-110');
      });
    });
  });

  describe('Race Statistics', () => {
    it('displays correct race statistics', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      // Leader points (Alice has 100) - use getAllByText since there might be multiple instances
      const leaderPointsElements = screen.getAllByText('100');
      expect(leaderPointsElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Leader Points')).toBeInTheDocument();

      // Total racers - find within stats section
      const statsSection = container.querySelector('.grid.grid-cols-3');
      expect(statsSection).toBeInTheDocument();
      expect(screen.getByText('Total Racers')).toBeInTheDocument();

      // Point spread (100 - 70 = 30)
      expect(screen.getByText('30')).toBeInTheDocument();
      expect(screen.getByText('Point Spread')).toBeInTheDocument();
    });

    it('calculates point spread correctly', () => {
      const playersWithSpread: Player[] = [
        { _id: '1', player: 'p1', name: 'High', position: 1, total: 200 },
        { _id: '2', player: 'p2', name: 'Low', position: 2, total: 50 }
      ];

      render(
        <ChickenRace
          players={playersWithSpread}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      // Point spread should be 200 - 50 = 150
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive grid classes to stats', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      const statsGrid = container.querySelector('.grid');
      expect(statsGrid).toHaveClass('grid-cols-3', 'gap-2', 'sm:gap-4');
    });

    it('renders race track with proper responsive container', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      const raceContainer = container.querySelector('.chicken-race-container');
      expect(raceContainer).toHaveClass('w-full', 'h-64', 'sm:h-80', 'lg:h-96');
    });
  });

  describe('Visual Elements', () => {
    it('renders track decorations', () => {
      const { container } = render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      // Should have finish line and start line elements
      const lines = container.querySelectorAll('.absolute.w-2');
      expect(lines.length).toBeGreaterThanOrEqual(2); // Start and finish lines
    });

    it('displays position guide legend', () => {
      render(
        <ChickenRace
          players={mockPlayers}
          leaderboardTitle="Test Race"
          isLoading={false}
        />
      );

      expect(screen.getByText('Position Guide')).toBeInTheDocument();
      expect(screen.getByText('🥇 1st')).toBeInTheDocument();
      expect(screen.getByText('🏁 Finish')).toBeInTheDocument();
    });
  });
});