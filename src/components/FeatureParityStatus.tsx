/**
 * Feature Parity Status Component
 * 
 * Displays current feature parity validation status and environment information.
 * Useful for debugging and monitoring cross-platform compatibility.
 */

import React from 'react';
import { useFeatureParity } from '../hooks/useFeatureParity';

interface FeatureParityStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function FeatureParityStatus({ 
  showDetails = false, 
  className = '' 
}: FeatureParityStatusProps) {
  const {
    lastReport,
    isValidating,
    environment,
    isPerformanceAcceptable,
    recommendations,
    runValidation
  } = useFeatureParity();

  if (!lastReport && !isValidating) {
    return (
      <div className={`feature-parity-status ${className}`} data-testid="feature-parity-status">
        <button 
          onClick={runValidation}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Feature Validation
        </button>
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className={`feature-parity-status ${className}`} data-testid="feature-parity-status">
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span className="text-sm text-gray-600">Validating features...</span>
        </div>
      </div>
    );
  }

  if (!lastReport) {
    return null;
  }

  const { testResults, overallPassed, timestamp } = lastReport;
  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div className={`feature-parity-status ${className}`} data-testid="feature-parity-status">
      <div className="space-y-2">
        {/* Status Summary */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${overallPassed ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm font-medium">
            Feature Parity: {passedCount}/{totalCount} passed
          </span>
          {!isPerformanceAcceptable && (
            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
              Performance Warning
            </span>
          )}
        </div>

        {/* Environment Info */}
        {environment && (
          <div className="text-xs text-gray-600 space-y-1">
            <div>Platform: {environment.platform}</div>
            {environment.isRaspberryPi && (
              <div className="text-orange-600">🥧 Raspberry Pi detected</div>
            )}
            {environment.isKioskMode && (
              <div className="text-blue-600">🖥️ Kiosk mode active</div>
            )}
            <div>Memory: {environment.memory}GB</div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="text-xs space-y-1">
            <div className="font-medium text-gray-700">Recommendations:</div>
            {recommendations.map((rec, index) => (
              <div key={index} className="text-gray-600 pl-2">
                • {rec}
              </div>
            ))}
          </div>
        )}

        {/* Detailed Results */}
        {showDetails && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Feature Details:</div>
            {testResults.map((result, index) => (
              <div key={index} className="text-xs flex items-center space-x-2">
                <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                  {result.passed ? '✓' : '✗'}
                </span>
                <span className="flex-1">{result.feature}</span>
                {result.performance && (
                  <span className="text-gray-500">
                    {result.performance.executionTime.toFixed(1)}ms
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500">
          Last checked: {new Date(timestamp).toLocaleTimeString()}
        </div>

        {/* Manual Refresh */}
        <button
          onClick={runValidation}
          disabled={isValidating}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:text-gray-400"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}

/**
 * Compact version for status bars
 */
export function FeatureParityIndicator({ className = '' }: { className?: string }) {
  const { lastReport, isPerformanceAcceptable } = useFeatureParity();

  if (!lastReport) {
    return null;
  }

  const { overallPassed } = lastReport;
  const statusColor = overallPassed 
    ? (isPerformanceAcceptable ? 'bg-green-500' : 'bg-yellow-500')
    : 'bg-red-500';

  return (
    <div 
      className={`w-2 h-2 rounded-full ${statusColor} ${className}`}
      title={`Feature parity: ${overallPassed ? 'OK' : 'Issues detected'}${!isPerformanceAcceptable ? ' (Performance warning)' : ''}`}
      data-testid="feature-parity-indicator"
    />
  );
}