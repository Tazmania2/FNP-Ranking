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
    updateTooltipPosition,
  } = useUIStore();

  const [currentCycleIndex, setCurrentCycleIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [isCycling, setIsCycling] = useState(false);

  const playersRef = useRef<Player[]>(players);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCycleIndexRef = useRef(0);

  useEffect(() => {
    playersRef.current = players;

    if (players.length === 0) {
      currentCycleIndexRef.current = 0;
      setCurrentCycleIndex(0);
    } else if (currentCycleIndexRef.current >= players.length) {
      const nextIndex = players.length - 1;
      currentCycleIndexRef.current = nextIndex;
      setCurrentCycleIndex(nextIndex);
    }
  }, [players]);

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

    const player = playersRef.current.find((p) => p._id === playerId);
    if (!player) return;

    const content = createTooltipContent(player);
    const resolvedPosition = position
      ?? getPlayerPosition?.(playerId)
      ?? { x: 15, y: 78 };

    showTooltip(playerId, resolvedPosition, content);
  }, [createTooltipContent, getPlayerPosition, isEnabled, showTooltip]);

  const hidePlayerTooltip = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  const updateTooltipPos = useCallback((position: { x: number; y: number }) => {
    updateTooltipPosition(position);
  }, [updateTooltipPosition]);

  useEffect(() => {
    if (!tooltips.isVisible || !tooltips.playerId) {
      return;
    }

    const updatedPosition = getPlayerPosition?.(tooltips.playerId);
    if (updatedPosition) {
      updateTooltipPos(updatedPosition);
    }
  }, [tooltips.isVisible, tooltips.playerId, getPlayerPosition, updateTooltipPos]);

  const getElementRelativePosition = useCallback((element: HTMLElement): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    const raceContainer = element.closest('.chicken-race-container');

    if (raceContainer) {
      const containerRect = raceContainer.getBoundingClientRect();
      const relativeX = ((rect.left + rect.width / 2 - containerRect.left) / containerRect.width) * 100;
      const relativeY = ((rect.top - containerRect.top) / containerRect.height) * 100;

      return {
        x: Math.max(0, Math.min(100, relativeX)),
        y: Math.max(0, Math.min(100, relativeY)),
      };
    }

    return { x: 50, y: 50 };
  }, []);

  const stopCycling = useCallback(() => {
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
      cycleTimerRef.current = null;
    }
    setIsCycling(false);
  }, []);

  const startCycling = useCallback(() => {
    const currentPlayers = playersRef.current;

    if (!isEnabled || currentPlayers.length === 0 || isHovering || isCycling) {
      return;
    }

    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
    }

    let startIndex = currentCycleIndexRef.current;
    if (startIndex >= currentPlayers.length) {
      startIndex = 0;
    }

    const initialPlayer = currentPlayers[startIndex];
    if (initialPlayer) {
      showPlayerTooltip(initialPlayer._id);
      currentCycleIndexRef.current = startIndex;
      setCurrentCycleIndex(startIndex);
    }

    setIsCycling(true);

    const cycleToNextPlayer = () => {
      if (isHovering) return;

      setCurrentCycleIndex((prevIndex) => {
        const latestPlayers = playersRef.current;
        if (latestPlayers.length === 0) return prevIndex;

        const nextIndex = (prevIndex + 1) % latestPlayers.length;
        const nextPlayer = latestPlayers[nextIndex];

        if (nextPlayer) {
          showPlayerTooltip(nextPlayer._id);
        }

        currentCycleIndexRef.current = nextIndex;
        return nextIndex;
      });
    };

    cycleTimerRef.current = setInterval(cycleToNextPlayer, 7000);
  }, [isEnabled, isHovering, isCycling, showPlayerTooltip]);

  useEffect(() => {
    currentCycleIndexRef.current = currentCycleIndex;
  }, [currentCycleIndex]);

  const handleChickenHover = useCallback((
    playerId: string | null,
    element?: HTMLElement,
  ) => {
    if (!isEnabled) return;

    if (playerId) {
      const overridePosition = element ? getElementRelativePosition(element) : undefined;
      showPlayerTooltip(playerId, overridePosition);
      setIsHovering(true);
      stopCycling();
    } else {
      setIsHovering(false);
      hidePlayerTooltip();
    }
  }, [getElementRelativePosition, hidePlayerTooltip, isEnabled, showPlayerTooltip, stopCycling]);

  useEffect(() => {
    if (isEnabled && playersRef.current.length > 0 && !isHovering && !isCycling) {
      startCycling();
    } else if (!isEnabled || playersRef.current.length === 0) {
      stopCycling();
    }

    return () => {
      stopCycling();
    };
  }, [isEnabled, isHovering, isCycling, startCycling, stopCycling]);

  useEffect(() => {
    if (!isHovering && isEnabled && playersRef.current.length > 0) {
      const timer = setTimeout(() => {
        startCycling();
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (isHovering) {
      stopCycling();
    }
  }, [isHovering, isEnabled, startCycling, stopCycling]);

  useEffect(() => {
    if (!isEnabled) {
      stopCycling();
      return;
    }

    if (players.length === 0) {
      stopCycling();
      return;
    }

    if (!isHovering) {
      if (isCycling) {
        stopCycling();
        const timer = setTimeout(() => {
          startCycling();
        }, 100);
        return () => clearTimeout(timer);
      }

      const timer = setTimeout(() => {
        startCycling();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [players, isEnabled, isHovering, isCycling, startCycling, stopCycling]);

  useEffect(() => {
    return () => {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
      }
    };
  }, []);

  return {
    tooltips,
    isHovering,
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
