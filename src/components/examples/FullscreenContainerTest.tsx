import React, { useState, useEffect } from 'react';
import { ChickenRace } from '../ChickenRace';
import type { Player, Leaderboard } from '../../types';

const FullscreenContainerTest: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock leaderboard
  const mockLeaderboard: Leaderboard = {
    _id: 'demo-leaderboard',
    title: '🏁 Teste de Container Limitado',
    description: 'Demonstração de que o fullscreen funciona mesmo dentro de containers pequenos',
    game_id: 'demo-game',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Generate mock players
  const generateMockPlayers = (count: number): Player[] => {
    const names = [
      'Alice Silva', 'Bob Santos', 'Charlie Costa', 'Diana Oliveira', 'Eve Pereira',
      'Frank Lima', 'Grace Souza', 'Henry Alves', 'Ivy Ferreira', 'Jack Rocha'
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
      setPlayers(generateMockPlayers(6));
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🧪 Teste de Container Limitado
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Este exemplo demonstra que o modo tela cheia funciona mesmo quando o Chicken Race está dentro de containers pequenos
        </p>
      </div>

      {/* Container pequeno para demonstrar o problema */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">
          ⚠️ Container Pequeno (300px de largura)
        </h2>
        <p className="text-sm text-yellow-700 mb-4">
          O Chicken Race está limitado a apenas 300px de largura, mas o modo tela cheia deve ocupar toda a tela
        </p>
        
        {/* Container limitado */}
        <div className="w-[300px] h-[200px] border-2 border-red-300 rounded-lg overflow-hidden bg-gray-100">
          <ChickenRace
            players={players}
            leaderboardTitle={mockLeaderboard.title}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Container médio */}
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">
          📱 Container Médio (600px de largura)
        </h2>
        <p className="text-sm text-blue-700 mb-4">
          Mesmo em containers maiores, o fullscreen deve escapar e ocupar toda a tela
        </p>
        
        {/* Container médio */}
        <div className="w-[600px] h-[300px] border-2 border-blue-300 rounded-lg overflow-hidden bg-gray-100">
          <ChickenRace
            players={players}
            leaderboardTitle={mockLeaderboard.title}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Container com overflow hidden */}
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          🚫 Container com Overflow Hidden
        </h2>
        <p className="text-sm text-red-700 mb-4">
          Mesmo com overflow hidden, o fullscreen deve aparecer por cima de tudo
        </p>
        
        {/* Container com overflow hidden */}
        <div className="w-[400px] h-[250px] border-2 border-red-300 rounded-lg overflow-hidden bg-gray-100 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 p-4">
            <h3 className="text-sm font-medium text-purple-800 mb-2">Container com overflow: hidden</h3>
            <p className="text-xs text-purple-600 mb-4">Este container tem overflow hidden, mas o fullscreen deve funcionar</p>
            
            <div className="relative">
              <ChickenRace
                players={players}
                leaderboardTitle={mockLeaderboard.title}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Container dentro de outro container */}
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-green-800 mb-2">
          📦 Container Aninhado
        </h2>
        <p className="text-sm text-green-700 mb-4">
          Mesmo dentro de múltiplos containers aninhados, o fullscreen deve funcionar
        </p>
        
        {/* Containers aninhados */}
        <div className="w-[500px] h-[300px] border-2 border-green-300 rounded-lg overflow-hidden bg-gray-100">
          <div className="p-4 bg-white/50 h-full">
            <div className="bg-gray-200 p-3 rounded h-full">
              <div className="bg-white p-2 rounded h-full">
                <ChickenRace
                  players={players}
                  leaderboardTitle={mockLeaderboard.title}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          📋 Como Testar
        </h2>
        <div className="space-y-2 text-sm text-gray-700">
          <div>1. <strong>Clique no botão de tela cheia</strong> em qualquer um dos containers acima</div>
          <div>2. <strong>Verifique se o modal ocupa toda a tela</strong> independente do tamanho do container</div>
          <div>3. <strong>Teste em diferentes tamanhos de tela</strong> para confirmar a responsividade</div>
          <div>4. <strong>Use ESC ou clique fora</strong> para fechar o modal</div>
          <div>5. <strong>O modal deve aparecer por cima</strong> de todos os elementos da página</div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenContainerTest;
