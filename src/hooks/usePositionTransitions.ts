import { useEffect, useCallback, useRef } from 'react';
import { useAnimationManager } from './useAppState';
import type { Player, ChickenAnimation } from '../types';

/**
 * Configuration for position transitions
 */
interface TransitionConfig {
  /** Duration of position transitions in milliseconds (default: 1000) */
  transitionDuration?: number;
  /** Easing function for transitions (default: 'ease-out') */
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Whether to enable staggered animations (default: true) */
  staggered?: boolean;
  /** Stagger delay between animations in milliseconds (default: 100) */
  staggerDelay?: number;
  /** Whether to show celebration animations for position improvements (default: true) */
  celebrateImprovements?: boolean;
}

/**
 * Calculate horizontal position based on player rank
 * Players are positioned from left (last place) to right (first place)
 */
const calculateHorizontalPosition = (rank: number, totalPlayers: number): number => {
  if (totalPlayers <= 1) return 50; // Center if only one player
  
  // Position from 10% (last place) to 90% (first place)
  const minPosition = 10;
  const maxPosition = 90;
  const range = maxPosition - minPosition;
  
  // Invert rank so first place (rank 1) gets highest position
  const normalizedRank = (totalPlayers - rank) / (totalPlayers - 1);
  
  return minPosition + (range * normalizedRank);
};

/**
 * Generate a random vertical position for visual variety
 */
const generateVerticalPosition = (playerId: string): number => {
  // Use player ID as seed for consistent positioning
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate position between 20% and 80% to avoid edges
  const min = 20;
  const max = 80;
  const range = max - min;
  
  return min + (Math.abs(hash) % range);
};

/**
 * Hook for managing smooth position transitions when player rankings change
 */
export const usePositionTransitions = (
  players: Player[],
  config: TransitionConfig = {}
) => {
  const {
    transitionDuration = 1000,
    easing = 'ease-out',
    staggered = true,
    staggerDelay = 100,
    celebrateImprovements = true,
  } = config;

  const {
    animations,
    updatePlayerAnimation,
  } = useAnimationManager();

  const previousPlayersRef = useRef<Player[]>([]);
  const animationTimeoutsRef = useRef<Map<string, number>>(new Map());

  /**
   * Clear all animation timeouts
   */
  const clearAnimationTimeouts = useCallback(() => {
    animationTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    animationTimeoutsRef.current.clear();
  }, []);

  /**
   * Create animation for a player's position change
   */
  const createPlayerAnimation = useCallback((
    player: Player,
    targetPosition: { x: number; y: number },
    currentPosition?: { x: number; y: number },
    delay = 0
  ): ChickenAnimation => {
    const now = Date.now();
    
    // Determine animation state based on player movement
    let animationState: ChickenAnimation['animationState'] = 'moving';
    
    if (celebrateImprovements && player.move === 'up') {
      animationState = 'celebrating';
    }

    return {
      playerId: player._id,
      currentPosition: currentPosition || targetPosition,
      targetPosition,
      animationState,
      lastUpdate: now + delay,
    };
  }, [celebrateImprovements]);

  /**
   * Calculate positions for all players
   */
  const calculatePlayerPositions = useCallback((playerList: Player[]) => {
    const totalPlayers = playerList.length;
    
    return playerList.map((player) => ({
      playerId: player._id,
      x: calculateHorizontalPosition(player.position, totalPlayers),
      y: generateVerticalPosition(player._id),
      rank: player.position,
    }));
  }, []);

  /**
   * Animate players to their new positions
   */
  const animateToNewPositions = useCallback((
    newPlayers: Player[],
    previousPlayers: Player[]
  ) => {
    const newPositions = calculatePlayerPositions(newPlayers);
    const previousPositions = calculatePlayerPositions(previousPlayers);
    
    // Clear existing timeouts
    clearAnimationTimeouts();

    newPositions.forEach((newPos, index) => {
      const player = newPlayers.find(p => p._id === newPos.playerId);
      if (!player) return;

      // Find previous position for this player
      const previousPos = previousPositions.find(p => p.playerId === newPos.playerId);
      
      // Calculate delay for staggered animations
      const delay = staggered ? index * staggerDelay : 0;
      
      // Create animation
      const animation = createPlayerAnimation(
        player,
        { x: newPos.x, y: newPos.y },
        previousPos ? { x: previousPos.x, y: previousPos.y } : undefined,
        delay
      );

      // Schedule animation update
      if (delay > 0) {
        const timeoutId = window.setTimeout(() => {
          updatePlayerAnimation(player._id, animation);
          animationTimeoutsRef.current.delete(player._id);
        }, delay);
        
        animationTimeoutsRef.current.set(player._id, timeoutId);
      } else {
        updatePlayerAnimation(player._id, animation);
      }
    });

    // Clean up animations for players who are no longer in the list
    previousPlayers.forEach((prevPlayer) => {
      const stillExists = newPlayers.some(p => p._id === prevPlayer._id);
      if (!stillExists) {
        // Remove animation for this player
        const timeoutId = animationTimeoutsRef.current.get(prevPlayer._id);
        if (timeoutId) {
          clearTimeout(timeoutId);
          animationTimeoutsRef.current.delete(prevPlayer._id);
        }
      }
    });
  }, [
    calculatePlayerPositions,
    clearAnimationTimeouts,
    staggered,
    staggerDelay,
    createPlayerAnimation,
    updatePlayerAnimation,
  ]);

  /**
   * Handle immediate positioning for initial load or when transitions are disabled
   */
  const setImmediatePositions = useCallback((playerList: Player[]) => {
    const positions = calculatePlayerPositions(playerList);
    
    positions.forEach((pos) => {
      const player = playerList.find(p => p._id === pos.playerId);
      if (!player) return;

      const animation = createPlayerAnimation(
        player,
        { x: pos.x, y: pos.y },
        { x: pos.x, y: pos.y }, // Same current and target for immediate positioning
        0
      );

      updatePlayerAnimation(player._id, {
        ...animation,
        animationState: 'idle',
      });
    });
  }, [calculatePlayerPositions, createPlayerAnimation, updatePlayerAnimation]);

  /**
   * Get current position for a specific player
   */
  const getPlayerPosition = useCallback((playerId: string) => {
    const animation = animations.find(anim => anim.playerId === playerId);
    return animation?.targetPosition || { x: 50, y: 50 };
  }, [animations]);

  /**
   * Get all current player positions
   */
  const getAllPlayerPositions = useCallback(() => {
    return players.map((player) => ({
      playerId: player._id,
      position: getPlayerPosition(player._id),
      rank: player.position,
      isAnimating: animations.some(anim => 
        anim.playerId === player._id && anim.animationState === 'moving'
      ),
    }));
  }, [players, getPlayerPosition, animations]);

  // Handle player changes and trigger animations
  useEffect(() => {
    const previousPlayers = previousPlayersRef.current;
    
    if (players.length === 0) {
      // No players to animate
      clearAnimationTimeouts();
      return;
    }

    if (previousPlayers.length === 0) {
      // Initial load - set immediate positions
      setImmediatePositions(players);
    } else {
      // Players changed - animate to new positions
      const hasPositionChanges = players.some((player) => {
        const prevPlayer = previousPlayers.find(p => p._id === player._id);
        return !prevPlayer || prevPlayer.position !== player.position;
      });

      if (hasPositionChanges) {
        animateToNewPositions(players, previousPlayers);
      }
    }

    // Update previous players reference
    previousPlayersRef.current = [...players];
  }, [players, setImmediatePositions, animateToNewPositions, clearAnimationTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAnimationTimeouts();
    };
  }, [clearAnimationTimeouts]);

  return {
    // Current state
    playerPositions: getAllPlayerPositions(),
    isAnimating: animations.some(anim => anim.animationState === 'moving'),
    
    // Position utilities
    getPlayerPosition,
    getAllPlayerPositions,
    
    // Manual control
    setImmediatePositions,
    animateToNewPositions: (newPlayers: Player[]) => 
      animateToNewPositions(newPlayers, previousPlayersRef.current),
    
    // Configuration
    config: {
      transitionDuration,
      easing,
      staggered,
      staggerDelay,
      celebrateImprovements,
    },
  };
};