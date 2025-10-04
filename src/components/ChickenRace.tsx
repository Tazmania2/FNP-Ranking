import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import type { Player, ChickenPosition } from '../types';
import { useTooltipManager } from '../hooks/useTooltipManager';
import Tooltip from './Tooltip';
import ChickenRaceFullscreen from './ChickenRaceFullscreen';
import './ChickenRace.css';

interface ChickenRaceProps {
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

interface ChickenProps {
  player: Player;
  position: ChickenPosition;
  onHover?: (_playerId: string | null, _element?: HTMLElement, _mouseEvent?: React.MouseEvent<HTMLDivElement>) => void;
  isFullscreen?: boolean;
}

// Individual Chicken component with optimized animations
const Chicken: React.FC<ChickenProps> = React.memo(({ player, position, onHover, isFullscreen = false }) => {
  const [animationOffset, setAnimationOffset] = useState({ x: 0, y: 0, rotate: 0, scale: 1 });
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const playerIdSeed = useRef<number>();

  // Memoize player ID seed for consistent animations
  useMemo(() => {
    playerIdSeed.current = parseInt(player._id.slice(-2), 16) || 1;
  }, [player._id]);

  // Optimized 60fps animation using requestAnimationFrame
  useEffect(() => {
    const animateChicken = (currentTime: number) => {
      // Throttle to 60fps max
      if (currentTime - lastTimeRef.current >= 16.67) { // ~60fps
        const time = currentTime * 0.001; // Convert to seconds
        const seed = playerIdSeed.current!;
        
        // Optimized calculations with reduced complexity
        const x = Math.sin(time * 0.5 + seed) * 2; // Horizontal sway (±2px)
        const y = Math.cos(time * 0.7 + seed) * 1.5; // Vertical bob (±1.5px)
        const rotate = Math.sin(time * 0.3 + seed) * 1; // Slight rotation (±1deg)
        const scale = 1 + Math.sin(time * 0.8 + seed) * 0.02; // Subtle scale (±2%)
        
        setAnimationOffset({ x, y, rotate, scale });
        lastTimeRef.current = currentTime;
      }
      
      animationFrameRef.current = requestAnimationFrame(animateChicken);
    };

    // Check for reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia 
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      : false;
    
    if (!prefersReducedMotion) {
      animationFrameRef.current = requestAnimationFrame(animateChicken);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [player._id]);

  // Memoize style calculations for performance
  const chickenStyle: React.CSSProperties = useMemo(() => ({
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: `translate(-50%, -50%) 
                translate3d(${animationOffset.x}px, ${animationOffset.y}px, 0) 
                rotate(${animationOffset.rotate}deg) 
                scale(${animationOffset.scale})`,
    transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), top 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    zIndex: 10,
    willChange: 'transform',
    backfaceVisibility: 'hidden',
  }), [position.x, position.y, animationOffset]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleMouseEnter = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    onHover?.(player._id, event.currentTarget, event);
  }, [onHover, player._id]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    // Prevent default to avoid triggering mouse events
    event.preventDefault();
    onHover?.(player._id, event.currentTarget);
  }, [onHover, player._id]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // For mobile devices, toggle tooltip on click/tap
    if ('ontouchstart' in window) {
      event.preventDefault();
      onHover?.(player._id, event.currentTarget);
    }
  }, [onHover, player._id]);

  return (
    <div
      style={chickenStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      className="chicken-container cursor-pointer touch-manipulation"
    >
      {/* Chicken Avatar */}
      <div className="flex flex-col items-center">
        <div className={`chicken-sprite mb-1 flex items-center justify-center hover:scale-110 transition-transform will-change-transform ${
          isFullscreen 
            ? 'w-16 h-16 text-2xl' 
            : 'w-12 h-12 text-lg'
        }`}>
          <div className="running-chicken">
            🐓
          </div>
        </div>
        {/* Player Name */}
        <div className={`player-name-tag font-medium text-gray-800 bg-white/80 px-2 py-1 rounded shadow-sm truncate ${
          isFullscreen 
            ? 'text-sm max-w-24' 
            : 'text-xs max-w-20'
        }`}>
          {player.name}
        </div>
        {/* Position Badge */}
        <div className={`position-badge font-bold text-white bg-blue-600 rounded-full flex items-center justify-center mt-1 ${
          isFullscreen 
            ? 'text-sm w-8 h-8' 
            : 'text-xs w-6 h-6'
        }`}>
          {player.position}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo optimization
  return (
    prevProps.player._id === nextProps.player._id &&
    prevProps.player.position === nextProps.player.position &&
    prevProps.player.name === nextProps.player.name &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.position.rank === nextProps.position.rank &&
    prevProps.isFullscreen === nextProps.isFullscreen
  );
});

export const ChickenRace: React.FC<ChickenRaceProps> = React.memo(({
  players,
  leaderboardTitle,
  isLoading,
  playerPositions,
  isFullscreen = false,
}) => {
  // State for fullscreen modal
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Initialize tooltip manager
  const {
    tooltips,
    handleChickenHover,
    hidePlayerTooltip,
  } = useTooltipManager({ players, isEnabled: !isLoading });

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
    // Sort players by position (ascending - position 1 is first place)
    const sortedPlayers = [...players].sort((a, b) => a.position - b.position);
    
    // Group players by score to handle ties
    const scoreGroups = new Map<number, Player[]>();
    sortedPlayers.forEach(player => {
      const score = player.total;
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, []);
      }
      scoreGroups.get(score)!.push(player);
    });

    const positions: ChickenPosition[] = [];
    let currentRankIndex = 0;

    // Process each score group
    Array.from(scoreGroups.entries())
      .sort(([a], [b]) => b - a) // Sort by score descending (highest first)
      .forEach(([, groupPlayers]) => {
        // Calculate horizontal position for this rank group
        // First place (position 1) should be at ~85%, last place at ~15%
        const totalPlayers = sortedPlayers.length;
        const rankProgress = currentRankIndex / Math.max(totalPlayers - 1, 1);
        const xPosition = 85 - (rankProgress * 70); // 85% to 15% range
        
        // For tied players, arrange them vertically at the same horizontal position
        groupPlayers.forEach((player, indexInGroup) => {
          // Randomize vertical position with some clustering for ties
          const baseY = 30 + (Math.random() * 40); // 30% to 70% range
          const tieOffset = indexInGroup * 8; // Spread tied players vertically
          const yPosition = Math.min(Math.max(baseY + tieOffset, 20), 80);
          
          positions.push({
            playerId: player._id,
            x: xPosition,
            y: yPosition,
            rank: player.position,
          });
        });
        
        currentRankIndex += groupPlayers.length;
      });

    return positions;
  }, [players, playerPositions]);

  // Memoize chicken components to prevent unnecessary re-renders
  const chickenComponents = useMemo(() => {
    return chickenPositions.map((position) => {
      const player = players.find(p => p._id === position.playerId);
      if (!player) return null;

      return (
        <Chicken
          key={player._id}
          player={player}
          position={position}
          onHover={handleChickenHover}
          isFullscreen={isFullscreen}
        />
      );
    }).filter(Boolean);
  }, [chickenPositions, players, handleChickenHover]);

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
      <div className={`chicken-race-container relative w-full bg-gradient-to-b from-sky-200 via-sky-100 to-green-200 rounded-lg border-2 sm:border-4 border-brown-600 overflow-hidden ${
        isFullscreen 
          ? 'h-[70vh] sm:h-[75vh] lg:h-[80vh]' 
          : 'h-64 sm:h-80 lg:h-96'
      }`}>
        {/* Track decorations */}
        <div className="absolute inset-0">
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

        {/* Chickens */}
        {chickenComponents}

        {/* Race Info Overlay */}
        <div className={`race-info-overlay absolute bg-white/90 rounded-lg shadow-lg ${
          isFullscreen 
            ? 'top-4 sm:top-6 left-4 sm:left-6 p-3 sm:p-4' 
            : 'top-2 sm:top-4 left-2 sm:left-4 p-2 sm:p-3'
        }`}>
          <div className={`font-medium text-gray-800 ${
            isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
          }`}>
            🏆 {players.length} Jogadores
          </div>
          <div className={`text-gray-600 hidden sm:block ${
            isFullscreen ? 'text-sm' : 'text-xs'
          }`}>
            Líder: {players.find(p => p.position === 1)?.name || 'N/A'}
          </div>
        </div>

        {/* Fullscreen Button - Only show when not in fullscreen */}
        {!isFullscreen && (
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
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
        <div className={`absolute bg-white/90 rounded-lg shadow-lg ${
          isFullscreen 
            ? 'bottom-4 sm:bottom-6 right-4 sm:right-6 p-3 sm:p-4' 
            : 'bottom-2 sm:bottom-4 right-2 sm:right-4 p-2 sm:p-3'
        }`}>
          <div className={`font-medium text-gray-800 mb-1 hidden sm:block ${
            isFullscreen ? 'text-sm' : 'text-xs'
          }`}>
            Colocação
          </div>
          <div className={`flex items-center gap-1 sm:gap-2 text-gray-600 ${
            isFullscreen ? 'text-sm' : 'text-xs'
          }`}>
            <span>🥇 1º</span>
            <span className="hidden sm:inline">→</span>
            <span>🏁 Chegada</span>
          </div>
        </div>
      </div>

      {/* Race Stats */}
      <div className={`grid grid-cols-2 gap-2 sm:gap-4 text-center ${
        isFullscreen ? 'mt-4 sm:mt-6' : 'mt-3 lg:mt-4'
      }`}>
        <div className={`stats-card bg-white rounded-lg shadow-sm ${
          isFullscreen ? 'p-3 sm:p-5' : 'p-2 sm:p-4'
        }`}>
          <div className={`font-bold text-blue-600 ${
            isFullscreen ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg sm:text-xl lg:text-2xl'
          }`}>
            {players.length}
          </div>
          <div className={`text-gray-600 ${
            isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
          }`}>
            Jogadores
          </div>
        </div>
        <div className={`stats-card bg-white rounded-lg shadow-sm ${
          isFullscreen ? 'p-3 sm:p-5' : 'p-2 sm:p-4'
        }`}>
          <div className={`font-bold text-yellow-600 ${
            isFullscreen ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-lg sm:text-xl lg:text-2xl'
          }`}>
            {Math.round(players.find(p => p.position === 1)?.total || 0)}
          </div>
          <div className={`text-gray-600 ${
            isFullscreen ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
          }`}>
            Pontos do Líder
          </div>
        </div>
        {/* <div className="stats-card bg-white rounded-lg p-2 sm:p-4 shadow-sm">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
            {Math.round(Math.max(...players.map(p => p.total)) - Math.min(...players.map(p => p.total)))}
          </div>
          <div className="text-xs sm:text-sm text-gray-600">Diferença de Pontos</div>
        </div> */}
      </div>

      {/* Tooltip System - Outside overflow container */}
      <Tooltip
        isVisible={tooltips.isVisible}
        position={tooltips.position}
        content={tooltips.content}
        onClose={hidePlayerTooltip}
      />

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
    // prevProps.leaderboardTitle === nextProps.leaderboardTitle &&
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

export default ChickenRace;