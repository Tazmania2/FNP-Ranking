import React, { useState, useEffect } from 'react';
import { Sidebar } from '../Sidebar';
import type { Player, Leaderboard } from '../../types';

// Mock data for demonstration
const mockLeaderboard: Leaderboard = {
  _id: 'demo-leaderboard',
  title: 'Chicken Race Championship 2024',
  description: 'Annual chicken racing competition',
  principalType: 0,
  operation: {
    type: 1,
    achievement_type: 1,
    item: 'race_points',
    sort: -1,
  },
  period: {
    type: 1,
    timeAmount: 30,
    timeScale: 1,
  },
};

const generateMockPlayers = (): Player[] => [
  {
    _id: 'player-1',
    player: 'player-1',
    name: 'Lightning McChicken',
    position: 1,
    total: 2500,
    previous_position: 3,
    previous_total: 2200,
    move: 'up',
  },
  {
    _id: 'player-2',
    player: 'player-2',
    name: 'Speedy Gonzales Hen',
    position: 2,
    total: 2300,
    previous_position: 1,
    previous_total: 2400,
    move: 'down',
  },
  {
    _id: 'player-3',
    player: 'player-3',
    name: 'Turbo Rooster',
    position: 3,
    total: 2100,
    previous_position: 2,
    previous_total: 2150,
    move: 'down',
  },
  {
    _id: 'player-4',
    player: 'player-4',
    name: 'Flash Feathers',
    position: 4,
    total: 1900,
    previous_position: 4,
    previous_total: 1850,
    move: 'same',
  },
  {
    _id: 'player-5',
    player: 'player-5',
    name: 'Rocket Chick',
    position: 5,
    total: 1700,
    previous_position: 6,
    previous_total: 1600,
    move: 'up',
  },
  {
    _id: 'player-6',
    player: 'player-6',
    name: 'Zoom Bantam',
    position: 6,
    total: 1500,
    previous_position: 5,
    previous_total: 1650,
    move: 'down',
  },
  {
    _id: 'player-7',
    player: 'player-7',
    name: 'Swift Silkie',
    position: 7,
    total: 1300,
  },
  {
    _id: 'player-8',
    player: 'player-8',
    name: 'Rapid Rhode Island',
    position: 8,
    total: 1100,
  },
];

export const SidebarExample: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>(generateMockPlayers());
  const [isLoading, setIsLoading] = useState(false);
  const [totalPlayers] = useState(15); // Simulating more players than displayed

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(currentPlayers => {
        return currentPlayers.map(player => {
          // Randomly adjust points to simulate real-time changes
          const pointChange = Math.floor(Math.random() * 100) - 50; // -50 to +50
          const newTotal = Math.max(0, player.total + pointChange);
          
          return {
            ...player,
            previous_total: player.total,
            total: newTotal,
          };
        }).sort((a, b) => b.total - a.total) // Re-sort by points
          .map((player, index) => ({
            ...player,
            previous_position: player.position,
            position: index + 1,
            move: player.previous_position 
              ? (player.previous_position > index + 1 ? 'up' 
                 : player.previous_position < index + 1 ? 'down' 
                 : 'same')
              : undefined,
          }));
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setPlayers(generateMockPlayers());
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Sidebar Component Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Displays top 5 players with chicken avatars, real-time updates, and movement indicators
          </p>
          
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Main Sidebar */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
                Standard Sidebar
              </h2>
              <Sidebar
                topPlayers={players}
                currentLeaderboard={mockLeaderboard}
                totalPlayers={totalPlayers}
                isLoading={isLoading}
              />
            </div>

            {/* Sidebar without leaderboard title */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
                Without Leaderboard Title
              </h2>
              <Sidebar
                topPlayers={players}
                currentLeaderboard={null}
                totalPlayers={totalPlayers}
                isLoading={isLoading}
              />
            </div>

            {/* Empty state example */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-700">
                Empty State
              </h2>
              <Sidebar
                topPlayers={[]}
                currentLeaderboard={mockLeaderboard}
                totalPlayers={0}
                isLoading={false}
              />
            </div>
          </div>
        </div>

        {/* Features showcase */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Sidebar Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                🐔 Chicken Avatars
              </h3>
              <p className="text-sm text-gray-600">
                Each player gets a unique chicken face emoji as their avatar, 
                cycling through different chicken-related emojis.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                🏆 Position Badges
              </h3>
              <p className="text-sm text-gray-600">
                Color-coded position badges: Gold for 1st, Silver for 2nd, 
                Bronze for 3rd, and Blue for others.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                📊 Movement Indicators
              </h3>
              <p className="text-sm text-gray-600">
                Shows position changes with arrows: ↗️ for up, ↘️ for down, 
                ➡️ for no change.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                🔢 Smart Formatting
              </h3>
              <p className="text-sm text-gray-600">
                Points are formatted for readability: 1.5K for thousands, 
                1.2M for millions.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                ⚡ Real-time Updates
              </h3>
              <p className="text-sm text-gray-600">
                Automatically updates when player data changes, with smooth 
                transitions and loading states.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">
                📱 Responsive Design
              </h3>
              <p className="text-sm text-gray-600">
                Optimized for different screen sizes with proper spacing 
                and hover effects.
              </p>
            </div>
          </div>
        </div>

        {/* Current data display */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Current Player Data
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Position</th>
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Points</th>
                  <th className="text-left p-2">Previous</th>
                  <th className="text-left p-2">Movement</th>
                </tr>
              </thead>
              <tbody>
                {players.slice(0, 8).map((player) => (
                  <tr key={player._id} className="border-b">
                    <td className="p-2">{player.position}</td>
                    <td className="p-2">{player.name}</td>
                    <td className="p-2">{player.total.toLocaleString()}</td>
                    <td className="p-2">{player.previous_position || '-'}</td>
                    <td className="p-2">
                      {player.move === 'up' && '↗️ Up'}
                      {player.move === 'down' && '↘️ Down'}
                      {player.move === 'same' && '➡️ Same'}
                      {!player.move && '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarExample;