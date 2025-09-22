import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { FunifierApiService } from '../services/funifierApi';
// import { useRealTimeUpdatesWithLoading } from './useRealTimeUpdates'; // Temporarily disabled
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
  /** Callback for authentication errors */
  onAuthError?: () => void;
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
    onAuthError,
  } = config;

  // Track initialization attempts to prevent infinite loops
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const retryCountRef = useRef(0);
  const isInitializingRef = useRef(false);
  const [usingMockData, setUsingMockData] = useState(false);

  // Mock data fallback
  const MOCK_LEADERBOARD_DATA = [
    {
      "_id": "cesar.domingos@cidadania4u.com.br_E7HHB2I",
      "total": 17.5,
      "position": 1,
      "move": "up" as const,
      "player": "cesar.domingos@cidadania4u.com.br",
      "name": "Cesar Domingos",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    },
    {
      "_id": "taira.rabelo@cidadania4u.com.br_E7HHB2I",
      "total": 17,
      "position": 2,
      "move": "up" as const,
      "player": "taira.rabelo@cidadania4u.com.br",
      "name": "Tairã Rabelo",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    },
    {
      "_id": "iuri.helou@cidadania4u.com.br_E7HHB2I",
      "total": 14,
      "position": 3,
      "move": "up" as const,
      "player": "iuri.helou@cidadania4u.com.br",
      "name": "Iuri Helou",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    },
    {
      "_id": "game@grupo4u.com.br_E7HHB2I",
      "total": 10,
      "position": 4,
      "move": "up" as const,
      "player": "game@grupo4u.com.br",
      "name": "Admin Game",
      "extra": {"cache": "E7HHB2I"},
      "boardId": "EVeTmET"
    }
  ];

  const MAX_RETRY_ATTEMPTS = 3; // Reduced to prevent immediate fallback

  // Create API service instance
  const apiService = useMemo(() => {
    if (!apiConfig) {
      return null;
    }
    try {
      return new FunifierApiService(apiConfig);
    } catch (error) {
      console.error('Failed to create API service:', error);
      // Trigger auth error callback if provided
      if (onAuthError) {
        onAuthError();
      }
      return null;
    }
  }, [apiConfig, onAuthError]);

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

  // TEMPORARILY DISABLE real-time updates to prevent infinite loops
  // We'll re-enable this once we fix the loop issue
  const realTimeUpdates = {
    isPolling: false,
    isUpdating: false,
    retryCount: 0,
    timeSinceLastUpdate: 0,
    lastSuccessfulUpdate: 0,
    startPolling: () => console.log('🚨 Real-time polling disabled to prevent loops'),
    stopPolling: () => console.log('🚨 Real-time polling disabled to prevent loops'),
    forceUpdate: () => console.log('🚨 Real-time updates disabled to prevent loops'),
    config: {
      pollingInterval: 30000,
      enabled: false, // DISABLED
      maxRetries: 3,
      retryDelay: 2000,
      pauseOnHidden: true,
    },
  };

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
  const activateMockDataFallback = useCallback(() => {
    console.warn('🐔 API failed after maximum retries. Using mock data for demonstration.');
    console.warn('Mock data is being displayed. This is not real leaderboard data.');
    
    setUsingMockData(true);
    
    // Create mock leaderboard with proper typing
    const mockLeaderboard = {
      _id: 'EVeTmET',
      title: 'Demo Leaderboard (Mock Data)',
      description: 'This is mock data shown due to API connection issues',
      principalType: 0,
      operation: {
        type: 0,
        achievement_type: 0,
        item: 'total',
        sort: 1,
      },
      period: {
        type: 0,
        timeAmount: 0,
        timeScale: 0,
      },
    };

    // Set mock leaderboard and data in store
    const leaderboardStore = useLeaderboardStore.getState();
    leaderboardStore.setLeaderboards([mockLeaderboard]);
    leaderboardStore.setCurrentLeaderboard(mockLeaderboard);
    leaderboardStore.setCurrentLeaderboardId(mockLeaderboard._id);
    updatePlayers(MOCK_LEADERBOARD_DATA);
    
    // Clear any errors and loading states
    console.log('🐔 Clearing all loading states and errors...');
    clearError();
    setLoadingState('leaderboards', false);
    setLoadingState('currentLeaderboard', false);
    setLoadingState('switchingLeaderboard', false);
    
    // Force reset initialization flags
    isInitializingRef.current = false;
    retryCountRef.current = 0;
    
    console.log('🐔 Mock data setup complete!');
  }, [updatePlayers, clearError, setLoadingState, MOCK_LEADERBOARD_DATA]);

  /**
   * Initialize the chicken race with leaderboards
   */
  const initializeRace = useCallback(async () => {
    // If no API service is available, fall back to mock data immediately
    if (!apiService) {
      console.warn('🔐 No API service available (likely auth error), falling back to mock data');
      activateMockDataFallback();
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (isInitializingRef.current) {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    // Check if we've exceeded max retries
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      console.warn(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Falling back to mock data.`);
      activateMockDataFallback();
      return;
    }

    try {
      isInitializingRef.current = true;
      setInitializationAttempted(true);
      setLoadingState('leaderboards', true);
      clearError();
      
      // Increment retry count
      retryCountRef.current += 1;
      console.log(`Initialization attempt ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS}`);

      // Fetch leaderboards from API
      console.log('🚀 Fetching leaderboards from API...');
      const fetchedLeaderboards = await apiService.getLeaderboards();
      console.log('✅ Leaderboards fetched:', fetchedLeaderboards);

      if (fetchedLeaderboards.length === 0) {
        throw new Error('No leaderboards available');
      }

      // Set leaderboards in store
      const leaderboardStore = useLeaderboardStore.getState();
      leaderboardStore.setLeaderboards(fetchedLeaderboards);

      // Switch to the first leaderboard (or EVeTmET if available)
      const targetLeaderboard = fetchedLeaderboards.find(lb => lb._id === 'EVeTmET') || fetchedLeaderboards[0];
      console.log('🎯 Switching to leaderboard:', targetLeaderboard._id);
      
      // Set the leaderboard in store without triggering additional API calls
      leaderboardStore.setCurrentLeaderboard(targetLeaderboard);
      leaderboardStore.setCurrentLeaderboardId(targetLeaderboard._id);
      
      // Fetch initial data for this leaderboard
      console.log('🔄 Fetching initial data for leaderboard:', targetLeaderboard._id);
      const response = await apiService.getLeaderboardData(targetLeaderboard._id, {
        live: true,
      });
      
      console.log('✅ Initial leaderboard data loaded:', response.leaders.length, 'players');
      updatePlayers(response.leaders);

      // Reset retry count on success
      retryCountRef.current = 0;
      setUsingMockData(false);
      console.log('🎉 Initialization successful!');

    } catch (error) {
      console.error('Failed to initialize chicken race:', error);
      
      // Check if it's an auth error
      if (error && typeof error === 'object' && 'type' in error && error.type === 'auth') {
        console.warn('🔐 Authentication error detected, triggering demo mode');
        if (onAuthError) {
          onAuthError();
        }
        return;
      }
      
      setError(error as any);
      
      // Fall back to mock data if we've tried multiple times
      if (retryCountRef.current >= 3) {
        console.warn('Multiple initialization failures, falling back to mock data');
        activateMockDataFallback();
      }
    } finally {
      setLoadingState('leaderboards', false);
      isInitializingRef.current = false;
    }
  }, [apiService, setLoadingState, clearError, setError, switchToLeaderboard, activateMockDataFallback, onAuthError]);

  /**
   * Manually refresh current leaderboard data
   */
  const refreshData = useCallback(async () => {
    if (!apiService) {
      console.warn('🔐 No API service available, cannot refresh data');
      return;
    }

    if (!currentLeaderboardId) {
      console.log('No current leaderboard ID, skipping refresh');
      return;
    }

    try {
      setLoadingState('currentLeaderboard', true);
      clearError();

      console.log('🔄 Refreshing leaderboard data for:', currentLeaderboardId);
      const response = await apiService.getLeaderboardData(currentLeaderboardId, {
        live: true,
      });

      console.log('✅ Leaderboard data refreshed:', response.leaders.length, 'players');
      updatePlayers(response.leaders);

    } catch (error) {
      console.error('Failed to refresh leaderboard data:', error);
      
      // Check if it's an auth error
      if (error && typeof error === 'object' && 'type' in error && error.type === 'auth') {
        console.warn('🔐 Authentication error during refresh, triggering demo mode');
        if (onAuthError) {
          onAuthError();
        }
        return;
      }
      
      setError(error as any);
    } finally {
      setLoadingState('currentLeaderboard', false);
    }
  }, [currentLeaderboardId, apiService, setLoadingState, clearError, setError, updatePlayers, onAuthError]);

  /**
   * Switch to a different leaderboard
   */
  const changeLeaderboard = useCallback(async (leaderboardId: string) => {
    if (!apiService) {
      console.warn('🔐 No API service available, cannot switch leaderboard');
      return;
    }

    try {
      setLoadingState('switchingLeaderboard', true);
      clearError();

      console.log('🔄 Switching to leaderboard:', leaderboardId);
      
      // Switch to new leaderboard
      switchToLeaderboard(leaderboardId);

      // Fetch data for new leaderboard
      const response = await apiService.getLeaderboardData(leaderboardId, {
        live: true,
      });

      console.log('✅ Leaderboard switched, loaded', response.leaders.length, 'players');
      updatePlayers(response.leaders);

    } catch (error) {
      console.error('Failed to switch leaderboard:', error);
      
      // Check if it's an auth error
      if (error && typeof error === 'object' && 'type' in error && error.type === 'auth') {
        console.warn('🔐 Authentication error during leaderboard switch, triggering demo mode');
        if (onAuthError) {
          onAuthError();
        }
        return;
      }
      
      setError(error as any);
    } finally {
      setLoadingState('switchingLeaderboard', false);
    }
  }, [apiService, setLoadingState, clearError, setError, switchToLeaderboard, updatePlayers, onAuthError]);

  /**
   * Handle retry for failed operations
   */
  const retryFailedOperation = useCallback(() => {
    console.log('🔄 Retry button clicked!');
    console.log('🔄 Current state:', {
      hasError: !!error,
      hasLeaderboards,
      currentLeaderboardId,
      usingMockData,
      retryCount: retryCountRef.current
    });

    if (!error && !usingMockData) {
      console.log('🔄 No error and not using mock data, nothing to retry');
      return;
    }

    console.log('🔄 Resetting all states for retry...');
    clearError();
    setInitializationAttempted(false); // Reset initialization flag for retry
    retryCountRef.current = 0; // Reset retry counter for manual retry
    isInitializingRef.current = false; // Reset initialization in progress flag
    setUsingMockData(false); // Reset mock data flag
    appStoreActions.resetSwitchCounters(); // Reset switch attempt counters

    // Determine what operation to retry based on current state
    if (!hasLeaderboards || usingMockData) {
      console.log('🔄 Retrying initialization...');
      initializeRace();
    } else if (currentLeaderboardId) {
      console.log('🔄 Retrying data refresh...');
      refreshData();
    }
  }, [error, clearError, hasLeaderboards, currentLeaderboardId, initializeRace, refreshData, usingMockData]);

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

  // Auto-initialize on mount if API config is provided - StrictMode compatible
  useEffect(() => {
    console.log('🐔 useEffect triggered:', {
      hasApiConfig: !!apiConfig,
      hasApiService: !!apiService,
      initializationAttempted,
      isInitializing: isInitializingRef.current,
      retryCount: retryCountRef.current,
      usingMockData
    });
    
    // If we have API config but no API service, it means there was an auth error
    if (apiConfig && !apiService) {
      console.warn('🔐 API config provided but no API service available, likely auth error');
      if (onAuthError) {
        onAuthError();
      }
      return;
    }
    
    if (apiConfig && apiService && !initializationAttempted && !isInitializingRef.current) {
      console.log('🐔 Starting chicken race initialization...');
      console.log('🐔 API Config:', {
        serverUrl: apiConfig.serverUrl,
        hasApiKey: !!apiConfig.apiKey,
        hasAuthToken: !!apiConfig.authToken
      });
      initializeRace();
    }
    
    // Cleanup function for StrictMode compatibility
    return () => {
      // This cleanup will run when the effect is cleaned up in StrictMode
      console.log('🐔 Initialization effect cleanup');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiConfig, apiService, initializationAttempted, onAuthError]); // Intentionally excluding initializeRace to prevent infinite loop

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
    retryCount: retryCountRef.current,
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