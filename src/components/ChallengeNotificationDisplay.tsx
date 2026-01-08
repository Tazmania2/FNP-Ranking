/**
 * Challenge Notification Display Component
 * 
 * Integrates with the main application to display challenge completion notifications.
 * Handles the complete notification lifecycle from SSE events to popup dismissal.
 */

import React from 'react';
import { ChallengeNotificationPopup } from './ChallengeNotificationPopup';
import { useNotificationDisplay } from '../hooks/useChallengeNotifications';
import { useDisplayConfig } from '../hooks/useChallengeNotificationConfig';

export interface ChallengeNotificationDisplayProps {
  /**
   * Whether to show connection status indicator
   */
  showConnectionStatus?: boolean;
  
  /**
   * Custom position override
   */
  position?: 'top-right' | 'top-center' | 'center';
  
  /**
   * Custom duration override (in milliseconds)
   */
  duration?: number;
  
  /**
   * Whether to show error indicators
   */
  showErrors?: boolean;
  
  /**
   * Custom CSS class for styling
   */
  className?: string;
}

/**
 * Main notification display component for integration with the app
 */
export const ChallengeNotificationDisplay: React.FC<ChallengeNotificationDisplayProps> = ({
  showConnectionStatus = false,
  position: propPosition,
  duration: propDuration,
  showErrors = true,
  className
}) => {
  // Get notification state and actions
  const {
    currentNotification,
    isConnected,
    hasErrors,
    dismissNotification,
    clearErrors
  } = useNotificationDisplay();

  // Get display configuration
  const displayConfig = useDisplayConfig();
  
  // Use prop values or fall back to configuration
  const position = propPosition || displayConfig.position;
  const duration = propDuration || displayConfig.displayDuration;

  return (
    <div className={`challenge-notification-display ${className || ''}`}>
      {/* Main notification popup */}
      {currentNotification && (
        <ChallengeNotificationPopup
          notification={currentNotification}
          position={position}
          duration={duration}
          onDismiss={dismissNotification}
        />
      )}

      {/* Connection status indicator (optional) */}
      {showConnectionStatus && (
        <div className={`
          fixed bottom-4 left-4 z-40
          px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-300
          ${isConnected 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
          }
        `}>
          <div className="flex items-center gap-2">
            <div className={`
              w-2 h-2 rounded-full
              ${isConnected ? 'bg-green-500' : 'bg-red-500'}
            `} />
            <span>
              {isConnected ? 'Notifications Active' : 'Notifications Offline'}
            </span>
          </div>
        </div>
      )}

      {/* Error indicator (optional) */}
      {showErrors && hasErrors && (
        <div className="
          fixed bottom-4 right-4 z-40
          bg-yellow-100 border border-yellow-200 rounded-lg
          px-4 py-3 max-w-sm
        ">
          <div className="flex items-start gap-3">
            <span className="text-yellow-600 text-lg flex-shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-800">
                Notification System Issue
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                Some notifications may not be displayed
              </p>
            </div>
            <button
              onClick={clearErrors}
              className="
                text-yellow-600 hover:text-yellow-800
                text-xs font-medium
                flex-shrink-0
              "
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Minimal notification display for kiosk mode
 */
export const KioskNotificationDisplay: React.FC<{
  position?: 'top-right' | 'top-center' | 'center';
  duration?: number;
}> = ({ position = 'top-center', duration = 5000 }) => {
  return (
    <ChallengeNotificationDisplay
      position={position}
      duration={duration}
      showConnectionStatus={false}
      showErrors={false}
      className="kiosk-notifications"
    />
  );
};

/**
 * Full-featured notification display for admin/debug mode
 */
export const AdminNotificationDisplay: React.FC = () => {
  return (
    <ChallengeNotificationDisplay
      showConnectionStatus={true}
      showErrors={true}
      className="admin-notifications"
    />
  );
};

export default ChallengeNotificationDisplay;