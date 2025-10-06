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

      {/* Tooltip Content - Discrete version */}
      <div className="tooltip-content bg-gray-800/95 text-white rounded-md px-2 py-1.5 shadow-md min-w-32 max-w-48 mx-2 backdrop-blur-sm">
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="absolute top-0.5 right-0.5 sm:hidden w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white text-xs"
          aria-label="Close tooltip"
        >
          ×
        </button>
        
        {/* Compact Player Info */}
        <div className="flex items-center justify-between gap-2 pr-4 sm:pr-0">
          <div className="flex items-center gap-1">
            <span className="bg-blue-600 text-white text-xs font-bold px-1 py-0.5 rounded">
              #{content.rank}
            </span>
            <span className="font-medium text-xs text-yellow-400 truncate max-w-20">
              {content.playerName}
            </span>
          </div>
        </div>

        {/* Compact Points Display */}
        <div className="mt-1 text-center">
          <div className="text-white text-xs font-bold">
            {content.points.toFixed(1)} pts
          </div>
          {pointsGainedToday !== 0 && (
            <div className={`text-xs ${gainColor}`}>
              {pointsGainedToday > 0 ? '+' : ''}{pointsGainedToday.toFixed(1)} {gainIcon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tooltip;