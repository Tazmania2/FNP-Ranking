import React, { useEffect, useRef } from 'react';
import type { TooltipContent } from '../types';

interface TooltipProps {
  isVisible: boolean;
  position: { x: number; y: number };
  content: TooltipContent | null;
  onClose?: () => void;
}

export const Tooltip: React.FC<TooltipProps> = ({
  isVisible,
  position,
  content,
  onClose,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Auto-hide tooltip after 5 seconds
  useEffect(() => {
    if (isVisible && content) {
      const timer = setTimeout(() => {
        onClose?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, content, onClose]);

  // Adjust tooltip position to stay within viewport
  const getAdjustedPosition = () => {
    if (!tooltipRef.current) return position;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position if tooltip would overflow
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    if (x < 10) {
      x = 10;
    }

    // Adjust vertical position if tooltip would overflow
    if (y + rect.height > viewportHeight) {
      y = position.y - rect.height - 20; // Position above instead of below
    }
    if (y < 10) {
      y = 10;
    }

    return { x, y };
  };

  if (!isVisible || !content) {
    return null;
  }

  const adjustedPosition = getAdjustedPosition();

  // Calculate points gained today (difference between current and previous total)
  const pointsGainedToday = content.pointsGainedToday || 0;
  const gainColor = pointsGainedToday > 0 ? 'text-green-600' : 
                   pointsGainedToday < 0 ? 'text-red-600' : 'text-gray-600';
  const gainIcon = pointsGainedToday > 0 ? '↗️' : 
                  pointsGainedToday < 0 ? '↘️' : '➡️';

  return (
    <div
      ref={tooltipRef}
      className="tooltip-container fixed z-[9999] pointer-events-auto sm:pointer-events-none"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        transform: 'translateX(-100%) translateY(-100%)',
      }}
    >
      {/* Tooltip Arrow */}
      <div className="tooltip-arrow absolute -bottom-2 left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
      </div>

      {/* Tooltip Content */}
      <div className="tooltip-content bg-gray-800 text-white rounded-lg px-3 sm:px-4 py-2 sm:py-3 shadow-lg min-w-40 sm:min-w-48 max-w-56 sm:max-w-64 mx-2">
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-1 right-1 sm:hidden w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white"
          aria-label="Close tooltip"
        >
          ×
        </button>
        {/* Player Name and Position */}
        <div className="flex items-center justify-between mb-2 pr-6 sm:pr-0">
          <h3 className="font-bold text-base sm:text-lg text-yellow-400 truncate">
            {content.playerName}
          </h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-300 hidden sm:inline">Rank</span>
            <span className="bg-blue-600 text-white text-xs sm:text-sm font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
              #{content.rank}
            </span>
          </div>
        </div>

        {/* Points Information */}
        <div className="space-y-1.5 sm:space-y-2">
          {/* Total Points */}
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-xs sm:text-sm">Total de Pontos:</span>
            <span className="font-bold text-white text-sm sm:text-lg">
              {content.points.toLocaleString('en-US')}
            </span>
          </div>

          {/* Points Gained Today */}
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-xs sm:text-sm">Alteração de Pontos:</span>
            <div className="flex items-center gap-1">
              <span className={`font-medium text-xs sm:text-sm ${gainColor}`}>
                {pointsGainedToday > 0 ? '+' : ''}{pointsGainedToday.toLocaleString('en-US')}
              </span>
              <span className="text-xs">{gainIcon}</span>
            </div>
          </div>
        </div>

        {/* Performance Indicator */}
        <div className="mt-2 sm:mt-3 pt-2 border-t border-gray-600">
          <div className="flex items-center justify-center gap-1 sm:gap-2">
            {content.rank === 1 && (
              <div className="flex items-center gap-1 text-yellow-400">
                <span className="text-sm sm:text-lg">👑</span>
                <span className="text-xs font-medium">Líder</span>
              </div>
            )}
            {content.rank <= 3 && content.rank > 1 && (
              <div className="flex items-center gap-1 text-orange-400">
                <span className="text-sm sm:text-lg">🏆</span>
                <span className="text-xs font-medium">Top 3 Jogadores</span>
              </div>
            )}
            {pointsGainedToday > 0 && (
              <div className="flex items-center gap-1 text-green-400">
                <span className="text-sm sm:text-lg">🔥</span>
                <span className="text-xs font-medium">Acelerando!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tooltip;