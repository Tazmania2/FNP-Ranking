/**
 * Intelligent Network Service
 * Combines API caching with network reconnection for Raspberry Pi optimization
 */

import { ApiCacheService, type CacheConfig } from './apiCacheService';
import { NetworkReconnectionService, type NetworkReconnectionConfig } from './networkReconnectionService';
import type { ApiError } from '../types';

export interface IntelligentNetworkConfig {
  cache?: CacheConfig;
  reconnection?: NetworkReconnectionConfig;
  /** Enable intelligent polling interval adjustment based on system performance */
  adaptivePolling?: boolean;
  /** Base polling interval in milliseconds */
  basePollingInterval?: number;
  /** Maximum polling interval in milliseconds */
  maxPollingInterval?: number;
  /** Minimum polling interval in milliseconds */
  minPollingInterval?: number;
}

export interface NetworkRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  cacheKey?: string;
  cacheTTL?: number;
  skipCache?: boolean;
}

export interface NetworkResponse<T = any> {
  data: T;
  fromCache: boolean;
  timestamp: number;
  status: number;
  headers?: Record<string, string>;
}

/**
 * Intelligent network service that combines caching and reconnection
 * Optimized for Raspberry Pi deployment with adaptive performance tuning
 */
export class IntelligentNetworkService {
  private cacheService: ApiCacheService;
  private reconnectionService: NetworkReconnectionService;
  private config: Required<IntelligentNetworkConfig>;
  private currentPollingInterval: number;
  private performanceMetrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    lastPerformanceCheck: number;
  };

  constructor(config: IntelligentNetworkConfig = {}) {
    this.config = {
      cache: config.cache ?? {},
      reconnection: config.reconnection ?? {},
      adaptivePolling: config.adaptivePolling ?? true,
      basePollingInterval: config.basePollingInterval ?? 30000, // 30 seconds
      maxPollingInterval: config.maxPollingInterval ?? 300000, // 5 minutes
      minPollingInterval: config.minPollingInterval ?? 5000, // 5 seconds
    };

    this.cacheService = new ApiCacheService(this.config.cache);
    this.reconnectionService = new NetworkReconnectionService(
      () => this.testNetworkConnection(),
      this.config.reconnection
    );

    this.currentPollingInterval = this.config.basePollingInterval;
    this.performanceMetrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastPerformanceCheck: Date.now(),
    };

    this.setupReconnectionCallbacks();
  }

  /**
   * Make an intelligent network request with caching and reconnection
   */
  public async request<T>(request: NetworkRequest): Promise<NetworkResponse<T>> {
    const startTime = Date.now();
    const cacheKey = request.cacheKey || this.generateCacheKey(request);

    try {
      // Try cache first (unless explicitly skipped)
      if (!request.skipCache) {
        const cachedData = this.cacheService.get<T>(cacheKey);
        if (cachedData) {
          return {
            data: cachedData,
            fromCache: true,
            timestamp: Date.now(),
            status: 200,
          };
        }
      }

      // Make network request
      const response = await this.makeNetworkRequest<T>(request);
      
      // Cache successful responses
      if (response.status >= 200 && response.status < 300 && !request.skipCache) {
        this.cacheService.set(cacheKey, response.data, request.cacheTTL);
      }

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime, false);

      return {
        data: response.data,
        fromCache: false,
        timestamp: Date.now(),
        status: response.status,
        headers: response.headers,
      };

    } catch (error) {
      this.updatePerformanceMetrics(Date.now() - startTime, true);
      
      // Try to return cached data as fallback for network errors
      if (!request.skipCache) {
        const cachedData = this.cacheService.get<T>(cacheKey);
        if (cachedData) {
          return {
            data: cachedData,
            fromCache: true,
            timestamp: Date.now(),
            status: 200,
          };
        }
      }

      throw error;
    }
  }

  /**
   * Get current cache statistics
   */
  public getCacheStats() {
    return this.cacheService.getStats();
  }

  /**
   * Get current network state
   */
  public getNetworkState() {
    return this.reconnectionService.getState();
  }

  /**
   * Get current polling interval (adaptive)
   */
  public getCurrentPollingInterval(): number {
    return this.currentPollingInterval;
  }

  /**
   * Force network reconnection attempt
   */
  public async forceReconnect(): Promise<boolean> {
    return await this.reconnectionService.forceReconnect();
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.cacheService.clear();
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Optimize polling interval based on system performance
   */
  public optimizePollingInterval(): void {
    if (!this.config.adaptivePolling) {
      return;
    }

    const now = Date.now();
    const timeSinceLastCheck = now - this.performanceMetrics.lastPerformanceCheck;

    // Only adjust every minute
    if (timeSinceLastCheck < 60000) {
      return;
    }

    const errorRate = this.performanceMetrics.requestCount > 0 
      ? this.performanceMetrics.errorCount / this.performanceMetrics.requestCount 
      : 0;

    const avgResponseTime = this.performanceMetrics.averageResponseTime;

    // Increase interval if high error rate or slow responses
    if (errorRate > 0.2 || avgResponseTime > 5000) {
      this.currentPollingInterval = Math.min(
        this.currentPollingInterval * 1.5,
        this.config.maxPollingInterval
      );
    }
    // Decrease interval if performance is good
    else if (errorRate < 0.05 && avgResponseTime < 1000) {
      this.currentPollingInterval = Math.max(
        this.currentPollingInterval * 0.8,
        this.config.minPollingInterval
      );
    }

    this.performanceMetrics.lastPerformanceCheck = now;
  }

  /**
   * Destroy the service and cleanup resources
   */
  public destroy(): void {
    this.cacheService.destroy();
    this.reconnectionService.destroy();
  }

  /**
   * Test network connection
   */
  private async testNetworkConnection(): Promise<boolean> {
    try {
      // Simple connectivity test - try to fetch a small resource
      const response = await fetch('https://httpbin.org/status/200', {
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Make actual network request
   */
  private async makeNetworkRequest<T>(request: NetworkRequest): Promise<{
    data: T;
    status: number;
    headers?: Record<string, string>;
  }> {
    const fetchOptions: RequestInit = {
      method: request.method || 'GET',
      headers: request.headers,
    };

    if (request.body && request.method !== 'GET') {
      fetchOptions.body = typeof request.body === 'string' 
        ? request.body 
        : JSON.stringify(request.body);
      
      if (!request.headers?.['Content-Type']) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json',
        };
      }
    }

    const response = await fetch(request.url, fetchOptions);

    if (!response.ok) {
      const error: ApiError = {
        type: response.status >= 500 ? 'network' : 'validation',
        message: `HTTP ${response.status}: ${response.statusText}`,
        retryable: response.status >= 500 || response.status === 429,
        timestamp: Date.now(),
      };
      throw error;
    }

    const data = await response.json();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      data,
      status: response.status,
      headers,
    };
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: NetworkRequest): string {
    const keyParts = [
      request.method || 'GET',
      request.url,
    ];

    if (request.body) {
      keyParts.push(JSON.stringify(request.body));
    }

    return keyParts.join('|');
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(responseTime: number, isError: boolean): void {
    this.performanceMetrics.requestCount++;
    
    if (isError) {
      this.performanceMetrics.errorCount++;
    }

    // Update average response time using exponential moving average
    const alpha = 0.1; // Smoothing factor
    this.performanceMetrics.averageResponseTime = 
      (1 - alpha) * this.performanceMetrics.averageResponseTime + alpha * responseTime;
  }

  /**
   * Setup reconnection event callbacks
   */
  private setupReconnectionCallbacks(): void {
    this.reconnectionService.onConnectionLost(() => {
      // When connection is lost, increase polling interval to reduce load
      if (this.config.adaptivePolling) {
        this.currentPollingInterval = Math.min(
          this.currentPollingInterval * 2,
          this.config.maxPollingInterval
        );
      }
    });

    this.reconnectionService.onReconnected(() => {
      // When connection is restored, reset to base polling interval
      if (this.config.adaptivePolling) {
        this.currentPollingInterval = this.config.basePollingInterval;
      }
    });
  }
}