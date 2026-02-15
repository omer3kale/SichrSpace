const { cacheService } = require('../services/RedisCacheService');

/**
 * Database Performance Service for SichrPlace
 * Step 9.1: Infrastructure Optimization - Database Performance
 */

class DatabasePerformanceService {
  constructor(supabase) {
    this.supabase = supabase;
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
  }

  /**
   * Wrapper for Supabase queries with caching and performance monitoring
   */
  async performQuery(tableName, queryBuilder, cacheConfig = {}) {
    const startTime = Date.now();
    const queryId = this.generateQueryId(tableName, queryBuilder);
    
    try {
      // Check cache first
      if (cacheConfig.enabled) {
        const cached = await cacheService.get(
          cacheConfig.category || 'database',
          queryId,
          cacheConfig.params || {}
        );
        
        if (cached) {
          this.recordQueryStats(queryId, Date.now() - startTime, true);
          return { data: cached, error: null, cached: true };
        }
      }

      // Execute query
      const result = await queryBuilder;
      const executionTime = Date.now() - startTime;

      // Record performance metrics
      this.recordQueryStats(queryId, executionTime, false);

      // Cache successful results
      if (cacheConfig.enabled && result.data && !result.error) {
        await cacheService.set(
          cacheConfig.category || 'database',
          queryId,
          result.data,
          cacheConfig.ttl,
          cacheConfig.params || {}
        );
      }

      return { ...result, cached: false, executionTime };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.recordQueryStats(queryId, executionTime, false, error);
      throw error;
    }
  }

  /**
   * Optimized apartment search with caching
   */
  async searchApartments(filters = {}) {
    const cacheConfig = {
      enabled: true,
      category: 'apartments',
      ttl: 300, // 5 minutes
      params: filters
    };

    let query = this.supabase.from('apartments').select(`
      id, title, description, price, location, 
      bedrooms, bathrooms, area, amenities,
      images, landlord_id, created_at,
      available_from, contact_info
    `);

    // Apply filters with optimized indexing
    if (filters.minPrice || filters.maxPrice) {
      if (filters.minPrice) query = query.gte('price', filters.minPrice);
      if (filters.maxPrice) query = query.lte('price', filters.maxPrice);
    }

    if (filters.bedrooms) {
      query = query.eq('bedrooms', filters.bedrooms);
    }

    if (filters.bathrooms) {
      query = query.gte('bathrooms', filters.bathrooms);
    }

    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    if (filters.amenities && filters.amenities.length > 0) {
      query = query.overlaps('amenities', filters.amenities);
    }

    if (filters.availableFrom) {
      query = query.lte('available_from', filters.availableFrom);
    }

    // Add ordering for consistent results
    query = query.order('created_at', { ascending: false });

    // Add pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    return await this.performQuery('apartments', query, cacheConfig);
  }

  /**
   * Get apartment by ID with caching
   */
  async getApartmentById(id) {
    const cacheConfig = {
      enabled: true,
      category: 'apartments',
      ttl: 600, // 10 minutes
      params: { id }
    };

    const query = this.supabase
      .from('apartments')
      .select('*')
      .eq('id', id)
      .single();

    return await this.performQuery('apartments', query, cacheConfig);
  }

  /**
   * Get user data with caching
   */
  async getUserById(userId) {
    const cacheConfig = {
      enabled: true,
      category: 'users',
      ttl: 300, // 5 minutes
      params: { userId }
    };

    const query = this.supabase
      .from('users')
      .select('id, email, name, phone, user_type, preferences, created_at')
      .eq('id', userId)
      .single();

    return await this.performQuery('users', query, cacheConfig);
  }

  /**
   * Get viewing requests with optimized joins
   */
  async getViewingRequests(userId, userType) {
    const cacheConfig = {
      enabled: true,
      category: 'viewing_requests',
      ttl: 60, // 1 minute
      params: { userId, userType }
    };

    let query = this.supabase.from('viewing_requests').select(`
      id, apartment_id, requester_id, landlord_id,
      preferred_date, preferred_time, message, status,
      created_at, updated_at,
      apartments:apartment_id (
        id, title, location, price, images
      ),
      requesters:requester_id (
        id, name, email, phone
      )
    `);

    if (userType === 'landlord') {
      query = query.eq('landlord_id', userId);
    } else {
      query = query.eq('requester_id', userId);
    }

    query = query.order('created_at', { ascending: false });

    return await this.performQuery('viewing_requests', query, cacheConfig);
  }

  /**
   * Get conversations with pagination and caching
   */
  async getConversations(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const cacheConfig = {
      enabled: true,
      category: 'conversations',
      ttl: 30, // 30 seconds
      params: { userId, page, limit }
    };

    const query = this.supabase.from('conversations').select(`
      id, apartment_id, requester_id, landlord_id,
      last_message, last_message_at, created_at,
      apartments:apartment_id (
        id, title, location, images
      ),
      requesters:requester_id (
        id, name
      ),
      landlords:landlord_id (
        id, name
      )
    `)
    .or(`requester_id.eq.${userId},landlord_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

    return await this.performQuery('conversations', query, cacheConfig);
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const cacheConfig = {
      enabled: true,
      category: 'messages',
      ttl: 30, // 30 seconds
      params: { conversationId, page, limit }
    };

    const query = this.supabase.from('messages').select(`
      id, conversation_id, sender_id, content,
      message_type, read_at, created_at,
      senders:sender_id (
        id, name
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

    return await this.performQuery('messages', query, cacheConfig);
  }

  /**
   * Analytics queries with caching
   */
  async getAnalyticsData(metric, timeframe = '24h') {
    const cacheConfig = {
      enabled: true,
      category: 'analytics',
      ttl: 300, // 5 minutes
      params: { metric, timeframe }
    };

    let dateFilter = new Date();
    switch (timeframe) {
      case '1h':
        dateFilter.setHours(dateFilter.getHours() - 1);
        break;
      case '24h':
        dateFilter.setDate(dateFilter.getDate() - 1);
        break;
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
    }

    let query;
    switch (metric) {
      case 'new_apartments':
        query = this.supabase
          .from('apartments')
          .select('id, created_at')
          .gte('created_at', dateFilter.toISOString());
        break;
      
      case 'new_users':
        query = this.supabase
          .from('users')
          .select('id, created_at, user_type')
          .gte('created_at', dateFilter.toISOString());
        break;
      
      case 'viewing_requests':
        query = this.supabase
          .from('viewing_requests')
          .select('id, created_at, status')
          .gte('created_at', dateFilter.toISOString());
        break;
      
      case 'messages':
        query = this.supabase
          .from('messages')
          .select('id, created_at')
          .gte('created_at', dateFilter.toISOString());
        break;
      
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    return await this.performQuery('analytics', query, cacheConfig);
  }

  /**
   * Popular apartments based on viewing requests
   */
  async getPopularApartments(limit = 10) {
    const cacheConfig = {
      enabled: true,
      category: 'popular_apartments',
      ttl: 600, // 10 minutes
      params: { limit }
    };

    const query = this.supabase.rpc('get_popular_apartments', { request_limit: limit });

    return await this.performQuery('popular_apartments', query, cacheConfig);
  }

  /**
   * Database optimization utilities
   */
  async optimizeQueries() {
    const recommendations = [];

    // Check for slow queries
    const slowQueries = Array.from(this.queryStats.entries())
      .filter(([_, stats]) => stats.avgTime > this.slowQueryThreshold)
      .sort((a, b) => b[1].avgTime - a[1].avgTime);

    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'slow_queries',
        count: slowQueries.length,
        queries: slowQueries.slice(0, 5).map(([id, stats]) => ({
          id,
          avgTime: stats.avgTime,
          count: stats.count
        }))
      });
    }

    // Check cache hit rates
    const cacheStats = await cacheService.getCacheStats();
    if (cacheStats) {
      recommendations.push({
        type: 'cache_performance',
        stats: cacheStats
      });
    }

    return recommendations;
  }

  /**
   * Clear cache for specific data
   */
  async invalidateCache(category, identifier = null) {
    if (identifier) {
      return await cacheService.delete(category, identifier);
    } else {
      return await cacheService.clearCategory(category);
    }
  }

  /**
   * Batch operations with caching
   */
  async batchGetApartments(apartmentIds) {
    const cached = [];
    const uncached = [];

    // Check cache for each apartment
    for (const id of apartmentIds) {
      const cachedApartment = await cacheService.get('apartments', id);
      if (cachedApartment) {
        cached.push(cachedApartment);
      } else {
        uncached.push(id);
      }
    }

    // Fetch uncached apartments
    let freshApartments = [];
    if (uncached.length > 0) {
      const result = await this.supabase
        .from('apartments')
        .select('*')
        .in('id', uncached);

      if (result.data) {
        freshApartments = result.data;

        // Cache the fresh results
        for (const apartment of freshApartments) {
          await cacheService.set('apartments', apartment.id, apartment, 600);
        }
      }
    }

    return [...cached, ...freshApartments];
  }

  /**
   * Helper methods
   */
  generateQueryId(tableName, queryBuilder) {
    const queryString = queryBuilder.toString ? queryBuilder.toString() : JSON.stringify(queryBuilder);
    const crypto = require('crypto');
    return crypto.createHash('md5').update(`${tableName}:${queryString}`).digest('hex');
  }

  recordQueryStats(queryId, executionTime, fromCache, error = null) {
    if (!this.queryStats.has(queryId)) {
      this.queryStats.set(queryId, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        cacheHits: 0,
        errors: 0
      });
    }

    const stats = this.queryStats.get(queryId);
    stats.count++;
    
    if (fromCache) {
      stats.cacheHits++;
    } else {
      stats.totalTime += executionTime;
      stats.avgTime = stats.totalTime / (stats.count - stats.cacheHits);
    }

    if (error) {
      stats.errors++;
    }

    // Log slow queries
    if (!fromCache && executionTime > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected: ${queryId} (${executionTime}ms)`);
    }

    // Increment cache counters
    if (fromCache) {
      cacheService.incrementCounter('cache_hits', queryId);
    } else {
      cacheService.incrementCounter('cache_misses', queryId);
    }
  }

  getPerformanceStats() {
    const stats = Array.from(this.queryStats.entries()).map(([queryId, data]) => ({
      queryId,
      ...data,
      cacheHitRate: data.count > 0 ? (data.cacheHits / data.count * 100).toFixed(2) + '%' : '0%'
    }));

    return {
      totalQueries: this.queryStats.size,
      slowQueries: stats.filter(s => s.avgTime > this.slowQueryThreshold).length,
      topSlowQueries: stats
        .filter(s => s.avgTime > 0)
        .sort((a, b) => b.avgTime - a.avgTime)
        .slice(0, 10),
      topCachedQueries: stats
        .sort((a, b) => b.cacheHits - a.cacheHits)
        .slice(0, 10)
    };
  }
}

module.exports = DatabasePerformanceService;
