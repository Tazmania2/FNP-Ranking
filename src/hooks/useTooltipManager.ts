import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import type { Player, TooltipContent } from '../types';

interface UseTooltipManagerProps {
  players: Player[];
  isEnabled?: boolean;
  getPlayerPosition?: (_playerId: string) => { x: number; y: number } | null;
}

export const useTooltipManager = ({
  players,
  isEnabled = true,
  getPlayerPosition,
}: UseTooltipManagerProps) => {
  const {
    tooltips,
    showTooltip,
    hideTooltip,
  } = useUIStore();

  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate points gained today for a player
  const calculatePointsGainedToday = useCallback((player: Player): number => {
    if (player.previous_total !== undefined) {
      return player.total - player.previous_total;
    }
    return 0;
  }, []);

  const createTooltipContent = useCallback((player: Player): TooltipContent => ({
    rank: player.position,
    points: player.total,
    pointsGainedToday: calculatePointsGainedToday(player),
    playerName: player.name,
  }), [calculatePointsGainedToday]);

  const showPlayerTooltip = useCallback((
    playerId: string,
    position?: { x: number; y: number },
  ) => {
    if (!isEnabled) return;

    const player = players.find((p) => p._id === playerId);
    if (!player) return;

    const content = createTooltipContent(player);
    const resolvedPosition = position ?? getPlayerPosition?.(playerId) ?? { x: 50, y: 50 };

    showTooltip(playerId, resolvedPosition, content);
  }, [createTooltipContent, getPlayerPosition, isEnabled, showTooltip, players]);

  const hidePlayerTooltip = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Clean up timers
  const clearTimers = useCallback(() => {
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  // Start auto-cycling through players
  const startCycling = useCallback(() => {
    if (!isEnabled || players.length === 0 || isHovering) return;

    clearTimers();

    // Show first player immediately
    if (players[currentCycleIndex]) {
      showPlayerTooltip(players[currentCycleIndex]._id);
    }

    // Set up cycling interval
    cycleTimerRef.current = setInterval(() => {
      if (isHovering) return; // Don't cycle while hovering

      setCurrentCycleIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % players.length;
        if (players[nextIndex]) {
          showPlayerTooltip(players[nextIndex]._id);
        }
        return nextIndex;
      });
    }, 3000); // Show each player for 3 seconds
  }, [isEnabled, players, currentCycleIndex, isHovering, showPlayerTooltip, clearTimers]);

  // Stop cycling
  const stopCycling = useCallback(() => {
    clearTimers();
  }, [clearTimers]);

  // Handle chicken hover/click
  const handleChickenHover = useCallback((
    playerId: string | null,
    element?: HTMLElement,
  ) => {
    if (!isEnabled) return;

    if (playerId) {
      // Stop cycling and show hovered player
      setIsHovering(true);
      stopCycling();
      
      // Get position from element if provided
      let position: { x: number; y: number } | undefined;
      if (element) {
        const rect = element.getBoundingClientRect();
        const raceContainer = element.closest('.chicken-race-container');
        
        if (raceContainer) {
          const containerRect = raceContainer.getBoundingClientRect();
          const relativeX = ((rect.left + rect.width / 2 - containerRect.left) / containerRect.width) * 100;
          const relativeY = ((rect.top - containerRect.top) / containerRect.height) * 100;
          
          position = {
            x: Math.max(5, Math.min(95, relativeX)),
            y: Math.max(5, Math.min(95, relativeY)),
          };
        }
      }

      showPlayerTooltip(playerId, position);

      // Clear any existing hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      // Set timeout to resume cycling after hover ends
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(false);
      }, 5000); // Keep tooltip visible for 5 seconds after hover
    } else {
      // Mouse left - hide tooltip and resume cycling after delay
      setIsHovering(false);
      hidePlayerTooltip();
      
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      
      hoverTimeoutRef.current = setTimeout(() => {
        if (!isHovering) {
          startCycling();
        }
      }, 1000);
    }
  }, [isEnabled, showPlayerTooltip, hidePlayerTooltip, stopCycling, startCycling, isHovering]);

  // Start cycling when enabled and players are available
  useEffect(() => {
    if (isEnabled && players.length > 0 && !isHovering) {
      const timer = setTimeout(startCycling, 2000); // Start after 2 seconds
      return () => clearTimeout(timer);
    } else {
      stopCycling();
    }
  }, [isEnabled, players.length, isHovering, startCycling, stopCycling]);

  // Reset cycle index when players change
  useEffect(() => {
    if (currentCycleIndex >= players.length) {
      setCurrentCycleIndex(0);
    }
  }, [players.length, currentCycleIndex]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    tooltips,
    isHovering,
    showPlayerTooltip,
    hidePlayerTooltip,
    handleChickenHover,
    createTooltipContent,
  };
};

export default useTooltipManager;
