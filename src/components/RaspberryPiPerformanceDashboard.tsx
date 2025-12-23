/**
 * Raspberry Pi Performance Dashboard
 * Debug component for monitoring performance on ARM devices
 */

import { useState, useEffect } from 'react';
import { globalPerformanceMonitor, PerformanceMetrics } from '../utils/performanceMonitor';
import { globalResourceOptimizer, ResourceAlert } from '../utils/resourceOptimizer';
import { globalRaspberryPiOptimizationManager } from '../utils/initializeRaspberryPiOptimizations';

interface PerformanceDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export function RaspberryPiPerformanceDashboard({ 
  isVisible = false, 
  onClose 
}: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<ResourceAlert[]>([]);
  const [optimizationStatus, setOptimizationStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      setMetrics(globalPerformanceMonitor.getMetrics());
      setAlerts(globalResourceOptimizer.getRecentAlerts(5));
      setOptimizationStatus(globalRaspberryPiOptimizationManager.getOptimizationStatus());
    };

    // Initial update
    updateMetrics();

    // Update every 2 seconds when visible
    const interval = setInterval(updateMetrics, 2000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const handleRunAnalysis = async () => {
    setIsRefreshing(true);
    try {
      await globalRaspberryPiOptimizationManager.runOptimizationAnalysis();
      // Update metrics after analysis
      setMetrics(globalPerformanceMonitor.getMetrics());
      setAlerts(globalResourceOptimizer.getRecentAlerts(5));
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPerformanceColor = (value: number, threshold: number, inverse = false): string => {
    const ratio = inverse ? threshold / value : value / threshold;
    if (ratio >= 1) return 'text-red-500';
    if (ratio >= 0.8) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              🍓 Raspberry Pi Performance Dashboard
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleRunAnalysis}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isRefreshing ? '🔄 Analyzing...' : '🔍 Run Analysis'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Hardware Information */}
          {optimizationStatus && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Hardware Profile</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Device Type:</span>
                  <div className={optimizationStatus.isARMDevice ? 'text-green-600' : 'text-blue-600'}>
                    {optimizationStatus.isARMDevice ? '🍓 ARM Device' : '💻 Desktop'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Optimizations:</span>
                  <div className={optimizationStatus.isInitialized ? 'text-green-600' : 'text-red-600'}>
                    {optimizationStatus.isInitialized ? '✅ Active' : '❌ Inactive'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Auto-Optimization:</span>
                  <div className={optimizationStatus.config?.enableAutoOptimization ? 'text-green-600' : 'text-yellow-600'}>
                    {optimizationStatus.config?.enableAutoOptimization ? '🔄 Enabled' : '⏸️ Disabled'}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Monitoring:</span>
                  <div className={optimizationStatus.config?.enablePerformanceMonitoring ? 'text-green-600' : 'text-red-600'}>
                    {optimizationStatus.config?.enablePerformanceMonitoring ? '📊 Active' : '📊 Inactive'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {metrics && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-gray-600">Memory Usage</div>
                  <div className={`text-xl font-bold ${getPerformanceColor(metrics.memoryUsage, 1536)}`}>
                    {metrics.memoryUsage}MB
                  </div>
                  <div className="text-xs text-gray-500">Limit: 1536MB</div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600">Frame Rate</div>
                  <div className={`text-xl font-bold ${getPerformanceColor(metrics.frameRate, 25, true)}`}>
                    {metrics.frameRate.toFixed(1)} FPS
                  </div>
                  <div className="text-xs text-gray-500">Target: &gt;25 FPS</div>
                </div>
                
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-sm text-gray-600">Load Time</div>
                  <div className={`text-xl font-bold ${getPerformanceColor(metrics.loadTime, 10000)}`}>
                    {(metrics.loadTime / 1000).toFixed(2)}s
                  </div>
                  <div className="text-xs text-gray-500">Target: &lt;10s</div>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm text-gray-600">Network Latency</div>
                  <div className={`text-xl font-bold ${getPerformanceColor(metrics.networkLatency, 1000)}`}>
                    {metrics.networkLatency.toFixed(0)}ms
                  </div>
                  <div className="text-xs text-gray-500">Target: &lt;1000ms</div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Metrics */}
          {metrics && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Additional Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">CPU Usage</div>
                  <div className="text-lg font-semibold">{metrics.cpuUsage.toFixed(1)}%</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">Render Time</div>
                  <div className="text-lg font-semibold">{metrics.renderTime.toFixed(2)}ms</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">Network Requests</div>
                  <div className="text-lg font-semibold">{metrics.networkRequests}</div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm text-gray-600">Cache Hit Rate</div>
                  <div className="text-lg font-semibold">{metrics.cacheHitRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Alerts */}
          {alerts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Recent Alerts</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {alerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                      alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className={`font-medium ${
                          alert.severity === 'critical' ? 'text-red-800' :
                          alert.severity === 'high' ? 'text-orange-800' :
                          alert.severity === 'medium' ? 'text-yellow-800' :
                          'text-blue-800'
                        }`}>
                          {alert.severity.toUpperCase()}: {alert.type}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{alert.message}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Tips */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">🍓 Raspberry Pi Optimization Tips</h3>
            <ul className="text-sm space-y-1">
              <li>• Keep memory usage below 1.5GB for optimal performance</li>
              <li>• Target 25+ FPS for smooth animations on ARM processors</li>
              <li>• Enable hardware acceleration in browser settings</li>
              <li>• Use Firefox in kiosk mode for best performance</li>
              <li>• Ensure good network connectivity for API calls</li>
              <li>• Monitor temperature to prevent thermal throttling</li>
            </ul>
          </div>

          {/* Debug Information */}
          <div className="mt-4 text-xs text-gray-500">
            <details>
              <summary className="cursor-pointer">Debug Information</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify({ metrics, optimizationStatus }, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

// Debug hook for development
export function useRaspberryPiDebug() {
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+P to toggle dashboard
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setShowDashboard(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return {
    showDashboard,
    setShowDashboard,
  };
}