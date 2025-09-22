import React from 'react';
import { DetailedRanking } from '../DetailedRanking';
import type { Player, Leaderboard } from '../../types';

// Mock data for the example
const mockLeaderboard: Leaderboard = {
  _id: 'example-leaderboard',
  title: 'Championship Chicken Race 2024',
  description: 'Annual championship with top competitors',
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
};

const createExamplePlayer = (id: number, overrides: Partial<Player> = {}): Player => ({
  _id: `example-player-${id}`,
  player: `example-player-${id}`,
  name: `Player ${id}`,
  position: id,
  total: Math.max(50, 2000 - (id * 75) + Math.floor(Math.random() * 200)),
  previous_position: id + (Math.random() > 0.5 ? 1 : -1),
  previous_total: Math.max(25, 1900 - (id * 75) + Math.floor(Math.random() * 150)),
  move: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'down' : 'same',
  ...overrides,
});

// Generate example players with realistic data
const examplePlayers: Player[] = [
  createExamplePlayer(1, { 
    name: 'Lightning McChicken', 
    total: 2500, 
    move: 'up',
    previous_position: 3 
  }),
  createExamplePlayer(2, { 
    name: 'Feather Dash', 
    total: 2350, 
    move: 'same',
    previous_position: 2 
  }),
  createExamplePlayer(3, { 
    name: 'Clucky Champion', 
    total: 2200, 
    move: 'down',
    previous_position: 1 
  }),
  createExamplePlayer(4, { 
    name: 'Speedy Gonzales Chicken', 
    total: 2100, 
    move: 'up',
    previous_position: 6 
  }),
  createExamplePlayer(5, { 
    name: 'Turbo Rooster', 
    total: 1950, 
    move: 'up',
    previous_position: 7 
  }),
  createExamplePlayer(6, { 
    name: 'Flash Fowl', 
    total: 1800, 
    move: 'down',
    previous_position: 4 
  }),
  createExamplePlayer(7, { 
    name: 'Rocket Hen', 
    total: 1650, 
    move: 'down',
    previous_position: 5 
  }),
  createExamplePlayer(8, { 
    name: 'Zoom Chick', 
    total: 1500, 
    move: 'same',
    previous_position: 8 
  }),
  createExamplePlayer(9, { 
    name: 'Rapid Runner', 
    total: 1350, 
    move: 'up',
    previous_position: 12 
  }),
  createExamplePlayer(10, { 
    name: 'Swift Striker', 
    total: 1200, 
    move: 'up',
    previous_position: 11 
  }),
  // Add more players to demonstrate pagination
  ...Array.from({ length: 25 }, (_, i) => 
    createExamplePlayer(i + 11, { 
      name: `Competitor ${i + 11}`,
      total: 1150 - (i * 30),
    })
  ),
];

/**
 * Example component demonstrating the DetailedRanking component
 * 
 * This example shows:
 * - Complete player rankings in a table format
 * - Search functionality for finding specific players
 * - Sortable columns for different data fields
 * - Pagination for handling large player lists
 * - Visual consistency with chicken race theme
 * - Loading states and empty states
 */
export const DetailedRankingExample: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [players, setPlayers] = React.useState(examplePlayers);

  const handleRefreshData = () => {
    setIsLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      // Shuffle some positions to show dynamic updates
      const shuffledPlayers = [...examplePlayers].map(player => ({
        ...player,
        total: player.total + Math.floor(Math.random() * 100) - 50,
      })).sort((a, b) => b.total - a.total).map((player, index) => ({
        ...player,
        position: index + 1,
      }));
      
      setPlayers(shuffledPlayers);
      setIsLoading(false);
    }, 1500);
  };

  const handleClearData = () => {
    setPlayers([]);
  };

  const handleRestoreData = () => {
    setPlayers(examplePlayers);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            DetailedRanking Component Example
          </h1>
          <p className="text-gray-600 mb-6">
            This example demonstrates the DetailedRanking component with comprehensive 
            player data, search functionality, sorting capabilities, and pagination.
          </p>
          
          {/* Control buttons */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={handleRefreshData}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Clear Data (Empty State)
            </button>
            <button
              onClick={handleRestoreData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Restore Data
            </button>
          </div>

          {/* Feature highlights */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Features Demonstrated:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Search:</strong> Try searching for player names, positions, or point values</li>
              <li>• <strong>Sorting:</strong> Click column headers to sort by position, name, points, or movement</li>
              <li>• <strong>Pagination:</strong> Navigate through multiple pages of players (20 per page)</li>
              <li>• <strong>Visual Theme:</strong> Chicken avatars and consistent styling with race theme</li>
              <li>• <strong>Movement Indicators:</strong> See which players moved up, down, or stayed the same</li>
              <li>• <strong>Responsive Design:</strong> Table adapts to different screen sizes</li>
            </ul>
          </div>
        </div>

        {/* DetailedRanking Component */}
        <DetailedRanking
          players={players}
          currentLeaderboard={mockLeaderboard}
          isLoading={isLoading}
        />

        {/* Additional information */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Component Usage:</h3>
          <pre className="text-sm text-gray-700 bg-white p-4 rounded border overflow-x-auto">
{`<DetailedRanking
  players={players}
  currentLeaderboard={leaderboard}
  isLoading={false}
/>`}
          </pre>
          
          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Props:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <code>players</code>: Array of Player objects to display</li>
              <li>• <code>currentLeaderboard</code>: Current leaderboard information (can be null)</li>
              <li>• <code>isLoading</code>: Optional boolean to show loading state</li>
            </ul>
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-gray-900 mb-2">Key Features:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Real-time search across player names, positions, and points</li>
              <li>• Multi-column sorting with visual indicators</li>
              <li>• Pagination for handling large datasets (20 items per page)</li>
              <li>• Responsive design that works on mobile and desktop</li>
              <li>• Loading states and empty state handling</li>
              <li>• Accessibility features including proper ARIA labels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedRankingExample;