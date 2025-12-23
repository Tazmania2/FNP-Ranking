import { useState, useEffect, useCallback, useRef } from 'react';
import { IntelligentNetworkService, type IntelligentNetworkConfig, type NetworkRequest } from '../services/intelligentNetworkService';

interface UseIntelligentNetworkOptions {
  config?: IntelligentNetworkConfig;
  autoOptimize?: boolean;
  optimizeInterval?: number;
}

interface NetworkHookState {
  isConnected: boolean;
  isReconnecting: boolean;
  currentPollingInterval: number;
  cacheStats: {
    hits: number;
    misses: number;
    hitRate: number;
    entryCount: number;
  };
  performanceMetrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
}

/**
 * Hook for intelligent network operations with caching and reconnection
 * Optimized for Raspberry Pi deployment
 */
export const useIntelligentNetwork = (options: UseIntelligentNetworkOptions = {}) => {
  const {
    config = {},
    autoOptimize = true,
    optimizeInterval = 60000, // 1 minute
  } = options;

  const serviceRef = useRef<IntelligentNetworkService | null>(null);
  const optimizeIntervalRef = useRef<number | null>(null);

  const [state, setState] = useState<NetworkHookState>({
    isConnected: true,
    isReconnecting: false,
    currentPollingInterval: config.basePollingInterval || 30000,
    cacheStats: {
      hits: 0,
      misses: 0,
      hitRate: 0,
      entryCount: 0,
    },
    performanceMetrics: {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
    },
  });

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new IntelligentNetworkService(config);
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
    };
  }, [config]);

  // Auto-optimization interval
  useEffect(() => {
    if (!autoOptimize || !serviceRef.current) {
      return;
    }

    optimizeIntervalRef.current = window.setInterval(() => {
      if (serviceRef.current) {
        serviceRef.current.optimizePollingInterval();
        updateState();
      }
    }, optimizeInterval);

    return () => {
      if (optimizeIntervalRef.current) {
        clearInterval(optimizeIntervalRef.current);
        optimizeIntervalRef.current = null;
      }
    };
  }, [autoOptimize, optimizeInterval]);

  /**
   * Update hook state from service
   */
  const updateState = useCallback(() => {
    if (!serviceRef.current) return;

    const networkState = serviceRef.current.getNetworkState();
    const cacheStats = serviceRef.current.getCacheStats();
    const performanceMetrics = serviceRef.current.getPerformanceMetrics();
    const currentPollingInterval = serviceRef.current.getCurrentPollingInterval();

    setState({
      isConnected: networkState.isConnected,
      isReconnecting: networkState.isReconnecting,
      currentPollingInterval,
      cacheStats: {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        entryCount: cacheStats.entryCount,
      },
      performanceMetrics: {
        requestCount: performanceMetrics.requestCount,
        errorCount: performanceMetrics.errorCount,
        averageResponseTime: performanceMetrics.averageResponseTime,
      },
    });
  }, []);

  /**
   * Make an intelligent network request
   */
  const request = useCallback(async <T>(requestConfig: NetworkRequest) => {
    if (!serviceRef.current) {
      throw new Error('Network service not initialized');
    }

    try {
      const response = await serviceRef.current.request<T>(requestConfig);
      updateState();
      return response;
    } catch (error) {
      updateState();
      throw error;
    }
  }, [updateState]);

  /**
   * Force network reconnection
   */
  const forceReconnect = useCallback(async () => {
    if (!serviceRef.current) {
      return false;
    }

    const result = await serviceRef.current.forceReconnect();
    updateState();
    return result;
  }, [updateState]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    if (!serviceRef.current) {
      return;
    }

    serviceRef.current.clearCache();
    updateState();
  }, [updateState]);

  /**
   * Manually optimize polling interval
   */
  const optimizePolling = useCallback(() => {
    if (!serviceRef.current) {
      return;
    }

    serviceRef.current.optimizePollingInterval();
    updateState();
  }, [updateState]);

  // Update state periodically
  useEffect(() => {
    const interval = setInterval(updateState, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateState]);

  return {
    // State
    ...state,
    
    // Actions
    request,
    forceReconnect,
    clearCache,
    optimizePolling,
    updateState,
    
    // Service reference for advanced usage
    service: serviceRef.current,
  };
};