import React from 'react';
import type { Player, Leaderboard } from '../types';

interface SidebarProps {
  topPlayers: Player[];
  currentLeaderboard: Leaderboard | null;
  totalPlayers: number;
  isLoading?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  topPlayers,
  currentLeaderboard,
  totalPlayers,
  isLoading = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  
  // Get top 5 players for display
  const displayPlayers = topPlayers.slice(0, 5);

  // Generate chicken face emoji based on player position for avatar
  const getChickenAvatar = (position: number): string => {
    // Use different chicken-related emojis for variety
    const chickenFaces = ['🐔', '🐓', '🐤', '🐣', '🥚'];
    return chickenFaces[position % chickenFaces.length];
  };

  // Format points display with proper number formatting (Brazilian format, no decimals)
  const formatPoints = (points: number): string => {
    const roundedPoints = Math.round(points);
    if (roundedPoints >= 1000000) {
      return `${(roundedPoints / 1000000).toFixed(1).replace('.', ',')}M`;
    }
    if (roundedPoints >= 1000) {
      return `${(roundedPoints / 1000).toFixed(1).replace('.', ',')}K`;
    }
    return roundedPoints.toLocaleString('pt-BR');
  };

  // Get position indicator with proper styling
  const getPositionBadge = (position: number) => {
    const baseClasses = "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white";
    
    switch (position) {
      case 1:
        return `${baseClasses} bg-yellow-500`; // Gold
      case 2:
        return `${baseClasses} bg-gray-400`; // Silver
      case 3:
        return `${baseClasses} bg-amber-600`; // Bronze
      default:
        return `${baseClasses} bg-blue-500`; // Default blue
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 w-full lg:w-80">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg w-full lg:w-80 h-full flex flex-col">
      {/* Mobile Header with Collapse Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">
          🏆 Destaques
        </h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`w-5 h-5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Sidebar Content */}
      <div className={`${isCollapsed ? 'hidden' : 'flex'} lg:flex flex-col flex-1 p-4 sm:p-6`}>
        {/* Header - Desktop Only */}
        <div className="hidden lg:block mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            🏆 Destaques
          </h2>
          {currentLeaderboard && (
            <p className="text-sm text-gray-600">
              {currentLeaderboard.title}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Mostrando top 5 de {totalPlayers} jogadores
          </p>
        </div>

        {/* Mobile Header Info */}
        <div className="lg:hidden mb-4">
          {currentLeaderboard && (
            <p className="text-sm text-gray-600 mb-1">
              {currentLeaderboard.title}
            </p>
          )}
          <p className="text-xs text-gray-500">
            Mostrando top 5 de {totalPlayers} jogadores
          </p>
        </div>

        {/* Players List */}
        <div className="space-y-2 lg:space-y-3 flex-1">
          {displayPlayers.length === 0 ? (
            <div className="text-center py-6 lg:py-8 text-gray-500">
              <div className="text-3xl lg:text-4xl mb-2">🐔</div>
              <p className="text-sm lg:text-base">Nenhum jogador encontrado</p>
            </div>
          ) : (
            displayPlayers.map((player) => (
              <div
                key={player._id}
                className="flex items-center space-x-2 lg:space-x-3 p-2 lg:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                {/* Position Badge */}
                <div className={getPositionBadge(player.position)}>
                  {player.position}
                </div>

                {/* Chicken Avatar */}
                <div className="text-xl lg:text-2xl" title={`${player.name}'s chicken`}>
                  {getChickenAvatar(player.position - 1)}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 truncate text-sm lg:text-base">
                      {player.name}
                    </h3>
                    <span className="text-xs lg:text-sm font-bold text-blue-600">
                      {formatPoints(player.total)}
                    </span>
                  </div>
                  
                  {/* Movement indicator */}
                  {player.move && player.previous_position && (
                    <div className="flex items-center mt-1">
                      {player.move === 'up' && (
                        <span className="text-xs text-green-600 flex items-center">
                          ↗️ +{player.previous_position - player.position}
                        </span>
                      )}
                      {player.move === 'down' && (
                        <span className="text-xs text-red-600 flex items-center">
                          ↘️ -{player.position - player.previous_position}
                        </span>
                      )}
                      {player.move === 'same' && (
                        <span className="text-xs text-gray-500 flex items-center">
                          ➡️ Sem mudança
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with last updated info */}
        <div className="mt-auto pt-3 lg:pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Atualiza automaticamente com os dados da corrida
          </p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;