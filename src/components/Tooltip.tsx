import React, { useEffect, useRef } from 'react';
import type { TooltipContent } from '../types';

interface TooltipProps {
  isVisible: boolean;
  position: { x: number; y: number };
  content: TooltipContent | null;
  onClose?: () => void;
  isFixed?: boolean; // New prop to indicate fixed positioning
  autoHideDelay?: number | null;
}

export const Tooltip: React.FC<TooltipProps> = ({
  isVisible,
  position,
  content,
  onClose,
  isFixed = false,
  autoHideDelay,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  const effectiveHideDelay = autoHideDelay !== undefined
    ? autoHideDelay
    : (isFixed ? null : 5000);

  // Auto-hide tooltip when applicable
  useEffect(() => {
    if (!isVisible || !content) return;
    if (effectiveHideDelay === null) return;

    const timer = setTimeout(() => {
      onClose?.();
    }, effectiveHideDelay);

    return () => clearTimeout(timer);
  }, [isVisible, content, onClose, effectiveHideDelay]);

  type TooltipPlacement = 'below' | 'above' | 'left' | 'right';

  interface TooltipGeometry {
    placement: TooltipPlacement;
    top: number;
    centerX?: number;
    left?: number;
    arrowOffset: number;
    isFallback?: boolean;
  }

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const getTooltipGeometry = (): TooltipGeometry => {
    const tooltipEl = tooltipRef.current;
    const container = tooltipEl?.parentElement;

    if (!tooltipEl || !container) {
      return {
        placement: 'below',
        top: position.y,
        centerX: position.x,
        arrowOffset: 0,
        isFallback: true,
      };
    }

    const { width: containerWidth, height: containerHeight } = container.getBoundingClientRect();
    const { width: tooltipWidth, height: tooltipHeight } = tooltipEl.getBoundingClientRect();

    const margin = 12;
    const anchorX = (position.x / 100) * containerWidth;
    const anchorY = (position.y / 100) * containerHeight;

    let placement: TooltipPlacement = 'below';
    let top = anchorY + 36; // Prefer below with subtle offset
    let centerX = clamp(
      anchorX,
      margin + tooltipWidth / 2,
      Math.max(margin + tooltipWidth / 2, containerWidth - margin - tooltipWidth / 2)
    );

    const maxVertical = containerHeight - margin - tooltipHeight;
    if (maxVertical < margin) {
      top = clamp(anchorY, 0, containerHeight - tooltipHeight);
    }

    if (top + tooltipHeight > containerHeight - margin) {
      const aboveTop = anchorY - tooltipHeight - 16;
      if (aboveTop >= margin) {
        top = aboveTop;
        placement = 'above';
      } else {
        const sideTop = clamp(anchorY - tooltipHeight / 2, margin, maxVertical);
        const spaceRight = containerWidth - anchorX;
        const spaceLeft = anchorX;

        if (spaceRight >= tooltipWidth + 32) {
          placement = 'right';
          top = sideTop;
        } else if (spaceLeft >= tooltipWidth + 32) {
          placement = 'left';
          top = sideTop;
        } else {
          top = clamp(containerHeight - margin - tooltipHeight, margin, maxVertical);
        }
      }
    }

    top = clamp(top, margin, maxVertical);

    if (placement === 'left') {
      const leftEdge = clamp(anchorX - tooltipWidth - 20, margin, containerWidth - margin - tooltipWidth);
      const arrowOffset = clamp(anchorY - top, 8, Math.max(8, tooltipHeight - 8));
      return { placement, top, left: leftEdge, arrowOffset };
    }

    if (placement === 'right') {
      const leftEdge = clamp(anchorX + 20, margin, containerWidth - margin - tooltipWidth);
      const arrowOffset = clamp(anchorY - top, 8, Math.max(8, tooltipHeight - 8));
      return { placement, top, left: leftEdge, arrowOffset };
    }

    const halfWidth = tooltipWidth / 2;
    const leftEdge = centerX - halfWidth;
    const arrowOffset = clamp(anchorX - leftEdge, 8, Math.max(8, tooltipWidth - 8));

    return { placement, top, centerX, arrowOffset };
  };

  if (!isVisible || !content) {
    return null;
  }

  const geometry = getTooltipGeometry();

  // Calculate points gained today (difference between current and previous total)
  const pointsGainedToday = content.pointsGainedToday || 0;

  let containerStyle: React.CSSProperties;
  if (geometry.isFallback) {
    containerStyle = {
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
    };
  } else if (geometry.placement === 'left' || geometry.placement === 'right') {
    containerStyle = {
      left: `${geometry.left}px`,
      top: `${geometry.top}px`,
    };
  } else {
    containerStyle = {
      left: `${geometry.centerX}px`,
      top: `${geometry.top}px`,
      transform: 'translateX(-50%)',
    };
  }

  const renderArrow = () => {
    if (geometry.isFallback) {
      return null;
    }

    switch (geometry.placement) {
      case 'above':
        return (
          <div
            className="tooltip-arrow absolute -bottom-1"
            style={{ left: `${geometry.arrowOffset}px`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900" />
          </div>
        );
      case 'below':
        return (
          <div
            className="tooltip-arrow absolute -top-1"
            style={{ left: `${geometry.arrowOffset}px`, transform: 'translateX(-50%)' }}
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-900" />
          </div>
        );
      case 'left':
        return (
          <div
            className="tooltip-arrow absolute -right-1"
            style={{ top: `${geometry.arrowOffset}px`, transform: 'translateY(-50%)' }}
          >
            <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-900" />
          </div>
        );
      case 'right':
        return (
          <div
            className="tooltip-arrow absolute -left-1"
            style={{ top: `${geometry.arrowOffset}px`, transform: 'translateY(-50%)' }}
          >
            <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-gray-900" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={tooltipRef}
      className={`tooltip-container absolute pointer-events-none ${isFixed ? 'z-40' : 'z-50'}`}
      style={containerStyle}
    >
      {renderArrow()}

      {/* Tooltip Content */}
      <div className={`tooltip-content bg-gray-900/90 text-white rounded shadow-sm backdrop-blur-sm border border-gray-700/50 ${
        isFixed
          ? 'px-2.5 py-2 text-xs sm:text-sm min-w-28 max-w-40'
          : 'px-1.5 py-1 text-xs min-w-24 max-w-32 mx-1'
      }`}>
        {/* Tooltip content */}
        <div className={isFixed ? 'text-left space-y-0.5' : 'text-center'}>
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