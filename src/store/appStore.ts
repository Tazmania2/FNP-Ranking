import { useLeaderboardStore } from './leaderboardStore';
import { useUIStore } from './uiStore';
import type { Leaderboard } from '../types';

// Auto-cycle configuration
const AUTO_CYCLE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Combined store actions that coordinate between leaderboard and UI stores
 */
export class AppStoreActions {
  private static instance: AppStoreActions;

  private constructor() {}

  public static getInstance(): AppStoreActions {
    if (!AppStoreActions.instance) {
      AppStoreActions.instance = new AppStoreActions();
    }
    return AppStoreActions.instance;
  }

  /**
   * Initialize the application with leaderboards and set up auto-cycling
   */
  public initializeApp = (leaderboards: Leaderboard[], initialLeaderboardId?: string) => {
    const leaderboardStore = useLeaderboardStore.getState();
    const uiStore = useUIStore.getState();

    // Set leaderboards
    leaderboardStore.setLeaderboards(leaderboards);

    // Set initial leaderboard
    if (leaderboards.length > 0) {
      const initialLeaderboard = initialLeaderboardId 
        ? leaderboards.find(lb => lb._id === initialLeaderboardId) || leaderboards[0]
        : leaderboards[0];
      
      leaderboardStore.setCurrentLeaderboard(initialLeaderboard);
      uiStore.setAutoCycleIndex(leaderboards.findIndex(lb => lb._id === initialLeaderboard._id));
    }

    // Mark as initialized
    uiStore.setInitialized(true);
  };

  /**
   * Switch to a specific leaderboard by ID
   */
  public switchToLeaderboard = (leaderboardId: string) => {
    const leaderboardStore = useLeaderboardStore.getState();
    const uiStore = useUIStore.getState();

    const leaderboard = leaderboardStore.leaderboards.find(lb => lb._id === leaderboardId);
    if (!leaderboard) {
      console.warn(`Leaderboard with ID ${leaderboardId} not found`);
      return;
    }

    // Set loading state
    leaderboardStore.setLoading('switchingLeaderboard', true);

    // Clear previous data
    leaderboardStore.resetLeaderboardData();
    uiStore.clearAnimations();
    uiStore.hideTooltip();

    // Set new leaderboard
    leaderboardStore.setCurrentLeaderboard(leaderboard);
    
    // Update auto-cycle index
    const newIndex = leaderboardStore.leaderboards.findIndex(lb => lb._id === leaderboardId);
    uiStore.setAutoCycleIndex(newIndex);

    // Update next switch time if auto-cycling is enabled
    if (uiStore.autoCycle.isEnabled) {
      uiStore.setNextSwitchTime(Date.now() + AUTO_CYCLE_INTERVAL);
    }

    // Clear loading state
    leaderboardStore.setLoading('switchingLeaderboard', false);
  };

  /**
   * Enable or disable auto-cycling between leaderboards
   */
  public setAutoCycling = (enabled: boolean) => {
    const leaderboardStore = useLeaderboardStore.getState();
    const uiStore = useUIStore.getState();

    // Clear existing interval if any
    if (uiStore.autoCycle.intervalId) {
      clearInterval(uiStore.autoCycle.intervalId);
      uiStore.setAutoCycleInterval(null);
    }

    uiStore.setAutoCycleEnabled(enabled);

    if (enabled && leaderboardStore.leaderboards.length > 1) {
      // Set next switch time
      uiStore.setNextSwitchTime(Date.now() + AUTO_CYCLE_INTERVAL);

      // Start auto-cycling
      const intervalId = window.setInterval(() => {
        this.cycleToNextLeaderboard();
      }, AUTO_CYCLE_INTERVAL);

      uiStore.setAutoCycleInterval(intervalId);
    } else {
      uiStore.setNextSwitchTime(0);
    }
  };

  /**
   * Cycle to the next leaderboard in the list
   */
  public cycleToNextLeaderboard = () => {
    const leaderboardStore = useLeaderboardStore.getState();
    const uiStore = useUIStore.getState();

    if (leaderboardStore.leaderboards.length <= 1) {
      return;
    }

    const currentIndex = uiStore.autoCycle.currentIndex;
    const nextIndex = (currentIndex + 1) % leaderboardStore.leaderboards.length;
    const nextLeaderboard = leaderboardStore.leaderboards[nextIndex];

    if (nextLeaderboard) {
      this.switchToLeaderboard(nextLeaderboard._id);
    }
  };

  /**
   * Get the time remaining until the next auto-cycle switch
   */
  public getTimeUntilNextSwitch = (): number => {
    const uiStore = useUIStore.getState();
    
    if (!uiStore.autoCycle.isEnabled || uiStore.autoCycle.nextSwitchTime === 0) {
      return 0;
    }

    return Math.max(0, uiStore.autoCycle.nextSwitchTime - Date.now());
  };

  /**
   * Clean up resources when the app is unmounted
   */
  public cleanup = () => {
    const uiStore = useUIStore.getState();

    // Clear auto-cycle interval
    if (uiStore.autoCycle.intervalId) {
      clearInterval(uiStore.autoCycle.intervalId);
      uiStore.setAutoCycleInterval(null);
    }

    // Reset stores
    useLeaderboardStore.getState().resetStore();
    uiStore.resetUI();
  };
}

// Export singleton instance
export const appStoreActions = AppStoreActions.getInstance();

// Custom hooks for common store combinations
export const useAppState = () => {
  const leaderboardState = useLeaderboardStore();
  const uiState = useUIStore();

  return {
    // Leaderboard state
    leaderboards: leaderboardState.leaderboards,
    currentLeaderboard: leaderboardState.currentLeaderboard,
    currentLeaderboardId: leaderboardState.currentLeaderboardId,
    players: leaderboardState.players,
    loading: leaderboardState.loading,
    error: leaderboardState.error,
    lastUpdated: leaderboardState.lastUpdated,

    // UI state
    tooltips: uiState.tooltips,
    animations: uiState.animations,
    autoCycle: uiState.autoCycle,
    isInitialized: uiState.isInitialized,

    // Actions
    ...leaderboardState,
    ...uiState,
  };
};

export const useAutoCycleStatus = () => {
  const autoCycle = useUIStore((state) => state.autoCycle);
  const leaderboards = useLeaderboardStore((state) => state.leaderboards);

  return {
    isEnabled: autoCycle.isEnabled,
    currentIndex: autoCycle.currentIndex,
    totalLeaderboards: leaderboards.length,
    timeUntilNext: appStoreActions.getTimeUntilNextSwitch(),
    canCycle: leaderboards.length > 1,
  };
};