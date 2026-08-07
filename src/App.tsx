import { useEffect } from 'react';
import { useDashboardSnapshot } from './hooks/useDashboardSnapshot';
import { useChickenRaceManager } from './hooks/useChickenRaceManager';
import { ChickenRace } from './components/ChickenRace';
import { Sidebar } from './components/Sidebar';
import { LazyDetailedRanking } from './components/LazyDetailedRanking';
import { FloatingErrorDisplay } from './components/ErrorDisplay';
import { LoadingDisplay } from './components/LoadingDisplay';
import { DailyGoalProgress } from './components/DailyGoalProgress';
import { ChallengeNotificationDisplay } from './components/ChallengeNotificationDisplay';
import { globalPreloadingService } from './services/preloadingService';
import { initializeAdaptivePreloading } from './utils/lazyLoading';
import { globalPerformanceMonitor } from './utils/performanceMonitor';
import { globalRaspberryPiOptimizationManager } from './utils/initializeRaspberryPiOptimizations';
import { ResponsiveWrapper } from './components/ResponsiveWrapper';
import { KioskModeProvider } from './components/KioskModeProvider';
import { initializeSecurity } from './utils/securityInit';

function App() {
  // Initialize performance monitoring and preloading for Raspberry Pi optimization
  useEffect(() => {
    const initializeOptimizations = async () => {
      try {
        initializeSecurity();
        await globalRaspberryPiOptimizationManager.initialize();
        globalPerformanceMonitor.triggerOptimizations();
        initializeAdaptivePreloading();
        await globalPreloadingService.initialize();
        console.log('🚀 All optimizations initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize some optimizations:', error);
      }
    };

    initializeOptimizations();

    return () => {
      globalRaspberryPiOptimizationManager.destroy();
    };
  }, []);

  // Dashboard snapshot: used ONLY for daily sales data
  const { dailySales, loading: snapshotLoading, error: snapshotError, lastUpdated: snapshotLastUpdated } =
    useDashboardSnapshot(60000);

  // Chicken race manager uses apiConfig to fetch monthly leaderboard via RPC
  const {
    players,
    raceStatus,
    playerPositions,
    currentLeaderboard,
    loading: raceLoading,
    lastUpdated: raceLastUpdated,
    retryFailedOperation,
    clearError,
    error: raceError,
  } = useChickenRaceManager({
    apiConfig: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    autoRefreshConfig: { enabled: true, interval: 60000 },
  });

  const loading = raceLoading.leaderboards || raceLoading.currentLeaderboard;
  const lastUpdated = raceLastUpdated || snapshotLastUpdated;

  // Show loading screen while first fetch is in progress
  if (loading && players.length === 0) {
    return (
      <KioskModeProvider enableAutoOptimization={true}>
        <ResponsiveWrapper enableAutoDetection={true}>
          <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4">
              <LoadingDisplay
                loading={{ leaderboards: true, currentLeaderboard: false, switchingLeaderboard: false }}
                variant="spinner"
                size="large"
              />
            </div>
          </div>
        </ResponsiveWrapper>
      </KioskModeProvider>
    );
  }

  return (
    <KioskModeProvider enableAutoOptimization={true}>
      <ResponsiveWrapper enableAutoDetection={true}>
        <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
          {/* Floating Error Display */}
          {(snapshotError || raceError) && (
            <FloatingErrorDisplay
              error={raceError || { type: 'network', message: snapshotError || '', retryable: true, timestamp: Date.now() }}
              onRetry={retryFailedOperation}
              onDismiss={clearError}
            />
          )}

          {/* Header */}
          <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white responsive-text">
                    🐔 Ranking do Game FNP
                  </h1>
                  <div className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium responsive-text bg-green-100 text-green-800">
                    <div className="w-2 h-2 rounded-full mr-1 sm:mr-2 bg-green-400" />
                    <span className="hidden sm:inline">conectado</span>
                    <span className="sm:hidden">✓</span>
                  </div>
                </div>
                {lastUpdated && (
                  <span className="text-white/60 text-xs">
                    Atualizado: {new Date(lastUpdated).toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 responsive-container">
            <div className="space-y-8 responsive-spacing">
              {/* Race Visualization */}
              <div className="flex flex-col lg:grid lg:grid-cols-4 gap-4 lg:gap-8 responsive-grid">
                {/* Main Race Area */}
                <div className="lg:col-span-3 relative order-2 lg:order-1">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-6 border border-white/20 responsive-card">
                    <div className="mb-4">
                      <h2 className="text-lg sm:text-xl font-semibold text-white mb-2 responsive-text">
                        {currentLeaderboard?.title || 'Ranking FNP'}
                      </h2>
                    </div>

                    <ChickenRace
                      players={players}
                      leaderboardTitle={currentLeaderboard?.title || 'Ranking FNP'}
                      isLoading={loading && players.length === 0}
                      playerPositions={playerPositions}
                    />
                    {/* Empty state message when no ranking data */}
                    {!loading && players.length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">📊</div>
                        <p className="text-white/80 text-lg">Nenhum dado de ranking disponível para este mês</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-1 order-1 lg:order-2 flex">
                  <Sidebar
                    topPlayers={players.slice(0, 5)}
                    currentLeaderboard={currentLeaderboard}
                    totalPlayers={players.length}
                    isLoading={loading && players.length === 0}
                  />
                </div>
              </div>

              {/* Daily Goal Progress */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-white/20 responsive-card">
                <DailyGoalProgress
                  current={dailySales.total}
                  target={dailySales.target}
                  goalMet={dailySales.goalMet}
                />
              </div>

              {/* Detailed Ranking */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 responsive-card">
                <LazyDetailedRanking
                  players={players}
                  currentLeaderboard={currentLeaderboard}
                  isLoading={loading && players.length === 0}
                />
              </div>
            </div>
          </main>

          {/* Challenge Completion Notifications */}
          <ChallengeNotificationDisplay
            showConnectionStatus={false}
            showErrors={true}
            position="top-right"
          />
        </div>
      </ResponsiveWrapper>
    </KioskModeProvider>
  );
}

export default App;
