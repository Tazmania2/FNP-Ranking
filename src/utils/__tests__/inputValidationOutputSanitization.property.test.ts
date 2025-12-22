import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  sanitizeString, 
  validatePlayerName, 
  validateNumber, 
  validateUrl, 
  validateApiConfig 
} from '../validation';

/**
 * Property-based tests for input validation and output sanitization
 * **Feature: raspberry-pi-kiosk, Property 14: Input validation and output sanitization**
 * **Validates: Requirements 4.3, 4.4**
 */

describe('Input Validation and Output Sanitization Properties', () => {
  describe('Property 14: Input validation and output sanitization', () => {
    it('should sanitize all string inputs to prevent XSS attacks', () => {
      fc.assert(
        fc.property(
          fc.string(),
          (input) => {
            const sanitized = sanitizeString(input);
            
            // Sanitized output should never contain script tags
            expect(sanitized).not.toMatch(/<script/i);
            expect(sanitized).not.toMatch(/<\/script>/i);
            
            // Sanitized output should not contain HTML tags
            expect(sanitized).not.toMatch(/<[^>]*>/);
            
            // Should handle non-string inputs gracefully
            if (typeof input !== 'string') {
              expect(sanitized).toBe('');
            }
            
            // Should return a string
            expect(typeof sanitized).toBe('string');
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should sanitize malicious HTML and JavaScript content', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Generate various XSS attack vectors
            fc.constant('<script>alert("xss")</script>'),
            fc.constant('<img src="x" onerror="alert(1)">'),
            fc.constant('<div onclick="alert(1)">click me</div>'),
            fc.constant('javascript:alert(1)'),
            fc.constant('<iframe src="javascript:alert(1)"></iframe>'),
            fc.constant('<svg onload="alert(1)">'),
            fc.constant('<body onload="alert(1)">'),
            // Generate random HTML-like content
            fc.string().map(s => `<${s}>`),
            fc.string().map(s => `<script>${s}</script>`),
            fc.string().map(s => `<div>${s}</div>`),
            // Generate mixed content
            fc.tuple(fc.string(), fc.string(), fc.string()).map(([a, b, c]) => 
              `${a}<script>${b}</script>${c}`
            )
          ),
          (maliciousInput) => {
            const sanitized = sanitizeString(maliciousInput);
            
            // Should remove all script tags and content
            expect(sanitized).not.toMatch(/<script/i);
            expect(sanitized).not.toMatch(/javascript:/i);
            
            // Should remove all HTML tags
            expect(sanitized).not.toMatch(/<[^>]*>/);
            
            // Should not contain event handlers
            expect(sanitized).not.toMatch(/on\w+\s*=/i);
            
            // Should be safe for display
            expect(sanitized).not.toMatch(/alert\(/);
            expect(sanitized).not.toMatch(/eval\(/);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate player names and prevent injection', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 0, maxLength: 200 }),
            fc.constant('<script>alert("xss")</script>'),
            fc.constant(''),
            fc.constant(null as any),
            fc.constant(undefined as any),
            fc.integer(),
            fc.object()
          ),
          (input) => {
            const validatedName = validatePlayerName(input);
            
            // Should always return a string
            expect(typeof validatedName).toBe('string');
            
            // Should not be empty (fallback to "Unknown Player")
            expect(validatedName.length).toBeGreaterThan(0);
            
            // Should not contain HTML tags
            expect(validatedName).not.toMatch(/<[^>]*>/);
            
            // Should not contain script tags
            expect(validatedName).not.toMatch(/<script/i);
            
            // Should be limited in length
            expect(validatedName.length).toBeLessThanOrEqual(100);
            
            // Should handle null/undefined gracefully
            if (input === null || input === undefined) {
              expect(validatedName).toBe('Unknown Player');
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate numeric inputs and prevent injection', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer(),
            fc.float(),
            fc.string(),
            fc.constant('NaN'),
            fc.constant('Infinity'),
            fc.constant('-Infinity'),
            fc.constant('<script>alert(1)</script>'),
            fc.constant(null),
            fc.constant(undefined),
            fc.object()
          ),
          (input) => {
            const validatedNumber = validateNumber(input);
            
            // Should always return a number
            expect(typeof validatedNumber).toBe('number');
            
            // Should not be NaN
            expect(isNaN(validatedNumber)).toBe(false);
            
            // Should not be negative (scores/positions are non-negative)
            expect(validatedNumber).toBeGreaterThanOrEqual(0);
            
            // Should be finite
            expect(isFinite(validatedNumber)).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate URLs and reject malicious schemes', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.webUrl(),
            fc.constant('javascript:alert(1)'),
            fc.constant('data:text/html,<script>alert(1)</script>'),
            fc.constant('vbscript:msgbox(1)'),
            fc.constant('file:///etc/passwd'),
            fc.constant('ftp://example.com'),
            fc.string().map(s => `${s}://example.com`),
            fc.string()
          ),
          (url) => {
            const isValid = validateUrl(url);
            
            // Should return boolean
            expect(typeof isValid).toBe('boolean');
            
            if (isValid) {
              // Valid URLs should be HTTP or HTTPS only
              expect(url).toMatch(/^https?:\/\//);
            }
            
            // Should reject dangerous schemes
            if (url.startsWith('javascript:') || 
                url.startsWith('data:') || 
                url.startsWith('vbscript:') ||
                url.startsWith('file:')) {
              expect(isValid).toBe(false);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should validate API configurations and reject malicious data', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Valid configurations
            fc.record({
              serverUrl: fc.webUrl().filter(url => url.startsWith('https://')),
              apiKey: fc.string({ minLength: 1, maxLength: 100 }),
              authToken: fc.string({ minLength: 1, maxLength: 200 })
            }),
            // Invalid configurations
            fc.record({
              serverUrl: fc.oneof(
                fc.constant('javascript:alert(1)'),
                fc.constant('http://insecure.com'),
                fc.string()
              ),
              apiKey: fc.oneof(fc.string(), fc.constant(''), fc.constant(null)),
              authToken: fc.oneof(fc.string(), fc.constant(''), fc.constant(null))
            }),
            // Malformed configurations
            fc.oneof(
              fc.constant(null),
              fc.constant(undefined),
              fc.string(),
              fc.integer(),
              fc.object()
            )
          ),
          (config) => {
            const isValid = validateApiConfig(config);
            
            // Should return boolean
            expect(typeof isValid).toBe('boolean');
            
            if (isValid) {
              // Valid configs must have all required fields
              expect(config).toHaveProperty('serverUrl');
              expect(config).toHaveProperty('apiKey');
              expect(config).toHaveProperty('authToken');
              
              // Server URL must be HTTPS
              expect(config.serverUrl).toMatch(/^https:/);
              
              // API key and auth token must be non-empty strings
              expect(typeof config.apiKey).toBe('string');
              expect(config.apiKey.length).toBeGreaterThan(0);
              expect(typeof config.authToken).toBe('string');
              expect(config.authToken.length).toBeGreaterThan(0);
            }
            
            // Should reject null/undefined
            if (config === null || config === undefined) {
              expect(isValid).toBe(false);
            }
            
            // Should reject non-objects
            if (typeof config !== 'object') {
              expect(isValid).toBe(false);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle HTML entity decoding safely', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('&lt;script&gt;alert(1)&lt;/script&gt;'),
            fc.constant('&quot;malicious&quot;'),
            fc.constant('&amp;lt;script&amp;gt;'),
            fc.string().map(s => `&lt;${s}&gt;`),
            fc.string().map(s => `&quot;${s}&quot;`),
            fc.string().map(s => `&amp;${s}`)
          ),
          (encodedInput) => {
            const sanitized = sanitizeString(encodedInput);
            
            // Should decode HTML entities
            expect(sanitized).not.toMatch(/&lt;/);
            expect(sanitized).not.toMatch(/&gt;/);
            expect(sanitized).not.toMatch(/&quot;/);
            expect(sanitized).not.toMatch(/&amp;/);
            
            // But should still remove any resulting HTML tags
            expect(sanitized).not.toMatch(/<[^>]*>/);
            expect(sanitized).not.toMatch(/<script/i);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
