import React from 'react';
import { useDailyCode } from '../hooks/useDailyCode';

/**
 * DailyCodeCard Component
 * Displays the daily code fetched from Google Sheets
 * Positioned at bottom-left corner - always visible (persistent)
 * Includes QR code for check-in form
 */
export const DailyCodeCard: React.FC = () => {
  const { code, loading, error } = useDailyCode();
  const [qrError, setQrError] = React.useState(false);
  
  const checkInUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeRZAVjnrAaQEyhC8U-hXnT405ZxJhsQ-DsR3Jqt6XLCXC0ew/viewform?usp=dialog';
  
  // Use local QR code image
  const qrCodeUrl = '/qrcode-checkin.png';

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-white/95 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg p-4 min-w-[220px]">
        {/* Header */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800 text-center">
            Código do Dia
          </h3>
        </div>

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
              <div className="text-3xl font-bold text-blue-600 tracking-wider mb-4 text-center">
                {code}
              </div>
              
              {/* QR Code Section - Always visible */}
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-600 mb-2 text-center font-medium">Check-in:</p>
                <div className="flex justify-center">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code para Check-in"
                    className="border border-gray-300 rounded w-[120px] h-[120px] object-contain bg-white"
                    onLoad={() => {
                      console.log('QR Code loaded successfully');
                      setQrError(false);
                    }}
                    onError={(_e) => {
                      console.error('QR Code failed to load:', qrCodeUrl);
                      setQrError(true);
                    }}
                  />
                </div>
                {qrError && (
                  <div className="text-xs text-red-600 mt-2 text-center">
                    ❌ Erro ao carregar QR Code
                  </div>
                )}
                <a 
                  href={checkInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 block text-center"
                >
                  Abrir formulário
                </a>
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
