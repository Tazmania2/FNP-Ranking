import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { usePositionTransitions } from '../usePositionTransitions';
import type { Player } from '../../types';

// Mock the useAnimationManager hook
const mockAnimationManager = {
  animations: [],
  updatePlayerAnimation: vi.fn(),
};

vi.mock('../useAppState', () => ({
  useAnimationManager: () => mockAnimationManager,
}));

// Mock data
const mockPlayers: Player[] = [
  {
    _id: 'player1',
    player: 'player1',
    name: 'Player 1',
    position: 1,
    total: 100,
  },
  {
    _id: 'player2',
    player: 'player2',
    name: 'Player 2',
    position: 2,
    total: 80,
  },
  {
    _id: 'player3',
    player: 'player3',
    name: 'Player 3',
    position: 3,
    total: 60,
  },
];

const mockPlayersWithChanges: Player[] = [
  {
    _id: 'player1',
    player: 'player1',
    name: 'Player 1',
    position: 2, // Moved down
    total: 100,
    previous_position: 1,
    move: 'down',
  },
  {
    _id: 'player2',
    player: 'player2',
    name: 'Player 2',
    position: 1, // Moved up
    total: 90,
    previous_position: 2,
    move: 'up',
  },
  {
    _id: 'player3',
    player: 'player3',
    name: 'Player 3',
    position: 3, // No change
    total: 60,
  },
];

describe('usePositionTransitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockAnimationManager.animations = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial Setup', () => {
    it('should initialize with correct default configuration', () => {
      const { result } = renderHook(() =>
        usePositionTransitions([])
      );

      expect(result.current.config).toEqual({
        transitionDuration: 1000,
        easing: 'ease-out',
        staggered: true,
        staggerDelay: 100,
        celebrateImprovements: true,
      });
    });

    it('should use custom configuration', () => {
      const customConfig = {
        transitionDuration: 2000,
        easing: 'ease-in' as const,
        staggered: false,
        staggerDelay: 200,
        celebrateImprovements: false,
      };

      const { result } = renderHook(() =>
        usePositionTransitions([], customConfig)
      );

      expect(result.current.config).toEqual(customConfig);
    });

    it('should set immediate positions for initial players', () => {
      renderHook(() => usePositionTransitions(mockPlayers));

      expect(mockAnimationManager.updatePlayerAnimation).toHaveBeenCalledTimes(3);
      
      // Check that all players got animations
      mockPlayers.forEach((player) => {
        expect(mockAnimationManager.updatePlayerAnimation).toHaveBeenCalledWith(
          player._id,
          expect.objectContaining({
            playerId: player._id,
            animationState: 'idle',
          })
        );
      });
    });
  });

  describe('Position Calculation', () => {
    it('should calculate correct horizontal positions based on rank', () => {
      renderHook(() => usePositionTransitions(mockPlayers));

      const calls = (mockAnimationManager.updatePlayerAnimation as any).mock.calls;
      
      // Player 1 (rank 1) should be rightmost
      const player1Call = calls.find((call: any) => call[0] === 'player1');
      expect(player1Call[1].targetPosition.x).toBeGreaterThan(50);

      // Player 3 (rank 3) should be leftmost
      const player3Call = calls.find((call: any) => call[0] === 'player3');
      expect(player3Call[1].targetPosition.x).toBeLessThan(50);

      // Player 1 should be further right than Player 2
      const player2Call = calls.find((call: any) => call[0] === 'player2');
      expect(player1Call[1].targetPosition.x).toBeGreaterThan(player2Call[1].targetPosition.x);
    });

    it('should generate consistent vertical positions based on player ID', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players),
        { initialProps: { players: mockPlayers } }
      );

      const firstCalls = [...(mockAnimationManager.updatePlayerAnimation as any).mock.calls];
      
      // Clear and re-render with same players
      vi.clearAllMocks();
      rerender({ players: mockPlayers });

      const secondCalls = [...(mockAnimationManager.updatePlayerAnimation as any).mock.calls];

      // Vertical positions should be the same for same player IDs
      firstCalls.forEach((firstCall: any, index: number) => {
        const secondCall = secondCalls[index];
        if (firstCall && secondCall) {
          expect(firstCall[1].targetPosition.y).toBe(secondCall[1].targetPosition.y);
        }
      });
    });

    it('should handle single player correctly', () => {
      const singlePlayer = [mockPlayers[0]];
      
      renderHook(() => usePositionTransitions(singlePlayer));

      expect(mockAnimationManager.updatePlayerAnimation).toHaveBeenCalledWith(
        'player1',
        expect.objectContaining({
          targetPosition: expect.objectContaining({
            x: 50, // Should be centered
          }),
        })
      );
    });
  });

  describe('Position Transitions', () => {
    it('should animate players to new positions when rankings change', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players),
        { initialProps: { players: mockPlayers } }
      );

      vi.clearAllMocks();

      // Update with changed positions
      rerender({ players: mockPlayersWithChanges });

      expect(mockAnimationManager.updatePlayerAnimation).toHaveBeenCalledTimes(3);

      // Check that player2 (moved up) gets celebrating animation
      const player2Call = (mockAnimationManager.updatePlayerAnimation as any).mock.calls
        .find((call: any) => call[0] === 'player2');
      expect(player2Call[1].animationState).toBe('celebrating');

      // Check that player1 (moved down) gets moving animation
      const player1Call = (mockAnimationManager.updatePlayerAnimation as any).mock.calls
        .find((call: any) => call[0] === 'player1');
      expect(player1Call[1].animationState).toBe('moving');
    });

    it('should use staggered animations when enabled', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players, { staggered: true, staggerDelay: 100 }),
        { initialProps: { players: mockPlayers } }
      );

      vi.clearAllMocks();

      // Update with changed positions
      rerender({ players: mockPlayersWithChanges });

      // Should schedule timeouts for staggered animations
      expect(setTimeout).toHaveBeenCalledTimes(2); // First player gets no delay
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 200);
    });

    it('should not use staggered animations when disabled', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players, { staggered: false }),
        { initialProps: { players: mockPlayers } }
      );

      vi.clearAllMocks();

      // Update with changed positions
      rerender({ players: mockPlayersWithChanges });

      // All animations should be immediate
      expect(mockAnimationManager.updatePlayerAnimation).toHaveBeenCalledTimes(3);
      expect(setTimeout).not.toHaveBeenCalled();
    });

    it('should not animate when celebrateImprovements is disabled', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players, { celebrateImprovements: false }),
        { initialProps: { players: mockPlayers } }
      );

      vi.clearAllMocks();

      // Update with changed positions
      rerender({ players: mockPlayersWithChanges });

      // All animations should be 'moving', not 'celebrating'
      const calls = (mockAnimationManager.updatePlayerAnimation as any).mock.calls;
      calls.forEach((call: any) => {
        expect(call[1].animationState).toBe('moving');
      });
    });
  });

  describe('Player Management', () => {
    it('should handle new players being added', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players),
        { initialProps: { players: mockPlayers.slice(0, 2) } }
      );

      vi.clearAllMocks();

      // Add a new player
      rerender({ players: mockPlayers });

      expect(mockAnimationManager.updatePlayerAnimation).toHaveBeenCalledWith(
        'player3',
        expect.objectContaining({
          playerId: 'player3',
        })
      );
    });

    it('should handle players being removed', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players),
        { initialProps: { players: mockPlayers } }
      );

      vi.clearAllMocks();

      // Remove a player
      rerender({ players: mockPlayers.slice(0, 2) });

      // Should only animate remaining players
      expect(mockAnimationManager.updatePlayerAnimation).toHaveBeenCalledTimes(2);
      expect(mockAnimationManager.updatePlayerAnimation).not.toHaveBeenCalledWith(
        'player3',
        expect.anything()
      );
    });

    it('should not animate when no position changes occur', () => {
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players),
        { initialProps: { players: mockPlayers } }
      );

      vi.clearAllMocks();

      // Re-render with same players (no position changes)
      rerender({ players: mockPlayers });

      expect(mockAnimationManager.updatePlayerAnimation).not.toHaveBeenCalled();
    });
  });

  describe('Utility Functions', () => {
    it('should provide getPlayerPosition function', () => {
      mockAnimationManager.animations = [
        {
          playerId: 'player1',
          currentPosition: { x: 80, y: 40 },
          targetPosition: { x: 85, y: 45 },
          animationState: 'moving',
          lastUpdate: Date.now(),
        },
      ];

      const { result } = renderHook(() => usePositionTransitions(mockPlayers));

      const position = result.current.getPlayerPosition('player1');
      expect(position).toEqual({ x: 85, y: 45 });

      const unknownPosition = result.current.getPlayerPosition('unknown');
      expect(unknownPosition).toEqual({ x: 50, y: 50 });
    });

    it('should provide getAllPlayerPositions function', () => {
      mockAnimationManager.animations = [
        {
          playerId: 'player1',
          currentPosition: { x: 80, y: 40 },
          targetPosition: { x: 85, y: 45 },
          animationState: 'moving',
          lastUpdate: Date.now(),
        },
        {
          playerId: 'player2',
          currentPosition: { x: 60, y: 30 },
          targetPosition: { x: 65, y: 35 },
          animationState: 'idle',
          lastUpdate: Date.now(),
        },
      ];

      const { result } = renderHook(() => usePositionTransitions(mockPlayers.slice(0, 2)));

      const positions = result.current.getAllPlayerPositions();
      
      expect(positions).toHaveLength(2);
      expect(positions[0]).toMatchObject({
        playerId: 'player1',
        position: { x: 85, y: 45 },
        rank: 1,
        isAnimating: true,
      });
      expect(positions[1]).toMatchObject({
        playerId: 'player2',
        position: { x: 65, y: 35 },
        rank: 2,
        isAnimating: false,
      });
    });

    it('should provide isAnimating status', () => {
      mockAnimationManager.animations = [
        {
          playerId: 'player1',
          currentPosition: { x: 80, y: 40 },
          targetPosition: { x: 85, y: 45 },
          animationState: 'moving',
          lastUpdate: Date.now(),
        },
      ];

      const { result } = renderHook(() => usePositionTransitions(mockPlayers));

      expect(result.current.isAnimating).toBe(true);

      mockAnimationManager.animations = [
        {
          playerId: 'player1',
          currentPosition: { x: 85, y: 45 },
          targetPosition: { x: 85, y: 45 },
          animationState: 'idle',
          lastUpdate: Date.now(),
        },
      ];

      expect(result.current.isAnimating).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should clear timeouts on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { unmount } = renderHook(() =>
        usePositionTransitions(mockPlayers, { staggered: true })
      );

      // Trigger some animations with timeouts
      act(() => {
        setTimeout(() => {}, 100);
        setTimeout(() => {}, 200);
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should clear timeouts when players change', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      const { rerender } = renderHook(
        ({ players }) => usePositionTransitions(players, { staggered: true }),
        { initialProps: { players: mockPlayers } }
      );

      // Trigger position changes
      rerender({ players: mockPlayersWithChanges });

      // Should clear existing timeouts before setting new ones
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });
});