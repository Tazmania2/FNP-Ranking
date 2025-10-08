import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTooltipManager } from '../useTooltipManager';
import type { Player } from '../../types';

type TooltipsState = {
  playerId: string | null;
  isVisible: boolean;
  position: { x: number; y: number };
  content: unknown;
};

const mockShowTooltip = vi.fn();
const mockHideTooltip = vi.fn();
const mockUpdateTooltipPosition = vi.fn();
let tooltipsState: TooltipsState;

vi.mock('../../store/uiStore', () => ({
  useUIStore: () => ({
    tooltips: tooltipsState,
    showTooltip: mockShowTooltip,
    hideTooltip: mockHideTooltip,
    updateTooltipPosition: mockUpdateTooltipPosition,
  }),
}));

describe('useTooltipManager', () => {
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
    mockShowTooltip.mockReset();
    mockHideTooltip.mockReset();
    mockUpdateTooltipPosition.mockReset();
    tooltipsState = {
      playerId: null,
      isVisible: false,
      position: { x: 0, y: 0 },
      content: null,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initialises tooltip state correctly', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    expect(result.current.tooltips).toEqual(tooltipsState);
  });

  it('computes tooltip content with and without previous totals', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    expect(result.current.createTooltipContent(mockPlayers[0])).toEqual({
      rank: 1,
      points: 1500,
      pointsGainedToday: 250,
      playerName: 'Alice',
    });

    expect(result.current.createTooltipContent(mockPlayers[2])).toEqual({
      rank: 3,
      points: 1000,
      pointsGainedToday: 0,
      playerName: 'Charlie',
    });
  });

  it('shows tooltip for a valid player with fallback coordinates', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    act(() => {
      result.current.showPlayerTooltip('player1');
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player1',
      { x: 15, y: 78 },
      expect.objectContaining({ playerName: 'Alice' }),
    );
  });

  it('prefers explicit coordinates when showing a tooltip', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    act(() => {
      result.current.showPlayerTooltip('player2', { x: 40, y: 60 });
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player2',
      { x: 40, y: 60 },
      expect.objectContaining({ playerName: 'Bob' }),
    );
  });

  it('uses the provided getPlayerPosition callback when available', () => {
    const getPlayerPosition = vi.fn().mockReturnValue({ x: 22, y: 48 });

    const { result } = renderHook(() =>
      useTooltipManager({ players: mockPlayers, getPlayerPosition })
    );

    act(() => {
      result.current.showPlayerTooltip('player3');
    });

    expect(getPlayerPosition).toHaveBeenCalledWith('player3');
    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player3',
      { x: 22, y: 48 },
      expect.objectContaining({ playerName: 'Charlie' }),
    );
  });

  it('hides tooltip when requested', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    act(() => {
      result.current.hidePlayerTooltip();
    });

    expect(mockHideTooltip).toHaveBeenCalled();
  });

  it('updates tooltip coordinates via the store', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    act(() => {
      result.current.updateTooltipPos({ x: 70, y: 30 });
    });

    expect(mockUpdateTooltipPosition).toHaveBeenCalledWith({ x: 70, y: 30 });
  });

  it('derives hover position relative to the race container', () => {
    const containerRect = { left: 50, top: 100, width: 400, height: 300 } as DOMRect;
    const mockElement = {
      getBoundingClientRect: () => ({ left: 100, top: 200, width: 40, height: 40 } as DOMRect),
      closest: () => ({ getBoundingClientRect: () => containerRect }),
    } as unknown as HTMLElement;

    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    act(() => {
      result.current.handleChickenHover('player1', mockElement);
    });

    const [[playerId, position]] = mockShowTooltip.mock.calls;
    expect(playerId).toBe('player1');
    expect(position.x).toBeCloseTo(17.5, 1);
    expect(position.y).toBeCloseTo(33.333, 1);
  });

  it('hides tooltip on hover end', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    act(() => {
      result.current.handleChickenHover(null);
    });

    expect(mockHideTooltip).toHaveBeenCalled();
  });

  it('cycles through players every seven seconds', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    act(() => {
      result.current.startCycling();
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player1',
      expect.any(Object),
      expect.objectContaining({ playerName: 'Alice' }),
    );

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player2',
      expect.any(Object),
      expect.objectContaining({ playerName: 'Bob' }),
    );

    act(() => {
      vi.advanceTimersByTime(7000);
    });

    expect(mockShowTooltip).toHaveBeenCalledWith(
      'player3',
      expect.any(Object),
      expect.objectContaining({ playerName: 'Charlie' }),
    );
  });

  it('does not start cycling when disabled', () => {
    const { result } = renderHook(() => useTooltipManager({ players: mockPlayers, isEnabled: false }));

    act(() => {
      result.current.startCycling();
    });

    expect(mockShowTooltip).not.toHaveBeenCalled();
  });

  it('clears the cycling interval on cleanup', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useTooltipManager({ players: mockPlayers }));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
