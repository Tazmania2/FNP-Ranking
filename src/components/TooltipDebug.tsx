import React, { useState } from 'react';
import Tooltip from './Tooltip';
import type { TooltipContent } from '../types';

export const TooltipDebug: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const sampleContent: TooltipContent = {
    rank: 1,
    points: 125.5,
    pointsGainedToday: 15.2,
    playerName: 'Test Player',
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    setPosition({ x, y });
    setShowTooltip(true);
    
    // Auto-hide after 5 seconds
    setTimeout(() => setShowTooltip(false), 5000);
  };

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Tooltip Debug</h2>
      <div 
        className="relative w-full h-96 bg-gradient-to-b from-sky-200 to-green-200 rounded-lg border-2 border-gray-300 cursor-pointer"
        onClick={handleClick}
      >
        <div className="absolute inset-4 flex items-center justify-center text-gray-600">
          Click anywhere to show tooltip
        </div>
        
        {/* Sample chicken */}
        <div 
          className="absolute w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl"
          style={{ left: `${position.x}%`, top: `${position.y}%`, transform: 'translate(-50%, -50%)' }}
        >
          🐓
        </div>

        <Tooltip
          isVisible={showTooltip}
          position={position}
          content={sampleContent}
          onClose={() => setShowTooltip(false)}
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Current position: {position.x.toFixed(1)}%, {position.y.toFixed(1)}%</p>
        <p>Tooltip visible: {showTooltip ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default TooltipDebug;