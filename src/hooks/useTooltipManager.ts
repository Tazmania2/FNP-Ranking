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

  // Get screen position from element
  const getElementScreenPosition = useCallback((element: HTMLElement): { x: number; y: number } => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top - 10, // Position above the element
    };
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
      
      if (mouseEvent && !isMobile) {
        // Use mouse position for desktop hover
        position = {
          x: mouseEvent.clientX,
          y: mouseEvent.clientY - 5, // Position very close to mouse
        };
      } else {
        // Fallback to element position for mobile or when mouse event not available
        position = getElementScreenPosition(element);
      }
      
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
  }, [isEnabled, getElementScreenPosition, showPlayerTooltip, hidePlayerTooltip, tooltips.isVisible, tooltips.content, players]);

  // Auto-display tooltips for all players every minute
  const startAutoDisplay = useCallback(() => {
    if (!isEnabled || players.length === 0) return;

    // Clear any existing auto display
    if (currentAutoDisplayRef.current) {
      clearTimeout(currentAutoDisplayRef.current);
    }

    let currentPlayerIndex = 0;
    const displayInterval = 1000; // 1 second between each tooltip
    // const totalDisplayTime = Math.min(players.length * displayInterval, 5000); // Max 5 seconds total

    const showNextTooltip = () => {
      if (currentPlayerIndex >= players.length) {
        // All tooltips shown, hide the last one after a brief delay
        currentAutoDisplayRef.current = setTimeout(() => {
          hidePlayerTooltip();
        }, 1000);
        return;
      }

      const player = players[currentPlayerIndex];
      if (player) {
        // Calculate a position for auto-display (center-ish of screen)
        const position = {
          x: window.innerWidth / 2 + (currentPlayerIndex - players.length / 2) * 100,
          y: window.innerHeight / 3,
        };

        showPlayerTooltip(player._id, position);

        // Schedule next tooltip
        currentPlayerIndex++;
        currentAutoDisplayRef.current = setTimeout(showNextTooltip, displayInterval);
      }
    };

    // Start the sequence
    showNextTooltip();
  }, [isEnabled, players, showPlayerTooltip, hidePlayerTooltip]);

  // Set up automatic tooltip display every minute
  useEffect(() => {
    if (!isEnabled) return;

    // Clear existing timer
    if (autoDisplayTimerRef.current) {
      clearInterval(autoDisplayTimerRef.current);
    }

    // Set up new timer for every minute (60 seconds)
    autoDisplayTimerRef.current = setInterval(() => {
      startAutoDisplay();
    }, 60000); // 60 seconds

    // Cleanup on unmount or dependency change
    return () => {
      if (autoDisplayTimerRef.current) {
        clearInterval(autoDisplayTimerRef.current);
      }
      if (currentAutoDisplayRef.current) {
        clearTimeout(currentAutoDisplayRef.current);
      }
    };
  }, [isEnabled, startAutoDisplay]);

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