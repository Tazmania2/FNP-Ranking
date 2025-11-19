import axios, { type AxiosInstance, AxiosError } from 'axios';
import type { GoogleSheetsConfig, GoogleSheetsResponse } from '../types';

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
 * Handles fetching data from Google Sheets using the Google Sheets API v4
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
    this.axiosInstance = axios.create({
      baseURL: 'https://sheets.googleapis.com/v4',
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
      // Fetch all data from columns A and B (date and passcode)
      const range = this.config.range || 'Sheet1!A:B';
      const response = await this.fetchSheetData(
        this.config.spreadsheetId,
        range
      );

      if (!response.values || response.values.length === 0) {
        throw this.createError(
          'validation',
          'No data found in the spreadsheet',
          false
        );
      }

      // Get today's date in DD/MM/YYYY format
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const todayFormatted = `${day}/${month}/${year}`;

      // Skip header row (index 0) and find today's date
      for (let i = 1; i < response.values.length; i++) {
        const row = response.values[i];
        if (row.length >= 2) {
          const dateCell = row[0]?.trim();
          const passcode = row[1]?.trim();

          if (dateCell === todayFormatted && passcode) {
            return passcode;
          }
        }
      }

      // If today's date not found, throw error
      throw this.createError(
        'validation',
        `Código não encontrado para hoje (${todayFormatted})`,
        false
      );
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
    const timestamp = Date.now();

    // Check if it's already a GoogleSheetsError first
    if (error && typeof error === 'object' && 'type' in error && 'retryable' in error) {
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
      // Check if it's already a GoogleSheetsError
      if ('type' in error && 'retryable' in error) {
        return error as GoogleSheetsError;
      }

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
   * Fetch data from a Google Sheet
   * @param spreadsheetId The ID of the spreadsheet
   * @param range The A1 notation range to fetch
   * @returns The sheet data
   */
  private async fetchSheetData(
    spreadsheetId: string,
    range: string
  ): Promise<GoogleSheetsResponse> {
    const url = `/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}`;

    const response = await this.axiosInstance.get<GoogleSheetsResponse>(url, {
      params: {
        key: this.config.apiKey,
      },
    });

    return response.data;
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
