import { useCallback, useEffect } from 'react';
import { 
  useAppState, 
  useAutoCycleStatus, 
  appStoreActions 
} from '../store';
import type { Leaderboard, Player, TooltipContent } from '../types';

/**
 * Custom hook that provides a comprehensive interface to the application state
 * and actions. This hook combines leaderboard and UI state management with
 * convenient action methods.
 */
export const useChickenRaceApp = () => {
  const state = useAppState();
  const autoCycleStatus = useAutoCycleStatus();

  // Initialize the application
  const initializeApp = useCallback((
    leaderboards: Leaderboard[], 
    initialLeaderboardId?: string
  ) => {
    appStoreActions.initializeApp(leaderboards, initialLeaderboardId);
  }, []);

  // Leaderboard management
  const switchToLeaderboard = useCallback((leaderboardId: string) => {
    appStoreActions.switchToLeaderboard(leaderboardId);
  }, []);

  const cycleToNext = useCallback(() => {
    appStoreActions.cycleToNextLeaderboard();
  }, []);

  // Auto-cycling management
  const setAutoCycling = useCallback((enabled: boolean) => {
    appStoreActions.setAutoCycling(enabled);
  }, []);

  const getTimeUntilNextSwitch = useCallback(() => {
    return appStoreActions.getTimeUntilNextSwitch();
  }, []);

  // Tooltip management
  const showTooltip = useCallback((
    playerId: string, 
    position: { x: number; y: number }, 
    content: TooltipContent
  ) => {
    state.showTooltip(playerId, position, content);
  }, [state]);

  const hideTooltip = useCallback(() => {
    state.hideTooltip();
  }, [state]);

  // Animation management
  const updatePlayerAnimation = useCallback((
    playerId: string, 
    animation: Parameters<typeof state.updateChickenAnimation>[1]
  ) => {
    const fullAnimation = {
      playerId,
      currentPosition: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0 },
      animationState: 'idle' as const,
      lastUpdate: Date.now(),
      ...animation,
    };
    state.addChickenAnimation(fullAnimation);
  }, [state]);

  // Data management
  const updatePlayers = useCallback((players: Player[]) => {
    state.setPlayers(players);
    state.setLastUpdated(Date.now());
  }, [state]);

  const setLoadingState = useCallback((
    key: Parameters<typeof state.setLoading>[0], 
    value: boolean
  ) => {
    state.setLoading(key, value);
  }, [state]);

  const setError = useCallback((error: Parameters<typeof state.setError>[0]) => {
    state.setError(error);
  }, [state]);

  const clearError = useCallback(() => {
    state.clearError();
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      appStoreActions.cleanup();
    };
  }, []);

  return {
    // State
    leaderboards: state.leaderboards,
    currentLeaderboard: state.currentLeaderboard,
    currentLeaderboardId: state.currentLeaderboardId,
    players: state.players,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    tooltips: state.tooltips,
    animations: state.animations,
    isInitialized: state.isInitialized,
    
    // Auto-cycle status
    autoCycle: {
      ...autoCycleStatus,
      timeUntilNext: getTimeUntilNextSwitch(),
    },

    // Actions
    initializeApp,
    switchToLeaderboard,
    cycleToNext,
    setAutoCycling,
    showTooltip,
    hideTooltip,
    updatePlayerAnimation,
    updatePlayers,
    setLoadingState,
    setError,
    clearError,

    // Computed values
    hasLeaderboards: state.leaderboards.length > 0,
    hasPlayers: state.players.length > 0,
    canAutoCycle: autoCycleStatus.canCycle,
    isLoading: Object.values(state.loading).some(Boolean),
    hasError: state.error !== null,
  };
};

/**
 * Hook for components that only need tooltip functionality
 */
export const useTooltipManager = () => {
  const { tooltips, showTooltip, hideTooltip } = useChickenRaceApp();

  return {
    tooltips,
    showTooltip,
    hideTooltip,
    isVisible: tooltips.isVisible,
    currentPlayer: tooltips.playerId,
  };
};

/**
 * Hook for components that only need animation functionality
 */
export const useAnimationManager = () => {
  const { animations, updatePlayerAnimation } = useChickenRaceApp();

  const getPlayerAnimation = useCallback((playerId: string) => {
    return animations.find(anim => anim.playerId === playerId);
  }, [animations]);

  const hasAnimation = useCallback((playerId: string) => {
    return animations.some(anim => anim.playerId === playerId);
  }, [animations]);

  return {
    animations,
    updatePlayerAnimation,
    getPlayerAnimation,
    hasAnimation,
    animationCount: animations.length,
  };
};

/**
 * Hook for components that only need leaderboard data
 */
export const useLeaderboardData = () => {
  const { 
    leaderboards, 
    currentLeaderboard, 
    currentLeaderboardId,
    players,
    loading,
    error,
    lastUpdated,
    hasLeaderboards,
    hasPlayers,
    isLoading,
    hasError,
    switchToLeaderboard,
    updatePlayers,
    setLoadingState,
    setError,
    clearError,
  } = useChickenRaceApp();

  return {
    leaderboards,
    currentLeaderboard,
    currentLeaderboardId,
    players,
    loading,
    error,
    lastUpdated,
    hasLeaderboards,
    hasPlayers,
    isLoading,
    hasError,
    switchToLeaderboard,
    updatePlayers,
    setLoadingState,
    setError,
    clearError,
  };
};

/**
 * Hook for components that only need auto-cycle functionality
 */
export const useAutoCycleManager = () => {
  const { 
    autoCycle, 
    setAutoCycling, 
    cycleToNext,
    canAutoCycle,
  } = useChickenRaceApp();

  return {
    autoCycle,
    setAutoCycling,
    cycleToNext,
    canAutoCycle,
    isEnabled: autoCycle.isEnabled,
    currentIndex: autoCycle.currentIndex,
    totalLeaderboards: autoCycle.totalLeaderboards,
    timeUntilNext: autoCycle.timeUntilNext,
  };
};