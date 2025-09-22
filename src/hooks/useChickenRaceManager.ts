import { useEffect, useCallback, useMemo } from 'react';
import { FunifierApiService } from '../services/funifierApi';
import { useRealTimeUpdatesWithLoading } from './useRealTimeUpdates';
import { usePositionTransitions } from './usePositionTransitions';
import { useLeaderboardData } from './useAppState';
import type { FunifierConfig } from '../types';

/**
 * Configuration for the chicken race manager
 */
interface ChickenRaceManagerConfig {
  /** Funifier API configuration */
  apiConfig?: FunifierConfig;
  /** Real-time update configuration */
  realTimeConfig?: {
    pollingInterval?: number;
    enabled?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    pauseOnHidden?: boolean;
  };
  /** Position transition configuration */
  transitionConfig?: {
    transitionDuration?: number;
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
    staggered?: boolean;
    staggerDelay?: number;
    celebrateImprovements?: boolean;
  };
}

/**
 * Comprehensive hook that manages the entire chicken race functionality
 * including real-time updates, smooth transitions, and error handling
 */
export const useChickenRaceManager = (config: ChickenRaceManagerConfig = {}) => {
  const {
    apiConfig,
    realTimeConfig = {},
    transitionConfig = {},
  } = config;

  // Create API service instance
  const apiService = useMemo(() => {
    return new FunifierApiService(apiConfig);
  }, [apiConfig]);

  // Get leaderboard data and actions
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
  } = useLeaderboardData();

  // Set up real-time updates
  const realTimeUpdates = useRealTimeUpdatesWithLoading(apiService, {
    pollingInterval: 30000, // 30 seconds default
    enabled: true,
    maxRetries: 3,
    retryDelay: 1000,
    pauseOnHidden: true,
    ...realTimeConfig,
  });

  // Set up position transitions
  const positionTransitions = usePositionTransitions(players, {
    transitionDuration: 1000,
    easing: 'ease-out',
    staggered: true,
    staggerDelay: 100,
    celebrateImprovements: true,
    ...transitionConfig,
  });

  /**
   * Initialize the chicken race with leaderboards
   */
  const initializeRace = useCallback(async () => {
    try {
      setLoadingState('leaderboards', true);
      clearError();

      let fetchedLeaderboards: any[] = [];
      
      // Fetch available leaderboards from API
      fetchedLeaderboards = await apiService.getLeaderboards();
      
      if (fetchedLeaderboards.length === 0) {
        setError({
          type: 'validation',
          message: 'No leaderboards found',
          retryable: true,
          timestamp: Date.now(),
        });
        return;
      }

      // Initialize with first leaderboard
      const firstLeaderboard = fetchedLeaderboards[0];
      switchToLeaderboard(firstLeaderboard._id);

    } catch (error) {
      console.error('Failed to initialize chicken race:', error);
      setError(error as any);
    } finally {
      setLoadingState('leaderboards', false);
    }
  }, [apiService, setLoadingState, clearError, setError, switchToLeaderboard]);

  /**
   * Manually refresh current leaderboard data
   */
  const refreshData = useCallback(async () => {
    if (!currentLeaderboardId) {
      return;
    }

    try {
      setLoadingState('currentLeaderboard', true);
      clearError();

      const response = await apiService.getLeaderboardData(currentLeaderboardId, {
        live: true,
        maxResults: 100,
      });

      updatePlayers(response.leaders);

    } catch (error) {
      console.error('Failed to refresh leaderboard data:', error);
      setError(error as any);
    } finally {
      setLoadingState('currentLeaderboard', false);
    }
  }, [currentLeaderboardId, apiService, setLoadingState, clearError, setError, updatePlayers]);

  /**
   * Switch to a different leaderboard
   */
  const changeLeaderboard = useCallback(async (leaderboardId: string) => {
    try {
      setLoadingState('switchingLeaderboard', true);
      clearError();

      // Switch to new leaderboard
      switchToLeaderboard(leaderboardId);

      // Fetch data for new leaderboard
      const response = await apiService.getLeaderboardData(leaderboardId, {
        live: true,
        maxResults: 100,
      });

      updatePlayers(response.leaders);

    } catch (error) {
      console.error('Failed to switch leaderboard:', error);
      setError(error as any);
    } finally {
      setLoadingState('switchingLeaderboard', false);
    }
  }, [apiService, setLoadingState, clearError, setError, switchToLeaderboard, updatePlayers]);

  /**
   * Handle retry for failed operations
   */
  const retryFailedOperation = useCallback(() => {
    if (!error) {
      return;
    }

    clearError();

    // Determine what operation to retry based on current state
    if (!hasLeaderboards) {
      initializeRace();
    } else if (currentLeaderboardId) {
      refreshData();
    }
  }, [error, clearError, hasLeaderboards, currentLeaderboardId, initializeRace, refreshData]);

  /**
   * Get race statistics
   */
  const getRaceStats = useCallback(() => {
    const totalPlayers = players.length;
    const playersWithMovement = players.filter(p => p.move && p.move !== 'same').length;
    const topPlayer = players.find(p => p.position === 1);
    const lastPlayer = players.find(p => p.position === totalPlayers);

    return {
      totalPlayers,
      playersWithMovement,
      topPlayer,
      lastPlayer,
      hasMovement: playersWithMovement > 0,
      lastUpdated,
      timeSinceUpdate: lastUpdated ? Date.now() - lastUpdated : 0,
    };
  }, [players, lastUpdated]);

  /**
   * Get current race status
   */
  const getRaceStatus = useCallback(() => {
    return {
      isInitialized: hasLeaderboards && currentLeaderboard !== null,
      isLoading: isLoading || realTimeUpdates.isUpdating,
      hasError,
      error,
      isPolling: realTimeUpdates.isPolling,
      isAnimating: positionTransitions.isAnimating,
      canRetry: error?.retryable || false,
      connectionStatus: realTimeUpdates.timeSinceLastUpdate < 60000 ? 'connected' : 'disconnected',
    };
  }, [
    hasLeaderboards,
    currentLeaderboard,
    isLoading,
    hasError,
    error,
    realTimeUpdates.isPolling,
    realTimeUpdates.isUpdating,
    realTimeUpdates.timeSinceLastUpdate,
    positionTransitions.isAnimating,
  ]);

  // Auto-initialize on mount if API config is provided
  useEffect(() => {
    if (apiConfig && !hasLeaderboards && !isLoading && !hasError) {
      initializeRace();
    }
  }, [apiConfig, hasLeaderboards, isLoading, hasError, initializeRace]);

  return {
    // State
    leaderboards,
    currentLeaderboard,
    currentLeaderboardId,
    players,
    loading,
    error,
    lastUpdated,

    // Computed state
    hasLeaderboards,
    hasPlayers,
    isLoading,
    hasError,
    raceStats: getRaceStats(),
    raceStatus: getRaceStatus(),

    // Position data
    playerPositions: positionTransitions.playerPositions,
    getPlayerPosition: positionTransitions.getPlayerPosition,

    // Real-time update state
    realTimeStatus: {
      isPolling: realTimeUpdates.isPolling,
      isUpdating: realTimeUpdates.isUpdating,
      retryCount: realTimeUpdates.retryCount,
      timeSinceLastUpdate: realTimeUpdates.timeSinceLastUpdate,
      lastSuccessfulUpdate: realTimeUpdates.lastSuccessfulUpdate,
    },

    // Actions
    initializeRace,
    refreshData,
    changeLeaderboard,
    retryFailedOperation,
    clearError,

    // Real-time controls
    startPolling: realTimeUpdates.startPolling,
    stopPolling: realTimeUpdates.stopPolling,
    forceUpdate: realTimeUpdates.forceUpdate,

    // Position controls
    setImmediatePositions: positionTransitions.setImmediatePositions,

    // Configuration
    config: {
      realTime: realTimeUpdates.config,
      transitions: positionTransitions.config,
    },

    // API service for advanced usage
    apiService,
  };
};