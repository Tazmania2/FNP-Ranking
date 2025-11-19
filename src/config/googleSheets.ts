import type { GoogleSheetsConfig } from '../types';

/**
 * Google Sheets API Configuration
 * Reads configuration from environment variables
 */
class GoogleSheetsConfigManager {
  private config: GoogleSheetsConfig | null = null;

  /**
   * Get Google Sheets configuration from environment variables
   */
  public getConfig(): GoogleSheetsConfig | null {
    if (this.config) {
      return this.config;
    }

    const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_SECRET;
    const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEETS_SPREADSHEET_ID;

    // Validate that all required config is present
    if (!clientId || !clientSecret || !apiKey || !spreadsheetId) {
      console.warn('⚠️ Google Sheets API configuration is incomplete');
      return null;
    }

    this.config = {
      clientId,
      clientSecret,
      apiKey,
      spreadsheetId,
      range: 'Sheet1!A:B', // Fetch all rows from columns A and B
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
