import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { SupabaseApiService } from '../services/supabaseApi';
// import { useRealTimeUpdatesWithLoading } from './useRealTimeUpdates'; // Temporarily disabled
// import { usePositionTransitions } from './usePositionTransitions'; // Disabled to use custom positioning
import { useLeaderboardData } from './useAppState';
import { useLeaderboardStore } from '../store/leaderboardStore';
import { appStoreActions } from '../store/appStore';
import type { SupabaseConfig } from '../types';



/**
 * Configuration for the chicken race manager
 */
interface ChickenRaceManagerConfig {
  /** Supabase API configuration */
  apiConfig?: SupabaseConfig;
  /** Pre-fetched players to skip API initialization entirely */
  initialPlayers?: import('../types').Player[];
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
  /** Auto-refresh configuration */
  autoRefreshConfig?: {
    enabled?: boolean;
    interval?: number; // Interval in milliseconds (default: 60000 = 1 minute)
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
    initialPlayers,
    realTimeConfig = {},
    transitionConfig = {},
    autoRefreshConfig = { enabled: true, interval: 60000 },
    onAuthError,
  } = config;

  // Track initialization attempts to prevent infinite loops
  const [initializationAttempted, setInitializationAttempted] = useState(false);
  const retryCountRef = useRef(0);
  const isInitializingRef = useRef(false);
  const [usingMockData, setUsingMockData] = useState(false);



  const MAX_RETRY_ATTEMPTS = 3; // Reduced to prevent immediate fallback

  /**
   * Process and reorganize players data to fix position inconsistencies
   * Players with the same points should have the same position number
   */
  const processPlayersData = useCallback((rawPlayers: any[]) => {
    if (!rawPlayers || rawPlayers.length === 0) return [];

    // Sort players by total score (descending - highest score first)
    const sortedPlayers = [...rawPlayers].sort((a, b) => b.total - a.total);

    // Group players by score (rounded to 1 decimal place)
    const scoreGroups = new Map<number, any[]>();
    sortedPlayers.forEach(player => {
      const score = Math.round(player.total * 10) / 10;
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, []);
      }
      scoreGroups.get(score)!.push(player);
    });

    // Reassign positions based on score groups
    const processedPlayers: any[] = [];
    let currentPosition = 1;

    // Process each score group (highest score first)
    Array.from(scoreGroups.entries())
      .sort(([a], [b]) => b - a) // Sort by score descending
      .forEach(([score, groupPlayers]) => {
        // All players in this group get the same position number
        groupPlayers.forEach(player => {
          processedPlayers.push({
            ...player,
            position: currentPosition, // Assign corrected position
            total: score, // Ensure consistent score formatting
          });
        });

        // Move to next position (skip positions for tied players)
        // e.g., if 3 players tied for 1st, next position is 4th
        currentPosition += groupPlayers.length;
      });

    // Players data processed successfully

    return processedPlayers;
  }, []);

  // Create API service instance
  const apiService = useMemo(() => {
    if (!apiConfig) {
      return null;
    }
    try {
      // Use Supabase service with correct config
      return new SupabaseApiService(apiConfig);
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

  // Disabled position transitions to use our custom positioning logic
  const positionTransitions = {
    playerPositions: [], // Empty array so ChickenRace uses its own positioning
    isAnimating: false,
    getPlayerPosition: () => ({ x: 50, y: 50 }),
    getAllPlayerPositions: () => [],
    setImmediatePositions: () => { },
    animateToNewPositions: () => { },
    config: {
      transitionDuration: 1000,
      easing: 'ease-out' as const,
      staggered: true,
      staggerDelay: 100,
      celebrateImprovements: true,
    },
  };

  /**
   * Handle empty state when API returns no data or fails repeatedly.
   * Instead of falling back to mock data, show an empty players array.
   */
  const handleEmptyState = useCallback((title?: string) => {
    console.log('🐔 No leaderboard data available. Setting empty state.');

    setUsingMockData(false);

    const emptyLeaderboard = {
      _id: 'EMPTY',
      title: title || 'Ranking FNP',
      description: 'Nenhum dado de ranking disponível para este mês',
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

    const leaderboardStore = useLeaderboardStore.getState();
    leaderboardStore.setLeaderboards([emptyLeaderboard]);
    leaderboardStore.setCurrentLeaderboard(emptyLeaderboard);
    leaderboardStore.setCurrentLeaderboardId(emptyLeaderboard._id);
    updatePlayers([]);

    // Clear any errors and loading states
    clearError();
    setLoadingState('leaderboards', false);
    setLoadingState('currentLeaderboard', false);
    setLoadingState('switchingLeaderboard', false);

    // Reset initialization flags
    isInitializingRef.current = false;
    retryCountRef.current = 0;

    console.log('🐔 Empty state setup complete.');
  }, [updatePlayers, clearError, setLoadingState]);

  /**
   * Initialize the chicken race with leaderboards
   */
  const initializeRace = useCallback(async () => {
    // If no API service is available, show empty state
    if (!apiService) {
      console.warn('🔐 No API service available (likely auth error), showing empty state');
      handleEmptyState();
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (isInitializingRef.current) {
      console.log('Initialization already in progress, skipping...');
      return;
    }

    // Check if we've exceeded max retries
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      console.warn(`Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) exceeded. Showing empty state.`);
      handleEmptyState();
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
      console.log('🚀 Fetching current month leaderboard from API...');
      
      // Get current month's leaderboard
      const currentMonthData = await apiService.getCurrentMonthLeaderboard();
      console.log('✅ Current month leaderboard fetched:', currentMonthData.leaderboard.title);

      // Set leaderboards in store (using just current month)
      const leaderboardStore = useLeaderboardStore.getState();
      leaderboardStore.setLeaderboards([currentMonthData.leaderboard]);

      // Set the current month leaderboard as active
      leaderboardStore.setCurrentLeaderboard(currentMonthData.leaderboard);
      leaderboardStore.setCurrentLeaderboardId(currentMonthData.leaderboard._id);

      console.log('✅ Current month leaderboard data loaded:', currentMonthData.leaders.length, 'players');
      
      // If no players yet this month, show empty state (not an error)
      if (currentMonthData.leaders.length === 0) {
        console.log('📭 No player data for this month yet. Showing empty leaderboard.');
      }
      
      const processedPlayers = processPlayersData(currentMonthData.leaders);
      updatePlayers(processedPlayers);

      // Reset retry count on success
      retryCountRef.current = 0;
      setUsingMockData(false);
      console.log('🎉 Initialization successful!');

    } catch (error) {
      console.error('Failed to initialize chicken race:', error);

      // Check if it's an auth error
      if (error && typeof error === 'object' && 'type' in error && error.type === 'auth') {
        console.warn('🔐 Authentication error detected');
        if (onAuthError) {
          onAuthError();
        }
        return;
      }

      // Fall back to empty state if we've tried multiple times
      if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
        console.warn('Multiple initialization failures, showing empty state');
        handleEmptyState();
      } else {
        setError(error as any);
      }
    } finally {
      setLoadingState('leaderboards', false);
      isInitializingRef.current = false;
    }
  }, [apiService, setLoadingState, clearError, setError, switchToLeaderboard, handleEmptyState, onAuthError, processPlayersData, updatePlayers]);

  /**
   * Manually refresh current leaderboard data
   */
  const refreshData = useCallback(async () => {
    if (!apiService) {
      console.warn('🔐 No API service available, cannot refresh data');
      return;
    }

    try {
      setLoadingState('currentLeaderboard', true);
      clearError();

      console.log('🔄 Refreshing current month leaderboard data...');
      const currentMonthData = await apiService.getCurrentMonthLeaderboard();

      console.log('✅ Leaderboard data refreshed:', currentMonthData.leaders.length, 'players');
      const processedPlayers = processPlayersData(currentMonthData.leaders);
      updatePlayers(processedPlayers);

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
  }, [apiService, setLoadingState, clearError, setError, updatePlayers, onAuthError, processPlayersData]);

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
      const processedPlayers = processPlayersData(response.leaders);
      updatePlayers(processedPlayers);

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
  }, [apiService, setLoadingState, clearError, setError, switchToLeaderboard, updatePlayers, onAuthError, processPlayersData]);

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

  // If initialPlayers are provided, use them directly and skip API initialization
  const prevPlayersRef = useRef<string>('');
  useEffect(() => {
    if (!initialPlayers || initialPlayers.length === 0) return;

    // Only update if the data actually changed (avoid infinite loop from new array references)
    const playersKey = initialPlayers.map(p => `${p._id}:${p.total}`).join(',');
    if (playersKey === prevPlayersRef.current) return;
    prevPlayersRef.current = playersKey;

    console.log('🐔 Using pre-fetched initialPlayers, skipping API initialization');
    setInitializationAttempted(true);
    isInitializingRef.current = false;
    setUsingMockData(false);

    const leaderboardStore = useLeaderboardStore.getState();
    // Set a synthetic leaderboard so the UI considers itself initialized
    if (!leaderboardStore.currentLeaderboard) {
      const syntheticLeaderboard = {
        _id: 'SNAPSHOT',
        title: 'Ranking FNP',
        description: 'Dados do snapshot diário',
        principalType: 0,
        operation: { type: 0, achievement_type: 0, item: 'total', sort: 1 },
        period: { type: 0, timeAmount: 0, timeScale: 0 },
      };
      leaderboardStore.setLeaderboards([syntheticLeaderboard]);
      leaderboardStore.setCurrentLeaderboard(syntheticLeaderboard);
      leaderboardStore.setCurrentLeaderboardId(syntheticLeaderboard._id);
    }

    updatePlayers(initialPlayers);
    setLoadingState('leaderboards', false);
    setLoadingState('currentLeaderboard', false);
  }, [initialPlayers, updatePlayers, setLoadingState]);

  // Auto-initialize on mount if API config is provided - StrictMode compatible
  useEffect(() => {
    // Skip API initialization if initialPlayers are provided
    if (initialPlayers && initialPlayers.length > 0) {
      return;
    }

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

    // Only initialize once when we have both API config and service, and haven't attempted yet
    if (apiConfig && apiService && !initializationAttempted && !isInitializingRef.current) {
      console.log('🐔 Starting chicken race initialization');
      initializeRace();
    }

    // Cleanup function for StrictMode compatibility
    return () => {
      // This cleanup will run when the effect is cleaned up in StrictMode
      console.log('🐔 Initialization effect cleanup');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiConfig, apiService, onAuthError]); // Removed initializationAttempted to prevent infinite loop

  // Auto-refresh effect - refreshes data every minute
  useEffect(() => {
    // Skip auto-refresh if initialPlayers are provided (snapshot hook handles polling)
    if (initialPlayers && initialPlayers.length > 0) {
      return;
    }

    const autoRefreshEnabled = autoRefreshConfig?.enabled !== false; // Default to true
    const refreshInterval = autoRefreshConfig?.interval || 60000; // Default 60 seconds

    if (!autoRefreshEnabled || !apiService || usingMockData) {
      return;
    }

    console.log(`🔄 Auto-refresh enabled with ${refreshInterval}ms interval`);

    const intervalId = setInterval(() => {
      // Only refresh if page is visible
      if (document.visibilityState === 'visible' && currentLeaderboardId) {
        console.log('🔄 Auto-refreshing data...');
        refreshData();
      }
    }, refreshInterval);

    return () => {
      console.log('🔄 Auto-refresh cleanup');
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiService, usingMockData, currentLeaderboardId]); // Removed refreshData and config to prevent loops

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