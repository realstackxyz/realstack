/**
 * ApiCacheService - Implements intelligent caching for API responses
 * to improve performance and reduce API calls.
 * 
 * Features:
 * - Time-based cache expiration
 * - Memory usage management
 * - Automatic stale-while-revalidate pattern
 * - Configurable cache size and TTL
 * - Cache persistence across sessions (optional)
 * - Cache invalidation on specific events
 */

class ApiCacheService {
  constructor(options = {}) {
    // Default configuration
    this.config = {
      maxCacheSize: options.maxCacheSize || 100, // Maximum number of cached items
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // Default TTL: 5 minutes
      persistCache: options.persistCache || false, // Whether to persist cache in localStorage
      cacheKeyPrefix: options.cacheKeyPrefix || 'api_cache_',
      staleTTL: options.staleTTL || 10 * 60 * 1000, // Time considered stale: 10 minutes
      debug: options.debug || false, // Enable debug logging
    };

    // Initialize cache storage
    this.cacheStore = new Map();
    
    // Load persisted cache if enabled
    if (this.config.persistCache) {
      this._loadPersistedCache();
    }
    
    // Start cache cleanup interval
    this._initCleanupInterval();
    
    this.metrics = {
      hits: 0,
      misses: 0,
      staleHits: 0,
    };
  }

  /**
   * Get data from cache or fetch from API
   * 
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if not in cache
   * @param {Object} options - Cache options for this specific request
   * @returns {Promise<any>} - Cached or fetched data
   */
  async get(key, fetchFn, options = {}) {
    const cacheKey = this._getCacheKey(key);
    const cachedItem = this.cacheStore.get(cacheKey);
    const now = Date.now();
    
    // Cache hit and not expired
    if (cachedItem && cachedItem.expiry > now) {
      this._debug(`Cache hit for "${key}"`);
      this.metrics.hits++;
      return cachedItem.data;
    }
    
    // Cache hit but stale (expired but still usable)
    if (cachedItem && cachedItem.staleExpiry > now) {
      this._debug(`Stale cache hit for "${key}", revalidating...`);
      this.metrics.staleHits++;
      
      // Return stale data immediately but refresh in background
      this._refreshInBackground(cacheKey, fetchFn, options);
      return cachedItem.data;
    }
    
    // Cache miss or completely expired
    this._debug(`Cache miss for "${key}"`);
    this.metrics.misses++;
    return this._fetchAndCache(cacheKey, fetchFn, options);
  }

  /**
   * Manually set data in cache
   * 
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {Object} options - Cache options
   */
  set(key, data, options = {}) {
    const cacheKey = this._getCacheKey(key);
    const ttl = options.ttl || this.config.defaultTTL;
    const now = Date.now();
    
    this.cacheStore.set(cacheKey, {
      data,
      expiry: now + ttl,
      staleExpiry: now + (options.staleTTL || this.config.staleTTL),
      createdAt: now,
      tags: options.tags || [],
    });
    
    this._debug(`Cache set for "${key}", expires in ${ttl}ms`);
    
    // If cache exceeds max size, remove oldest entries
    this._enforceMaxSize();
    
    // Persist cache if enabled
    if (this.config.persistCache) {
      this._persistCache();
    }
  }

  /**
   * Remove item from cache
   * 
   * @param {string} key - Cache key to invalidate
   */
  invalidate(key) {
    const cacheKey = this._getCacheKey(key);
    const deleted = this.cacheStore.delete(cacheKey);
    
    if (deleted) {
      this._debug(`Cache invalidated for "${key}"`);
      
      if (this.config.persistCache) {
        this._persistCache();
      }
    }
    
    return deleted;
  }

  /**
   * Invalidate cache entries by tags
   * 
   * @param {string[]} tags - Tags to invalidate
   * @returns {number} - Number of invalidated entries
   */
  invalidateByTags(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return 0;
    }
    
    let count = 0;
    
    for (const [key, value] of this.cacheStore.entries()) {
      if (value.tags && value.tags.some(tag => tags.includes(tag))) {
        this.cacheStore.delete(key);
        count++;
      }
    }
    
    this._debug(`Invalidated ${count} cache entries by tags: ${tags.join(', ')}`);
    
    if (count > 0 && this.config.persistCache) {
      this._persistCache();
    }
    
    return count;
  }

  /**
   * Clear entire cache
   */
  clear() {
    const size = this.cacheStore.size;
    this.cacheStore.clear();
    this._debug(`Cleared entire cache (${size} entries)`);
    
    if (this.config.persistCache) {
      this._persistCache();
    }
    
    return size;
  }

  /**
   * Get cache metrics
   * 
   * @returns {Object} - Cache metrics
   */
  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.staleHits + this.metrics.misses === 0
      ? 0
      : (this.metrics.hits + this.metrics.staleHits) / 
        (this.metrics.hits + this.metrics.staleHits + this.metrics.misses);
    
    return {
      ...this.metrics,
      hitRate: hitRate.toFixed(2),
      cacheSize: this.cacheStore.size,
      maxSize: this.config.maxCacheSize,
    };
  }

  /**
   * Fetch fresh data and cache it
   * 
   * @private
   * @param {string} cacheKey - Full cache key
   * @param {Function} fetchFn - Function to fetch data
   * @param {Object} options - Cache options
   * @returns {Promise<any>} - Fetched data
   */
  async _fetchAndCache(cacheKey, fetchFn, options) {
    try {
      const data = await fetchFn();
      this.set(cacheKey, data, options);
      return data;
    } catch (error) {
      this._debug(`Error fetching data for "${cacheKey}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh data in background without blocking
   * 
   * @private
   * @param {string} cacheKey - Full cache key
   * @param {Function} fetchFn - Function to fetch data
   * @param {Object} options - Cache options
   */
  _refreshInBackground(cacheKey, fetchFn, options) {
    // Use setTimeout to not block the main thread
    setTimeout(async () => {
      try {
        const data = await fetchFn();
        this.set(cacheKey, data, options);
        this._debug(`Background refresh completed for "${cacheKey}"`);
      } catch (error) {
        this._debug(`Background refresh failed for "${cacheKey}": ${error.message}`);
      }
    }, 0);
  }

  /**
   * Clean up expired cache entries periodically
   * 
   * @private
   */
  _initCleanupInterval() {
    // Run cleanup every minute
    setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;
      
      for (const [key, value] of this.cacheStore.entries()) {
        if (value.staleExpiry < now) {
          this.cacheStore.delete(key);
          expiredCount++;
        }
      }
      
      if (expiredCount > 0) {
        this._debug(`Cleaned up ${expiredCount} expired cache entries`);
        
        if (this.config.persistCache) {
          this._persistCache();
        }
      }
    }, 60000); // 1 minute
  }

  /**
   * Ensure cache doesn't exceed max size
   * 
   * @private
   */
  _enforceMaxSize() {
    if (this.cacheStore.size <= this.config.maxCacheSize) {
      return;
    }
    
    // Create array of entries sorted by creation time (oldest first)
    const entries = Array.from(this.cacheStore.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    
    // Remove oldest entries until we're under the limit
    const entriesToRemove = this.cacheStore.size - this.config.maxCacheSize;
    const removedEntries = entries.slice(0, entriesToRemove);
    
    for (const [key] of removedEntries) {
      this.cacheStore.delete(key);
    }
    
    this._debug(`Removed ${entriesToRemove} oldest cache entries due to size limit`);
  }

  /**
   * Generate full cache key
   * 
   * @private
   * @param {string} key - Original key
   * @returns {string} - Full cache key
   */
  _getCacheKey(key) {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }

  /**
   * Persist cache to localStorage
   * 
   * @private
   */
  _persistCache() {
    if (!this.config.persistCache || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const serialized = JSON.stringify(Array.from(this.cacheStore.entries()));
      localStorage.setItem(this.config.cacheKeyPrefix + 'data', serialized);
      localStorage.setItem(
        this.config.cacheKeyPrefix + 'meta',
        JSON.stringify({
          updatedAt: Date.now(),
          size: this.cacheStore.size,
        })
      );
    } catch (error) {
      this._debug(`Failed to persist cache: ${error.message}`);
    }
  }

  /**
   * Load persisted cache from localStorage
   * 
   * @private
   */
  _loadPersistedCache() {
    if (!this.config.persistCache || typeof localStorage === 'undefined') {
      return;
    }
    
    try {
      const serialized = localStorage.getItem(this.config.cacheKeyPrefix + 'data');
      
      if (!serialized) {
        return;
      }
      
      const entries = JSON.parse(serialized);
      
      if (Array.isArray(entries)) {
        this.cacheStore = new Map(entries);
        this._debug(`Loaded ${this.cacheStore.size} cache entries from localStorage`);
        
        // Immediately clean expired entries
        const now = Date.now();
        let expiredCount = 0;
        
        for (const [key, value] of this.cacheStore.entries()) {
          if (value.staleExpiry < now) {
            this.cacheStore.delete(key);
            expiredCount++;
          }
        }
        
        if (expiredCount > 0) {
          this._debug(`Removed ${expiredCount} expired entries from loaded cache`);
        }
      }
    } catch (error) {
      this._debug(`Failed to load persisted cache: ${error.message}`);
      // Reset cache if loading fails
      this.cacheStore.clear();
    }
  }

  /**
   * Debug log if enabled
   * 
   * @private
   * @param {string} message - Debug message
   */
  _debug(message) {
    if (this.config.debug) {
      console.log(`[ApiCacheService] ${message}`);
    }
  }
}

// Create singleton instance
const apiCache = new ApiCacheService({
  maxCacheSize: 200,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  persistCache: true,
  debug: process.env.NODE_ENV === 'development',
});

// Usage example:
/*
import apiCache from './ApiCacheService';

// In your API service
async function fetchUserData(userId) {
  return apiCache.get(
    `user_${userId}`, 
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      return response.json();
    },
    {
      ttl: 15 * 60 * 1000, // 15 minutes
      tags: ['user', `user_${userId}`],
    }
  );
}

// Invalidate specific cache entries
function updateUser(userData) {
  // Update user in API...
  
  // Then invalidate related cache entries
  apiCache.invalidateByTags([`user_${userData.id}`, 'userList']);
}
*/

export default apiCache;