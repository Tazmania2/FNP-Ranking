import React, { useEffect } from 'react';
import { LeaderboardSelector } from '../LeaderboardSelector';
import { appStoreActions } from '../../store/appStore';
import { useAppState } from '../../store/appStore';
import type { Leaderboard } from '../../types';

// Mock leaderboards for demonstration
const mockLeaderboards: Leaderboard[] = [
  {
    _id: 'lb1',
    title: 'Weekly Challenge',
    description: 'Weekly leaderboard for challenges',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 7,
      timeScale: 1,
    },
  },
  {
    _id: 'lb2',
    title: 'Monthly Competition',
    description: 'Monthly leaderboard for competitions',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 30,
      timeScale: 1,
    },
  },
  {
    _id: 'lb3',
    title: 'Daily Sprint',
    description: 'Daily leaderboard for sprints',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 1,
      timeScale: 1,
    },
  },
];

/**
 * Example component demonstrating LeaderboardSelector usage
 */
export const LeaderboardSelectorExample: React.FC = () => {
  const { currentLeaderboard, isInitialized } = useAppState();

  // Initialize the app with mock leaderboards
  useEffect(() => {
    if (!isInitialized) {
      appStoreActions.initializeApp(mockLeaderboards);
    }
  }, [isInitialized]);

  const handleLeaderboardChange = (leaderboardId: string) => {
    console.log('Leaderboard changed to:', leaderboardId);
    // Here you would typically fetch new leaderboard data
    // For example: fetchLeaderboardData(leaderboardId);
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading leaderboards...</div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Leaderboard Selector Example
        </h1>

        {/* LeaderboardSelector Component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Leaderboard Selector
          </h2>
          <LeaderboardSelector
            onLeaderboardChange={handleLeaderboardChange}
            className="mb-4"
          />
          
          {/* Current Selection Display */}
          {currentLeaderboard && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">
                Current Selection:
              </h3>
              <div className="text-blue-800">
                <div className="font-semibold">{currentLeaderboard.title}</div>
                <div className="text-sm text-blue-600 mt-1">
                  {currentLeaderboard.description}
                </div>
                <div className="text-xs text-blue-500 mt-2">
                  ID: {currentLeaderboard._id}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Usage Instructions
          </h2>
          <div className="space-y-4 text-gray-600">
            <div>
              <h3 className="font-medium text-gray-800">Dropdown Selection:</h3>
              <p className="text-sm">
                Click the dropdown to see all available leaderboards. Select any leaderboard to switch to it immediately.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Auto-Cycle Feature:</h3>
              <p className="text-sm">
                Toggle the "Auto Cycle" button to automatically rotate between leaderboards every 5 minutes. 
                The countdown timer shows time remaining until the next switch.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">Status Indicator:</h3>
              <p className="text-sm">
                When auto-cycling is enabled, you'll see a pulsing indicator showing the current position 
                (e.g., "2 of 3") in the rotation cycle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardSelectorExample;