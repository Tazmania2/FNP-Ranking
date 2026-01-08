/**
 * Configuration Panel for Challenge Notification Settings
 * 
 * Provides a user interface for managing notification configuration with real-time updates
 */

import React, { useState } from 'react';
import { useChallengeNotificationConfig } from '../hooks/useChallengeNotificationConfig';

export interface ChallengeNotificationConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChallengeNotificationConfigPanel: React.FC<ChallengeNotificationConfigPanelProps> = ({
  isOpen,
  onClose
}) => {
  const {
    config,
    updateConfig,
    resetToDefaults,
    isValid,
    validationErrors,
    validationWarnings,
    isLoading
  } = useChallengeNotificationConfig();

  const [activeTab, setActiveTab] = useState<'display' | 'filters' | 'infrastructure'>('display');

  if (!isOpen) return null;

  const handleDisplayDurationChange = (value: number) => {
    updateConfig({ displayDuration: value });
  };

  const handlePositionChange = (position: 'top-right' | 'top-center' | 'center') => {
    updateConfig({ position });
  };

  const handleMaxQueueSizeChange = (value: number) => {
    updateConfig({ maxQueueSize: value });
  };

  const handleEnabledTypesChange = (types: string[]) => {
    updateConfig({ enabledChallengeTypes: types });
  };

  const handleEnabledCategoriesChange = (categories: string[]) => {
    updateConfig({ enabledChallengeCategories: categories });
  };

  const handleFeatureToggle = (feature: keyof typeof config, enabled: boolean) => {
    updateConfig({ [feature]: enabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            Challenge Notification Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Validation Messages */}
        {(!isValid || validationWarnings.length > 0) && (
          <div className="p-4 border-b border-gray-200">
            {validationErrors.length > 0 && (
              <div className="mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-1">Configuration Errors:</h4>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            {validationWarnings.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-1">Configuration Warnings:</h4>
                <ul className="text-sm text-yellow-700 list-disc list-inside">
                  {validationWarnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          {[
            { id: 'display', label: 'Display Settings' },
            { id: 'filters', label: 'Challenge Filters' },
            { id: 'infrastructure', label: 'Infrastructure' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'display' && (
            <div className="space-y-6">
              {/* Display Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Duration (milliseconds)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="30000"
                  step="500"
                  value={config.displayDuration}
                  onChange={(e) => handleDisplayDurationChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long notifications stay visible (1000-30000ms)
                </p>
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Position
                </label>
                <select
                  value={config.position}
                  onChange={(e) => handlePositionChange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="top-right">Top Right</option>
                  <option value="top-center">Top Center</option>
                  <option value="center">Center</option>
                </select>
              </div>

              {/* Max Queue Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Queue Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.maxQueueSize}
                  onChange={(e) => handleMaxQueueSizeChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of notifications to queue
                </p>
              </div>

              {/* Feature Toggles */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Features</h3>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableNotifications}
                    onChange={(e) => handleFeatureToggle('enableNotifications', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Notifications</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableSounds}
                    onChange={(e) => handleFeatureToggle('enableSounds', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Sound Effects</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enableVibration}
                    onChange={(e) => handleFeatureToggle('enableVibration', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable Vibration (Mobile)</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="space-y-6">
              {/* Challenge Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enabled Challenge Types
                </label>
                <textarea
                  value={config.enabledChallengeTypes.join('\n')}
                  onChange={(e) => handleEnabledTypesChange(
                    e.target.value.split('\n').filter(type => type.trim())
                  )}
                  placeholder="Enter challenge types (one per line)&#10;Leave empty to enable all types"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  One challenge type per line. Leave empty to enable all types.
                </p>
              </div>

              {/* Challenge Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enabled Challenge Categories
                </label>
                <textarea
                  value={config.enabledChallengeCategories.join('\n')}
                  onChange={(e) => handleEnabledCategoriesChange(
                    e.target.value.split('\n').filter(category => category.trim())
                  )}
                  placeholder="Enter challenge categories (one per line)&#10;Leave empty to enable all categories"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  One challenge category per line. Leave empty to enable all categories.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'infrastructure' && (
            <div className="space-y-6">
              {/* SSE Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Server-Sent Events</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reconnect Interval (ms)
                    </label>
                    <input
                      type="number"
                      min="1000"
                      value={config.sseConfig.reconnectInterval}
                      onChange={(e) => updateConfig({
                        sseConfig: {
                          ...config.sseConfig,
                          reconnectInterval: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Reconnect Attempts
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={config.sseConfig.maxReconnectAttempts}
                      onChange={(e) => updateConfig({
                        sseConfig: {
                          ...config.sseConfig,
                          maxReconnectAttempts: Number(e.target.value)
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Performance Settings */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Performance</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Memory Cleanup Interval (ms)
                    </label>
                    <input
                      type="number"
                      min="60000"
                      value={config.memoryCleanupInterval}
                      onChange={(e) => updateConfig({ memoryCleanupInterval: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Stored Events
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={config.maxStoredEvents}
                      onChange={(e) => updateConfig({ maxStoredEvents: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={resetToDefaults}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Reset to Defaults
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isValid ? 'Configuration Valid' : 'Configuration Invalid'}
              </span>
            </div>
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChallengeNotificationConfigPanel;