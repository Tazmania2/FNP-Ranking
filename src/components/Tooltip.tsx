import React, { useEffect, useRef } from 'react';
import type { TooltipContent } from '../types';

interface TooltipProps {
  isVisible: boolean;
  position: { x: number; y: number };
  content: TooltipContent | null;
  onClose?: () => void;
  isFixed?: boolean; // New prop to indicate fixed positioning
}

export const Tooltip: React.FC<TooltipProps> = ({
  isVisible,
  position,
  content,
  onClose,
  isFixed = false,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Auto-hide tooltip after 5 seconds (only for non-fixed tooltips)
  useEffect(() => {
    if (isVisible && content && !isFixed) {
      const timer = setTimeout(() => {
        onClose?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, content, onClose, isFixed]);

  // Get tooltip position based on type (fixed or hover)
  const getTooltipPosition = () => {
    if (isFixed) {
      // Fixed position: bottom left corner
      return {
        x: 16, // 16px from left
        y: 16, // 16px from bottom
        isAbove: false,
        isFixed: true
      };
    }

    // Hover tooltip positioning (existing logic)
    if (!tooltipRef.current) return { ...position, isAbove: false };

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const container = tooltipRef.current.parentElement;
    if (!container) return { ...position, isAbove: false };

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

    return { x: adjustedX, y: adjustedY, isAbove };
  };

  if (!isVisible || !content) {
    return null;
  }

  const tooltipPosition = getTooltipPosition();
  const isAbove = tooltipPosition.isAbove || false;

  // Calculate points gained today (difference between current and previous total)
  const pointsGainedToday = content.pointsGainedToday || 0;

  const containerStyle = isFixed ? {
    // Fixed position: bottom left corner of the race container
    left: `${tooltipPosition.x}px`,
    bottom: `${tooltipPosition.y}px`,
  } : {
    // Hover position: relative to chicken
    left: `${tooltipPosition.x}px`,
    top: `${tooltipPosition.y}px`,
    transform: 'translateX(-50%)', // Center horizontally on the position
  };

  return (
    <div
      ref={tooltipRef}
      className={`tooltip-container absolute pointer-events-none ${isFixed ? 'z-40' : 'z-50'}`}
      style={containerStyle}
    >
      {/* Tooltip Arrow - only for hover tooltips */}
      {!isFixed && (
        <>
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
        </>
      )}

      {/* Tooltip Content */}
      <div className={`tooltip-content bg-gray-900/90 text-white rounded shadow-sm backdrop-blur-sm border border-gray-700/50 ${
        isFixed 
          ? 'px-3 py-2 text-sm min-w-32 max-w-40' // Larger for fixed tooltip
          : 'px-1.5 py-1 text-xs min-w-24 max-w-32 mx-1' // Smaller for hover tooltip
      }`}>
        {/* Tooltip content */}
        <div className={isFixed ? 'text-left' : 'text-center'}>
          <div className="text-yellow-300 font-medium truncate">
            {content.playerName}
          </div>
          <div className="text-white">
            #{content.rank} • {content.points.toFixed(1)}pts
          </div>
          {isFixed && pointsGainedToday !== 0 && (
            <div className={`text-xs mt-1 ${
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