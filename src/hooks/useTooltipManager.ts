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

  // Fixed tooltip cycling state - MUST be declared before useEffect
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
  const playersRef = useRef<Player[]>(players);

  // Keep players ref updated
  useEffect(() => {
    playersRef.current = players;
    console.log('📝 Players ref updated:', players.length, 'players');
  }, [players]);



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
    console.log('🛑 stopCycling called');
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
      console.log('🛑 Cleared cycling interval');
    }
    setIsCycling(false);
    console.log('🛑 Set isCycling to false');
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
    const currentPlayers = playersRef.current;
    console.log('🎯 startCycling called:', {
      isEnabled,
      playersCount: currentPlayers.length,
      isHovering,
      isCycling,
      canStart: isEnabled && currentPlayers.length > 0 && !isHovering && !isCycling
    });

    if (!isEnabled || currentPlayers.length === 0 || isHovering || isCycling) {
      console.log('❌ Cannot start cycling - conditions not met');
      return;
    }

    // Clear any existing timer
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
    }

    setIsCycling(true);

    const cycleToNextPlayer = () => {
      if (isHovering) return; // Don't cycle while hovering

      setCurrentCycleIndex((prevIndex) => {
        const latestPlayers = playersRef.current;
        if (latestPlayers.length === 0) return prevIndex;
        
        const nextIndex = (prevIndex + 1) % latestPlayers.length;
        const currentPlayer = latestPlayers[nextIndex];
        
        console.log(`🔄 Cycling tooltip: ${prevIndex} → ${nextIndex} (${currentPlayer?.name || 'N/A'})`);
        
        if (currentPlayer) {
          const content = createTooltipContent(currentPlayer);
          // Fixed position: bottom left (10% from left, 85% from top)
          showTooltip(currentPlayer._id, { x: 10, y: 85 }, content);
        }
        
        return nextIndex;
      });
    };

    // Show first player immediately
    if (currentPlayers.length > 0) {
      const firstPlayer = currentPlayers[0];
      const content = createTooltipContent(firstPlayer);
      showTooltip(firstPlayer._id, { x: 10, y: 85 }, content);
      setCurrentCycleIndex(0);
      console.log(`🎯 Starting tooltip cycling with ${currentPlayers.length} players, showing: ${firstPlayer.name}`);
    }

    // Set up interval for cycling (7 seconds per player)
    cycleTimerRef.current = setInterval(cycleToNextPlayer, 7000);
    console.log('⏰ Tooltip cycling interval set for 7 seconds');
  }, [isEnabled, isHovering, isCycling, createTooltipContent, showTooltip]);

  // Handle hover events on chicken elements
  const handleChickenHover = useCallback((
    playerId: string | null,
    element?: HTMLElement
  ) => {
    if (!isEnabled) return;

    if (playerId) {
      const player = playersRef.current.find(p => p._id === playerId);
      if (player) {
        showHoverTooltip(player);
      }
    } else {
      hideHoverTooltip();
    }
  }, [isEnabled, showHoverTooltip, hideHoverTooltip]);



  // Start cycling when component mounts or when enabled/disabled
  useEffect(() => {
    console.log('🎯 Tooltip mount effect:', {
      isEnabled,
      playersCount: playersRef.current.length,
      isHovering,
      isCycling,
      shouldStart: isEnabled && playersRef.current.length > 0 && !isHovering && !isCycling
    });

    if (isEnabled && playersRef.current.length > 0 && !isHovering && !isCycling) {
      console.log('🚀 Starting tooltip cycling from mount effect');
      startCycling();
    } else if (!isEnabled || playersRef.current.length === 0) {
      console.log('🛑 Stopping tooltip cycling from mount effect');
      stopCycling();
    }

    return () => {
      stopCycling();
    };
  }, [isEnabled, startCycling, stopCycling]);

  // Resume cycling when hover ends
  useEffect(() => {
    if (!isHovering && isEnabled && playersRef.current.length > 0) {
      const timer = setTimeout(() => {
        startCycling();
      }, 1000); // Wait 1 second before resuming
      return () => clearTimeout(timer);
    } else if (isHovering) {
      stopCycling(); // Stop cycling when hovering starts
    }
  }, [isHovering, isEnabled, startCycling, stopCycling]);

  // Handle players change - only restart if already cycling
  useEffect(() => {
    console.log('🔄 Players change effect:', {
      playersLength: players.length,
      isEnabled,
      isHovering,
      isCycling,
      shouldRestart: isEnabled && players.length > 0 && !isHovering && isCycling
    });

    // Only restart if we're already cycling and players changed
    if (isEnabled && players.length > 0 && !isHovering && isCycling) {
      console.log('🔄 Restarting cycling due to players change');
      stopCycling();
      const timer = setTimeout(() => {
        startCycling();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [players.length, isEnabled, isHovering, isCycling, startCycling, stopCycling]);

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