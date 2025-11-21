import type { GoogleSheetsConfig } from '../types';

/**
 * Google Sheets API Configuration
 * Reads configuration from environment variables
 */
class GoogleSheetsConfigManager {
  private config: GoogleSheetsConfig | null = null;

  /**
   * Get Google Sheets configuration from environment variables
   * Note: API calls now go through serverless endpoint, so we just need
   * a minimal config to indicate the feature is enabled
   */
  public getConfig(): GoogleSheetsConfig | null {
    if (this.config) {
      return this.config;
    }

    // We still keep these for backward compatibility, but they're not used in browser
    const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_SECRET;
    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;

    // For the serverless approach, we just need to know if it's configured
    // The actual API key and credentials are on the server side
    this.config = {
      clientId: clientId || '',
      clientSecret: clientSecret || '',
      apiKey: apiKey || '',
      spreadsheetId: spreadsheetId || '',
      range: 'Sheet1!A:B',
    };

    return this.config;
  }

  /**
   * Check if Google Sheets configuration is available
   */
  public isConfigured(): boolean {
    return this.getConfig() !== null;
  }

  /**
   * Reset configuration (useful for testing)
   */
  public resetConfig(): void {
    this.config = null;
  }
}

// Export singleton instance
export const googleSheetsConfig = new GoogleSheetsConfigManager();
