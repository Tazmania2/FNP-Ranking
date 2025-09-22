import React, { useEffect } from 'react';
import { useChickenRaceApp } from '../../hooks';
import type { Leaderboard } from '../../types';

// Example component demonstrating how to use the state management system
const StateManagementExample: React.FC = () => {
  const {
    // State
    leaderboards,
    currentLeaderboard,
    players,
    loading,
    error,
    autoCycle,
    isInitialized,
    hasLeaderboards,
    hasPlayers,
    canAutoCycle,
    isLoading,
    hasError,

    // Actions
    initializeApp,
    switchToLeaderboard,
    setAutoCycling,
    updatePlayers,
    setLoadingState,
    setError,
    clearError,
  } = useChickenRaceApp();

  // Example leaderboards for demonstration
  const exampleLeaderboards: Leaderboard[] = [
    {
      _id: 'demo-lb-1',
      title: 'Demo Leaderboard 1',
      description: 'First demo leaderboard',
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
    {
      _id: 'demo-lb-2',
      title: 'Demo Leaderboard 2',
      description: 'Second demo leaderboard',
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

  // Initialize the app on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeApp(exampleLeaderboards);
    }
  }, [isInitialized, initializeApp]);

  // Simulate loading some players
  const handleLoadPlayers = () => {
    setLoadingState('currentLeaderboard', true);
    
    // Simulate API call delay
    setTimeout(() => {
      updatePlayers([
        {
          _id: 'p1',
          player: 'player1',
          name: 'Alice Johnson',
          position: 1,
          total: 150,
          move: 'up',
        },
        {
          _id: 'p2',
          player: 'player2',
          name: 'Bob Smith',
          position: 2,
          total: 120,
          move: 'same',
        },
        {
          _id: 'p3',
          player: 'player3',
          name: 'Charlie Brown',
          position: 3,
          total: 100,
          move: 'down',
        },
      ]);
      setLoadingState('currentLeaderboard', false);
    }, 1000);
  };

  // Simulate an error
  const handleSimulateError = () => {
    setError({
      type: 'network',
      message: 'Simulated network error for demonstration',
      retryable: true,
      timestamp: Date.now(),
    });
  };

  if (!isInitialized) {
    return <div className="p-4">Initializing...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">State Management Example</h1>
      
      {/* Error Display */}
      {hasError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error?.message}
          <button
            onClick={clearError}
            className="ml-4 bg-red-500 text-white px-2 py-1 rounded text-sm"
          >
            Clear Error
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          Loading...
        </div>
      )}

      {/* Leaderboard Selection */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Leaderboard Management</h2>
        <div className="flex gap-4 items-center">
          <select
            value={currentLeaderboard?._id || ''}
            onChange={(e) => switchToLeaderboard(e.target.value)}
            className="border rounded px-3 py-2"
          >
            {leaderboards.map((lb) => (
              <option key={lb._id} value={lb._id}>
                {lb.title}
              </option>
            ))}
          </select>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoCycle.isEnabled}
              onChange={(e) => setAutoCycling(e.target.checked)}
              disabled={!canAutoCycle}
            />
            Auto-cycle ({autoCycle.totalLeaderboards} leaderboards)
          </label>
        </div>
        
        {autoCycle.isEnabled && (
          <div className="mt-2 text-sm text-gray-600">
            Next switch in: {Math.ceil(autoCycle.timeUntilNext / 1000)}s
          </div>
        )}
      </div>

      {/* Current Leaderboard Info */}
      {currentLeaderboard && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Current Leaderboard</h2>
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-medium">{currentLeaderboard.title}</h3>
            <p className="text-gray-600">{currentLeaderboard.description}</p>
            <p className="text-sm text-gray-500">ID: {currentLeaderboard._id}</p>
          </div>
        </div>
      )}

      {/* Players */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Players</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleLoadPlayers}
            disabled={loading.currentLeaderboard}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading.currentLeaderboard ? 'Loading...' : 'Load Players'}
          </button>
          
          <button
            onClick={handleSimulateError}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Simulate Error
          </button>
        </div>

        {hasPlayers ? (
          <div className="grid gap-2">
            {players.map((player) => (
              <div key={player._id} className="bg-white border rounded p-3 flex justify-between items-center">
                <div>
                  <span className="font-medium">#{player.position} {player.name}</span>
                  <span className="ml-2 text-gray-600">({player.total} points)</span>
                </div>
                <div className="text-sm">
                  {player.move === 'up' && <span className="text-green-600">↑</span>}
                  {player.move === 'down' && <span className="text-red-600">↓</span>}
                  {player.move === 'same' && <span className="text-gray-600">→</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No players loaded. Click "Load Players" to see example data.</p>
        )}
      </div>

      {/* State Summary */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">State Summary</h2>
        <div className="bg-gray-50 p-4 rounded">
          <ul className="space-y-1 text-sm">
            <li>Has Leaderboards: {hasLeaderboards ? '✅' : '❌'}</li>
            <li>Has Players: {hasPlayers ? '✅' : '❌'}</li>
            <li>Can Auto-cycle: {canAutoCycle ? '✅' : '❌'}</li>
            <li>Is Loading: {isLoading ? '✅' : '❌'}</li>
            <li>Has Error: {hasError ? '✅' : '❌'}</li>
            <li>Auto-cycle Enabled: {autoCycle.isEnabled ? '✅' : '❌'}</li>
            <li>Current Index: {autoCycle.currentIndex}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StateManagementExample;