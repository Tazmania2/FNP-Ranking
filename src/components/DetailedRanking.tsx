import React, { useState, useMemo } from 'react';
import type { Player, Leaderboard } from '../types';

interface DetailedRankingProps {
  players: Player[];
  currentLeaderboard: Leaderboard | null;
  isLoading?: boolean;
}

type SortField = 'position' | 'name' | 'total' | 'move';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const ITEMS_PER_PAGE = 20;

export const DetailedRanking: React.FC<DetailedRankingProps> = ({
  players,
  currentLeaderboard,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'position',
    direction: 'asc',
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Generate chicken face emoji based on player position for avatar
  const getChickenAvatar = (position: number): string => {
    const chickenFaces = ['🐔', '🐓', '🐤', '🐣', '🥚'];
    return chickenFaces[position % chickenFaces.length];
  };

  // Format points display with proper number formatting
  const formatPoints = (points: number): string => {
    return points.toLocaleString();
  };

  // Get movement indicator
  const getMoveIndicator = (player: Player) => {
    if (!player.move || !player.previous_position) return null;

    switch (player.move) {
      case 'up':
        return (
          <span className="text-green-600 flex items-center text-sm">
            ↗️ +{player.previous_position - player.position}
          </span>
        );
      case 'down':
        return (
          <span className="text-red-600 flex items-center text-sm">
            ↘️ -{player.position - player.previous_position}
          </span>
        );
      case 'same':
        return (
          <span className="text-gray-500 flex items-center text-sm">
            ➡️ No change
          </span>
        );
      default:
        return null;
    }
  };

  // Filter players based on search term
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players;
    
    const term = searchTerm.toLowerCase();
    return players.filter(player =>
      player.name.toLowerCase().includes(term) ||
      player.position.toString().includes(term) ||
      player.total.toString().includes(term)
    );
  }, [players, searchTerm]);

  // Sort players based on current sort configuration
  const sortedPlayers = useMemo(() => {
    const sorted = [...filteredPlayers].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortConfig.field) {
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'move': {
          // Sort by movement: up > same > down > no movement
          const moveOrder = { up: 3, same: 2, down: 1 };
          aValue = moveOrder[a.move as keyof typeof moveOrder] || 0;
          bValue = moveOrder[b.move as keyof typeof moveOrder] || 0;
          break;
        }
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [filteredPlayers, sortConfig]);

  // Paginate sorted players
  const paginatedPlayers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return sortedPlayers.slice(startIndex, endIndex);
  }, [sortedPlayers, currentPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(sortedPlayers.length / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, sortedPlayers.length);

  // Handle sorting
  const handleSort = (field: SortField) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Get sort icon for column headers
  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <span className="text-gray-400">↕️</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>;
  };

  // Get position badge styling
  const getPositionBadge = (position: number) => {
    const baseClasses = "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white";
    
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, index) => (
              <div key={index} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 mb-2 flex items-center">
          📊 Lista de Jogadores Completa
        </h2>
        {currentLeaderboard && (
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            {currentLeaderboard.title} - {sortedPlayers.length} jogadores
          </p>
        )}

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar jogadores..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="bg-white text-gray-800 w-full px-3 sm:px-4 py-2 pl-8 sm:pl-10 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-sm sm:text-base">🔍</span>
          </div>
        </div>
      </div>

      {/* Results Info */}
      {searchTerm && (
        <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
          Found {sortedPlayers.length} player{sortedPlayers.length !== 1 ? 's' : ''} 
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-3">
        {paginatedPlayers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">🐔</div>
            <p className="text-base">
              {searchTerm ? 'No players found matching your search' : 'No players available'}
            </p>
            {searchTerm && (
              <button
                onClick={() => handleSearch('')}
                className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          paginatedPlayers.map((player) => (
            <div key={player._id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className={getPositionBadge(player.position)}>
                    {player.position}
                  </div>
                  <div className="text-xl" title={`${player.name}'s chicken`}>
                    {getChickenAvatar(player.position - 1)}
                  </div>
                  <div className="font-medium text-gray-800 text-sm">
                    {player.name}
                  </div>
                </div>
                <div className="font-bold text-blue-600 text-sm">
                  {formatPoints(player.total)}
                </div>
              </div>
              {getMoveIndicator(player) && (
                <div className="flex justify-center">
                  {getMoveIndicator(player)}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th 
                className="w-20 text-center py-3 px-2 lg:px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors text-sm lg:text-base"
                onClick={() => handleSort('position')}
              >
                <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                  <span>Pos.</span>
                  {getSortIcon('position')}
                </div>
              </th>
              <th className="w-16 text-center py-3 px-2 lg:px-4 font-semibold text-gray-700 text-sm lg:text-base">
                Ícone
              </th>
              <th 
                className="w-60 text-left py-3 px-2 lg:px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors text-sm lg:text-base"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1 lg:space-x-2 ">
                  <span>Nome do Jogador</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th 
                className="w-24 text-right py-3 px-2 lg:px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors text-sm lg:text-base"
                onClick={() => handleSort('total')}
              >
                <div className="flex items-center justify-end space-x-1 lg:space-x-2">
                  <span>Pontos</span>
                  {getSortIcon('total')}
                </div>
              </th>
              <th 
                className="w-24 text-center py-3 px-2 lg:px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors text-sm lg:text-base"
                onClick={() => handleSort('move')}
              >
                <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                  <span>Movimento</span>
                  {getSortIcon('move')}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlayers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-500">
                  <div className="text-4xl lg:text-6xl mb-4">🐔</div>
                  <p className="text-base lg:text-lg">
                    {searchTerm ? 'Nenhum jogador encontrado correspondente à sua busca' : 'Nenhum jogador disponível'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => handleSearch('')}
                      className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm lg:text-base"
                    >
                      Limpar busca
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paginatedPlayers.map((player) => (
                <tr 
                  key={player._id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="w-20 text-center py-3 lg:py-4 px-2 lg:px-4">
                    <div className="flex justify-center">
                      <div className={getPositionBadge(player.position)}>
                        {player.position}
                      </div>
                    </div>
                  </td>
                  <td className="w-16 text-center py-3 lg:py-4 px-2 lg:px-4">
                    <div className="flex justify-center">
                      <div className="text-xl lg:text-2xl" title={`${player.name}'s chicken`}>
                        {getChickenAvatar(player.position - 1)}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 lg:py-4 px-2 lg:px-4">
                    <div className="font-medium text-gray-800 text-sm lg:text-base truncate">
                      {player.name}
                    </div>
                  </td>
                  <td className="w-24 text-right py-3 lg:py-4 px-2 lg:px-4">
                    <div className="font-bold text-blue-600 text-sm lg:text-base">
                      {formatPoints(player.total)}
                    </div>
                  </td>
                  <td className="w-24 text-center py-3 lg:py-4 px-2 lg:px-4">
                    <div className="flex justify-center">
                      {getMoveIndicator(player)}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
            Mostrando {startItem}-{endItem} de {sortedPlayers.length} jogadores
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 order-1 sm:order-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sm:hidden">‹</span>
              <span className="hidden sm:inline">Anterior</span>
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, totalPages) }, (_, i) => {
                let pageNum;
                const maxPages = window.innerWidth < 640 ? 3 : 5;
                if (totalPages <= maxPages) {
                  pageNum = i + 1;
                } else if (currentPage <= Math.floor(maxPages / 2) + 1) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - Math.floor(maxPages / 2)) {
                  pageNum = totalPages - maxPages + 1 + i;
                } else {
                  pageNum = currentPage - Math.floor(maxPages / 2) + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-2 sm:px-3 py-1 border rounded-md text-xs sm:text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sm:hidden">›</span>
              <span className="hidden sm:inline">Próximo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetailedRanking;