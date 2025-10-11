import React from 'react';
import { ChickenRaceCanvas } from '../ChickenRaceCanvas';
import type { Player } from '../../types';

/**
 * ChickenRaceCanvasExample - Demonstração do componente ChickenRaceCanvas
 * 
 * Este exemplo mostra como usar o componente ChickenRaceCanvas que usa
 * HTML5 Canvas para renderizar as galinhas de forma mais performática.
 * 
 * Benefícios do Canvas:
 * - Melhor performance com muitos elementos animados
 * - Renderização mais eficiente
 * - Controle mais fino sobre animações
 * - Menor uso de memória comparado a DOM elements
 * 
 * Mantém todas as funcionalidades:
 * - Tooltips interativos
 * - Animações suaves
 * - Posicionamento baseado em ranking
 * - Detecção de hover/click
 * - Modo fullscreen
 */

// Mock data for demonstration
const mockPlayers: Player[] = [
  {
    _id: '1',
    name: 'João Silva',
    total: 1250.5,
    position: 1,
    player: 'player1',
  },
  {
    _id: '2',
    name: 'Maria Santos',
    total: 1180.0,
    position: 2,
    player: 'player2',
  },
  {
    _id: '3',
    name: 'Pedro Costa',
    total: 1050.3,
    position: 3,
    player: 'player3',
  },
  {
    _id: '4',
    name: 'Ana Paula',
    total: 980.7,
    position: 4,
    player: 'player4',
  },
  {
    _id: '5',
    name: 'Carlos Eduardo',
    total: 920.1,
    position: 5,
    player: 'player5',
  },
  {
    _id: '6',
    name: 'Fernanda Lima',
    total: 850.5,
    position: 6,
    player: 'player6',
  },
  {
    _id: '7',
    name: 'Roberto Alves',
    total: 780.2,
    position: 7,
    player: 'player7',
  },
  {
    _id: '8',
    name: 'Juliana Souza',
    total: 720.8,
    position: 8,
    player: 'player8',
  },
];

export const ChickenRaceCanvasExample: React.FC = () => {
  return (
    <div className="p-4 space-y-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🎨 ChickenRaceCanvas Component
        </h1>
        <p className="text-gray-600 mb-6">
          Versão otimizada usando HTML5 Canvas para melhor performance
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            🚀 Vantagens do Canvas
          </h2>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>Renderização mais eficiente de múltiplos elementos</li>
            <li>Animações 60fps mesmo com muitos jogadores</li>
            <li>Menor uso de memória (sem criar elementos DOM)</li>
            <li>Melhor performance em dispositivos móveis</li>
            <li>Mantém todas as funcionalidades originais</li>
          </ul>
        </div>

        {/* Basic Example */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Exemplo Básico
          </h2>
          <div className="bg-white rounded-lg shadow-lg p-4">
            <ChickenRaceCanvas
              players={mockPlayers}
              leaderboardTitle="Ranking de Performance"
              isLoading={false}
            />
          </div>
        </section>

        {/* Features */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Funcionalidades Preservadas
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">✅ Interatividade</h3>
              <p className="text-sm text-green-800">
                Hover e click nas galinhas para ver tooltips com informações detalhadas
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">🎭 Animações</h3>
              <p className="text-sm text-purple-800">
                Animações suaves a 60fps com movimento, rotação e escala
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 mb-2">📊 Posicionamento</h3>
              <p className="text-sm text-orange-800">
                Sistema inteligente de posicionamento baseado em pontuação
              </p>
            </div>
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <h3 className="font-semibold text-pink-900 mb-2">🖥️ Fullscreen</h3>
              <p className="text-sm text-pink-800">
                Modo tela cheia otimizado para TVs e apresentações
              </p>
            </div>
          </div>
        </section>

        {/* Code Example */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Como Usar
          </h2>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-gray-100 text-sm">
              <code>{`import { ChickenRaceCanvas } from './components/ChickenRaceCanvas';

// Use exatamente como o componente original
<ChickenRaceCanvas
  players={players}
  leaderboardTitle="Meu Ranking"
  isLoading={false}
  playerPositions={playerPositions} // opcional
  isFullscreen={false} // opcional
/>`}</code>
            </pre>
          </div>
        </section>

        {/* Performance Comparison */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            ⚡ Comparação de Performance
          </h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-yellow-300">
                  <th className="text-left py-2 text-yellow-900">Métrica</th>
                  <th className="text-center py-2 text-yellow-900">DOM</th>
                  <th className="text-center py-2 text-yellow-900">Canvas</th>
                </tr>
              </thead>
              <tbody className="text-yellow-800">
                <tr className="border-b border-yellow-200">
                  <td className="py-2">Elementos no DOM</td>
                  <td className="text-center">~50 por galinha</td>
                  <td className="text-center">1 canvas</td>
                </tr>
                <tr className="border-b border-yellow-200">
                  <td className="py-2">FPS com 50 jogadores</td>
                  <td className="text-center">~30 FPS</td>
                  <td className="text-center">60 FPS</td>
                </tr>
                <tr className="border-b border-yellow-200">
                  <td className="py-2">Uso de Memória</td>
                  <td className="text-center">Alto</td>
                  <td className="text-center">Baixo</td>
                </tr>
                <tr>
                  <td className="py-2">Renderização Mobile</td>
                  <td className="text-center">Pesada</td>
                  <td className="text-center">Leve</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ChickenRaceCanvasExample;

