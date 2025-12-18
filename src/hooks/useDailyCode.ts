import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { googleSheetsConfig } from '../config/googleSheets';
import type { DailyCodeCache } from '../types';

const CACHE_KEY = 'daily_code_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour - force refresh every hour

interface UseDailyCodeReturn {
  code: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and cache the daily code from Google Sheets
 * Implements 24-hour caching to minimize API calls
 */
export const useDailyCode = (): UseDailyCodeReturn => {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get cached code from localStorage
   */
  const getCachedCode = useCallback((): string | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      const cacheData: DailyCodeCache = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now < cacheData.expiresAt) {
        console.log('Using cached daily code');
        return cacheData.code;
      }

      // Cache expired, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch (error) {
      console.error('Error reading cached code:', error);
      // If there's an error parsing cache, remove it
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  }, []);

  /**
   * Save code to localStorage cache
   */
  const setCachedCode = useCallback((codeValue: string): void => {
    try {
      const now = Date.now();
      const cacheData: DailyCodeCache = {
        code: codeValue,
        timestamp: now,
        expiresAt: now + CACHE_DURATION,
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('Daily code cached successfully');
    } catch (error) {
      console.error('Error caching code:', error);
      // If we can't cache, it's not critical - just log the error
    }
  }, []);

  /**
   * Fetch code from Google Sheets
   */
  const fetchCode = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Check if Google Sheets is configured
      const config = googleSheetsConfig.getConfig();
      if (!config) {
        throw new Error(
          'Google Sheets API is not configured. Please check your environment variables.'
        );
      }

      // Create service and fetch code
      const service = new GoogleSheetsService(config);
      const fetchedCode = await service.getDailyCode();

      // Update state and cache
      setCode(fetchedCode);
      setCachedCode(fetchedCode);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch daily code:', err);

      // Try to use cached code as fallback
      const cachedCode = getCachedCode();
      if (cachedCode) {
        console.log('Using cached code as fallback after fetch error');
        setCode(cachedCode);
        setError('Usando código em cache. Erro ao buscar novo código.');
      } else {
        setCode(null);
        setError(
          err.message || 'Erro ao buscar código do dia. Tente novamente mais tarde.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [getCachedCode, setCachedCode]);

  /**
   * Initialize: check cache first, then fetch if needed
   * Also set up periodic refresh
   */
  useEffect(() => {
    const initializeCode = async () => {
      // First, try to get cached code
      const cachedCode = getCachedCode();

      if (cachedCode) {
        // We have valid cached code, use it
        setCode(cachedCode);
        setLoading(false);
        setError(null);
        
        // Still fetch in background to ensure we have the latest
        fetchCode();
      } else {
        // No valid cache, fetch from API
        await fetchCode();
      }
    };

    initializeCode();

    // Set up periodic refresh to keep code updated
    intervalRef.current = setInterval(() => {
      console.log('Auto-refreshing daily code...');
      fetchCode();
    }, REFRESH_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [getCachedCode, fetchCode]);

  // Also refresh when page becomes visible again and on focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && code) {
        console.log('Page became visible, refreshing daily code...');
        fetchCode();
      }
    };

    const handleFocus = () => {
      console.log('Window focused, refreshing daily code...');
      fetchCode();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchCode, code]);

  return {
    code,
    loading,
    error,
    refetch: fetchCode,
  };
};
