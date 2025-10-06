import { useState } from 'react';
import { useChickenRaceManager } from './hooks/useChickenRaceManager';
import { ChickenRace } from './components/ChickenRace';
import { Sidebar } from './components/Sidebar';
import { LazyDetailedRanking } from './components/LazyDetailedRanking';
import { LeaderboardSelector } from './components/LeaderboardSelector';
import { FloatingErrorDisplay } from './components/ErrorDisplay';
import { LoadingDisplay, OverlayLoading } from './components/LoadingDisplay';
import { DailyGoalProgress } from './components/DailyGoalProgress';
import ChickenRaceExample from './components/examples/ChickenRaceExample';
import type { FunifierConfig } from './types';

function App() {
  const [showDemo, setShowDemo] = useState(false);
  const [forceDemo, setForceDemo] = useState(false);
  
  // Get API config from environment, allowing null for demo mode fallback
  const [apiConfig] = useState<FunifierConfig | null>(() => {
    const serverUrl = import.meta.env.VITE_FUNIFIER_SERVER_URL;
    const apiKey = import.meta.env.VITE_FUNIFIER_API_KEY;
    const authToken = import.meta.env.VITE_FUNIFIER_AUTH_TOKEN;

    if (!serverUrl || !apiKey || !authToken) {
      console.warn('🔧 Missing API configuration, will use demo mode');
      return null;
    }

    return {
      serverUrl: serverUrl.replace(/\/$/, ''),
      apiKey,
      authToken,
    };
  });

  // Debug API config
  console.log('🔧 App.tsx - Environment variables:', {
    VITE_FUNIFIER_SERVER_URL: import.meta.env.VITE_FUNIFIER_SERVER_URL,
    VITE_FUNIFIER_API_KEY: import.meta.env.VITE_FUNIFIER_API_KEY,
    VITE_FUNIFIER_AUTH_TOKEN: import.meta.env.VITE_FUNIFIER_AUTH_TOKEN,
  });
  
  console.log('🔧 App.tsx - API Config:', {
    hasConfig: !!apiConfig,
    serverUrl: apiConfig?.serverUrl,
    hasApiKey: !!apiConfig?.apiKey,
    hasAuthToken: !!apiConfig?.authToken,
  });
  
  console.log('🔧 App.tsx - Show demo decision:', {
    showDemo,
    forceDemo,
    hasApiConfig: !!apiConfig,
    willShowDemo: showDemo || forceDemo || !apiConfig,
  });

  const {
    // State
    leaderboards,
    currentLeaderboard,
    players,
    loading,
    error,
    usingMockData,
    
    // Status
    raceStatus,
    playerPositions,
    
    // Actions
    initializeRace,
    changeLeaderboard,
    retryFailedOperation,
    clearError,
  } = useChickenRaceManager({
    apiConfig: apiConfig || undefined,
    realTimeConfig: {
      pollingInterval: 30000, // 30 seconds
      enabled: true,
      maxRetries: 3,
      retryDelay: 1000,
      pauseOnHidden: true,
    },
    transitionConfig: {
      transitionDuration: 1000,
      easing: 'ease-out',
      staggered: true,
      staggerDelay: 100,
      celebrateImprovements: true,
    },
    onAuthError: () => {
      console.warn('🔐 Authentication error detected, switching to demo mode');
      setForceDemo(false);
    },
  });

  // Show demo if no API config is provided or auth error occurred
  if (showDemo || forceDemo || !apiConfig) {
    return "Demo Example";
    // return (
    //   <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
    //     <div className="container mx-auto py-8">
    //       {/* Demo Mode Banner */}
    //       <div className="bg-yellow-500/90 backdrop-blur-sm border-b border-yellow-400/50 mb-6 rounded-lg mx-4">
    //         <div className="px-4 py-3">
    //           <div className="flex items-center justify-center text-center">
    //             <div className="flex items-center space-x-2">
    //               <span className="text-yellow-900 text-lg">🎮</span>
    //               <span className="text-yellow-900 font-medium">
    //                 Modo Demo: {!apiConfig ? 'Configuração da API não encontrada' : 'Falha na conexão com a API'}
    //               </span>
    //               {(forceDemo || !apiConfig) && (
    //                 <button
    //                   onClick={() => window.location.reload()}
    //                   className="ml-4 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
    //                 >
    //                   Recarregar App
    //                 </button>
    //               )}
    //             </div>
    //           </div>
    //         </div>
    //       </div>
          
    //       <ChickenRaceExample />
    //     </div>
    //   </div>
    // );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
      {/* Floating Error Display */}
      <FloatingErrorDisplay
        error={error}
        onRetry={retryFailedOperation}
        onDismiss={clearError}
      />

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                🐔 Ranking do Game FNP
              </h1>
              {raceStatus.connectionStatus && (
                <div className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                  raceStatus.connectionStatus === 'connected' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-1 sm:mr-2 ${
                    raceStatus.connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="hidden sm:inline">{raceStatus.connectionStatus === 'connected' ? 'conectado' : 'desconectado'}</span>
                  <span className="sm:hidden">{raceStatus.connectionStatus === 'connected' ? '✓' : '✗'}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              {/* Leaderboard Selector */}
              {leaderboards.length > 0 && (
                <div className="w-full sm:w-auto">
                  <LeaderboardSelector
                    onLeaderboardChange={changeLeaderboard}
                  />
                </div>
              )}

              <button
                onClick={() => setShowDemo(true)}
                className="px-3 sm:px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors text-sm sm:text-base"
              >
                <span className="sm:hidden">Demo</span>
                <span className="hidden sm:inline">Modo Demo</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mock Data Warning Banner */}
      {usingMockData && (
        <div className="bg-yellow-500/90 backdrop-blur-sm border-b border-yellow-400/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-center text-center">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-900 text-lg">⚠️</span>
                <span className="text-yellow-900 font-medium text-sm sm:text-base">
                  Modo Demo: Mostrando dados simulados devido a problemas de conexão com a API
                </span>
                <button
                  onClick={retryFailedOperation}
                  className="ml-4 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors"
                >
                  Tentar API
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!raceStatus.isInitialized && !raceStatus.isLoading ? (
          /* Welcome Screen */
          <div className="text-center py-20">
            <div className="text-white/80 text-8xl mb-8">🐔</div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Bem-vindo ao Game FNP!
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Transforme seus rankings em uma experiência envolvente e animada de corrida de galinhas. 
              Assista os jogadores competirem em tempo real com animações suaves e atualizações ao vivo.
            </p>
            <div className="space-y-4">
              <button
                onClick={initializeRace}
                disabled={loading.leaderboards}
                className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading.leaderboards ? 'Inicializando...' : 'Começar a Corrida!'}
              </button>
              <div>
                <button
                  onClick={() => setShowDemo(true)}
                  className="text-white/80 hover:text-white underline"
                >
                  Ou experimente a demonstração interativa
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Race Interface */
          <div className="space-y-8">
            {/* Loading Overlay */}
            {loading.leaderboards && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md mx-4">
                  <LoadingDisplay
                    loading={loading}
                    variant="spinner"
                    size="large"
                  />
                </div>
              </div>
            )}

            {/* Race Visualization */}
            <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-8">
              {/* Main Race Area */}
              <div className="lg:col-span-3 relative order-2 lg:order-1">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-white/20">
                  {currentLeaderboard && (
                    <div className="mb-4">
                      <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                        {currentLeaderboard.title}
                      </h2>
                      <p className="text-white/80 text-xs sm:text-sm">
                        {currentLeaderboard.description}
                      </p>
                    </div>
                  )}

                  <ChickenRace
                    players={players}
                    leaderboardTitle={currentLeaderboard?.title || ''}
                    isLoading={loading.currentLeaderboard}
                    playerPositions={playerPositions}
                  />

                  {/* Switching Overlay */}
                  {loading.switchingLeaderboard && (
                    <OverlayLoading
                      loading={loading}
                      message="Trocando ranking..."
                    />
                  )}
                </div>
              </div>

              {/* Sidebar - Mobile: Top, Desktop: Right */}
              <div className="lg:col-span-1 order-1 lg:order-2 flex">
                <Sidebar
                  topPlayers={players.slice(0, 5)}
                  currentLeaderboard={currentLeaderboard}
                  totalPlayers={players.length}
                  isLoading={loading.currentLeaderboard}
                />
              </div>
            </div>

            {/* Daily Goal Progress */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20">
              <DailyGoalProgress 
                current={39000}
                target={50000}
              />
            </div>

            {/* Detailed Ranking - Lazy Loaded */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <LazyDetailedRanking
                players={players}
                currentLeaderboard={currentLeaderboard}
                isLoading={loading.currentLeaderboard}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
