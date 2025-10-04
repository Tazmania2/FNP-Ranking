import React, { useState, useEffect } from 'react';
import { ChickenRaceFullscreen } from '../ChickenRaceFullscreen';
import type { Player, Leaderboard } from '../../types';

const ChickenRaceFullscreenExample: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);

  // Mock leaderboard
  const mockLeaderboard: Leaderboard = {
    _id: 'demo-leaderboard',
    title: '🏁 Chicken Race Championship',
    description: 'Demonstração do modo tela cheia para TV',
    game_id: 'demo-game',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Generate mock players
  const generateMockPlayers = (count: number): Player[] => {
    const names = [
      'Alice Silva', 'Bob Santos', 'Charlie Costa', 'Diana Oliveira', 'Eve Pereira',
      'Frank Lima', 'Grace Souza', 'Henry Alves', 'Ivy Ferreira', 'Jack Rocha',
      'Kate Martins', 'Leo Barbosa', 'Mia Nunes', 'Noah Dias', 'Olivia Ramos'
    ];

    return Array.from({ length: count }, (_, index) => ({
      _id: `player-${index + 1}`,
      name: names[index] || `Jogador ${index + 1}`,
      position: index + 1,
      total: Math.floor(Math.random() * 1000) + 500,
      previous_total: Math.floor(Math.random() * 1000) + 400,
      previous_position: Math.floor(Math.random() * count) + 1,
      move: ['up', 'down', 'same'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'same',
    }));
  };

  // Initialize with mock data
  useEffect(() => {
    const timer = setTimeout(() => {
      setPlayers(generateMockPlayers(8));
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (isLoading || players.length === 0) return;

    const updateInterval = setInterval(() => {
      setPlayers(currentPlayers => {
        const updatedPlayers = currentPlayers.map(player => {
          // Randomly update some players
          if (Math.random() > 0.7) {
            const change = Math.floor(Math.random() * 20) - 10; // -10 to +10 points
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
          
          // Update movement indicator
          if (player.previous_position && player.previous_position !== player.position) {
            player.move = player.previous_position > player.position ? 'up' : 'down';
          } else {
            player.move = 'same';
          }
        });

        return updatedPlayers;
      });
    }, 2000); // Update every 2 seconds

    return () => clearInterval(updateInterval);
  }, [isLoading, players.length]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🖥️ Chicken Race - Modo Tela Cheia
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Demonstração do componente Chicken Race em tela cheia, perfeito para exibir em TVs
        </p>
      </div>

      {/* Demo Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          🎮 Controles de Demonstração
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">📺 Modo TV</h3>
            <p className="text-sm text-blue-600 mb-3">
              Ideal para exibir em televisões grandes para acompanhamento em tempo real
            </p>
            <button
              onClick={() => setIsFullscreenOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Abrir em Tela Cheia
            </button>
          </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">⚡ Tempo Real</h3>
          <p className="text-sm text-green-600 mb-3">
            Atualizações automáticas a cada 2 segundos simulando dados em tempo real
          </p>
          <div className="text-sm text-green-700">
            <div>🔄 {players.length} jogadores ativos</div>
            <div>📊 Pontuações atualizando</div>
            <div>📺 Tamanho otimizado para TV</div>
          </div>
        </div>
        </div>

        {/* Current Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">📊 Status Atual</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Jogadores:</span>
              <span className="ml-2 font-medium">{players.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Líder:</span>
              <span className="ml-2 font-medium">{players.find(p => p.position === 1)?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Pontos do Líder:</span>
              <span className="ml-2 font-medium">{players.find(p => p.position === 1)?.total || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium text-green-600">Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-3">
          📋 Instruções de Uso
        </h2>
        <div className="space-y-2 text-sm text-yellow-700">
          <div>• <strong>Clique em "Abrir em Tela Cheia"</strong> para visualizar o Chicken Race em modo TV</div>
          <div>• <strong>Pressione ESC</strong> ou clique no X para sair do modo tela cheia</div>
          <div>• <strong>Clique fora do modal</strong> também fecha a tela cheia</div>
          <div>• <strong>Ideal para TVs</strong> - o componente se adapta automaticamente ao tamanho da tela</div>
          <div>• <strong>Atualizações em tempo real</strong> - perfeito para acompanhamento ao vivo</div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      <ChickenRaceFullscreen
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
        players={players}
        leaderboardTitle={mockLeaderboard.title}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ChickenRaceFullscreenExample;
