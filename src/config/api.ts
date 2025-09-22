import type { FunifierConfig } from '../types';

/**
 * API Configuration management for Funifier integration
 * Uses environment variables for secure configuration
 */
export class ApiConfigManager {
  private static instance: ApiConfigManager;
  private config: FunifierConfig | null = null;

  private constructor() {}

  public static getInstance(): ApiConfigManager {
    if (!ApiConfigManager.instance) {
      ApiConfigManager.instance = new ApiConfigManager();
    }
    return ApiConfigManager.instance;
  }

  /**
   * Initialize configuration from environment variables
   */
  public initializeConfig(): FunifierConfig {
    const serverUrl = import.meta.env.VITE_FUNIFIER_SERVER_URL;
    const apiKey = import.meta.env.VITE_FUNIFIER_API_KEY;
    const authToken = import.meta.env.VITE_FUNIFIER_AUTH_TOKEN;

    if (!serverUrl || !apiKey || !authToken) {
      throw new Error(
        'Missing required Funifier configuration. Please check your environment variables: VITE_FUNIFIER_SERVER_URL, VITE_FUNIFIER_API_KEY, VITE_FUNIFIER_AUTH_TOKEN'
      );
    }

    this.config = {
      serverUrl: serverUrl.replace(/\/$/, ''), // Remove trailing slash
      apiKey,
      authToken,
    };

    return this.config;
  }

  /**
   * Get current configuration
   */
  public getConfig(): FunifierConfig {
    if (!this.config) {
      return this.initializeConfig();
    }
    return this.config;
  }

  /**
   * Validate configuration
   */
  public validateConfig(): boolean {
    try {
      const config = this.getConfig();
      return !!(config.serverUrl && config.apiKey && config.authToken);
    } catch {
      return false;
    }
  }

  /**
   * Update configuration (useful for testing)
   */
  public updateConfig(newConfig: Partial<FunifierConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
    }
  }
}

// Export singleton instance
export const apiConfig = ApiConfigManager.getInstance();