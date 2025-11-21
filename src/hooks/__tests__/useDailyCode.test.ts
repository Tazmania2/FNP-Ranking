import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDailyCode } from '../useDailyCode';
import { GoogleSheetsService } from '../../services/googleSheetsService';
import { googleSheetsConfig } from '../../config/googleSheets';

// Mock the dependencies
vi.mock('../../services/googleSheetsService');
vi.mock('../../config/googleSheets');

const MockedGoogleSheetsService = GoogleSheetsService as any;
const mockedGoogleSheetsConfig = googleSheetsConfig as any;

describe('useDailyCode', () => {
  let mockGetDailyCode: any;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(),
    } as any;

    // Mock GoogleSheetsService
    mockGetDailyCode = vi.fn();
    MockedGoogleSheetsService.mockImplementation(() => ({
      getDailyCode: mockGetDailyCode,
    }));

    // Mock googleSheetsConfig
    mockedGoogleSheetsConfig.getConfig = vi.fn().mockReturnValue({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      apiKey: 'test-api-key',
      spreadsheetId: 'test-spreadsheet-id',
      range: 'Sheet1!A1:B1',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and return code when no cache exists', async () => {
    mockGetDailyCode.mockResolvedValue('TEST123');

    const { result } = renderHook(() => useDailyCode());

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.code).toBe(null);

    // Wait for fetch to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe('TEST123');
    expect(result.current.error).toBe(null);
    expect(mockGetDailyCode).toHaveBeenCalledTimes(1);
  });

  it('should use cached code when valid cache exists', async () => {
    const now = Date.now();
    const cachedData = {
      code: 'CACHED456',
      timestamp: now,
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours from now
    };

    mockLocalStorage['daily_code_cache'] = JSON.stringify(cachedData);

    const { result } = renderHook(() => useDailyCode());

    // Should use cached code immediately
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe('CACHED456');
    expect(result.current.error).toBe(null);
    expect(mockGetDailyCode).not.toHaveBeenCalled();
  });

  it('should fetch new code when cache is expired', async () => {
    const now = Date.now();
    const expiredData = {
      code: 'EXPIRED789',
      timestamp: now - 25 * 60 * 60 * 1000, // 25 hours ago
      expiresAt: now - 1 * 60 * 60 * 1000, // 1 hour ago (expired)
    };

    mockLocalStorage['daily_code_cache'] = JSON.stringify(expiredData);
    mockGetDailyCode.mockResolvedValue('FRESH999');

    const { result } = renderHook(() => useDailyCode());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe('FRESH999');
    expect(result.current.error).toBe(null);
    expect(mockGetDailyCode).toHaveBeenCalledTimes(1);
    expect(localStorage.removeItem).toHaveBeenCalledWith('daily_code_cache');
  });

  it('should cache fetched code in localStorage', async () => {
    mockGetDailyCode.mockResolvedValue('NEWCODE111');

    const { result } = renderHook(() => useDailyCode());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(localStorage.setItem).toHaveBeenCalled();
    const setItemCalls = (localStorage.setItem as any).mock.calls;
    const cacheCall = setItemCalls.find(
      (call: any) => call[0] === 'daily_code_cache'
    );

    expect(cacheCall).toBeDefined();
    const cachedData = JSON.parse(cacheCall[1]);
    expect(cachedData.code).toBe('NEWCODE111');
    expect(cachedData.timestamp).toBeDefined();
    expect(cachedData.expiresAt).toBeDefined();
  });

  it('should handle fetch errors and use cached code as fallback', async () => {
    const now = Date.now();
    const cachedData = {
      code: 'FALLBACK222',
      timestamp: now,
      expiresAt: now + 24 * 60 * 60 * 1000,
    };

    mockLocalStorage['daily_code_cache'] = JSON.stringify(cachedData);
    mockGetDailyCode.mockRejectedValue(new Error('Network error'));

    // Force a refetch to trigger the error
    const { result } = renderHook(() => useDailyCode());

    // First it will use cache
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe('FALLBACK222');

    // Now trigger refetch which will fail
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still have the cached code
    expect(result.current.code).toBe('FALLBACK222');
    expect(result.current.error).toContain('cache');
  });

  it('should handle fetch errors when no cache exists', async () => {
    mockGetDailyCode.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useDailyCode());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe(null);
    expect(result.current.error).toBeDefined();
    expect(result.current.error).toBe('API error');
  });

  it('should handle missing Google Sheets configuration', async () => {
    mockedGoogleSheetsConfig.getConfig.mockReturnValue(null);

    const { result } = renderHook(() => useDailyCode());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe(null);
    expect(result.current.error).toContain('not configured');
  });

  it('should allow manual refetch', async () => {
    mockGetDailyCode
      .mockResolvedValueOnce('FIRST333')
      .mockResolvedValueOnce('SECOND444');

    const { result } = renderHook(() => useDailyCode());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe('FIRST333');

    // Trigger refetch
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe('SECOND444');
    expect(mockGetDailyCode).toHaveBeenCalledTimes(2);
  });

  it('should handle corrupted cache data', async () => {
    mockLocalStorage['daily_code_cache'] = 'invalid json {{{';
    mockGetDailyCode.mockResolvedValue('RECOVERED555');

    const { result } = renderHook(() => useDailyCode());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.code).toBe('RECOVERED555');
    expect(localStorage.removeItem).toHaveBeenCalledWith('daily_code_cache');
    expect(mockGetDailyCode).toHaveBeenCalledTimes(1);
  });
});
