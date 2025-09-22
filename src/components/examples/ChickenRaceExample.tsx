import React, { useState, useEffect } from 'react';
import { ChickenRace } from '../ChickenRace';
import type { Player } from '../../types';

// Mock data for demonstration
const generateMockPlayers = (count: number): Player[] => {
  const names = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
    'Ivy', 'Jack', 'Kate', 'Liam', 'Maya', 'Noah', 'Olivia', 'Paul'
  ];

  const players: Player[] = [];
  
  for (let i = 0; i < count; i++) {
    const baseScore = Math.floor(Math.random() * 100) + 50;
    players.push({
      _id: `player_${i + 1}`,
      player: `player${i + 1}`,
      name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
      position: i + 1,
      total: baseScore,
      previous_position: i + 1 + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0),
      previous_total: baseScore - Math.floor(Math.random() * 20),
      move: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'down' : 'same',
    });
  }

  // Sort by total score descending and assign correct positions
  players.sort((a, b) => b.total - a.total);
  players.forEach((player, index) => {
    player.position = index + 1;
  });

  // Create some ties for demonstration
  if (players.length >= 4) {
    players[2].total = players[1].total; // Tie for 2nd place
    players[2].position = players[1].position;
  }

  return players;
};

const ChickenRaceExample: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playerCount, setPlayerCount] = useState(8);
  const [leaderboardTitle, setLeaderboardTitle] = useState('Demo Championship');

  // Simulate loading and data generation
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setPlayers(generateMockPlayers(playerCount));
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [playerCount]);

  // Simulate real-time updates
  useEffect(() => {
    if (isLoading || players.length === 0) return;

    const updateInterval = setInterval(() => {
      setPlayers(currentPlayers => {
        const updatedPlayers = currentPlayers.map(player => {
          // Randomly update some players' scores
          if (Math.random() > 0.8) {
            const change = Math.floor(Math.random() * 10) - 5; // -5 to +5 points
            return {
              ...player,
              previous_total: player.total,
              total: Math.max(0, player.total + change),
            };
          }
          return player;
        });

        // Re-sort and update positions
        updatedPlayers.sort((a, b) => b.total - a.total);
        updatedPlayers.forEach((player, index) => {
          player.previous_position = player.position;
          player.position = index + 1;
          
          // Update move indicator
          if (player.previous_position && player.previous_position !== player.position) {
            player.move = player.previous_position > player.position ? 'up' : 'down';
          } else {
            player.move = 'same';
          }
        });

        return updatedPlayers;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(updateInterval);
  }, [isLoading, players.length]);

  const handleRefresh = () => {
    setPlayers(generateMockPlayers(playerCount));
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
  };

  return (
    <div className="chicken-race-example p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🐔 Chicken Race Component Demo
        </h1>
        <p className="text-gray-600 mb-4">
          This demonstrates the ChickenRace component with various features including
          positioning logic, animations, tied scores, and responsive design.
        </p>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2">
            <label htmlFor="playerCount" className="text-sm font-medium">
              Player Count:
            </label>
            <select
              id="playerCount"
              value={playerCount}
              onChange={(e) => handlePlayerCountChange(Number(e.target.value))}
              className="px-3 py-1 border rounded"
            >
              <option value={3}>3 Players</option>
              <option value={5}>5 Players</option>
              <option value={8}>8 Players</option>
              <option value={12}>12 Players</option>
              <option value={16}>16 Players</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="title" className="text-sm font-medium">
              Race Title:
            </label>
            <input
              id="title"
              type="text"
              value={leaderboardTitle}
              onChange={(e) => setLeaderboardTitle(e.target.value)}
              className="px-3 py-1 border rounded"
              placeholder="Enter race title"
            />
          </div>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Refresh Race
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-green-600 mb-2">✅ Positioning Logic</h3>
            <p className="text-sm text-gray-600">
              First place positioned furthest right, with proper ranking distribution
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-blue-600 mb-2">🎯 Tied Scores</h3>
            <p className="text-sm text-gray-600">
              Players with same scores aligned horizontally, spread vertically
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-purple-600 mb-2">🎨 4-Axis Animation</h3>
            <p className="text-sm text-gray-600">
              Subtle movement on X, Y, rotation, and scale for lifelike motion
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-orange-600 mb-2">📱 Responsive</h3>
            <p className="text-sm text-gray-600">
              Adapts to different screen sizes with mobile-friendly design
            </p>
          </div>
        </div>
      </div>

      {/* Main Component */}
      <ChickenRace
        players={players}
        leaderboardTitle={leaderboardTitle}
        isLoading={isLoading}
      />

      {/* Implementation Notes */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Implementation Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Positioning Algorithm</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Horizontal position based on rank (85% to 15% range)</li>
              <li>• Tied players aligned at same X position</li>
              <li>• Randomized Y positions for natural appearance</li>
              <li>• Smooth transitions between position changes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Animation System</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 60fps animation loop using setInterval</li>
              <li>• Unique animation per player based on ID</li>
              <li>• Subtle 4-axis movement (X, Y, rotation, scale)</li>
              <li>• CSS transitions for position changes</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Players Debug Info */}
      {!isLoading && players.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-lg border">
          <h4 className="font-medium mb-3">Current Race Data</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            {players.slice(0, 6).map((player) => (
              <div key={player._id} className="flex justify-between p-2 bg-gray-50 rounded">
                <span className="font-medium">{player.name}</span>
                <span className="text-gray-600">
                  #{player.position} - {player.total}pts
                  {player.move === 'up' && ' ↗️'}
                  {player.move === 'down' && ' ↘️'}
                  {player.move === 'same' && ' ➡️'}
                </span>
              </div>
            ))}
            {players.length > 6 && (
              <div className="text-gray-500 text-center p-2">
                ... and {players.length - 6} more players
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChickenRaceExample;