import React from 'react';
import { useDailyCode } from '../hooks/useDailyCode';
import { useFadeAnimation } from '../hooks/useFadeAnimation';

/**
 * DailyCodeCard Component
 * Displays the daily code fetched from Google Sheets
 * Positioned at bottom-right corner with fade animation
 */
export const DailyCodeCard: React.FC = () => {
  const { code, loading, error } = useDailyCode();
  const { opacity } = useFadeAnimation();

  return (
    <div
      className="fixed bottom-4 right-4 z-50 transition-opacity duration-300"
      style={{ opacity }}
    >
      <div className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg p-4 min-w-[200px]">
        {/* Header */}
        <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
          Código do Dia
        </h3>

        {/* Content */}
        <div className="text-center">
          {loading && (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && !code && (
            <div className="text-sm text-red-600 py-2">
              <p className="font-medium">Erro ao carregar</p>
              <p className="text-xs mt-1">{error}</p>
            </div>
          )}

          {code && (
            <div className="py-2">
              <div className="text-3xl font-bold text-blue-600 tracking-wider">
                {code}
              </div>
            </div>
          )}

          {error && code && (
            <div className="text-xs text-yellow-600 mt-2">
              ⚠️ {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
