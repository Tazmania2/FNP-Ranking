import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { appStoreActions } from '../appStore';
import { useLeaderboardStore } from '../leaderboardStore';
import { useUIStore } from '../uiStore';
import type { Leaderboard } from '../../types';

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
  {
    _id: 'lb3',
    title: 'Test Leaderboard 3',
    description: 'Third test leaderboard',
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

// Mock timers
vi.useFakeTimers();

describe('AppStoreActions', () => {
  beforeEach(() => {
    // Reset stores before each test
    useLeaderboardStore.getState().resetStore();
    useUIStore.getState().resetUI();
    
    // Clear any existing intervals
    vi.clearAllTimers();
  });

  afterEach(() => {
    // Clean up after each test
    appStoreActions.cleanup();
    vi.clearAllTimers();
  });

  describe('initializeApp', () => {
    it('should initialize app with leaderboards and set first as current', () => {
      appStoreActions.initializeApp(mockLeaderboards);
      
      const leaderboardState = useLeaderboardStore.getState();
      const uiState = useUIStore.getState();
      
      expect(leaderboardState.leaderboards).toEqual(mockLeaderboards);
      expect(leaderboardState.currentLeaderboard).toEqual(mockLeaderboards[0]);
      expect(leaderboardState.currentLeaderboardId).toBe(mockLeaderboards[0]._id);
      expect(uiState.autoCycle.currentIndex).toBe(0);
      expect(uiState.isInitialized).toBe(true);
    });

    it('should initialize app with specific initial leaderboard', () => {
      appStoreActions.initializeApp(mockLeaderboards, 'lb2');
      
      const leaderboardState = useLeaderboardStore.getState();
      const uiState = useUIStore.getState();
      
      expect(leaderboardState.currentLeaderboard).toEqual(mockLeaderboards[1]);
      expect(leaderboardState.currentLeaderboardId).toBe('lb2');
      expect(uiState.autoCycle.currentIndex).toBe(1);
    });

    it('should fallback to first leaderboard if initial ID not found', () => {
      appStoreActions.initializeApp(mockLeaderboards, 'nonexistent');
      
      const leaderboardState = useLeaderboardStore.getState();
      const uiState = useUIStore.getState();
      
      expect(leaderboardState.currentLeaderboard).toEqual(mockLeaderboards[0]);
      expect(uiState.autoCycle.currentIndex).toBe(0);
    });

    it('should handle empty leaderboards array', () => {
      appStoreActions.initializeApp([]);
      
      const leaderboardState = useLeaderboardStore.getState();
      const uiState = useUIStore.getState();
      
      expect(leaderboardState.leaderboards).toEqual([]);
      expect(leaderboardState.currentLeaderboard).toBeNull();
      expect(uiState.isInitialized).toBe(true);
    });
  });

  describe('switchToLeaderboard', () => {
    beforeEach(() => {
      appStoreActions.initializeApp(mockLeaderboards);
    });

    it('should switch to specified leaderboard', () => {
      appStoreActions.switchToLeaderboard('lb2');
      
      const leaderboardState = useLeaderboardStore.getState();
      const uiState = useUIStore.getState();
      
      expect(leaderboardState.currentLeaderboard).toEqual(mockLeaderboards[1]);
      expect(leaderboardState.currentLeaderboardId).toBe('lb2');
      expect(uiState.autoCycle.currentIndex).toBe(1);
    });

    it('should clear previous data when switching', () => {
      const leaderboardStore = useLeaderboardStore.getState();
      const uiStore = useUIStore.getState();
      
      // Set some previous data
      leaderboardStore.setPlayers([
        {
          _id: 'p1',
          player: 'player1',
          name: 'Player One',
          position: 1,
          total: 100,
        },
      ]);
      uiStore.showTooltip('p1', { x: 100, y: 200 }, {
        rank: 1,
        points: 100,
        pointsGainedToday: 10,
        playerName: 'Player One',
      });
      
      appStoreActions.switchToLeaderboard('lb2');
      
      const newLeaderboardState = useLeaderboardStore.getState();
      const newUIState = useUIStore.getState();
      
      expect(newLeaderboardState.players).toEqual([]);
      expect(newUIState.tooltips.isVisible).toBe(false);
      expect(newUIState.animations).toEqual([]);
    });

    it('should update next switch time if auto-cycling is enabled', () => {
      const uiStore = useUIStore.getState();
      uiStore.setAutoCycleEnabled(true);
      
      const beforeTime = Date.now();
      appStoreActions.switchToLeaderboard('lb2');
      const afterTime = Date.now();
      
      const uiState = useUIStore.getState();
      expect(uiState.autoCycle.nextSwitchTime).toBeGreaterThan(beforeTime);
      expect(uiState.autoCycle.nextSwitchTime).toBeGreaterThan(afterTime);
    });

    it('should handle nonexistent leaderboard ID gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const beforeState = useLeaderboardStore.getState();
      appStoreActions.switchToLeaderboard('nonexistent');
      const afterState = useLeaderboardStore.getState();
      
      expect(consoleSpy).toHaveBeenCalledWith('Leaderboard with ID nonexistent not found');
      expect(afterState.currentLeaderboard).toEqual(beforeState.currentLeaderboard);
      
      consoleSpy.mockRestore();
    });
  });

  describe('setAutoCycling', () => {
    beforeEach(() => {
      appStoreActions.initializeApp(mockLeaderboards);
    });

    it('should enable auto-cycling with multiple leaderboards', () => {
      appStoreActions.setAutoCycling(true);
      
      const uiState = useUIStore.getState();
      
      expect(uiState.autoCycle.isEnabled).toBe(true);
      expect(uiState.autoCycle.nextSwitchTime).toBeGreaterThan(Date.now());
      expect(uiState.autoCycle.intervalId).toBeTruthy();
    });

    it('should not enable auto-cycling with single leaderboard', () => {
      // Initialize with single leaderboard
      appStoreActions.initializeApp([mockLeaderboards[0]]);
      
      appStoreActions.setAutoCycling(true);
      
      const uiState = useUIStore.getState();
      
      expect(uiState.autoCycle.isEnabled).toBe(true);
      expect(uiState.autoCycle.nextSwitchTime).toBe(0);
      expect(uiState.autoCycle.intervalId).toBeNull();
    });

    it('should disable auto-cycling and clear interval', () => {
      // First enable auto-cycling
      appStoreActions.setAutoCycling(true);
      
      const uiStateEnabled = useUIStore.getState();
      const intervalId = uiStateEnabled.autoCycle.intervalId;
      expect(intervalId).toBeTruthy();
      
      // Then disable it
      appStoreActions.setAutoCycling(false);
      
      const uiStateDisabled = useUIStore.getState();
      expect(uiStateDisabled.autoCycle.isEnabled).toBe(false);
      expect(uiStateDisabled.autoCycle.nextSwitchTime).toBe(0);
      expect(uiStateDisabled.autoCycle.intervalId).toBeNull();
    });

    it('should clear existing interval when re-enabling', () => {
      // Enable auto-cycling
      appStoreActions.setAutoCycling(true);
      const firstIntervalId = useUIStore.getState().autoCycle.intervalId;
      
      // Re-enable auto-cycling
      appStoreActions.setAutoCycling(true);
      const secondIntervalId = useUIStore.getState().autoCycle.intervalId;
      
      expect(firstIntervalId).not.toBe(secondIntervalId);
    });
  });

  describe('cycleToNextLeaderboard', () => {
    beforeEach(() => {
      appStoreActions.initializeApp(mockLeaderboards);
    });

    it('should cycle to next leaderboard', () => {
      // Start at first leaderboard (index 0)
      expect(useLeaderboardStore.getState().currentLeaderboardId).toBe('lb1');
      
      appStoreActions.cycleToNextLeaderboard();
      
      expect(useLeaderboardStore.getState().currentLeaderboardId).toBe('lb2');
      expect(useUIStore.getState().autoCycle.currentIndex).toBe(1);
    });

    it('should wrap around to first leaderboard after last', () => {
      // Start at last leaderboard
      appStoreActions.switchToLeaderboard('lb3');
      expect(useUIStore.getState().autoCycle.currentIndex).toBe(2);
      
      appStoreActions.cycleToNextLeaderboard();
      
      expect(useLeaderboardStore.getState().currentLeaderboardId).toBe('lb1');
      expect(useUIStore.getState().autoCycle.currentIndex).toBe(0);
    });

    it('should not cycle with single leaderboard', () => {
      // Initialize with single leaderboard
      appStoreActions.initializeApp([mockLeaderboards[0]]);
      
      const beforeId = useLeaderboardStore.getState().currentLeaderboardId;
      appStoreActions.cycleToNextLeaderboard();
      const afterId = useLeaderboardStore.getState().currentLeaderboardId;
      
      expect(beforeId).toBe(afterId);
    });

    it('should not cycle with no leaderboards', () => {
      // Initialize with no leaderboards
      appStoreActions.initializeApp([]);
      
      // Should not throw error
      expect(() => appStoreActions.cycleToNextLeaderboard()).not.toThrow();
    });
  });

  describe('getTimeUntilNextSwitch', () => {
    beforeEach(() => {
      appStoreActions.initializeApp(mockLeaderboards);
    });

    it('should return 0 when auto-cycling is disabled', () => {
      const timeRemaining = appStoreActions.getTimeUntilNextSwitch();
      expect(timeRemaining).toBe(0);
    });

    it('should return correct time remaining when auto-cycling is enabled', () => {
      appStoreActions.setAutoCycling(true);
      
      const timeRemaining = appStoreActions.getTimeUntilNextSwitch();
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(5 * 60 * 1000); // 5 minutes
    });

    it('should return 0 when next switch time is in the past', () => {
      const uiStore = useUIStore.getState();
      uiStore.setAutoCycleEnabled(true);
      uiStore.setNextSwitchTime(Date.now() - 1000); // 1 second ago
      
      const timeRemaining = appStoreActions.getTimeUntilNextSwitch();
      expect(timeRemaining).toBe(0);
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      appStoreActions.initializeApp(mockLeaderboards);
    });

    it('should clear interval and reset stores', () => {
      // Enable auto-cycling to create an interval
      appStoreActions.setAutoCycling(true);
      
      const beforeCleanup = useUIStore.getState();
      expect(beforeCleanup.autoCycle.intervalId).toBeTruthy();
      expect(beforeCleanup.isInitialized).toBe(true);
      
      appStoreActions.cleanup();
      
      const leaderboardState = useLeaderboardStore.getState();
      const uiState = useUIStore.getState();
      
      expect(leaderboardState.leaderboards).toEqual([]);
      expect(leaderboardState.currentLeaderboard).toBeNull();
      expect(uiState.autoCycle.intervalId).toBeNull();
      expect(uiState.isInitialized).toBe(false);
    });
  });

  describe('Auto-cycling Integration', () => {
    beforeEach(() => {
      appStoreActions.initializeApp(mockLeaderboards);
    });

    it('should automatically cycle through leaderboards', () => {
      appStoreActions.setAutoCycling(true);
      
      // Initially at first leaderboard
      expect(useLeaderboardStore.getState().currentLeaderboardId).toBe('lb1');
      
      // Fast-forward 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      // Should have cycled to second leaderboard
      expect(useLeaderboardStore.getState().currentLeaderboardId).toBe('lb2');
      
      // Fast-forward another 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      // Should have cycled to third leaderboard
      expect(useLeaderboardStore.getState().currentLeaderboardId).toBe('lb3');
      
      // Fast-forward another 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      
      // Should have wrapped around to first leaderboard
      expect(useLeaderboardStore.getState().currentLeaderboardId).toBe('lb1');
    });
  });
});