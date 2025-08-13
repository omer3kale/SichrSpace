const Redis = require('ioredis');
const crypto = require('crypto');

/**
 * Redis Caching Service for SichrPlace
 * Step 9.1: Infrastructure Optimization - Advanced Caching
 */

class RedisCacheService {
  constructor() {
    this.redis = null;
    this.connected = false;
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true
    };
    
    this.defaultTTL = {
      apartments: 15 * 60, // 15 minutes
      users: 10 * 60, // 10 minutes
      search: 5 * 60, // 5 minutes
      geocoding: 60 * 60, // 1 hour
      places: 30 * 60, // 30 minutes
      analytics: 60, // 1 minute
      session: 24 * 60 * 60, // 24 hours
      static: 7 * 24 * 60 * 60 // 7 days
    };

    this.initializeRedis();
  }

  async initializeRedis() {
    try {
      this.redis = new Redis(this.config);
      
      this.redis.on('connect', () => {
        console.log('🔄 Connecting to Redis...');
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis connected successfully');
        this.connected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.connected = false;
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.connected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      // Test connection
      await this.testConnection();
      
    } catch (error) {
      console.error('❌ Redis initialization failed:', error.message);
      this.connected = false;
    }
  }

  async testConnection() {
    try {
      if (!this.redis) return false;
      
      const result = await this.redis.ping();
      if (result === 'PONG') {
        console.log('✅ Redis health check passed');
        this.connected = true;
        return true;
      }
    } catch (error) {
      console.error('❌ Redis health check failed:', error.message);
      this.connected = false;
    }
    return false;
  }

  /**
   * Generate cache key with prefix and hash for long keys
   */
  generateKey(category, identifier, params = {}) {
    const baseKey = `sichr:${category}:${identifier}`;
    
    if (Object.keys(params).length === 0) {
      return baseKey;
    }

    // Create hash for complex parameters
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    const hash = crypto.createHash('md5').update(paramsStr).digest('hex').substring(0, 8);
    
    return `${baseKey}:${hash}`;
  }

  /**
   * Set cache with automatic TTL based on category
   */
  async set(category, identifier, data, customTTL = null, params = {}) {
    if (!this.connected) return false;

    try {
      const key = this.generateKey(category, identifier, params);
      const ttl = customTTL || this.defaultTTL[category] || 300; // 5 min default
      const value = JSON.stringify({
        data,
        timestamp: Date.now(),
        category,
        identifier
      });

      await this.redis.setex(key, ttl, value);
      console.log(`📦 Cached: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('❌ Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Get cached data with automatic deserialization
   */
  async get(category, identifier, params = {}) {
    if (!this.connected) return null;

    try {
      const key = this.generateKey(category, identifier, params);
      const cached = await this.redis.get(key);
      
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      console.log(`🎯 Cache hit: ${key}`);
      return parsed.data;
    } catch (error) {
      console.error('❌ Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Delete specific cache entry
   */
  async delete(category, identifier, params = {}) {
    if (!this.connected) return false;

    try {
      const key = this.generateKey(category, identifier, params);
      const result = await this.redis.del(key);
      console.log(`🗑️  Cache deleted: ${key}`);
      return result > 0;
    } catch (error) {
      console.error('❌ Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Clear all cache entries for a category
   */
  async clearCategory(category) {
    if (!this.connected) return false;

    try {
      const pattern = `sichr:${category}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) return true;

      const result = await this.redis.del(...keys);
      console.log(`🧹 Cleared ${result} cache entries for category: ${category}`);
      return true;
    } catch (error) {
      console.error('❌ Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Cache apartment search results
   */
  async cacheApartmentSearch(filters, apartments) {
    const searchId = crypto.createHash('md5').update(JSON.stringify(filters)).digest('hex');
    return await this.set('search', 'apartments', apartments, this.defaultTTL.search, filters);
  }

  /**
   * Get cached apartment search results
   */
  async getCachedApartmentSearch(filters) {
    const searchId = crypto.createHash('md5').update(JSON.stringify(filters)).digest('hex');
    return await this.get('search', 'apartments', filters);
  }

  /**
   * Cache user session data
   */
  async cacheUserSession(userId, sessionData) {
    return await this.set('session', userId, sessionData, this.defaultTTL.session);
  }

  /**
   * Get cached user session
   */
  async getCachedUserSession(userId) {
    return await this.get('session', userId);
  }

  /**
   * Cache geocoding results
   */
  async cacheGeocodingResult(address, result) {
    const addressKey = address.toLowerCase().replace(/[^a-z0-9]/g, '');
    return await this.set('geocoding', addressKey, result, this.defaultTTL.geocoding);
  }

  /**
   * Get cached geocoding result
   */
  async getCachedGeocodingResult(address) {
    const addressKey = address.toLowerCase().replace(/[^a-z0-9]/g, '');
    return await this.get('geocoding', addressKey);
  }

  /**
   * Cache nearby places results
   */
  async cacheNearbyPlaces(lat, lng, type, radius, places) {
    const locationKey = `${lat}_${lng}_${type}_${radius}`;
    return await this.set('places', locationKey, places, this.defaultTTL.places);
  }

  /**
   * Get cached nearby places
   */
  async getCachedNearbyPlaces(lat, lng, type, radius) {
    const locationKey = `${lat}_${lng}_${type}_${radius}`;
    return await this.get('places', locationKey);
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics(metric, timeframe, data) {
    const analyticsKey = `${metric}_${timeframe}`;
    return await this.set('analytics', analyticsKey, data, this.defaultTTL.analytics);
  }

  /**
   * Get cached analytics data
   */
  async getCachedAnalytics(metric, timeframe) {
    const analyticsKey = `${metric}_${timeframe}`;
    return await this.get('analytics', analyticsKey);
  }

  /**
   * Increment counter (for analytics)
   */
  async incrementCounter(category, identifier, amount = 1) {
    if (!this.connected) return 0;

    try {
      const key = this.generateKey('counter', category, { id: identifier });
      const result = await this.redis.incrby(key, amount);
      
      // Set expiry for counters (daily reset)
      await this.redis.expire(key, 24 * 60 * 60);
      
      return result;
    } catch (error) {
      console.error('❌ Counter increment error:', error.message);
      return 0;
    }
  }

  /**
   * Get counter value
   */
  async getCounter(category, identifier) {
    if (!this.connected) return 0;

    try {
      const key = this.generateKey('counter', category, { id: identifier });
      const result = await this.redis.get(key);
      return parseInt(result) || 0;
    } catch (error) {
      console.error('❌ Counter get error:', error.message);
      return 0;
    }
  }

  /**
   * Set with expiration time
   */
  async setWithExpiry(key, value, seconds) {
    if (!this.connected) return false;

    try {
      await this.redis.setex(key, seconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('❌ Set with expiry error:', error.message);
      return false;
    }
  }

  /**
   * Add to sorted set (for leaderboards, rankings)
   */
  async addToSortedSet(setName, score, member) {
    if (!this.connected) return false;

    try {
      const key = `sichr:sorted:${setName}`;
      await this.redis.zadd(key, score, member);
      return true;
    } catch (error) {
      console.error('❌ Sorted set add error:', error.message);
      return false;
    }
  }

  /**
   * Get top items from sorted set
   */
  async getTopFromSortedSet(setName, count = 10) {
    if (!this.connected) return [];

    try {
      const key = `sichr:sorted:${setName}`;
      const result = await this.redis.zrevrange(key, 0, count - 1, 'WITHSCORES');
      
      // Convert to objects
      const items = [];
      for (let i = 0; i < result.length; i += 2) {
        items.push({
          member: result[i],
          score: parseFloat(result[i + 1])
        });
      }
      
      return items;
    } catch (error) {
      console.error('❌ Sorted set get error:', error.message);
      return [];
    }
  }

  /**
   * Cache management functions
   */
  async getCacheStats() {
    if (!this.connected) return null;

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        connected: this.connected,
        memory_usage: this.parseRedisInfo(info),
        keyspace: this.parseRedisInfo(keyspace),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Cache stats error:', error.message);
      return null;
    }
  }

  parseRedisInfo(infoString) {
    const lines = infoString.split('\r\n');
    const info = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#') && line.includes(':')) {
        const [key, value] = line.split(':');
        info[key] = value;
      }
    });
    
    return info;
  }

  /**
   * Flush all cache (use with caution)
   */
  async flushAll() {
    if (!this.connected) return false;

    try {
      await this.redis.flushdb();
      console.log('🧹 All cache cleared');
      return true;
    } catch (error) {
      console.error('❌ Cache flush error:', error.message);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('🔌 Redis connection closed');
    }
  }
}

// Middleware for automatic caching
const cacheMiddleware = (category, getTtl = null) => {
  return async (req, res, next) => {
    if (!cacheService.connected) {
      return next();
    }

    const cacheKey = `${req.method}:${req.originalUrl}`;
    const cached = await cacheService.get(category, cacheKey, req.query);

    if (cached) {
      console.log(`🎯 Cache hit for ${req.originalUrl}`);
      return res.json(cached);
    }

    // Store original res.json
    const originalJson = res.json.bind(res);
    
    // Override res.json to cache the response
    res.json = function(data) {
      if (res.statusCode === 200) {
        const ttl = getTtl ? getTtl(req) : null;
        cacheService.set(category, cacheKey, data, ttl, req.query);
      }
      return originalJson(data);
    };

    next();
  };
};

// Create singleton instance
const cacheService = new RedisCacheService();

module.exports = {
  cacheService,
  cacheMiddleware
};
