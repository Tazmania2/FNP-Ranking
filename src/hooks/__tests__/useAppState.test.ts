import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useChickenRaceApp, 
  useTooltipManager, 
  useAnimationManager, 
  useLeaderboardData,
  useAutoCycleManager 
} from '../useAppState';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import { useUIStore } from '../../store/uiStore';
import type { Leaderboard, Player, TooltipContent } from '../../types';

// Mock data
const mockLeaderboards: Leaderboard[] = [
  {
    _id: 'lb1',
    title: 'Test Leaderboard 1',
    description: 'First test leaderboard',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 1,
      timeScale: 1,
    },
  },
  {
    _id: 'lb2',
    title: 'Test Leaderboard 2',
    description: 'Second test leaderboard',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 1,
      timeScale: 1,
    },
  },
];

const mockPlayers: Player[] = [
  {
    _id: 'p1',
    player: 'player1',
    name: 'Player One',
    position: 1,
    total: 100,
  },
  {
    _id: 'p2',
    player: 'player2',
    name: 'Player Two',
    position: 2,
    total: 90,
  },
];

const mockTooltipContent: TooltipContent = {
  rank: 1,
  points: 100,
  pointsGainedToday: 10,
  playerName: 'Test Player',
};

// Mock timers
vi.useFakeTimers();

describe('useChickenRaceApp', () => {
  beforeEach(() => {
    // Reset stores before each test
    useLeaderboardStore.getState().resetStore();
    useUIStore.getState().resetUI();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should provide initial state correctly', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    expect(result.current.leaderboards).toEqual([]);
    expect(result.current.currentLeaderboard).toBeNull();
    expect(result.current.players).toEqual([]);
    expect(result.current.isInitialized).toBe(false);
    expect(result.current.hasLeaderboards).toBe(false);
    expect(result.current.hasPlayers).toBe(false);
    expect(result.current.canAutoCycle).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('should initialize app correctly', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    act(() => {
      result.current.initializeApp(mockLeaderboards);
    });

    expect(result.current.leaderboards).toEqual(mockLeaderboards);
    expect(result.current.currentLeaderboard).toEqual(mockLeaderboards[0]);
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.hasLeaderboards).toBe(true);
    expect(result.current.canAutoCycle).toBe(true);
  });

  it('should switch leaderboards correctly', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    act(() => {
      result.current.initializeApp(mockLeaderboards);
    });

    act(() => {
      result.current.switchToLeaderboard('lb2');
    });

    expect(result.current.currentLeaderboard).toEqual(mockLeaderboards[1]);
    expect(result.current.currentLeaderboardId).toBe('lb2');
  });

  it('should manage players correctly', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    act(() => {
      result.current.updatePlayers(mockPlayers);
    });

    expect(result.current.players).toEqual(mockPlayers);
    expect(result.current.hasPlayers).toBe(true);
    expect(result.current.lastUpdated).toBeTruthy();
  });

  it('should manage loading states correctly', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    act(() => {
      result.current.setLoadingState('leaderboards', true);
    });

    expect(result.current.loading.leaderboards).toBe(true);
    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setLoadingState('leaderboards', false);
    });

    expect(result.current.loading.leaderboards).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should manage error states correctly', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    const error = {
      type: 'network' as const,
      message: 'Test error',
      retryable: true,
      timestamp: Date.now(),
    };

    act(() => {
      result.current.setError(error);
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.hasError).toBe(true);

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it('should manage auto-cycling correctly', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    act(() => {
      result.current.initializeApp(mockLeaderboards);
    });

    act(() => {
      result.current.setAutoCycling(true);
    });

    expect(result.current.autoCycle.isEnabled).toBe(true);
    expect(result.current.autoCycle.timeUntilNext).toBeGreaterThan(0);

    act(() => {
      result.current.setAutoCycling(false);
    });

    expect(result.current.autoCycle.isEnabled).toBe(false);
    expect(result.current.autoCycle.timeUntilNext).toBe(0);
  });

  it('should cycle to next leaderboard', () => {
    const { result } = renderHook(() => useChickenRaceApp());

    act(() => {
      result.current.initializeApp(mockLeaderboards);
    });

    expect(result.current.currentLeaderboardId).toBe('lb1');

    act(() => {
      result.current.cycleToNext();
    });

    expect(result.current.currentLeaderboardId).toBe('lb2');
  });
});

describe('useTooltipManager', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('should manage tooltips correctly', () => {
    const { result } = renderHook(() => useTooltipManager());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.currentPlayer).toBeNull();

    act(() => {
      result.current.showTooltip('player1', { x: 100, y: 200 }, mockTooltipContent);
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.currentPlayer).toBe('player1');
    expect(result.current.tooltips.content).toEqual(mockTooltipContent);

    act(() => {
      result.current.hideTooltip();
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.currentPlayer).toBeNull();
  });
});

describe('useAnimationManager', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  it('should manage animations correctly', () => {
    const { result } = renderHook(() => useAnimationManager());

    expect(result.current.animationCount).toBe(0);
    expect(result.current.hasAnimation('player1')).toBe(false);

    act(() => {
      result.current.updatePlayerAnimation('player1', {
        currentPosition: { x: 50, y: 30 },
        targetPosition: { x: 60, y: 35 },
        animationState: 'moving',
        lastUpdate: Date.now(),
      });
    });

    expect(result.current.animationCount).toBe(1);
    expect(result.current.hasAnimation('player1')).toBe(true);

    const animation = result.current.getPlayerAnimation('player1');
    expect(animation?.animationState).toBe('moving');
  });
});

describe('useLeaderboardData', () => {
  beforeEach(() => {
    useLeaderboardStore.getState().resetStore();
  });

  it('should provide leaderboard data and actions', () => {
    const { result } = renderHook(() => useLeaderboardData());

    expect(result.current.hasLeaderboards).toBe(false);
    expect(result.current.hasPlayers).toBe(false);

    act(() => {
      result.current.updatePlayers(mockPlayers);
    });

    expect(result.current.players).toEqual(mockPlayers);
    expect(result.current.hasPlayers).toBe(true);
  });
});

describe('useAutoCycleManager', () => {
  beforeEach(() => {
    useLeaderboardStore.getState().resetStore();
    useUIStore.getState().resetUI();
  });

  it('should provide auto-cycle functionality', () => {
    const { result } = renderHook(() => useAutoCycleManager());

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.canAutoCycle).toBe(false);

    // Initialize with leaderboards to enable auto-cycling
    act(() => {
      useLeaderboardStore.getState().setLeaderboards(mockLeaderboards);
    });

    expect(result.current.canAutoCycle).toBe(true);

    act(() => {
      result.current.setAutoCycling(true);
    });

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.timeUntilNext).toBeGreaterThan(0);
  });
});