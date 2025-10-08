import React from 'react';
import type { TooltipContent } from '../types';

interface HoverTooltipProps {
  isVisible: boolean;
  content: TooltipContent | null;
}

export const HoverTooltip: React.FC<HoverTooltipProps> = ({
  isVisible,
  content,
}) => {
  if (!isVisible || !content) {
    return null;
  }

  // Calculate points gained today
  const pointsGainedToday = content.pointsGainedToday || 0;

  return (
    <div className="hover-tooltip-overlay absolute inset-0 z-60 pointer-events-none flex items-center justify-center">
      {/* Overlay background */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
      
      {/* Tooltip content - centered */}
      <div className="relative bg-gray-900/95 text-white rounded-lg px-4 py-3 shadow-xl border border-gray-700/50 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-yellow-300 font-bold text-lg mb-1">
            {content.playerName}
          </div>
          <div className="text-white text-base mb-2">
            Posição #{content.rank}
          </div>
          <div className="text-white text-xl font-bold mb-1">
            {content.points.toFixed(1)} pontos
          </div>
          {pointsGainedToday !== 0 && (
            <div className={`text-sm ${
              pointsGainedToday > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {pointsGainedToday > 0 ? '+' : ''}{pointsGainedToday.toFixed(1)} pontos hoje
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoverTooltip;