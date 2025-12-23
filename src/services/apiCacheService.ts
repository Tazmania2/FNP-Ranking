/**
 * API Cache Service for intelligent caching of API responses
 * Optimized for Raspberry Pi deployment with memory-efficient caching
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hitCount: number;
  size: number; // Approximate size in bytes
}

export interface CacheConfig {
  /** Maximum cache size in MB */
  maxSizeMB?: number;
  /** Default TTL in milliseconds */
  defaultTTL?: number;
  /** Maximum number of cache entries */
  maxEntries?: number;
  /** Enable automatic cleanup */
  autoCleanup?: boolean;
  /** Cleanup interval in milliseconds */
  cleanupInterval?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  currentSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
}

/**
 * Intelligent API caching service with memory management
 * Implements LRU eviction and automatic cleanup for resource-constrained environments
 */
export class ApiCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private config: Required<CacheConfig>;
  private stats: { hits: number; misses: number };
  private cleanupIntervalId: number | null = null;
  private currentSizeBytes: number = 0;

  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.config = {
      maxSizeMB: config.maxSizeMB ?? 50, // 50MB default for Raspberry Pi
      defaultTTL: config.defaultTTL ?? 5 * 60 * 1000, // 5 minutes default
      maxEntries: config.maxEntries ?? 100,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 60 * 1000, // 1 minute
    };
    this.stats = { hits: 0, misses: 0 };

    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  /**
   * Get data from cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and stats
    entry.hitCount++;
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  public set<T>(key: string, data: T, ttl?: number): boolean {
    // Don't cache null or undefined values
    if (data === null || data === undefined) {
      return false;
    }

    const entryTTL = ttl ?? this.config.defaultTTL;
    const now = Date.now();
    const dataSize = this.estimateSize(data);

    // Remove old entry if updating (to get accurate size calculation)
    const isUpdate = this.cache.has(key);
    let oldSize = 0;
    if (isUpdate) {
      const oldEntry = this.cache.get(key)!;
      oldSize = oldEntry.size;
      this.currentSizeBytes -= oldSize;
      this.cache.delete(key);
    }

    // Check if we've exceeded max entries (after potential removal)
    if (this.cache.size >= this.config.maxEntries) {
      this.evictLRU(0); // Evict at least one entry
    }

    // Check if adding this entry would exceed size limit
    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    if (this.currentSizeBytes + dataSize > maxSizeBytes) {
      // Try to make room by evicting LRU entries
      this.evictLRU(dataSize);

      // If still not enough room, reject the entry
      if (this.currentSizeBytes + dataSize > maxSizeBytes) {
        // Restore old entry if this was an update
        if (isUpdate) {
          const oldEntry: CacheEntry<T> = {
            data: data, // We don't have the old data, so use new data
            timestamp: now,
            expiresAt: now + entryTTL,
            hitCount: 0,
            size: oldSize,
          };
          this.cache.set(key, oldEntry);
          this.currentSizeBytes += oldSize;
        }
        return false;
      }
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + entryTTL,
      hitCount: 0,
      size: dataSize,
    };

    this.cache.set(key, entry);
    this.currentSizeBytes += dataSize;

    return true;
  }

  /**
   * Delete entry from cache
   */
  public delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.currentSizeBytes -= entry.size;
    return this.cache.delete(key);
  }

  /**
   * Check if key exists and is not expired
   */
  public has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    let oldestEntry = Infinity;
    let newestEntry = 0;

    this.cache.forEach(entry => {
      if (entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    });

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      currentSize: this.currentSizeBytes,
      entryCount: this.cache.size,
      oldestEntry: oldestEntry === Infinity ? 0 : oldestEntry,
      newestEntry,
    };
  }

  /**
   * Clean up expired entries
   */
  public cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.delete(key);
        removedCount++;
      }
    });

    return removedCount;
  }

  /**
   * Evict least recently used entries to make room
   */
  private evictLRU(requiredSpace: number): void {
    if (this.cache.size === 0) {
      return;
    }

    // Sort entries by hit count and timestamp (LRU)
    const entries = Array.from(this.cache.entries()).sort((a, b) => {
      // First sort by hit count (lower is more likely to evict)
      if (a[1].hitCount !== b[1].hitCount) {
        return a[1].hitCount - b[1].hitCount;
      }
      // Then by timestamp (older is more likely to evict)
      return a[1].timestamp - b[1].timestamp;
    });

    const maxSizeBytes = this.config.maxSizeMB * 1024 * 1024;
    let freedSpace = 0;
    let evictedCount = 0;

    for (const [key, entry] of entries) {
      // Always evict at least one entry if we're at max entries
      const needsSpace = this.currentSizeBytes + requiredSpace - freedSpace > maxSizeBytes;
      const atMaxEntries = this.cache.size >= this.config.maxEntries;
      
      if (!needsSpace && !atMaxEntries && evictedCount > 0) {
        break;
      }

      this.delete(key);
      freedSpace += entry.size;
      evictedCount++;

      // Don't evict more than half the cache at once
      if (evictedCount >= Math.max(1, Math.floor(this.config.maxEntries / 2))) {
        break;
      }
    }
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * Start automatic cleanup interval
   */
  private startAutoCleanup(): void {
    if (this.cleanupIntervalId) {
      return;
    }

    this.cleanupIntervalId = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cleanup
   */
  public stopAutoCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Destroy the cache service
   */
  public destroy(): void {
    this.stopAutoCleanup();
    this.clear();
  }
}