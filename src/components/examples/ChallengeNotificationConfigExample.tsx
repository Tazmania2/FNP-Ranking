/**
 * Example component demonstrating the Challenge Notification Configuration System
 * 
 * Shows how to use the configuration service and hot-reloading capabilities
 */

import React, { useState, useEffect } from 'react';
import { ChallengeNotificationConfigPanel } from '../ChallengeNotificationConfigPanel';
import { ChallengeNotificationPopup } from '../ChallengeNotificationPopup';
import { useChallengeNotificationConfig } from '../../hooks/useChallengeNotificationConfig';
import type { ChallengeCompletionEvent } from '../../services/sseClientService';

export const ChallengeNotificationConfigExample: React.FC = () => {
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [showTestNotification, setShowTestNotification] = useState(false);
  const { config, updateConfig, isValid, validationErrors } = useChallengeNotificationConfig();

  // Sample notification for testing
  const sampleNotification: ChallengeCompletionEvent = {
    id: 'test-notification-1',
    playerId: 'player-123',
    playerName: 'Test Player',
    challengeId: 'challenge-456',
    challengeName: 'Complete Daily Challenge',
    completedAt: new Date().toISOString(),
    points: 100,
    timestamp: new Date().toISOString()
  };

  const handleTestNotification = () => {
    setShowTestNotification(true);
  };

  const handleDismissNotification = () => {
    setShowTestNotification(false);
  };

  const handleQuickConfigChange = (setting: string, value: any) => {
    updateConfig({ [setting]: value });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Challenge Notification Configuration Demo
        </h1>
        <p className="text-gray-600">
          This example demonstrates the configuration system for challenge completion notifications
          with hot-reloading capabilities.
        </p>
      </div>

      {/* Configuration Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Configuration Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isValid ? 'Valid Configuration' : 'Invalid Configuration'}
            </span>
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Display Duration:</span> {config.displayDuration}ms
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Position:</span> {config.position}
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Max Queue Size:</span> {config.maxQueueSize}
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Notifications:</span> {config.enableNotifications ? 'Enabled' : 'Disabled'}
          </div>
          
          <div className="text-sm">
            <span className="font-medium">Challenge Types:</span> {config.enabledChallengeTypes.length || 'All'}
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <h4 className="text-sm font-medium text-red-800 mb-1">Configuration Errors:</h4>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Quick Configuration Controls */}
      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Duration (ms)
            </label>
            <input
              type="number"
              min="1000"
              max="30000"
              step="500"
              value={config.displayDuration}
              onChange={(e) => handleQuickConfigChange('displayDuration', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              value={config.position}
              onChange={(e) => handleQuickConfigChange('position', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="top-right">Top Right</option>
              <option value="top-center">Top Center</option>
              <option value="center">Center</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Queue Size
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={config.maxQueueSize}
              onChange={(e) => handleQuickConfigChange('maxQueueSize', Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.enableNotifications}
              onChange={(e) => handleQuickConfigChange('enableNotifications', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Notifications</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config.enableSounds}
              onChange={(e) => handleQuickConfigChange('enableSounds', e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Enable Sounds</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => setIsConfigPanelOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Open Full Configuration Panel
        </button>

        <button
          onClick={handleTestNotification}
          disabled={!config.enableNotifications}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Test Notification
        </button>

        <button
          onClick={() => handleQuickConfigChange('displayDuration', 2000)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Set 2s Duration
        </button>

        <button
          onClick={() => handleQuickConfigChange('displayDuration', 8000)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Set 8s Duration
        </button>
      </div>

      {/* Configuration Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Current Configuration</h2>
        <pre className="text-sm bg-white p-3 rounded border overflow-x-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      {/* Hot-Reloading Demo */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">Hot-Reloading Demo</h2>
        <p className="text-blue-800 mb-3">
          Try changing any configuration setting above. Notice how the changes are applied immediately
          without requiring a page refresh. This demonstrates the hot-reloading capability.
        </p>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
          <li>Configuration changes are validated in real-time</li>
          <li>Invalid changes are rejected and errors are shown</li>
          <li>All components using the configuration are updated automatically</li>
          <li>Configuration is persisted to localStorage</li>
        </ul>
      </div>

      {/* Configuration Panel */}
      <ChallengeNotificationConfigPanel
        isOpen={isConfigPanelOpen}
        onClose={() => setIsConfigPanelOpen(false)}
      />

      {/* Test Notification */}
      {showTestNotification && config.enableNotifications && (
        <ChallengeNotificationPopup
          notification={sampleNotification}
          onDismiss={handleDismissNotification}
        />
      )}
    </div>
  );
};

export default ChallengeNotificationConfigExample;