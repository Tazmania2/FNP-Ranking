import { useEffect, useCallback, useMemo, useState } from 'react';
import { FunifierApiService } from '../services/funifierApi';
import { useRealTimeUpdatesWithLoading } from './useRealTimeUpdates';
import { usePositionTransitions } from './usePositionTransitions';
import { useLeaderboardData } from './useAppState';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { appStoreActions } from '../store/appStore';
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

  // Track initialization attempts to prevent infinite loops
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [usingMockData, setUsingMockData] = useState(false);

  // Mock data fallback
  const MOCK_LEADERBOARD_DATA = [
    {
      "_id": "cesar.domingos@cidadania4u.com.br_E7HHB2I",
      "total": 17.5,
      "position": 1,
      "move": "up",
      "player": "cesar.domingos@cidadania4u.com.br",
      "name": "Cesar Domingos",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    },
    {
      "_id": "taira.rabelo@cidadania4u.com.br_E7HHB2I",
      "total": 17,
      "position": 2,
      "move": "up",
      "player": "taira.rabelo@cidadania4u.com.br",
      "name": "Tairã Rabelo",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    },
    {
      "_id": "iuri.helou@cidadania4u.com.br_E7HHB2I",
      "total": 14,
      "position": 3,
      "move": "up",
      "player": "iuri.helou@cidadania4u.com.br",
      "name": "Iuri Helou",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    },
    {
      "_id": "game@grupo4u.com.br_E7HHB2I",
      "total": 10,
      "position": 4,
      "move": "up",
      "player": "game@grupo4u.com.br",
      "name": "Admin Game",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    }
  ];

  const MAX_RETRY_ATTEMPTS = 10;

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
   * Fallback to mock data when API fails repeatedly
   */
  const useMockDataFallback = useCallback(() => {
    console.warn('🐔 API failed after maximum retries. Using mock data for demonstration.');
    console.warn('Mock data is being displayed. This is not real leaderboard data.');
    
    setUsingMockData(true);
    
    // Create mock leaderboard
    const mockLeaderboard = {
      _id: 'EVeTmET',
      title: 'Demo Leaderboard (Mock Data)',
      description: 'This is mock data shown due to API connection issues',
    };

    // Set mock leaderboard and data in store
    const leaderboardStore = useLeaderboardStore.getState();
    leaderboardStore.setLeaderboards([mockLeaderboard]);
    leaderboardStore.setCurrentLeaderboard(mockLeaderboard);
    leaderboardStore.setCurrentLeaderboardId(mockLeaderboard._id);
    updatePlayers(MOCK_LEADERBOARD_DATA);
    
    // Clear any errors
    clearError();
  }, [updatePlayers, clearError]);

  /**
   * Initialize the chicken race with leaderboards
   */
  const initializeRace = useCallback(async () => {
    // Check if we've exceeded max retries
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.warn(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Falling back to mock data.`);
      useMockDataFallback();
      return;
    }

    try {
      setInitializationAttempted(true);
      setLoadingState('leaderboards', true);
      clearError();
      
      // Increment retry count
      setRetryCount(prev => prev + 1);
      console.log(`Initialization attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);

      let fetchedLeaderboards: any[] = [];
      
      try {
        // Now safe to call getLeaderboards since it's been fixed to not make the problematic API call
        fetchedLeaderboards = await apiService.getLeaderboards();
        console.log('Successfully got leaderboards (using safe method):', fetchedLeaderboards);
        
        // Test the leaderboard data to make sure it works
        const testResponse = await apiService.getLeaderboardData(fetchedLeaderboards[0]._id, { live: true });
        if (testResponse && testResponse.leaders) {
          console.log('Successfully verified leaderboard data access');
        }
      } catch (dataError) {
        console.error('Failed to fetch leaderboard data:', dataError);
        
        // If we've tried multiple times, use mock data
        if (retryCount >= MAX_RETRY_ATTEMPTS - 1) {
          console.warn('API consistently failing, using mock data fallback');
          useMockDataFallback();
          return;
        }
        
        setError({
          type: 'network',
          message: `Unable to connect to leaderboard service (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}). Please check your API configuration.`,
          retryable: true,
          timestamp: Date.now(),
        });
        return;
      }
      
      if (fetchedLeaderboards.length === 0) {
        if (retryCount >= MAX_RETRY_ATTEMPTS - 1) {
          console.warn('No leaderboards found after maximum retries, using mock data fallback');
          useMockDataFallback();
          return;
        }
        
        setError({
          type: 'validation',
          message: `No leaderboards found (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`,
          retryable: true,
          timestamp: Date.now(),
        });
        return;
      }

      // Set the leaderboards in the store first
      const leaderboardStore = useLeaderboardStore.getState();
      leaderboardStore.setLeaderboards(fetchedLeaderboards);

      // Wait a bit for the store to update, then initialize with first leaderboard
      const firstLeaderboard = fetchedLeaderboards[0];
      console.log('Setting up leaderboard:', firstLeaderboard);
      
      // Reset retry count on success
      setRetryCount(0);
      
      // Use setTimeout to ensure the store update has propagated
      setTimeout(() => {
        switchToLeaderboard(firstLeaderboard._id);
      }, 0);

    } catch (error) {
      console.error('Failed to initialize chicken race:', error);
      
      // If we've tried multiple times, use mock data
      if (retryCount >= MAX_RETRY_ATTEMPTS - 1) {
        console.warn('Initialization failed after maximum retries, using mock data fallback');
        useMockDataFallback();
        return;
      }
      
      setError(error as any);
    } finally {
      setLoadingState('leaderboards', false);
    }
  }, [apiService, setLoadingState, clearError, setError, switchToLeaderboard, retryCount, useMockDataFallback]);

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
    setInitializationAttempted(false); // Reset initialization flag for retry
    setRetryCount(0); // Reset retry counter for manual retry
    setUsingMockData(false); // Reset mock data flag
    appStoreActions.resetSwitchCounters(); // Reset switch attempt counters

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

  // Auto-initialize on mount if API config is provided - only run once
  useEffect(() => {
    if (apiConfig && !initializationAttempted) {
      initializeRace();
    }
  }, [apiConfig, initializationAttempted, initializeRace]);

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
    usingMockData,
    retryCount,
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