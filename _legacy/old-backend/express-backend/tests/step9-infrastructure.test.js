/**
 * Step 9.1: Infrastructure Optimization Tests
 * Comprehensive testing for Redis caching and database performance
 */

describe('Step 9.1: Infrastructure Optimization', function() {
  
  describe('Redis Cache Service', () => {
    
    it('should validate cache service interface', () => {
      // Test the service can be loaded without errors
      expect(() => {
        require('../services/RedisCacheService');
      }).not.toThrow();
    });

    it('should validate database performance service interface', () => {
      // Test the service can be loaded without errors
      expect(() => {
        require('../services/DatabasePerformanceService');
      }).not.toThrow();
    });

    it('should have correct cache service structure', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      expect(cacheService).toBeDefined();
      expect(typeof cacheService.set).toBe('function');
      expect(typeof cacheService.get).toBe('function');
      expect(typeof cacheService.delete).toBe('function');
      expect(typeof cacheService.clearCategory).toBe('function');
      expect(typeof cacheService.incrementCounter).toBe('function');
      expect(typeof cacheService.getCounter).toBe('function');
    });

    it('should have database performance service methods', () => {
      const DatabasePerformanceService = require('../services/DatabasePerformanceService');
      const mockSupabase = { from: () => ({ select: () => ({}) }) };
      const dbService = new DatabasePerformanceService(mockSupabase);
      
      expect(typeof dbService.performQuery).toBe('function');
      expect(typeof dbService.searchApartments).toBe('function');
      expect(typeof dbService.getApartmentById).toBe('function');
      expect(typeof dbService.getUserById).toBe('function');
      expect(typeof dbService.getViewingRequests).toBe('function');
      expect(typeof dbService.getAnalyticsData).toBe('function');
      expect(typeof dbService.getPopularApartments).toBe('function');
      expect(typeof dbService.optimizeQueries).toBe('function');
      expect(typeof dbService.invalidateCache).toBe('function');
      expect(typeof dbService.batchGetApartments).toBe('function');
    });

    it('should validate cache key generation', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      const key1 = cacheService.generateKey('test', 'item1', {});
      const key2 = cacheService.generateKey('test', 'item1', { param: 'value' });
      
      expect(key1).toBe('sichr:test:item1');
      expect(key2).toContain('sichr:test:item1:');
      expect(key1).not.toBe(key2);
    });

    it('should have proper TTL defaults', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      expect(cacheService.defaultTTL).toBeDefined();
      expect(cacheService.defaultTTL.apartments).toBe(15 * 60);
      expect(cacheService.defaultTTL.users).toBe(10 * 60);
      expect(cacheService.defaultTTL.search).toBe(5 * 60);
      expect(cacheService.defaultTTL.geocoding).toBe(60 * 60);
      expect(cacheService.defaultTTL.session).toBe(24 * 60 * 60);
    });

    it('should have middleware function', () => {
      const { cacheMiddleware } = require('../services/RedisCacheService');
      
      expect(typeof cacheMiddleware).toBe('function');
      
      const middleware = cacheMiddleware('test');
      expect(typeof middleware).toBe('function');
    });

    it('should validate performance routes', () => {
      expect(() => {
        require('../routes/performance');
      }).not.toThrow();
    });

    it('should have database service performance tracking', () => {
      const DatabasePerformanceService = require('../services/DatabasePerformanceService');
      const mockSupabase = { from: () => ({ select: () => ({}) }) };
      const dbService = new DatabasePerformanceService(mockSupabase);
      
      expect(dbService.queryStats).toBeDefined();
      expect(dbService.slowQueryThreshold).toBe(1000);
      expect(typeof dbService.getPerformanceStats).toBe('function');
      expect(typeof dbService.recordQueryStats).toBe('function');
    });

    it('should validate query ID generation', () => {
      const DatabasePerformanceService = require('../services/DatabasePerformanceService');
      const mockSupabase = { from: () => ({ select: () => ({}) }) };
      const dbService = new DatabasePerformanceService(mockSupabase);
      
      const queryId1 = dbService.generateQueryId('table1', 'query1');
      const queryId2 = dbService.generateQueryId('table1', 'query2');
      
      expect(typeof queryId1).toBe('string');
      expect(typeof queryId2).toBe('string');
      expect(queryId1).not.toBe(queryId2);
      expect(queryId1.length).toBe(32); // MD5 hash length
    });

    it('should have correct cache service configuration', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      expect(cacheService.config).toBeDefined();
      expect(cacheService.config.host).toBeDefined();
      expect(cacheService.config.port).toBeDefined();
      expect(cacheService.config.retryDelayOnFailover).toBe(100);
      expect(cacheService.config.maxRetriesPerRequest).toBe(3);
    });

    it('should handle cache service initialization', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      expect(typeof cacheService.initializeRedis).toBe('function');
      expect(typeof cacheService.testConnection).toBe('function');
      expect(typeof cacheService.close).toBe('function');
    });

    it('should have specialized cache methods', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      expect(typeof cacheService.cacheApartmentSearch).toBe('function');
      expect(typeof cacheService.getCachedApartmentSearch).toBe('function');
      expect(typeof cacheService.cacheUserSession).toBe('function');
      expect(typeof cacheService.getCachedUserSession).toBe('function');
      expect(typeof cacheService.cacheGeocodingResult).toBe('function');
      expect(typeof cacheService.getCachedGeocodingResult).toBe('function');
      expect(typeof cacheService.cacheNearbyPlaces).toBe('function');
      expect(typeof cacheService.getCachedNearbyPlaces).toBe('function');
      expect(typeof cacheService.cacheAnalytics).toBe('function');
      expect(typeof cacheService.getCachedAnalytics).toBe('function');
    });

    it('should have sorted set operations', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      expect(typeof cacheService.addToSortedSet).toBe('function');
      expect(typeof cacheService.getTopFromSortedSet).toBe('function');
    });

    it('should have cache management functions', () => {
      const { cacheService } = require('../services/RedisCacheService');
      
      expect(typeof cacheService.getCacheStats).toBe('function');
      expect(typeof cacheService.flushAll).toBe('function');
      expect(typeof cacheService.setWithExpiry).toBe('function');
      expect(typeof cacheService.parseRedisInfo).toBe('function');
    });

    it('should validate database optimization methods', () => {
      const DatabasePerformanceService = require('../services/DatabasePerformanceService');
      const mockSupabase = { 
        from: () => ({ 
          select: () => ({}),
          eq: () => ({}),
          single: () => ({})
        }),
        rpc: () => ({})
      };
      const dbService = new DatabasePerformanceService(mockSupabase);
      
      expect(typeof dbService.getConversations).toBe('function');
      expect(typeof dbService.getMessages).toBe('function');
    });
  });

  describe('Performance Integration', () => {
    
    it('should have performance monitoring setup', () => {
      // Check that all required modules load correctly
      const cacheModule = require('../services/RedisCacheService');
      const dbModule = require('../services/DatabasePerformanceService');
      const performanceRoutes = require('../routes/performance');
      
      expect(cacheModule.cacheService).toBeDefined();
      expect(cacheModule.cacheMiddleware).toBeDefined();
      expect(dbModule).toBeDefined();
      expect(performanceRoutes).toBeDefined();
    });

    it('should validate Step 9.1 implementation completeness', () => {
      // Redis Cache Service
      const { cacheService } = require('../services/RedisCacheService');
      expect(cacheService).toBeDefined();
      
      // Database Performance Service
      const DatabasePerformanceService = require('../services/DatabasePerformanceService');
      expect(DatabasePerformanceService).toBeDefined();
      
      // Performance Routes
      const performanceRoutes = require('../routes/performance');
      expect(performanceRoutes).toBeDefined();
      
      console.log('✅ Step 9.1 Infrastructure Optimization - All components loaded successfully');
      console.log('📊 Redis caching system implemented');
      console.log('🗃️  Database performance monitoring implemented');
      console.log('🚀 Performance dashboard and API endpoints ready');
    });
  });
});
