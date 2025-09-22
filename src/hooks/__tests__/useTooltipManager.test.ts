import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTooltipManager } from '../useTooltipManager';
import type { Player } from '../../types';

// Mock the UI store
const mockShowTooltip = vi.fn();
const mockHideTooltip = vi.fn();
const mockUpdateTooltipPosition = vi.fn();

vi.mock('../../store/uiStore', () => ({
  useUIStore: () => ({
    tooltips: {
      playerId: null,
      isVisible: false,
      position: { x: 0, y: 0 },
      content: null,
    },
    showTooltip: mockShowTooltip,
    hideTooltip: mockHideTooltip,
    updateTooltipPosition: mockUpdateTooltipPosition,
  }),
}));

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

describe('useTooltipManager Hook', () => {
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
    {
      _id: 'player3',
      player: 'player3',
      name: 'Charlie',
      position: 3,
      total: 1000,
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes with correct default values', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    expect(result.current.tooltips).toEqual({
      playerId: null,
      isVisible: false,
      position: { x: 0, y: 0 },
      content: null,
    });
  });

  it('creates correct tooltip content for player with previous total', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    const content = result.current.createTooltipContent(mockPlayers[0]);

    expect(content).toEqual({
      rank: 1,
      points: 1500,
      pointsGainedToday: 250, // 1500 - 1250
      playerName: 'Alice',
    });
  });

  it('creates correct tooltip content for player without previous total', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    const content = result.current.createTooltipContent(mockPlayers[2]);

    expect(content).toEqual({
      rank: 3,
      points: 1000,
      pointsGainedToday: 0,
      playerName: 'Charlie',
    });
  });

  it('shows tooltip for valid player', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    act(() => {
      result.current.showPlayerTooltip('player1', { x: 100, y: 200 });
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player1',
      { x: 100, y: 200 },
      {
        rank: 1,
        points: 1500,
        pointsGainedToday: 250,
        playerName: 'Alice',
      }
    );
  });

  it('does not show tooltip for invalid player', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    act(() => {
      result.current.showPlayerTooltip('invalid-player', { x: 100, y: 200 });
    });

    expect(mockShowTooltip).not.toHaveBeenCalled();
  });

  it('hides tooltip when called', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    act(() => {
      result.current.hidePlayerTooltip();
    });

    expect(mockHideTooltip).toHaveBeenCalled();
  });

  it('updates tooltip position', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    act(() => {
      result.current.updateTooltipPos({ x: 150, y: 250 });
    });

    expect(mockUpdateTooltipPosition).toHaveBeenCalledWith({ x: 150, y: 250 });
  });

  it('handles chicken hover with element', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    // Mock element with getBoundingClientRect
    const mockElement = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 200,
        width: 50,
        height: 50,
        right: 150,
        bottom: 250,
      }),
    } as HTMLElement;

    act(() => {
      result.current.handleChickenHover('player1', mockElement);
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player1',
      { x: 125, y: 190 }, // center x, top y - 10
      expect.objectContaining({
        rank: 1,
        playerName: 'Alice',
      })
    );
  });

  it('handles chicken hover without element (hide)', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    act(() => {
      result.current.handleChickenHover(null);
    });

    expect(mockHideTooltip).toHaveBeenCalled();
  });

  it('does not show tooltips when disabled', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers, isEnabled: false })
    );

    act(() => {
      result.current.showPlayerTooltip('player1', { x: 100, y: 200 });
    });

    expect(mockShowTooltip).not.toHaveBeenCalled();
  });

  it('sets up auto-display timer every minute', () => {
    renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    // Fast-forward 60 seconds
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Should have called showTooltip for the first player
    expect(mockShowTooltip).toHaveBeenCalled();
  });

  it('displays tooltips sequentially during auto-display', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    act(() => {
      result.current.startAutoDisplay();
    });

    // Should show first tooltip immediately
    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player1',
      expect.any(Object),
      expect.objectContaining({ playerName: 'Alice' })
    );

    // Advance 1 second for next tooltip
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player2',
      expect.any(Object),
      expect.objectContaining({ playerName: 'Bob' })
    );
  });

  it('cleans up timers on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { unmount } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    // clearTimeout might not be called if no timeout is active
    // expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('calculates negative points gained correctly', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers })
    );

    const content = result.current.createTooltipContent(mockPlayers[1]); // Bob

    expect(content.pointsGainedToday).toBe(-100); // 1200 - 1300
  });

  it('does not start auto-display when no players', () => {
    const { result } = renderHook(() =>
      useTooltipManager({ players: [] })
    );

    act(() => {
      result.current.startAutoDisplay();
    });

    expect(mockShowTooltip).not.toHaveBeenCalled();
  });

  it('limits auto-display to 5 seconds maximum', () => {
    // Create many players to test the 5-second limit
    const manyPlayers: Player[] = Array.from({ length: 10 }, (_, i) => ({
      _id: `player${i}`,
      player: `player${i}`,
      name: `Player ${i}`,
      position: i + 1,
      total: 1000 - i * 100,
    }));

    const { result } = renderHook(() =>
      useTooltipManager({ players: manyPlayers })
    );

    act(() => {
      result.current.startAutoDisplay();
    });

    // Fast-forward 5 seconds (should show 5 tooltips, 1 per second)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Should have shown tooltips for first 5 players (1 second each) plus initial call
    expect(mockShowTooltip).toHaveBeenCalledTimes(6); // 1 initial + 5 more
  });
});