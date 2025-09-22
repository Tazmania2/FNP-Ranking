/**
 * Input validation and sanitization utilities
 * Provides XSS protection and input validation for user data
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags using a more comprehensive approach
  let sanitized = input;
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
  
  return sanitized.trim();
}

/**
 * Validate and sanitize player name
 */
export function validatePlayerName(name: string): string {
  const sanitized = sanitizeString(name);
  // Limit length and ensure it's not empty
  return sanitized.slice(0, 100) || 'Unknown Player';
}

/**
 * Validate numeric input (scores, positions)
 */
export function validateNumber(value: any): number {
  const num = Number(value);
  return isNaN(num) ? 0 : Math.max(0, num);
}

/**
 * Validate URL input
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate API configuration
 */
export function validateApiConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  return (
    typeof config.serverUrl === 'string' &&
    validateUrl(config.serverUrl) &&
    typeof config.apiKey === 'string' &&
    config.apiKey.length > 0 &&
    typeof config.authToken === 'string' &&
    config.authToken.length > 0
  );
}