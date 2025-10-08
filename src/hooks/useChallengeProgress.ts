import { useState, useEffect, useCallback } from 'react';
import { FunifierApiService } from '../services/funifierApi';
import type { PlayerStatus, ChallengeProgress, ApiError } from '../types';

interface ChallengeProgressState {
  progress: number;
  current: number;
  target: number;
  isCompleted: boolean;
  challengeName: string;
  loading: boolean;
  error: ApiError | null;
}

interface UseChallengeProgressOptions {
  apiService: FunifierApiService | null;
  playerId: string;
  challengeId: string;
  refreshInterval?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch and manage challenge progress for a specific player and challenge
 */
export const useChallengeProgress = ({
  apiService,
  playerId,
  challengeId,
  refreshInterval = 30000, // 30 seconds default
  enabled = true,
}: UseChallengeProgressOptions) => {
  const [state, setState] = useState<ChallengeProgressState>({
    progress: 0,
    current: 0,
    target: 0,
    isCompleted: false,
    challengeName: '',
    loading: true,
    error: null,
  });

  const fetchChallengeProgress = useCallback(async () => {
    if (!apiService || !enabled) {
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const playerStatus: PlayerStatus = await apiService.getPlayerStatus(playerId);
      
      // Check if challenge is completed (in challenges object)
      const completedChallenges = playerStatus.challenges || {};
      if (completedChallenges[challengeId]) {
        setState({
          progress: 100,
          current: completedChallenges[challengeId],
          target: completedChallenges[challengeId],
          isCompleted: true,
          challengeName: 'Meta Diária', // Default name, could be enhanced
          loading: false,
          error: null,
        });
        return;
      }

      // Look for challenge in progress
      const challengeProgress = playerStatus.challenge_progress?.find(
        (cp: ChallengeProgress) => cp.challenge === challengeId
      );

      if (challengeProgress) {
        // Get the first rule (assuming single rule challenges for daily goals)
        const rule = challengeProgress.rules[0];
        
        setState({
          progress: challengeProgress.percent_completed,
          current: rule?.times_completed || 0,
          target: rule?.times_required || 0,
          isCompleted: rule?.completed || false,
          challengeName: challengeProgress.name,
          loading: false,
          error: null,
        });
      } else {
        // Challenge not found, set default values
        setState({
          progress: 0,
          current: 0,
          target: 50000, // Default target
          isCompleted: false,
          challengeName: 'Meta Diária',
          loading: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Failed to fetch challenge progress:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as ApiError,
      }));
    }
  }, [apiService, playerId, challengeId, enabled]);

  const retry = useCallback(() => {
    fetchChallengeProgress();
  }, [fetchChallengeProgress]);

  // Initial fetch
  useEffect(() => {
    fetchChallengeProgress();
  }, [fetchChallengeProgress]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || !refreshInterval) {
      return;
    }

    const interval = setInterval(fetchChallengeProgress, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchChallengeProgress, refreshInterval, enabled]);

  return {
    ...state,
    refresh: fetchChallengeProgress,
    retry,
  };
};