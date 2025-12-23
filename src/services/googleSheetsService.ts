import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { GoogleSheetsConfig } from '../types';

/**
 * Error types for Google Sheets operations
 */
export interface GoogleSheetsError {
  type: 'network' | 'auth' | 'not_found' | 'rate_limit' | 'validation';
  message: string;
  retryable: boolean;
  timestamp: number;
  originalError?: Error;
}

/**
 * Google Sheets API Service
 * Handles fetching data from Google Sheets via serverless API endpoint
 * Includes retry logic with exponential backoff
 */
export class GoogleSheetsService {
  private axiosInstance: AxiosInstance;
  private config: GoogleSheetsConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private retryAttempts = 3;
  private retryDelay = 1000; // Base delay in milliseconds

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    // Use the serverless API endpoint instead of calling Google Sheets directly
    this.axiosInstance = axios.create({
      baseURL: '/api',
      timeout: 10000,
    });
  }

  /**
   * Get the daily code from the configured Google Sheet
   * Includes retry logic with exponential backoff
   * @returns The daily code as a string
   */
  public async getDailyCode(): Promise<string> {
    return this.retryRequest(async () => {
      const response = await this.fetchDailyCodeFromAPI();
      return response.code;
    });
  }

  /**
   * Retry logic with exponential backoff
   * @param requestFn The function to retry
   * @param attempt Current attempt number
   * @returns The result of the request
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error) {
      const sheetsError = this.handleError(error);

      if (!sheetsError.retryable || attempt >= this.retryAttempts) {
        throw sheetsError;
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = this.retryDelay * Math.pow(2, attempt - 1);
      console.log(
        `Retrying Google Sheets request (attempt ${attempt + 1}/${
          this.retryAttempts
        }) after ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryRequest(requestFn, attempt + 1);
    }
  }

  /**
   * Handle errors and convert to standardized format
   * @param error The error to handle
   * @returns Standardized GoogleSheetsError
   */
  private handleError(error: unknown): GoogleSheetsError {
    // Check if it's already a GoogleSheetsError first
    if (error && typeof error === 'object' && 'type' in error && 'retryable' in error && 'timestamp' in error) {
      return error as GoogleSheetsError;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 403) {
        return this.createError(
          'auth',
          'Access denied. Please check API key and sheet permissions.',
          false,
          error
        );
      }

      if (axiosError.response?.status === 404) {
        return this.createError(
          'not_found',
          'Spreadsheet or range not found. Please check the spreadsheet ID and range.',
          false,
          error
        );
      }

      if (axiosError.response?.status === 429) {
        return this.createError(
          'rate_limit',
          'Rate limit exceeded. Please try again later.',
          true,
          error
        );
      }

      if (
        axiosError.code === 'ECONNABORTED' ||
        axiosError.code === 'ENOTFOUND'
      ) {
        return this.createError(
          'network',
          'Network error. Please check your internet connection.',
          true,
          error
        );
      }

      if (axiosError.response?.status && axiosError.response.status >= 500) {
        return this.createError(
          'network',
          'Google Sheets server error. Please try again later.',
          true,
          error
        );
      }
    }

    if (error instanceof Error) {
      return this.createError('validation', error.message, false, error);
    }

    return this.createError(
      'validation',
      'An unexpected error occurred',
      false
    );
  }

  /**
   * Create a standardized error object
   */
  private createError(
    type: GoogleSheetsError['type'],
    message: string,
    retryable: boolean,
    originalError?: Error
  ): GoogleSheetsError {
    return {
      type,
      message,
      retryable,
      timestamp: Date.now(),
      originalError,
    };
  }

  /**
   * Fetch daily code from serverless API endpoint
   * @returns The daily code response
   */
  private async fetchDailyCodeFromAPI(): Promise<{ code: string }> {
    const url = '/daily-code';

    console.log('Fetching daily code from API:', {
      url: `${this.axiosInstance.defaults.baseURL || ''}${url}`,
    });

    try {
      const response = await this.axiosInstance.get<{ code: string }>(url);

      console.log('Daily code fetch successful');

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Daily code API error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
        });
      }
      throw error;
    }
  }

  /**
   * Test the connection to Google Sheets API
   * @returns true if connection is successful
   */
  public async testConnection(): Promise<boolean> {
    try {
      await this.getDailyCode();
      return true;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }
}
