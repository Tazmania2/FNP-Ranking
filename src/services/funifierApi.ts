import axios, { type AxiosInstance, AxiosError } from 'axios';
import type {
  FunifierConfig,
  Leaderboard,
  Player,
  LeaderboardResponse,
  LeaderboardOptions,
  ApiError,
} from '../types';
import { apiConfig } from '../config/api';
import {
  validateApiConfig,
  validatePlayerName,
  validateNumber,
} from '../utils/validation';

/**
 * Funifier API Service for handling all API communications
 * Implements authentication, error handling, and retry logic
 */
export class FunifierApiService {
  private axiosInstance: AxiosInstance;
  private config: FunifierConfig;
  private retryAttempts = 3;
  private retryDelay = 1000; // Base delay in milliseconds

  constructor(customConfig?: FunifierConfig) {
    this.config = customConfig || apiConfig.getConfig();

    // Validate API configuration for security
    if (!validateApiConfig(this.config)) {
      throw new Error('Invalid API configuration provided');
    }

    this.axiosInstance = this.createAxiosInstance();
  }

  /**
   * Create configured axios instance with authentication
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.serverUrl,
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.config.authToken,
        'X-API-Key': this.config.apiKey,
      },
    });

    // Add response interceptor for error handling
    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const apiError = this.handleApiError(error);
        return Promise.reject(apiError);
      }
    );

    return instance;
  }

  /**
   * Handle API errors and convert to standardized format
   */
  private handleApiError(error: AxiosError): ApiError {
    const timestamp = Date.now();

    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      return {
        type: 'network',
        message:
          'Network connection failed. Please check your internet connection.',
        retryable: true,
        timestamp,
        originalError: error,
      };
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return {
        type: 'auth',
        message: 'Authentication failed. Please check your API credentials.',
        retryable: false,
        timestamp,
        originalError: error,
      };
    }

    if (error.response?.status === 404) {
      return {
        type: 'validation',
        message: 'Requested resource not found.',
        retryable: false,
        timestamp,
        originalError: error,
      };
    }

    if (error.response?.status === 429) {
      return {
        type: 'network',
        message: 'Rate limit exceeded. Please try again later.',
        retryable: true,
        timestamp,
        originalError: error,
      };
    }

    if (error.response?.status && error.response.status >= 500) {
      return {
        type: 'network',
        message: 'Server error occurred. Please try again later.',
        retryable: true,
        timestamp,
        originalError: error,
      };
    }

    return {
      type: 'validation',
      message: error.message || 'An unexpected error occurred.',
      retryable: false,
      timestamp,
      originalError: error,
    };
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      // Handle both ApiError and raw AxiosError
      let apiError: ApiError;
      if (error && typeof error === 'object' && 'type' in error) {
        apiError = error as ApiError;
      } else {
        apiError = this.handleApiError(error as AxiosError);
      }

      if (!apiError.retryable || attempt >= this.retryAttempts) {
        throw apiError;
      }

      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.retryRequest(requestFn, attempt + 1);
    }
  }

  /**
   * Set authentication token (useful for token refresh)
   */
  public setAuthToken(token: string): void {
    this.config.authToken = token;
    this.axiosInstance.defaults.headers['Authorization'] = token;
  }

  /**
   * Fetch list of available leaderboards
   */
  public async getLeaderboards(): Promise<Leaderboard[]> {
    console.log('🚀 getLeaderboards() called');
    console.log('🚀 API Config:', {
      serverUrl: this.config.serverUrl,
      hasApiKey: !!this.config.apiKey,
      hasAuthToken: !!this.config.authToken
    });
    
    return this.retryRequest(async () => {
      console.log('🌐 Making HTTP request to:', `${this.config.serverUrl}/leaderboard`);
      const response = await this.axiosInstance.get('/leaderboard');
      console.log('✅ Leaderboards response received:', response.data);

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid leaderboards response format');
      }

      // Sanitize leaderboard data
      const sanitizedLeaderboards = response.data.map((leaderboard: any) => ({
        _id: leaderboard._id || '',
        title: leaderboard.title || `Leaderboard ${leaderboard._id}`,
        description: leaderboard.description || '',
        principalType: leaderboard.principalType || 0,
        operation: leaderboard.operation || 'sum',
        period: leaderboard.period || 'all',
      }));

      console.log('🧹 Sanitized leaderboards:', sanitizedLeaderboards);
      return sanitizedLeaderboards as Leaderboard[];
    });
  }

  /**
   * Fetch leaderboard data with players using the aggregate endpoint
   */
  public async getLeaderboardData(
    leaderboardId: string,
    options: LeaderboardOptions = {}
  ): Promise<LeaderboardResponse> {
    return this.retryRequest(async () => {
      const params = new URLSearchParams();

      if (options.live !== undefined) {
        params.append('live', options.live.toString());
      }
      if (options.period !== undefined) {
        params.append('period', options.period);
      } else {
        params.append('period', ''); // Default empty period
      }

      // Use the aggregate endpoint that matches your working test
      const url = `/leaderboard/${leaderboardId}/leader/aggregate?${params.toString()}`;
      console.log(
        'Fetching leaderboard data from:',
        `${this.config.serverUrl}${url}`
      );
      const response = await this.axiosInstance.post(url, []);
      console.log('Leaderboard data response:', response.data);

      // The API returns an array of players directly
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid leaderboard data response format');
      }

      // Sanitize player data to prevent XSS
      const sanitizedPlayers = response.data.map((player: any) => ({
        ...player,
        name: validatePlayerName(player.name || ''),
        total: validateNumber(player.total),
        position: validateNumber(player.position),
        previous_total: player.previous_total
          ? validateNumber(player.previous_total)
          : undefined,
        previous_position: player.previous_position
          ? validateNumber(player.previous_position)
          : undefined,
      }));

      // Return in the expected format
      return {
        leaderboard: {
          _id: leaderboardId,
          title: `Leaderboard ${leaderboardId}`,
          description: 'Live leaderboard data',
        },
        leaders: sanitizedPlayers,
      } as LeaderboardResponse;
    });
  }

  /**
   * Get player details by ID
   */
  public async getPlayerDetails(playerId: string): Promise<Player> {
    return this.retryRequest(async () => {
      const response = await this.axiosInstance.get(`/players/${playerId}`);

      if (!response.data || !response.data._id) {
        throw new Error('Invalid player data response format');
      }

      // Sanitize player data
      const sanitizedPlayer = {
        ...response.data,
        name: validatePlayerName(response.data.name || ''),
        total: validateNumber(response.data.total),
        position: validateNumber(response.data.position),
        previous_total: response.data.previous_total
          ? validateNumber(response.data.previous_total)
          : undefined,
        previous_position: response.data.previous_position
          ? validateNumber(response.data.previous_position)
          : undefined,
      };

      return sanitizedPlayer as Player;
    });
  }

  /**
   * Test API connection and authentication
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Use the working aggregate endpoint instead of getLeaderboards
      await this.getLeaderboardData('EVeTmET', { live: true });
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): FunifierConfig {
    return { ...this.config };
  }
}
