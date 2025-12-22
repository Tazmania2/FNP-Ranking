/**
 * Property-based tests for API cache service
 * Tests intelligent API caching for Raspberry Pi deployment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ApiCacheService } from '../apiCacheService';

describe('API Cache Service Property Tests', () => {
  let cacheService: ApiCacheService;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (cacheService) {
      cacheService.destroy();
    }
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /**
   * **Feature: raspberry-pi-kiosk, Property 11: Intelligent API caching**
   * **Validates: Requirements 3.3**
   * 
   * For any repeated API request, the webapp should use cached data when appropriate 
   * to minimize network requests
   */
  it('should use cached data for repeated requests within TTL', () => {
    fc.assert(
      fc.property(
        // Generate sequences of API requests with potential repeats
        fc.array(
          fc.record({
            key: fc.oneof(fc.constant('api/users'), fc.constant('api/posts'), fc.constant('api/comments')),
            data: fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              value: fc.string({ minLength: 5, maxLength: 50 })
            })
          }),
          { minLength: 2, maxLength: 20 }
        ),
        fc.record({
          defaultTTL: fc.integer({ min: 1000, max: 10000 }),
          maxEntries: fc.integer({ min: 5, max: 50 })
        }),
        (requests, config) => {
          cacheService = new ApiCacheService(config);

          const requestCounts = new Map<string, number>();
          const cacheHits = new Map<string, number>();

          // Process all requests
          requests.forEach(request => {
            const count = requestCounts.get(request.key) || 0;
            requestCounts.set(request.key, count + 1);

            // Try to get from cache first
            const cachedData = cacheService.get(request.key);

            if (cachedData) {
              // Cache hit
              const hits = cacheHits.get(request.key) || 0;
              cacheHits.set(request.key, hits + 1);
            } else {
              // Cache miss - set the data
              cacheService.set(request.key, request.data);
            }
          });

          // Property: For any key requested more than once, subsequent requests should hit cache
          requestCounts.forEach((count, key) => {
            if (count > 1) {
              const hits = cacheHits.get(key) || 0;
              // At least count - 1 requests should have been cache hits
              // (first request is always a miss)
              expect(hits).toBeGreaterThanOrEqual(count - 1);
            }
          });

          // Property: Cache stats should be consistent
          const stats = cacheService.getStats();
          expect(stats.hits).toBeGreaterThanOrEqual(0);
          expect(stats.misses).toBeGreaterThanOrEqual(0);
          expect(stats.hitRate).toBeGreaterThanOrEqual(0);
          expect(stats.hitRate).toBeLessThanOrEqual(100);
          expect(stats.entryCount).toBeLessThanOrEqual(config.maxEntries);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should respect TTL and expire entries correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 20 }),
          data: fc.oneof(fc.string(), fc.integer(), fc.record({ value: fc.string() })), // Avoid null
          ttl: fc.integer({ min: 100, max: 5000 }),
          waitTime: fc.integer({ min: 0, max: 6000 })
        }),
        (testCase) => {
          cacheService = new ApiCacheService({ autoCleanup: false });

          // Set data with specific TTL
          const setResult = cacheService.set(testCase.key, testCase.data, testCase.ttl);
          expect(setResult).toBe(true);

          // Advance time
          vi.advanceTimersByTime(testCase.waitTime);

          // Try to get data
          const cachedData = cacheService.get(testCase.key);

          // Property: Data should only be available if waitTime < TTL
          if (testCase.waitTime < testCase.ttl) {
            expect(cachedData).not.toBeNull();
            expect(cachedData).toEqual(testCase.data);
          } else {
            expect(cachedData).toBeNull();
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should maintain cache size within configured limits', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 10 }),
            data: fc.record({
              value: fc.string({ minLength: 10, maxLength: 100 })
            })
          }),
          { minLength: 5, maxLength: 30 }
        ),
        fc.record({
          maxSizeMB: fc.integer({ min: 1, max: 5 }), // Use integer instead of float
          maxEntries: fc.integer({ min: 3, max: 20 })
        }),
        (entries, config) => {
          cacheService = new ApiCacheService(config);

          // Add all entries
          entries.forEach(entry => {
            cacheService.set(entry.key, entry.data);
          });

          // Property: Cache should respect size and entry limits
          const stats = cacheService.getStats();
          const maxSizeBytes = config.maxSizeMB * 1024 * 1024;

          expect(stats.currentSize).toBeLessThanOrEqual(maxSizeBytes);
          expect(stats.entryCount).toBeLessThanOrEqual(config.maxEntries);
          expect(stats.entryCount).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should implement LRU eviction correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }), // Max entries
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 5 }),
            data: fc.string({ minLength: 10, maxLength: 50 })
          }),
          { minLength: 5, maxLength: 15 }
        ),
        (maxEntries, entries) => {
          cacheService = new ApiCacheService({ maxEntries, maxSizeMB: 10 });

          // Create unique entries to avoid key collisions
          const uniqueEntries = entries.map((entry, index) => ({
            key: `${entry.key}_${index}`, // Make keys unique
            data: entry.data
          }));

          // Add entries sequentially
          uniqueEntries.forEach(entry => {
            cacheService.set(entry.key, entry.data);
          });

          // Property: Cache should never exceed max entries
          const stats = cacheService.getStats();
          expect(stats.entryCount).toBeLessThanOrEqual(maxEntries);

          // Property: Most recently added entries should still be in cache
          if (uniqueEntries.length > maxEntries) {
            const recentEntries = uniqueEntries.slice(-maxEntries);
            let foundRecentEntries = 0;
            
            recentEntries.forEach(entry => {
              const cached = cacheService.get(entry.key);
              if (cached !== null) {
                expect(cached).toEqual(entry.data);
                foundRecentEntries++;
              }
            });
            
            // At least some recent entries should be in cache
            expect(foundRecentEntries).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should handle concurrent cache operations consistently', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.record({ op: fc.constant('set'), key: fc.string({ minLength: 1, maxLength: 5 }), data: fc.anything() }),
            fc.record({ op: fc.constant('get'), key: fc.string({ minLength: 1, maxLength: 5 }) }),
            fc.record({ op: fc.constant('delete'), key: fc.string({ minLength: 1, maxLength: 5 }) }),
            fc.record({ op: fc.constant('has'), key: fc.string({ minLength: 1, maxLength: 5 }) })
          ),
          { minLength: 5, maxLength: 20 }
        ),
        (operations) => {
          cacheService = new ApiCacheService({ maxEntries: 10 });

          // Execute operations
          operations.forEach(operation => {
            switch (operation.op) {
              case 'set':
                cacheService.set(operation.key, operation.data);
                break;
              case 'get':
                cacheService.get(operation.key);
                break;
              case 'delete':
                cacheService.delete(operation.key);
                break;
              case 'has':
                cacheService.has(operation.key);
                break;
            }
          });

          // Property: Cache state should remain consistent
          const stats = cacheService.getStats();
          
          expect(stats.hits).toBeGreaterThanOrEqual(0);
          expect(stats.misses).toBeGreaterThanOrEqual(0);
          expect(stats.currentSize).toBeGreaterThanOrEqual(0);
          expect(stats.entryCount).toBeGreaterThanOrEqual(0);
          expect(stats.entryCount).toBeLessThanOrEqual(10);
          
          // Hit rate should be valid percentage
          expect(stats.hitRate).toBeGreaterThanOrEqual(0);
          expect(stats.hitRate).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should cleanup expired entries automatically', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            key: fc.string({ minLength: 1, maxLength: 10 }),
            data: fc.anything(),
            ttl: fc.integer({ min: 100, max: 2000 })
          }),
          { minLength: 3, maxLength: 10 }
        ),
        fc.integer({ min: 2500, max: 5000 }), // Time to advance (longer than max TTL)
        (entries, advanceTime) => {
          cacheService = new ApiCacheService({ autoCleanup: false });

          // Add entries with various TTLs
          entries.forEach(entry => {
            cacheService.set(entry.key, entry.data, entry.ttl);
          });

          const statsBeforeCleanup = cacheService.getStats();
          expect(statsBeforeCleanup.entryCount).toBeGreaterThan(0);

          // Advance time past all TTLs
          vi.advanceTimersByTime(advanceTime);

          // Run cleanup
          const removedCount = cacheService.cleanup();

          // Property: All entries should be expired and removed
          const statsAfterCleanup = cacheService.getStats();
          
          // All entries with TTL < advanceTime should be removed
          const expiredCount = entries.filter(e => e.ttl < advanceTime).length;
          expect(removedCount).toBe(expiredCount);
          
          // Cache should be empty or contain only non-expired entries
          expect(statsAfterCleanup.entryCount).toBe(entries.length - expiredCount);
        }
      ),
      { numRuns: 10 }
    );
  });
});
