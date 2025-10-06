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

  // Adjust tooltip position to stay within the race container
  const getAdjustedPosition = () => {
    if (!tooltipRef.current) return position;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const container = tooltipRef.current.parentElement;
    if (!container) return position;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    let { x, y } = position;

    // Convert percentage positions to pixels within the container
    const pixelX = (x / 100) * containerWidth;
    const pixelY = (y / 100) * containerHeight;

    // Adjust horizontal position if tooltip would overflow container
    let adjustedX = pixelX;
    if (pixelX + rect.width > containerWidth) {
      adjustedX = containerWidth - rect.width - 10;
    }
    if (adjustedX < 10) {
      adjustedX = 10;
    }

    // Adjust vertical position - position below the chicken by default
    let adjustedY = pixelY + 40; // Position below the chicken by default (40px below)
    let isAbove = false;
    
    // If tooltip would overflow bottom, position above instead
    if (adjustedY + rect.height > containerHeight - 10) {
      adjustedY = pixelY - rect.height - 10; // Position above
      isAbove = true;
    }
    
    // Ensure tooltip stays within container bounds
    if (adjustedY < 10) {
      adjustedY = 10;
      isAbove = false;
    }

    // Debug logging
    console.log('🎯 Tooltip positioning:', {
      original: { x: position.x, y: position.y },
      pixels: { x: pixelX, y: pixelY },
      adjusted: { x: adjustedX, y: adjustedY },
      isAbove,
      containerSize: { width: containerWidth, height: containerHeight }
    });

    return { x: adjustedX, y: adjustedY, isAbove };
  };

  if (!isVisible || !content) {
    return null;
  }

  const adjustedPosition = getAdjustedPosition();
  const isAbove = (adjustedPosition as any).isAbove || false;

  // Calculate points gained today (difference between current and previous total)
  const pointsGainedToday = content.pointsGainedToday || 0;
  const gainColor = pointsGainedToday > 0 ? 'text-green-600' : 
                   pointsGainedToday < 0 ? 'text-red-600' : 'text-gray-600';
  const gainIcon = pointsGainedToday > 0 ? '↗️' : 
                  pointsGainedToday < 0 ? '↘️' : '➡️';

  return (
    <div
      ref={tooltipRef}
      className="tooltip-container absolute z-50 pointer-events-none"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        transform: 'translateX(-50%)', // Center horizontally on the position
      }}
    >
      {/* Tooltip Arrow - dynamic based on position */}
      {isAbove ? (
        // Arrow pointing down when tooltip is above chicken
        <div className="tooltip-arrow absolute -bottom-1 left-1/2 transform -translate-x-1/2">
          <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
        </div>
      ) : (
        // Arrow pointing up when tooltip is below chicken
        <div className="tooltip-arrow absolute -top-1 left-1/2 transform -translate-x-1/2">
          <div className="w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent border-b-gray-900"></div>
        </div>
      )}

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