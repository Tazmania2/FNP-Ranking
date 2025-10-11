import React, { useMemo, useState, useCallback } from 'react';
import type { Player, ChickenPosition } from '../types';
import { useTooltipManager } from '../hooks/useTooltipManager';
import { useCanvasRenderer } from '../hooks/useCanvasRenderer';
import Tooltip from './Tooltip';
import ChickenRaceFullscreen from './ChickenRaceFullscreen';
import './ChickenRace.css';

interface ChickenRaceCanvasProps {
  players: Player[];
  leaderboardTitle: string;
  isLoading: boolean;
  playerPositions?: Array<{
    playerId: string;
    position: { x: number; y: number };
    rank: number;
    isAnimating: boolean;
  }>;
  isFullscreen?: boolean;
}

export const ChickenRaceCanvas: React.FC<ChickenRaceCanvasProps> = React.memo(({ 
  players,
  leaderboardTitle,
  isLoading,
  playerPositions,
  isFullscreen = false,
}) => {
  // State for fullscreen modal
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Calculate chicken positions based on rankings or use provided positions
  const chickenPositions = useMemo((): ChickenPosition[] => {
    if (!players.length) return [];

    // Use provided positions if available
    if (playerPositions && playerPositions.length > 0) {
      return playerPositions.map(pos => ({
        playerId: pos.playerId,
        x: pos.position.x,
        y: pos.position.y,
        rank: pos.rank,
      }));
    }

    // Fallback to calculating positions
    const sortedPlayers = [...players].sort((a, b) => a.position - b.position);

    // Group by score
    const scoreGroups = new Map<number, Player[]>();
    sortedPlayers.forEach(player => {
      const score = Math.round(player.total * 10) / 10;
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, []);
      }
      scoreGroups.get(score)!.push(player);
    });

    const positions: ChickenPosition[] = [];
    const maxDistance = 70; // Maximum distance from start to finish (85% - 15%)
    const chickenSize = 8;

    // Define safe zones to avoid UI overlaps
    const safeZones = {
      topLeft: { x: [0, 30], y: [0, 25] },
      topRight: { x: [70, 100], y: [0, 25] },
      bottomLeft: { x: [0, 30], y: [75, 100] },
      bottomRight: { x: [70, 100], y: [75, 100] },
    };

    // Helper function to check if position is in a safe zone
    const isInSafeZone = (x: number, y: number, zones: typeof safeZones) => {
      return Object.values(zones).some((zone) => {
        return x >= zone.x[0] && x <= zone.x[1] && y >= zone.y[0] && y <= zone.y[1];
      });
    };

    // Helper function to check if two chickens would overlap
    const wouldOverlap = (pos1: { x: number; y: number }, pos2: { x: number; y: number }) => {
      const xDiff = Math.abs(pos1.x - pos2.x);
      const yDiff = Math.abs(pos1.y - pos2.y);
      return xDiff < (chickenSize * 0.8) && yDiff < (chickenSize * 0.5);
    };

    // Helper function to find a non-overlapping position
    const findNonOverlappingPosition = (baseX: number, baseY: number, existingPositions: { x: number; y: number }[]) => {
      let x = baseX;
      let y = baseY;
      let attempts = 0;
      const maxAttempts = 15;

      const initialPos = { x, y };
      const initialOverlap = existingPositions.some(pos => wouldOverlap(initialPos, pos));
      const initialSafeZone = isInSafeZone(x, y, safeZones);

      if (!initialOverlap && !initialSafeZone) {
        return { x, y };
      }

      while (attempts < maxAttempts) {
        const currentPos = { x, y };
        const hasOverlap = existingPositions.some(pos => wouldOverlap(currentPos, pos));
        const inSafeZone = isInSafeZone(x, y, safeZones);

        if (!hasOverlap && !inSafeZone) {
          return { x, y };
        }

        if (attempts < 8) {
          const yOffset = (attempts % 2 === 0 ? 1 : -1) * Math.ceil(attempts / 2) * 2;
          y = Math.min(Math.max(baseY + yOffset, 35), 65);
          x = baseX;
        } else {
          const angle = ((attempts - 8) * 0.7) * Math.PI;
          const radius = Math.min((attempts - 8) * 1.5, 6);
          x = Math.min(Math.max(baseX + Math.cos(angle) * radius, 15), 85);
          y = Math.min(Math.max(baseY + Math.sin(angle) * radius, 35), 65);
        }

        attempts++;
      }

      return { x: baseX, y: baseY };
    };

    // Calculate score range for positioning
    const maxScore = Math.max(...players.map(p => p.total));
    const minScore = Math.min(...players.map(p => p.total));
    const scoreRange = maxScore - minScore || 1;

    // Process each score group
    Array.from(scoreGroups.entries())
      .sort(([a], [b]) => b - a)
      .forEach(([score, groupPlayers]) => {
        const scoreProgress = scoreRange > 0 ? (score - minScore) / scoreRange : 1;
        const xPosition = 15 + (scoreProgress * maxDistance);

        groupPlayers.forEach((player, indexInGroup) => {
          const randomFactor = Math.random();
          const horizontalVariation = (Math.random() - 0.5) * 4;
          let xOffset = horizontalVariation;

          if (groupPlayers.length > 1) {
            const systematicOffset = (indexInGroup - (groupPlayers.length - 1) / 2) * 1.5;
            xOffset += systematicOffset;
          }

          const safeAreaHeight = 65 - 35;
          const randomYOffset = randomFactor * safeAreaHeight;
          let yPosition = 35 + randomYOffset;

          const additionalRandomness = (Math.random() - 0.5) * 8;
          yPosition += additionalRandomness;

          yPosition = Math.min(Math.max(yPosition, 35), 65);
          const finalXPosition = Math.min(Math.max(xPosition + xOffset, 15), 85);

          const existingPositions = positions.map(p => ({ x: p.x, y: p.y }));
          const finalPosition = findNonOverlappingPosition(finalXPosition, yPosition, existingPositions);

          positions.push({
            playerId: player._id,
            x: finalPosition.x,
            y: finalPosition.y,
            rank: player.position,
          });
        });
      });

    return positions;
  }, [players, playerPositions]);

  const chickenPositionMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    chickenPositions.forEach(position => {
      map.set(position.playerId, { x: position.x, y: position.y });
    });
    return map;
  }, [chickenPositions]);

  const getPlayerTooltipPosition = useCallback((playerId: string) => {
    const coords = chickenPositionMap.get(playerId);
    if (!coords) return null;

    const marginX = 4;
    const marginY = 12;

    return {
      x: Math.min(100 - marginX, Math.max(marginX, coords.x)),
      y: Math.min(100 - marginY, Math.max(marginY, coords.y)),
    };
  }, [chickenPositionMap]);

  // Initialize tooltip manager
  const {
    tooltips,
    isHovering,
    handleChickenHover,
    hidePlayerTooltip,
  } = useTooltipManager({
    players,
    isEnabled: !isLoading,
    getPlayerPosition: getPlayerTooltipPosition,
  });

  // Handle canvas interactions
  const handleCanvasHover = useCallback((playerId: string | null, x: number, y: number) => {
    if (playerId) {
      // Create a mock element for tooltip positioning
      const mockElement = {
        getBoundingClientRect: () => ({
          left: x,
          top: y,
          right: x,
          bottom: y,
          width: 0,
          height: 0,
          x,
          y,
          toJSON: () => ({}),
        }),
      } as HTMLElement;
      
      handleChickenHover(playerId, mockElement);
    } else {
      handleChickenHover(null);
    }
  }, [handleChickenHover]);

  const handleCanvasClick = useCallback((playerId: string | null, x: number, y: number) => {
    if (playerId) {
      const mockElement = {
        getBoundingClientRect: () => ({
          left: x,
          top: y,
          right: x,
          bottom: y,
          width: 0,
          height: 0,
          x,
          y,
          toJSON: () => ({}),
        }),
      } as HTMLElement;
      
      handleChickenHover(playerId, mockElement);
    }
  }, [handleChickenHover]);

  // Initialize canvas renderer
  const {
    canvasRef,
    handleMouseMove,
    handleMouseLeave,
    handleClick,
  } = useCanvasRenderer({
    players,
    chickenPositions,
    isFullscreen,
    onChickenHover: handleCanvasHover,
    onChickenClick: handleCanvasClick,
  });

  if (isLoading) {
    return (
      <div className="chicken-race-container w-full h-96 bg-gradient-to-b from-sky-200 to-green-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="loading-chicken text-4xl mb-4">
            <div className="running-chicken">🐓</div>
          </div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!players.length) {
    return (
      <div className="chicken-race-container w-full h-96 bg-gradient-to-b from-sky-200 to-green-200 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🏁</div>
          <p className="text-gray-600">Nenhum jogador nesta corrida ainda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chicken-race-wrapper w-full">
      {/* Race Title */}
      <div className="text-center mb-3 lg:mb-4">
        {/* <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-1 lg:mb-2">{leaderboardTitle}</h2> */}
        {/* <p className="text-sm lg:text-base text-gray-600">🏁 Chicken Race Championship 🏁</p> */}
      </div>

      {/* Race Track */}
      <div className={`chicken-race-container relative w-full bg-gradient-to-b from-sky-200 via-sky-100 to-green-200 rounded-lg border-2 sm:border-4 border-brown-600 overflow-hidden ${isFullscreen
        ? 'h-[70vh] sm:h-[75vh] lg:h-[80vh]'
        : 'h-64 sm:h-80 lg:h-96'
        }`}>
        {/* Track decorations */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Finish line */}
          <div className="absolute right-4 top-0 bottom-0 w-2 bg-black opacity-20">
            <div className="finish-line h-full" />
          </div>

          {/* Start line */}
          <div className="absolute left-4 top-0 bottom-0 w-2 bg-black opacity-20">
            <div className="start-line h-full" />
          </div>

          {/* Track lanes (subtle) */}
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="track-lane absolute left-0 right-0 h-px bg-white/30"
              style={{ top: `${20 + i * 15}%` }}
            />
          ))}
        </div>

        {/* Canvas for chickens */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          style={{ touchAction: 'manipulation' }}
        />

        {/* Player Tooltip */}
        <Tooltip
          isVisible={tooltips.isVisible}
          position={tooltips.position}
          content={tooltips.content}
          onClose={hidePlayerTooltip}
          isFixed={!isHovering}
        />

        {/* Race Info Overlay */}
        <div className={`race-info-overlay absolute bg-white/90 rounded-lg shadow-lg z-30 ${isFullscreen
          ? 'top-4 sm:top-6 left-4 sm:left-6 p-3 sm:p-4'
          : 'top-2 sm:top-4 left-2 sm:left-4 p-2 sm:p-3'
          }`}>
          <div className={`font-medium text-gray-800 ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
            }`}>
            🏆 {players.length} Jogadores
          </div>
          <div className={`text-gray-600 hidden sm:block ${isFullscreen ? 'text-sm' : 'text-xs'
            }`}>
            Líder: {players.find(p => p.position === 1)?.name || 'N/A'}
          </div>
        </div>

        {/* Fullscreen Button - Only show when not in fullscreen */}
        {!isFullscreen && (
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-40">
            <button
              onClick={() => setIsFullscreenOpen(true)}
              className="flex items-center gap-1 sm:gap-2 bg-white/90 hover:bg-white rounded-lg p-2 sm:p-3 shadow-lg transition-colors backdrop-blur-sm"
              aria-label="Abrir em tela cheia"
              title="Visualizar em tela cheia para TV"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              <span className="text-xs sm:text-sm font-medium text-gray-700 hidden sm:inline">
                Tela Cheia
              </span>
            </button>
          </div>
        )}

        {/* Position Legend */}
        <div className={`absolute bg-white/90 rounded-lg shadow-lg z-30 ${isFullscreen
          ? 'bottom-4 sm:bottom-6 right-4 sm:right-6 p-3 sm:p-4'
          : 'bottom-2 sm:bottom-4 right-2 sm:right-4 p-2 sm:p-3'
          }`}>
          <div className={`font-medium text-gray-800 mb-1 hidden sm:block ${isFullscreen ? 'text-sm' : 'text-xs'
            }`}>
            Colocação
          </div>
          <div className={`flex items-center gap-1 sm:gap-2 text-gray-600 ${isFullscreen ? 'text-sm' : 'text-xs'
            }`}>
            <span>🥇 1º</span>
            <span className="hidden sm:inline">→</span>
            <span>🏁 Chegada</span>
          </div>
        </div>
      </div>

      {/* Race Stats */}
      <div className={`grid grid-cols-2 gap-2 sm:gap-4 text-center ${isFullscreen ? 'mt-4 sm:mt-6' : 'mt-3 lg:mt-4'
        }`}>
        <div className={`stats-card bg-white rounded-lg shadow-sm ${isFullscreen ? 'p-3 sm:p-5' : 'p-2 sm:p-4'
          }`}>
          <div className={`font-bold text-blue-600 ${isFullscreen ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg sm:text-xl lg:text-2xl'
            }`}>
            {players.length}
          </div>
          <div className={`text-gray-600 ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
            }`}>
            Jogadores
          </div>
        </div>
        <div className={`stats-card bg-white rounded-lg shadow-sm ${isFullscreen ? 'p-3 sm:p-5' : 'p-2 sm:p-4'
          }`}>
          <div className={`font-bold text-yellow-600 ${isFullscreen ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg sm:text-xl lg:text-2xl'
            }`}>
            {(players.find(p => p.position === 1)?.total || 0).toFixed(1)}
          </div>
          <div className={`text-gray-600 ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
            }`}>
            Pontos do Líder
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <ChickenRaceFullscreen
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        players={players}
        leaderboardTitle={leaderboardTitle}
        isLoading={isLoading}
        playerPositions={playerPositions}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo optimization
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.players.length === nextProps.players.length &&
    prevProps.isFullscreen === nextProps.isFullscreen &&
    prevProps.players.every((player, index) =>
      player._id === nextProps.players[index]?._id &&
      player.position === nextProps.players[index]?.position &&
      player.total === nextProps.players[index]?.total
    ) &&
    JSON.stringify(prevProps.playerPositions) === JSON.stringify(nextProps.playerPositions)
  );
});

ChickenRaceCanvas.displayName = 'ChickenRaceCanvas';

export default ChickenRaceCanvas;

