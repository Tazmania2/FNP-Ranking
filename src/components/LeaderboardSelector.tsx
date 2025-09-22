import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ClockIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import { useLeaderboards, useCurrentLeaderboardId } from '../store/leaderboardStore';
import { useAutoCycle } from '../store/uiStore';
import { appStoreActions } from '../store/appStore';
interface LeaderboardSelectorProps {
  onLeaderboardChange?: (_leaderboardId: string) => void;
  className?: string;
}

export const LeaderboardSelector: React.FC<LeaderboardSelectorProps> = ({
  onLeaderboardChange,
  className = '',
}) => {
  const leaderboards = useLeaderboards();
  const currentLeaderboardId = useCurrentLeaderboardId();
  const autoCycle = useAutoCycle();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Update countdown timer
  useEffect(() => {
    if (!autoCycle.isEnabled || autoCycle.nextSwitchTime === 0) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, autoCycle.nextSwitchTime - Date.now());
      setTimeRemaining(remaining);
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [autoCycle.isEnabled, autoCycle.nextSwitchTime]);

  const handleLeaderboardSelect = (leaderboardId: string) => {
    if (leaderboardId !== currentLeaderboardId) {
      appStoreActions.switchToLeaderboard(leaderboardId);
      onLeaderboardChange?.(leaderboardId);
    }
    setIsDropdownOpen(false);
  };

  const handleAutoCycleToggle = () => {
    appStoreActions.setAutoCycling(!autoCycle.isEnabled);
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentLeaderboard = leaderboards.find(lb => lb._id === currentLeaderboardId);
  const canAutoCycle = leaderboards.length > 1;

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 ${className}`}>
      {/* Leaderboard Dropdown */}
      <div className="relative flex-1 sm:flex-initial" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={isDropdownOpen}
        >
          <span className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-32 sm:max-w-48">
            {currentLeaderboard?.title || 'Select Leaderboard'}
          </span>
          <ChevronDownIcon 
            className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
              isDropdownOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 sm:left-0 sm:right-auto mt-1 w-full sm:min-w-64 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
            <div className="py-1 max-h-60 overflow-y-auto">
              {leaderboards.map((leaderboard) => (
                <button
                  key={leaderboard._id}
                  onClick={() => handleLeaderboardSelect(leaderboard._id)}
                  className={`w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 transition-colors ${
                    leaderboard._id === currentLeaderboardId
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}
                  role="option"
                  aria-selected={leaderboard._id === currentLeaderboardId}
                >
                  <div className="truncate">{leaderboard.title}</div>
                  {leaderboard.description && (
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {leaderboard.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Auto-Cycle Toggle */}
      {canAutoCycle && (
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <button
            onClick={handleAutoCycleToggle}
            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              autoCycle.isEnabled
                ? 'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500'
            }`}
            title={autoCycle.isEnabled ? 'Disable auto-cycle' : 'Enable auto-cycle'}
          >
            {autoCycle.isEnabled ? (
              <PauseIcon className="w-3 sm:w-4 h-3 sm:h-4" />
            ) : (
              <PlayIcon className="w-3 sm:w-4 h-3 sm:h-4" />
            )}
            <span className="hidden sm:inline">Auto Cycle</span>
            <span className="sm:hidden">Auto</span>
          </button>

          {/* Countdown Timer */}
          {autoCycle.isEnabled && timeRemaining > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono">
              <ClockIcon className="w-3 h-3" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
          )}

          {/* Auto-Cycle Status Indicator */}
          {autoCycle.isEnabled && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="hidden sm:inline">
                {autoCycle.currentIndex + 1} of {leaderboards.length}
              </span>
              <span className="sm:hidden">
                {autoCycle.currentIndex + 1}/{leaderboards.length}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardSelector;