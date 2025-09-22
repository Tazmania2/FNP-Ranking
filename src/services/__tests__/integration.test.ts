import { describe, it, expect } from 'vitest';
import { FunifierApiService } from '../funifierApi';
import { FunifierConfig } from '../../types';

describe('FunifierApiService Integration', () => {
  const testConfig: FunifierConfig = {
    serverUrl: 'https://test.funifier.com',
    apiKey: 'test-api-key',
    authToken: 'Basic test-token',
  };

  it('should create service instance with valid configuration', () => {
    const service = new FunifierApiService(testConfig);
    
    expect(service).toBeInstanceOf(FunifierApiService);
    expect(service.getConfig()).toEqual(testConfig);
  });

  it('should handle configuration updates', () => {
    const service = new FunifierApiService(testConfig);
    
    service.setAuthToken('Basic new-token');
    
    const updatedConfig = service.getConfig();
    expect(updatedConfig.authToken).toBe('Basic new-token');
    expect(updatedConfig.serverUrl).toBe(testConfig.serverUrl);
    expect(updatedConfig.apiKey).toBe(testConfig.apiKey);
  });

  it('should validate error handling structure', () => {
    const service = new FunifierApiService(testConfig);
    
    // Test that the service has the expected methods
    expect(typeof service.getLeaderboards).toBe('function');
    expect(typeof service.getLeaderboardData).toBe('function');
    expect(typeof service.getPlayerDetails).toBe('function');
    expect(typeof service.testConnection).toBe('function');
    expect(typeof service.setAuthToken).toBe('function');
    expect(typeof service.getConfig).toBe('function');
  });
});