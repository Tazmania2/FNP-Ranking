
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  LeaderboardState, 
  Leaderboard, 
  Player, 
  ApiError, 
  LoadingState 
} from '../types';

interface LeaderboardActions {
  // Leaderboard management
   
  setLeaderboards: (_leaderboards: Leaderboard[]) => void;
  setCurrentLeaderboard: (_leaderboard: Leaderboard) => void;
  setCurrentLeaderboardId: (_id: string) => void;
  setPlayers: (_players: Player[]) => void;
  
  // Loading state management
  setLoading: (_key: keyof LoadingState, _value: boolean) => void;
  setAllLoading: (_loading: Partial<LoadingState>) => void;
  
  // Error handling
  setError: (_error: ApiError | null) => void;
  clearError: () => void;
  
  // Data refresh
  setLastUpdated: (_timestamp: number) => void;
  
  // Reset functions
  resetLeaderboardData: () => void;
  resetStore: () => void;
}

type LeaderboardStore = LeaderboardState & LeaderboardActions;

const initialState: LeaderboardState = {
  leaderboards: [],
  currentLeaderboard: null,
  currentLeaderboardId: null,
  players: [],
  loading: {
    leaderboards: false,
    currentLeaderboard: false,
    switchingLeaderboard: false,
  },
  error: null,
  lastUpdated: null,
};

export const useLeaderboardStore = create<LeaderboardStore>()(
  devtools(
    (set) => ({
      ...initialState,

      // Leaderboard management actions
      setLeaderboards: (leaderboards) =>
        set(
          { leaderboards },
          false,
          'leaderboard/setLeaderboards'
        ),

      setCurrentLeaderboard: (leaderboard) =>
        set(
          { 
            currentLeaderboard: leaderboard,
            currentLeaderboardId: leaderboard._id,
          },
          false,
          'leaderboard/setCurrentLeaderboard'
        ),

      setCurrentLeaderboardId: (id) =>
        set(
          { currentLeaderboardId: id },
          false,
          'leaderboard/setCurrentLeaderboardId'
        ),

      setPlayers: (players) =>
        set(
          { players },
          false,
          'leaderboard/setPlayers'
        ),

      // Loading state management
      setLoading: (key, value) =>
        set(
          (state) => ({
            loading: {
              ...state.loading,
              [key]: value,
            },
          }),
          false,
          `leaderboard/setLoading/${key}`
        ),

      setAllLoading: (loading) =>
        set(
          (state) => ({
            loading: {
              ...state.loading,
              ...loading,
            },
          }),
          false,
          'leaderboard/setAllLoading'
        ),

      // Error handling
      setError: (error) =>
        set(
          { error },
          false,
          'leaderboard/setError'
        ),

      clearError: () =>
        set(
          { error: null },
          false,
          'leaderboard/clearError'
        ),

      // Data refresh
      setLastUpdated: (timestamp) =>
        set(
          { lastUpdated: timestamp },
          false,
          'leaderboard/setLastUpdated'
        ),

      // Reset functions
      resetLeaderboardData: () =>
        set(
          {
            currentLeaderboard: null,
            currentLeaderboardId: null,
            players: [],
            error: null,
            lastUpdated: null,
          },
          false,
          'leaderboard/resetLeaderboardData'
        ),

      resetStore: () =>
        set(
          initialState,
          false,
          'leaderboard/resetStore'
        ),
    }),
    {
      name: 'leaderboard-store',
    }
  )
);

// Selector hooks for better performance
export const useLeaderboards = () => useLeaderboardStore((state) => state.leaderboards);
export const useCurrentLeaderboard = () => useLeaderboardStore((state) => state.currentLeaderboard);
export const useCurrentLeaderboardId = () => useLeaderboardStore((state) => state.currentLeaderboardId);
export const usePlayers = () => useLeaderboardStore((state) => state.players);
export const useLeaderboardLoading = () => useLeaderboardStore((state) => state.loading);
export const useLeaderboardError = () => useLeaderboardStore((state) => state.error);
export const useLastUpdated = () => useLeaderboardStore((state) => state.lastUpdated);