import React from 'react';
import type { TooltipContent } from '../types';

interface TooltipProps {
  isVisible: boolean;
  position: { x: number; y: number };
  content: TooltipContent | null;
  onClose?: () => void;
  isFixed?: boolean;
  autoHideDelay?: number | null;
}

export const Tooltip: React.FC<TooltipProps> = ({
  isVisible,
  position,
  content,
  isFixed = false,
}) => {
  if (!isVisible || !content) {
    return null;
  }

  // Calculate points gained today
  const pointsGainedToday = content.pointsGainedToday || 0;

  // Simple positioning - always show tooltip above and to the right of the chicken
  const tooltipStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${Math.min(position.x + 8, 85)}%`, // Offset to the right, but keep within bounds
    top: `${Math.max(position.y - 12, 5)}%`, // Offset above, but keep within bounds
    transform: 'translateY(-100%)', // Move tooltip above its position
    zIndex: 1000, // Very high z-index to ensure it's always visible
    pointerEvents: 'none',
  };

  return (
    <div
      className="tooltip-container"
      style={tooltipStyle}
    >
      {/* Simple arrow pointing to the chicken */}
      <div className="absolute -bottom-1 left-4">
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900/95" />
      </div>

      {/* Tooltip Content */}
      <div className="tooltip-content bg-gray-900/95 text-white rounded-lg shadow-xl border border-gray-700/50 backdrop-blur-sm px-3 py-2 text-sm min-w-32 max-w-48">
        <div className="text-left space-y-1">
          {/* Player Name */}
          <div className="text-yellow-300 font-semibold truncate">
            {content.playerName}
          </div>
          
          {/* Position and Points */}
          <div className="text-white font-medium">
            #{content.rank} • {content.points.toFixed(1)} pts
          </div>
          
          {/* Points gained today (if any) */}
          {pointsGainedToday !== 0 && (
            <div className={`text-xs ${
              pointsGainedToday > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {pointsGainedToday > 0 ? '+' : ''}{pointsGainedToday.toFixed(1)} hoje
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tooltip;