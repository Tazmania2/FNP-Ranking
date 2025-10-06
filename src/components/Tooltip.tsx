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

      {/* Tooltip Content - Very discrete version */}
      <div className="tooltip-content bg-gray-900/90 text-white rounded px-1.5 py-1 shadow-sm text-xs min-w-24 max-w-32 mx-1 backdrop-blur-sm border border-gray-700/50">
        {/* Very compact info */}
        <div className="text-center">
          <div className="text-yellow-300 font-medium text-xs truncate">
            {content.playerName}
          </div>
          <div className="text-white text-xs">
            #{content.rank} • {content.points.toFixed(1)}pts
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tooltip;