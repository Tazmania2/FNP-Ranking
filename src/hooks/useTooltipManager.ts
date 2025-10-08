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
  const isHoveringRef = useRef(false);

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
    if (!isEnabled || players.length === 0 || isHoveringRef.current) {
      return;
    }

    clearTimers();

    // Show first player immediately
    if (players[currentCycleIndex]) {
      showPlayerTooltip(players[currentCycleIndex]._id);
    }

    // Set up cycling interval
    cycleTimerRef.current = setInterval(() => {
      // Check the ref instead of state to avoid stale closures
      if (isHoveringRef.current) {
        return;
      }

      setCurrentCycleIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % players.length;
        if (players[nextIndex] && !isHoveringRef.current) {
          showPlayerTooltip(players[nextIndex]._id);
        }
        return nextIndex;
      });
    }, 3000); // Show each player for 3 seconds
  }, [isEnabled, players, currentCycleIndex, showPlayerTooltip, clearTimers]);

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
      // Immediately stop cycling and clear any timers
      clearTimers();
      setIsHovering(true);
      isHoveringRef.current = true;
      
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

      // Set timeout to resume cycling after hover ends
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(false);
        isHoveringRef.current = false;
      }, 5000); // Keep tooltip visible for 5 seconds after hover
    } else {
      // Mouse left - clear timers and set up delayed restart
      clearTimers();
      setIsHovering(false);
      isHoveringRef.current = false;
      hidePlayerTooltip();
      
      // Resume cycling after a short delay
      hoverTimeoutRef.current = setTimeout(() => {
        if (!isHoveringRef.current) {
          startCycling();
        }
      }, 1000);
    }
  }, [isEnabled, showPlayerTooltip, hidePlayerTooltip, clearTimers, startCycling]);

  // Keep ref in sync with state
  useEffect(() => {
    isHoveringRef.current = isHovering;
  }, [isHovering]);

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
