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
   * Returns null if configuration is missing (for demo mode fallback)
   * Enforces HTTPS for all API communications
   */
  public initializeConfig(): FunifierConfig | null {
    const serverUrl = import.meta.env.VITE_FUNIFIER_SERVER_URL;
    const apiKey = import.meta.env.VITE_FUNIFIER_API_KEY;
    const authToken = import.meta.env.VITE_FUNIFIER_AUTH_TOKEN;
    
    // Security: Do not log sensitive credentials
    // Only log configuration status, not actual values
    
    // Return null instead of throwing error to allow demo mode fallback
    if (!serverUrl || !apiKey || !authToken) {
      console.warn(
        'Missing Funifier configuration. Falling back to demo mode.'
      );
      return null;
    }

    // Security: Enforce HTTPS for all API communications
    const cleanServerUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
    if (!cleanServerUrl.startsWith('https://')) {
      console.error('Security Error: API server URL must use HTTPS protocol');
      return null;
    }

    this.config = {
      serverUrl: cleanServerUrl,
      apiKey,
      authToken,
    };

    return this.config;
  }

  /**
   * Get current configuration
   * Returns null if configuration is not available (for demo mode fallback)
   */
  public getConfig(): FunifierConfig | null {
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
      return !!(config && config.serverUrl && config.apiKey && config.authToken);
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