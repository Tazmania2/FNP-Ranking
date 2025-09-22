import React, { useState, useEffect } from 'react';
import { ChickenRace } from '../ChickenRace';
import { Sidebar } from '../Sidebar';
import type { Player } from '../../types';

// Dados simulados para demonstração
const generateMockPlayers = (count: number): Player[] => {
  const names = [
    'Ana Silva', 'Bruno Costa', 'Carlos Mendes', 'Diana Santos', 'Eduardo Lima', 
    'Fernanda Rocha', 'Gabriel Alves', 'Helena Martins', 'Igor Pereira', 'Julia Ferreira',
    'Lucas Oliveira', 'Marina Souza', 'Nicolas Barbosa', 'Olivia Carvalho', 'Pedro Ribeiro',
    'Rafaela Gomes', 'Samuel Dias', 'Tatiana Moura', 'Vitor Nascimento', 'Yasmin Torres'
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
  const [leaderboardTitle, setLeaderboardTitle] = useState('Campeonato Demonstração');
  
  // Estados para a barra de progresso da meta
  const [gameGoal, setGameGoal] = useState(200); // Meta do jogo
  const [currentProgress, setCurrentProgress] = useState(0); // Progresso atual

  // Simular carregamento e geração de dados
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setPlayers(generateMockPlayers(playerCount));
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [playerCount]);

  // Simular atualizações em tempo real
  useEffect(() => {
    if (isLoading || players.length === 0) return;

    const updateInterval = setInterval(() => {
      setPlayers(currentPlayers => {
        const updatedPlayers = currentPlayers.map(player => {
          // Atualizar aleatoriamente alguns jogadores
          if (Math.random() > 0.8) {
            const change = Math.floor(Math.random() * 10) - 5; // -5 a +5 pontos
            return {
              ...player,
              previous_total: player.total,
              total: Math.max(0, player.total + change),
            };
          }
          return player;
        });

        // Re-ordenar e atualizar posições
        updatedPlayers.sort((a, b) => b.total - a.total);
        updatedPlayers.forEach((player, index) => {
          player.previous_position = player.position;
          player.position = index + 1;
          
          // Atualizar indicador de movimento
          if (player.previous_position && player.previous_position !== player.position) {
            player.move = player.previous_position > player.position ? 'up' : 'down';
          } else {
            player.move = 'same';
          }
        });

        return updatedPlayers;
      });
    }, 3000); // Atualizar a cada 3 segundos

    return () => clearInterval(updateInterval);
  }, [isLoading, players.length]);

  // Simular progresso da meta do jogo
  useEffect(() => {
    if (isLoading || players.length === 0) return;

    // Calcular progresso baseado na pontuação do líder
    const leader = players.find(p => p.position === 1);
    if (leader) {
      setCurrentProgress(leader.total);
    }
  }, [players, isLoading]);

  const handleRefresh = () => {
    setPlayers(generateMockPlayers(playerCount));
  };

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
  };

  // Criar leaderboard mock para o Sidebar
  const mockLeaderboard = {
    _id: 'demo-leaderboard',
    title: leaderboardTitle,
    description: 'Demonstração interativa do ranking de corrida de galinhas',
    principalType: 0,
    operation: {
      type: 0,
      achievement_type: 0,
      item: 'total',
      sort: 1,
    },
    period: {
      type: 0,
      timeAmount: 0,
      timeScale: 0,
    },
  };

  return (
    <div className="chicken-race-example p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          🐔 Demonstração da Corrida de Galinhas
        </h1>
        <p className="text-gray-600 mb-4">
          Esta demonstração mostra o componente ChickenRace com várias funcionalidades incluindo
          lógica de posicionamento, animações, empates e design responsivo.
        </p>

        {/* Controles */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-100 rounded-lg">
          <div className="flex items-center gap-2">
            <label htmlFor="playerCount" className="text-sm font-medium">
              Número de Jogadores:
            </label>
            <select
              id="playerCount"
              value={playerCount}
              onChange={(e) => handlePlayerCountChange(Number(e.target.value))}
              className="px-3 py-1 border rounded"
            >
              <option value={3}>3 Jogadores</option>
              <option value={5}>5 Jogadores</option>
              <option value={8}>8 Jogadores</option>
              <option value={12}>12 Jogadores</option>
              <option value={16}>16 Jogadores</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="title" className="text-sm font-medium">
              Título da Corrida:
            </label>
            <input
              id="title"
              type="text"
              value={leaderboardTitle}
              onChange={(e) => setLeaderboardTitle(e.target.value)}
              className="px-3 py-1 border rounded"
              placeholder="Digite o título da corrida"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="gameGoal" className="text-sm font-medium">
              Meta do Jogo:
            </label>
            <input
              id="gameGoal"
              type="number"
              value={gameGoal}
              onChange={(e) => setGameGoal(Number(e.target.value))}
              className="px-3 py-1 border rounded w-20"
              min="100"
              max="500"
            />
            <span className="text-xs text-gray-500">pontos</span>
          </div>

          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Atualizar Corrida
          </button>
        </div>

        {/* Destaques das Funcionalidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-green-600 mb-2">✅ Lógica de Posicionamento</h3>
            <p className="text-sm text-gray-600">
              Primeiro lugar posicionado mais à direita, com distribuição adequada do ranking
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-blue-600 mb-2">🎯 Pontuações Empatadas</h3>
            <p className="text-sm text-gray-600">
              Jogadores com mesma pontuação alinhados horizontalmente, espalhados verticalmente
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-purple-600 mb-2">🎨 Animação 4-Eixos</h3>
            <p className="text-sm text-gray-600">
              Movimento sutil em X, Y, rotação e escala para movimento realista
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-orange-600 mb-2">📱 Responsivo</h3>
            <p className="text-sm text-gray-600">
              Adapta-se a diferentes tamanhos de tela com design mobile-friendly
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <h3 className="font-semibold text-indigo-600 mb-2">🏁 Meta do Jogo</h3>
            <p className="text-sm text-gray-600">
              Barra de progresso visual mostrando o avanço do líder em direção à meta
            </p>
          </div>
        </div>
      </div>

      {/* Interface da Corrida */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-8 mb-8">
        {/* Área Principal da Corrida */}
        <div className="lg:col-span-3 relative order-2 lg:order-1">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-white/20">
            <div className="mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                {leaderboardTitle}
              </h2>
              <p className="text-white/80 text-xs sm:text-sm">
                Demonstração interativa com {players.length} participantes
              </p>
            </div>

            <ChickenRace
              players={players}
              leaderboardTitle={leaderboardTitle}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Sidebar - Mobile: Topo, Desktop: Direita */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <Sidebar
            topPlayers={players.slice(0, 5)}
            currentLeaderboard={mockLeaderboard}
            totalPlayers={players.length}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Barra de Progresso da Meta do Jogo */}
      {!isLoading && players.length > 0 && (
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  🎯 Meta do Jogo
                </h3>
                <p className="text-white/80 text-sm">
                  Progresso do líder em direção à meta de {gameGoal} pontos
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {currentProgress}/{gameGoal}
                </div>
                <div className="text-sm text-white/80">
                  {Math.round((currentProgress / gameGoal) * 100)}% completo
                </div>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="relative">
              <div className="w-full bg-white/20 rounded-full h-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${Math.min((currentProgress / gameGoal) * 100, 100)}%` }}
                >
                  {/* Efeito de brilho animado */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                </div>
              </div>

              {/* Marcadores de progresso */}
              <div className="flex justify-between mt-2 text-xs text-white/60">
                <span>0</span>
                <span>{Math.round(gameGoal * 0.25)}</span>
                <span>{Math.round(gameGoal * 0.5)}</span>
                <span>{Math.round(gameGoal * 0.75)}</span>
                <span>{gameGoal}</span>
              </div>

              {/* Indicador do líder atual */}
              {players.length > 0 && (
                <div className="mt-3 flex items-center justify-center">
                  <div className="bg-white/20 rounded-lg px-3 py-2 flex items-center space-x-2">
                    <span className="text-yellow-400">👑</span>
                    <span className="text-white font-medium">
                      {players[0]?.name}
                    </span>
                    <span className="text-white/80">
                      está liderando com {players[0]?.total} pontos
                    </span>
                  </div>
                </div>
              )}

              {/* Status da meta */}
              {currentProgress >= gameGoal && (
                <div className="mt-3 text-center">
                  <div className="bg-green-500/20 border border-green-400/50 rounded-lg px-4 py-2">
                    <span className="text-green-300 font-bold text-lg">
                      🎉 META ALCANÇADA! 🎉
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notas de Implementação */}
      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Funcionalidades da Implementação</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Algoritmo de Posicionamento</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Posição horizontal baseada no ranking (faixa de 85% a 15%)</li>
              <li>• Jogadores empatados alinhados na mesma posição X</li>
              <li>• Posições Y aleatórias para aparência natural</li>
              <li>• Transições suaves entre mudanças de posição</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Sistema de Animação</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Loop de animação 60fps usando setInterval</li>
              <li>• Animação única por jogador baseada no ID</li>
              <li>• Movimento sutil em 4 eixos (X, Y, rotação, escala)</li>
              <li>• Transições CSS para mudanças de posição</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">Barra de Progresso da Meta</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Progresso baseado na pontuação do líder atual</li>
              <li>• Meta configurável pelo usuário (100-500 pontos)</li>
              <li>• Animação suave com gradiente e efeito de brilho</li>
              <li>• Indicadores visuais e status de conclusão</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Informações de Debug dos Jogadores Atuais */}
      {!isLoading && players.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-lg border">
          <h4 className="font-medium mb-3">Dados Atuais da Corrida</h4>
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
                ... e mais {players.length - 6} jogadores
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChickenRaceExample;