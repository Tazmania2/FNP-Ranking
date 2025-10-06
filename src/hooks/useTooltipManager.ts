import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '../store/uiStore';
import type { Player, TooltipContent } from '../types';

interface UseTooltipManagerProps {
  players: Player[];
  isEnabled?: boolean;
}

export const useTooltipManager = ({ players, isEnabled = true }: UseTooltipManagerProps) => {
  const {
    tooltips,
    showTooltip,
    hideTooltip,
    updateTooltipPosition,
  } = useUIStore();

  // Fixed tooltip cycling state
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isCycling, setIsCycling] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState<{
    isVisible: boolean;
    content: TooltipContent | null;
  }>({ isVisible: false, content: null });

  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoDisplayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentAutoDisplayRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate points gained today for a player
  const calculatePointsGainedToday = useCallback((player: Player): number => {
    if (player.previous_total !== undefined) {
      return player.total - player.previous_total;
    }
    return 0;
  }, []);

  // Create tooltip content for a player
  const createTooltipContent = useCallback((player: Player): TooltipContent => {
    return {
      rank: player.position,
      points: player.total,
      pointsGainedToday: calculatePointsGainedToday(player),
      playerName: player.name,
    };
  }, [calculatePointsGainedToday]);

  // Show tooltip for a specific player at a position
  const showPlayerTooltip = useCallback((
    playerId: string,
    position: { x: number; y: number }
  ) => {
    if (!isEnabled) return;

    const player = players.find(p => p._id === playerId);
    if (!player) return;

    const content = createTooltipContent(player);
    showTooltip(playerId, position, content);
  }, [players, isEnabled, createTooltipContent, showTooltip]);

  // Hide current tooltip
  const hidePlayerTooltip = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  // Update tooltip position (useful for following mouse or element movement)
  const updateTooltipPos = useCallback((position: { x: number; y: number }) => {
    updateTooltipPosition(position);
  }, [updateTooltipPosition]);

  // Get position relative to the race container from element
  const getElementRelativePosition = useCallback((element: HTMLElement): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    const raceContainer = element.closest('.chicken-race-container');
    
    if (raceContainer) {
      const containerRect = raceContainer.getBoundingClientRect();
      // Return percentage-based position relative to container
      const relativeX = ((rect.left + rect.width / 2 - containerRect.left) / containerRect.width) * 100;
      const relativeY = ((rect.top - containerRect.top) / containerRect.height) * 100;
      
      // Tooltip position calculated
      
      return {
        x: Math.max(0, Math.min(100, relativeX)),
        y: Math.max(0, Math.min(100, relativeY)),
      };
    }
    
    // Fallback to center if container not found
    return { x: 50, y: 50 };
  }, []);

  // Stop cycling
  const stopCycling = useCallback(() => {
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    setIsCycling(false);
  }, []);

  // Handle hover tooltip (overlay)
  const showHoverTooltip = useCallback((player: Player) => {
    const content = createTooltipContent(player);
    setHoverTooltip({ isVisible: true, content });
    setIsHovering(true);
    stopCycling(); // Stop cycling while hovering
  }, [createTooltipContent, stopCycling]);

  const hideHoverTooltip = useCallback(() => {
    setHoverTooltip({ isVisible: false, content: null });
    setIsHovering(false);
  }, []);

  // Fixed position tooltip cycling
  const startCycling = useCallback(() => {
    if (!isEnabled || players.length === 0 || isHovering || isCycling) return;

    // Clear any existing timer
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
    }

    setIsCycling(true);

    const cycleToNextPlayer = () => {
      if (isHovering) return; // Don't cycle while hovering

      setCurrentCycleIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % players.length;
        const currentPlayer = players[nextIndex];
        
        if (currentPlayer) {
          const content = createTooltipContent(currentPlayer);
          // Fixed position: bottom left (10% from left, 85% from top)
          showTooltip(currentPlayer._id, { x: 10, y: 85 }, content);
        }
        
        return nextIndex;
      });
    };

    // Show first player immediately
    if (players.length > 0) {
      const firstPlayer = players[0];
      const content = createTooltipContent(firstPlayer);
      showTooltip(firstPlayer._id, { x: 10, y: 85 }, content);
      setCurrentCycleIndex(0);
    }

    // Set up interval for cycling (7 seconds per player)
    cycleTimerRef.current = setInterval(cycleToNextPlayer, 7000);
  }, [isEnabled, players, isHovering, isCycling, createTooltipContent, showTooltip]);

  // Handle hover events on chicken elements
  const handleChickenHover = useCallback((
    playerId: string | null,
    element?: HTMLElement
  ) => {
    if (!isEnabled) return;

    if (playerId) {
      const player = players.find(p => p._id === playerId);
      if (player) {
        showHoverTooltip(player);
      }
    } else {
      hideHoverTooltip();
    }
  }, [isEnabled, players, showHoverTooltip, hideHoverTooltip]);

  // Start cycling when component mounts or players change
  useEffect(() => {
    if (isEnabled && players.length > 0 && !isHovering) {
      startCycling();
    }

    return () => {
      stopCycling();
    };
  }, [isEnabled, players.length, startCycling, stopCycling]);

  // Resume cycling when hover ends
  useEffect(() => {
    if (!isHovering && isEnabled && players.length > 0) {
      const timer = setTimeout(() => {
        startCycling();
      }, 1000); // Wait 1 second before resuming
      return () => clearTimeout(timer);
    } else if (isHovering) {
      stopCycling(); // Stop cycling when hovering starts
    }
  }, [isHovering, isEnabled, players.length, startCycling, stopCycling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoDisplayTimerRef.current) {
        clearInterval(autoDisplayTimerRef.current);
      }
      if (currentAutoDisplayRef.current) {
        clearTimeout(currentAutoDisplayRef.current);
      }
    };
  }, []);

  return {
    tooltips, // Fixed position cycling tooltip
    hoverTooltip, // Hover overlay tooltip
    showPlayerTooltip,
    hidePlayerTooltip,
    updateTooltipPos,
    handleChickenHover,
    startCycling,
    stopCycling,
    createTooltipContent,
  };
};

export default useTooltipManager;