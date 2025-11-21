import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { GoogleSheetsService } from '../googleSheetsService';
import type { GoogleSheetsConfig } from '../../types';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('GoogleSheetsService', () => {
  let service: GoogleSheetsService;
  let mockConfig: GoogleSheetsConfig;

  beforeEach(() => {
    mockConfig = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      apiKey: 'test-api-key',
      spreadsheetId: 'test-spreadsheet-id',
      range: 'Sheet1!A1:B1',
    };

    // Mock axios.create to return a mock instance
    mockedAxios.create = vi.fn(() => ({
      get: vi.fn(),
    }));

    service = new GoogleSheetsService(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getDailyCode', () => {
    it('should fetch and return the daily code successfully', async () => {
      const mockResponse = {
        data: {
          values: [['Código do Dia', 'ABC123']],
        },
      };

      // Mock the axios instance get method
      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      (service as any).axiosInstance.get = mockGet;

      const code = await service.getDailyCode();

      expect(code).toBe('ABC123');
      expect(mockGet).toHaveBeenCalledWith(
        '/spreadsheets/test-spreadsheet-id/values/Sheet1!A1%3AB1',
        {
          params: {
            key: 'test-api-key',
          },
        }
      );
    });

    it('should return first column value if only one column exists', async () => {
      const mockResponse = {
        data: {
          values: [['XYZ789']],
        },
      };

      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      (service as any).axiosInstance.get = mockGet;

      const code = await service.getDailyCode();

      expect(code).toBe('XYZ789');
    });

    it('should throw validation error when no data is found', async () => {
      const mockResponse = {
        data: {
          values: [],
        },
      };

      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      (service as any).axiosInstance.get = mockGet;

      try {
        await service.getDailyCode();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.type).toBe('validation');
        expect(error.message).toBe('No data found in the specified range');
        expect(error.retryable).toBe(false);
      }
    });

    it('should handle 403 authentication errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: {
          status: 403,
        },
      };

      const mockGet = vi.fn().mockRejectedValue(mockError);
      (service as any).axiosInstance.get = mockGet;
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      await expect(service.getDailyCode()).rejects.toMatchObject({
        type: 'auth',
        message: 'Access denied. Please check API key and sheet permissions.',
        retryable: false,
      });
    });

    it('should handle 404 not found errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: {
          status: 404,
        },
      };

      const mockGet = vi.fn().mockRejectedValue(mockError);
      (service as any).axiosInstance.get = mockGet;
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      await expect(service.getDailyCode()).rejects.toMatchObject({
        type: 'not_found',
        message:
          'Spreadsheet or range not found. Please check the spreadsheet ID and range.',
        retryable: false,
      });
    });

    it('should retry on rate limit errors', async () => {
      const mockError = {
        isAxiosError: true,
        response: {
          status: 429,
        },
      };

      const mockGet = vi
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          data: {
            values: [['Código do Dia', 'RETRY123']],
          },
        });

      (service as any).axiosInstance.get = mockGet;
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      // Mock setTimeout to avoid actual delays in tests
      vi.useFakeTimers();

      const codePromise = service.getDailyCode();

      // Fast-forward through all timers
      await vi.runAllTimersAsync();

      const code = await codePromise;

      expect(code).toBe('RETRY123');
      expect(mockGet).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });

    it('should retry on network errors', async () => {
      const mockError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
      };

      const mockGet = vi
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce({
          data: {
            values: [['Código do Dia', 'NETWORK123']],
          },
        });

      (service as any).axiosInstance.get = mockGet;
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      vi.useFakeTimers();

      const codePromise = service.getDailyCode();
      await vi.runAllTimersAsync();

      const code = await codePromise;

      expect(code).toBe('NETWORK123');
      expect(mockGet).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should fail after max retry attempts', async () => {
      const mockError = {
        isAxiosError: true,
        response: {
          status: 429,
        },
      };

      const mockGet = vi.fn().mockRejectedValue(mockError);
      (service as any).axiosInstance.get = mockGet;
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      vi.useFakeTimers();

      const codePromise = service.getDailyCode();
      await vi.runAllTimersAsync();

      await expect(codePromise).rejects.toMatchObject({
        type: 'rate_limit',
        retryable: true,
      });

      // Should try 3 times (initial + 2 retries)
      expect(mockGet).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      const mockResponse = {
        data: {
          values: [['Código do Dia', 'TEST123']],
        },
      };

      const mockGet = vi.fn().mockResolvedValue(mockResponse);
      (service as any).axiosInstance.get = mockGet;

      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      const mockError = {
        isAxiosError: true,
        response: {
          status: 403,
        },
      };

      const mockGet = vi.fn().mockRejectedValue(mockError);
      (service as any).axiosInstance.get = mockGet;
      mockedAxios.isAxiosError = vi.fn().mockReturnValue(true);

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });
});
