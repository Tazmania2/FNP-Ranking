import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless function to fetch daily code from Google Sheets
 * This runs on the server, keeping API credentials secure
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get credentials from environment (server-side only, not exposed to browser)
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!apiKey || !spreadsheetId) {
    console.error('Missing Google Sheets configuration');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Fetch data from Google Sheets
    const range = 'Sheet1!A:B';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      range
    )}?key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API error:', response.status, errorText);
      
      if (response.status === 403) {
        return res.status(403).json({ 
          error: 'Access denied. Check API key and sheet permissions.' 
        });
      }
      
      if (response.status === 404) {
        return res.status(404).json({ 
          error: 'Spreadsheet not found.' 
        });
      }

      return res.status(response.status).json({ 
        error: 'Failed to fetch from Google Sheets' 
      });
    }

    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      return res.status(404).json({ error: 'No data found in spreadsheet' });
    }

    // Get today's date in DD/MM/YYYY format
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const todayFormatted = `${day}/${month}/${year}`;

    // Skip header row (index 0) and find today's date
    for (let i = 1; i < data.values.length; i++) {
      const row = data.values[i];
      if (row.length >= 2) {
        const dateCell = row[0]?.trim();
        const passcode = row[1]?.trim();

        if (dateCell === todayFormatted && passcode) {
          return res.status(200).json({ code: passcode });
        }
      }
    }

    // If today's date not found
    return res.status(404).json({ 
      error: `Código não encontrado para hoje (${todayFormatted})` 
    });

  } catch (error: any) {
    console.error('Error fetching daily code:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}
