import { useCallback, useEffect, useRef } from 'react';
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
      
      // Debug logging
      console.log('🐔 Chicken hover position:', {
        elementRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        containerRect: { left: containerRect.left, top: containerRect.top, width: containerRect.width, height: containerRect.height },
        calculated: { relativeX, relativeY },
        final: { x: Math.max(0, Math.min(100, relativeX)), y: Math.max(0, Math.min(100, relativeY)) }
      });
      
      return {
        x: Math.max(0, Math.min(100, relativeX)),
        y: Math.max(0, Math.min(100, relativeY)),
      };
    }
    
    // Fallback to center if container not found
    return { x: 50, y: 50 };
  }, []);

  // Handle hover events on chicken elements
  const handleChickenHover = useCallback((
    playerId: string | null,
    element?: HTMLElement,
    mouseEvent?: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!isEnabled) return;

    // For mobile devices, toggle tooltip on tap
    const isMobile = 'ontouchstart' in window;
    
    if (playerId && element) {
      let position;
      
      // Always use element position relative to race container
      position = getElementRelativePosition(element);
      
      if (isMobile) {
        // On mobile, toggle tooltip - if same player is already shown, hide it
        if (tooltips.isVisible && tooltips.content?.playerName === players.find(p => p._id === playerId)?.name) {
          hidePlayerTooltip();
        } else {
          showPlayerTooltip(playerId, position);
        }
      } else {
        // On desktop, show tooltip on hover
        showPlayerTooltip(playerId, position);
      }
    } else if (!isMobile) {
      // On desktop, hide tooltip when not hovering
      hidePlayerTooltip();
    }
  }, [isEnabled, getElementRelativePosition, showPlayerTooltip, hidePlayerTooltip, tooltips.isVisible, tooltips.content, players]);

  // Auto-display tooltips for all players (disabled for now to avoid interference)
  const startAutoDisplay = useCallback(() => {
    // Disabled auto-display to prevent interference with manual hover
    // This was causing positioning issues and unwanted tooltip cycling
    console.log('Auto-display disabled to prevent tooltip cycling issues');
  }, []);

  // Disabled automatic tooltip display to prevent cycling issues
  useEffect(() => {
    // Auto-display is disabled to prevent interference with manual hover tooltips
    return () => {
      if (autoDisplayTimerRef.current) {
        clearInterval(autoDisplayTimerRef.current);
      }
      if (currentAutoDisplayRef.current) {
        clearTimeout(currentAutoDisplayRef.current);
      }
    };
  }, []);

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
    tooltips,
    showPlayerTooltip,
    hidePlayerTooltip,
    updateTooltipPos,
    handleChickenHover,
    startAutoDisplay,
    createTooltipContent,
  };
};

export default useTooltipManager;