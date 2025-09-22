import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { FunifierApiService } from '../funifierApi';
import { FunifierConfig, Leaderboard, LeaderboardResponse, Player } from '../../types';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('FunifierApiService', () => {
  let apiService: FunifierApiService;
  let mockAxiosInstance: any;

  const mockConfig: FunifierConfig = {
    serverUrl: 'https://test.funifier.com',
    apiKey: 'test-api-key',
    authToken: 'Basic test-token',
  };

  const mockLeaderboard: Leaderboard = {
    _id: 'test-leaderboard-id',
    title: 'Test Leaderboard',
    description: 'A test leaderboard',
    principalType: 0,
    operation: {
      type: 1,
      achievement_type: 1,
      item: 'points',
      sort: -1,
    },
    period: {
      type: 1,
      timeAmount: 1,
      timeScale: 1,
    },
  };

  const mockPlayer: Player = {
    _id: 'player-1',
    player: 'player-1',
    name: 'Test Player',
    position: 1,
    total: 100,
    previous_position: 2,
    previous_total: 90,
    move: 'up',
  };

  const mockLeaderboardResponse: LeaderboardResponse = {
    leaderboard: mockLeaderboard,
    leaders: [mockPlayer],
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock axios.create to return a mock instance
    mockAxiosInstance = {
      get: vi.fn(),
      defaults: {
        headers: {},
      },
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    // Create API service instance
    apiService = new FunifierApiService(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: mockConfig.serverUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': mockConfig.authToken,
          'X-API-Key': mockConfig.apiKey,
        },
      });
    });

    it('should set up response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('setAuthToken', () => {
    it('should update auth token in config and axios headers', () => {
      const newToken = 'Basic new-token';
      
      apiService.setAuthToken(newToken);
      
      expect(mockAxiosInstance.defaults.headers['Authorization']).toBe(newToken);
      expect(apiService.getConfig().authToken).toBe(newToken);
    });
  });

  describe('getLeaderboards', () => {
    it('should fetch leaderboards successfully', async () => {
      const mockLeaderboards = [mockLeaderboard];
      mockAxiosInstance.get.mockResolvedValue({ data: mockLeaderboards });

      const result = await apiService.getLeaderboards();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/leaderboards');
      expect(result).toEqual(mockLeaderboards);
    });

    it('should throw error for invalid response format', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: 'invalid' });

      await expect(apiService.getLeaderboards()).rejects.toThrow(
        'Invalid leaderboards response format'
      );
    });
  });

  describe('getLeaderboardData', () => {
    const leaderboardId = 'test-leaderboard-id';

    it('should fetch leaderboard data successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockLeaderboardResponse });

      const result = await apiService.getLeaderboardData(leaderboardId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/leaderboards/${leaderboardId}`);
      expect(result).toEqual(mockLeaderboardResponse);
    });

    it('should include query parameters when options provided', async () => {
      const options = {
        live: true,
        maxResults: 10,
        period: 'daily',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockLeaderboardResponse });

      await apiService.getLeaderboardData(leaderboardId, options);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/leaderboards/${leaderboardId}?live=true&maxResults=10&period=daily`
      );
    });

    it('should throw error for invalid response format', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { invalid: 'data' } });

      await expect(apiService.getLeaderboardData(leaderboardId)).rejects.toThrow(
        'Invalid leaderboard data response format'
      );
    });
  });

  describe('getPlayerDetails', () => {
    const playerId = 'player-1';

    it('should fetch player details successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockPlayer });

      const result = await apiService.getPlayerDetails(playerId);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/players/${playerId}`);
      expect(result).toEqual(mockPlayer);
    });

    it('should throw error for invalid response format', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { invalid: 'data' } });

      await expect(apiService.getPlayerDetails(playerId)).rejects.toThrow(
        'Invalid player data response format'
      );
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockLeaderboard] });

      const result = await apiService.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await apiService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the configuration', () => {
      const config = apiService.getConfig();
      
      expect(config).toEqual(mockConfig);
      expect(config).not.toBe(mockConfig); // Should be a copy, not the same reference
    });
  });
});