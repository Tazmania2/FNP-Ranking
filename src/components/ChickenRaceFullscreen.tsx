import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChickenRace } from './ChickenRace';
import { useKioskModeContext } from './KioskModeProvider';
import type { Player } from '../types';

interface ChickenRaceFullscreenProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  leaderboardTitle: string;
  isLoading: boolean;
  playerPositions?: Array<{
    playerId: string;
    position: { x: number; y: number };
    rank: number;
    isAnimating: boolean;
  }>;
}

export const ChickenRaceFullscreen: React.FC<ChickenRaceFullscreenProps> = ({
  isOpen,
  onClose,
  players,
  leaderboardTitle,
  isLoading,
  playerPositions,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const kioskMode = useKioskModeContext();

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      // In kiosk mode, prevent escape key from closing unless explicitly allowed
      if (event.key === 'Escape' && isOpen && !kioskMode.isKioskMode) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Small delay to ensure smooth animation
      setTimeout(() => setIsVisible(true), 10);
    } else {
      document.body.style.overflow = 'unset';
      setIsVisible(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Ensure document.body exists before creating portal
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  // Use React Portal to render outside the parent container
  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] bg-black transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
      }}
    >
      {/* Header with title and close button */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="text-white">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
              🏁 {leaderboardTitle || 'Chicken Race Championship'}
            </h1>
            <p className="text-sm sm:text-base text-white/80">
              Acompanhamento em tempo real • {players.length} jogadores
            </p>
          </div>
          
          {/* Close button - Hidden in kiosk mode */}
          {!kioskMode.isKioskMode && (
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-white/20 hover:bg-white/30 rounded-full transition-colors backdrop-blur-sm touch-target"
              aria-label="Fechar tela cheia"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="h-full flex items-center justify-center p-2 sm:p-4 pt-16 sm:pt-20">
        <div className={`w-full h-full transition-transform duration-300 ${
          isVisible ? 'scale-100' : 'scale-95'
        }`}>
          <ChickenRace
            players={players}
            leaderboardTitle={leaderboardTitle}
            isLoading={isLoading}
            playerPositions={playerPositions}
            isFullscreen={true}
          />
        </div>
      </div>

      {/* Footer with instructions - Adapted for kiosk mode */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
        <div className="text-center text-white/80">
          <p className="text-sm sm:text-base">
            {!kioskMode.isKioskMode && (
              <>
                Pressione <kbd className="px-2 py-1 bg-white/20 rounded text-xs">ESC</kbd> para sair • 
              </>
            )}
            Atualização automática em tempo real
            {kioskMode.isFirefox && (
              <span className="block text-xs mt-1 text-white/60">
                Otimizado para Firefox em modo kiosk
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Click outside to close - Disabled in kiosk mode */}
      {!kioskMode.isKioskMode && (
        <div
          className="absolute inset-0 -z-10"
          onClick={onClose}
          aria-label="Clique fora para fechar"
        />
      )}
    </div>,
    document.body // Render directly in document.body
  );
};

export default ChickenRaceFullscreen;
