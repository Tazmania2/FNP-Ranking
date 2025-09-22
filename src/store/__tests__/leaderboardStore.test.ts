import { describe, it, expect, beforeEach } from 'vitest';
import { useLeaderboardStore } from '../leaderboardStore';
import type { Leaderboard, Player, ApiError } from '../../types';

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
    move: 'up',
  },
  {
    _id: 'p2',
    player: 'player2',
    name: 'Player Two',
    position: 2,
    total: 90,
    move: 'same',
  },
];

const mockError: ApiError = {
  type: 'network',
  message: 'Network error occurred',
  retryable: true,
  timestamp: Date.now(),
};

describe('LeaderboardStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useLeaderboardStore.getState().resetStore();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useLeaderboardStore.getState();
      
      expect(state.leaderboards).toEqual([]);
      expect(state.currentLeaderboard).toBeNull();
      expect(state.currentLeaderboardId).toBeNull();
      expect(state.players).toEqual([]);
      expect(state.loading).toEqual({
        leaderboards: false,
        currentLeaderboard: false,
        switchingLeaderboard: false,
      });
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });
  });

  describe('Leaderboard Management', () => {
    it('should set leaderboards correctly', () => {
      const { setLeaderboards } = useLeaderboardStore.getState();
      
      setLeaderboards(mockLeaderboards);
      
      const state = useLeaderboardStore.getState();
      expect(state.leaderboards).toEqual(mockLeaderboards);
    });

    it('should set current leaderboard and ID', () => {
      const { setCurrentLeaderboard } = useLeaderboardStore.getState();
      
      setCurrentLeaderboard(mockLeaderboards[0]);
      
      const state = useLeaderboardStore.getState();
      expect(state.currentLeaderboard).toEqual(mockLeaderboards[0]);
      expect(state.currentLeaderboardId).toBe(mockLeaderboards[0]._id);
    });

    it('should set current leaderboard ID independently', () => {
      const { setCurrentLeaderboardId } = useLeaderboardStore.getState();
      
      setCurrentLeaderboardId('test-id');
      
      const state = useLeaderboardStore.getState();
      expect(state.currentLeaderboardId).toBe('test-id');
    });

    it('should set players correctly', () => {
      const { setPlayers } = useLeaderboardStore.getState();
      
      setPlayers(mockPlayers);
      
      const state = useLeaderboardStore.getState();
      expect(state.players).toEqual(mockPlayers);
    });
  });

  describe('Loading State Management', () => {
    it('should set individual loading states', () => {
      const { setLoading } = useLeaderboardStore.getState();
      
      setLoading('leaderboards', true);
      
      let state = useLeaderboardStore.getState();
      expect(state.loading.leaderboards).toBe(true);
      expect(state.loading.currentLeaderboard).toBe(false);
      expect(state.loading.switchingLeaderboard).toBe(false);

      setLoading('currentLeaderboard', true);
      
      state = useLeaderboardStore.getState();
      expect(state.loading.leaderboards).toBe(true);
      expect(state.loading.currentLeaderboard).toBe(true);
      expect(state.loading.switchingLeaderboard).toBe(false);
    });

    it('should set multiple loading states at once', () => {
      const { setAllLoading } = useLeaderboardStore.getState();
      
      setAllLoading({
        leaderboards: true,
        currentLeaderboard: true,
      });
      
      const state = useLeaderboardStore.getState();
      expect(state.loading.leaderboards).toBe(true);
      expect(state.loading.currentLeaderboard).toBe(true);
      expect(state.loading.switchingLeaderboard).toBe(false); // Should remain unchanged
    });
  });

  describe('Error Handling', () => {
    it('should set error correctly', () => {
      const { setError } = useLeaderboardStore.getState();
      
      setError(mockError);
      
      const state = useLeaderboardStore.getState();
      expect(state.error).toEqual(mockError);
    });

    it('should clear error', () => {
      const { setError, clearError } = useLeaderboardStore.getState();
      
      setError(mockError);
      clearError();
      
      const state = useLeaderboardStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('Data Refresh', () => {
    it('should set last updated timestamp', () => {
      const { setLastUpdated } = useLeaderboardStore.getState();
      const timestamp = Date.now();
      
      setLastUpdated(timestamp);
      
      const state = useLeaderboardStore.getState();
      expect(state.lastUpdated).toBe(timestamp);
    });
  });

  describe('Reset Functions', () => {
    it('should reset leaderboard data only', () => {
      const { 
        setLeaderboards, 
        setCurrentLeaderboard, 
        setPlayers, 
        setError, 
        setLastUpdated,
        resetLeaderboardData 
      } = useLeaderboardStore.getState();
      
      // Set some data
      setLeaderboards(mockLeaderboards);
      setCurrentLeaderboard(mockLeaderboards[0]);
      setPlayers(mockPlayers);
      setError(mockError);
      setLastUpdated(Date.now());
      
      // Reset leaderboard data
      resetLeaderboardData();
      
      const state = useLeaderboardStore.getState();
      expect(state.leaderboards).toEqual(mockLeaderboards); // Should remain
      expect(state.currentLeaderboard).toBeNull();
      expect(state.currentLeaderboardId).toBeNull();
      expect(state.players).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });

    it('should reset entire store', () => {
      const { 
        setLeaderboards, 
        setCurrentLeaderboard, 
        setPlayers, 
        setError, 
        setLastUpdated,
        setLoading,
        resetStore 
      } = useLeaderboardStore.getState();
      
      // Set some data
      setLeaderboards(mockLeaderboards);
      setCurrentLeaderboard(mockLeaderboards[0]);
      setPlayers(mockPlayers);
      setError(mockError);
      setLastUpdated(Date.now());
      setLoading('leaderboards', true);
      
      // Reset entire store
      resetStore();
      
      const state = useLeaderboardStore.getState();
      expect(state.leaderboards).toEqual([]);
      expect(state.currentLeaderboard).toBeNull();
      expect(state.currentLeaderboardId).toBeNull();
      expect(state.players).toEqual([]);
      expect(state.loading).toEqual({
        leaderboards: false,
        currentLeaderboard: false,
        switchingLeaderboard: false,
      });
      expect(state.error).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });
  });

  describe('Selector Hooks', () => {
    it('should provide correct selector values', () => {
      const { setLeaderboards, setCurrentLeaderboard, setPlayers } = useLeaderboardStore.getState();
      
      setLeaderboards(mockLeaderboards);
      setCurrentLeaderboard(mockLeaderboards[0]);
      setPlayers(mockPlayers);
      
      // Note: In a real test environment, you would need to render these hooks
      // For now, we'll test the store state directly
      const state = useLeaderboardStore.getState();
      expect(state.leaderboards).toEqual(mockLeaderboards);
      expect(state.currentLeaderboard).toEqual(mockLeaderboards[0]);
      expect(state.players).toEqual(mockPlayers);
    });
  });
});