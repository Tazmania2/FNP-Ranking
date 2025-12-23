/**
 * Input validation and sanitization utilities
 * Provides XSS protection and input validation for user data
 */

/**
 * Sanitize string input to prevent XSS attacks
 * Removes potentially dangerous HTML tags and attributes
 * Enhanced for kiosk deployment security
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags using a more comprehensive approach
  let sanitized = input;
  
  // Remove dangerous schemes (javascript:, data:, vbscript:) BEFORE other processing
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  
  // Remove dangerous function calls
  sanitized = sanitized.replace(/alert\s*\(/gi, '');
  sanitized = sanitized.replace(/eval\s*\(/gi, '');
  sanitized = sanitized.replace(/document\./gi, '');
  sanitized = sanitized.replace(/window\./gi, '');
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove all HTML tags BEFORE decoding entities
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities in multiple passes to handle nested encoding
  let previousLength = 0;
  while (sanitized.length !== previousLength) {
    previousLength = sanitized.length;
    sanitized = sanitized
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }
  
  // Remove any HTML tags that might have been created by entity decoding
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove any remaining script tags that might have been created
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove any remaining dangerous function calls after decoding
  sanitized = sanitized.replace(/alert\s*\(/gi, '');
  sanitized = sanitized.replace(/eval\s*\(/gi, '');
  
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
 * Enhanced to prevent injection and ensure finite values
 */
export function validateNumber(value: any): number {
  const num = Number(value);
  // Ensure finite, non-negative numbers only
  // Reject NaN, Infinity, -Infinity, and negative numbers
  if (isNaN(num) || !isFinite(num) || num < 0 || num === Infinity || num === -Infinity) {
    return 0;
  }
  return Math.max(0, num);
}

/**
 * Validate URL input
 * Enhanced security: only allow HTTP and HTTPS protocols
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Only allow HTTP and HTTPS protocols for security
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validate API configuration
 * Enhanced security validation for kiosk deployment
 */
export function validateApiConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }
  
  // Validate server URL (must be HTTPS)
  if (typeof config.serverUrl !== 'string' || !config.serverUrl.startsWith('https://')) {
    return false;
  }
  
  // Validate URL format
  if (!validateUrl(config.serverUrl)) {
    return false;
  }
  
  // Validate API key and auth token
  return (
    typeof config.apiKey === 'string' &&
    config.apiKey.length > 0 &&
    typeof config.authToken === 'string' &&
    config.authToken.length > 0
  );
}