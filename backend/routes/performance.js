const express = require('express');
const router = express.Router();
const { cacheService, cacheMiddleware } = require('../services/RedisCacheService');
const DatabasePerformanceService = require('../services/DatabasePerformanceService');
const supabaseAdmin = require('../config/supabase');

/**
 * Performance monitoring and optimization routes
 * Step 9.1: Infrastructure Optimization - Performance API
 */

// Initialize database performance service
const dbPerformance = new DatabasePerformanceService(supabaseAdmin);

/**
 * GET /api/performance/cache/stats
 * Get cache performance statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    
    if (!stats) {
      return res.status(503).json({
        success: false,
        message: 'Cache service unavailable'
      });
    }

    // Add cache hit rates from counters
    const cacheHits = await cacheService.getCounter('cache_hits', 'total');
    const cacheMisses = await cacheService.getCounter('cache_misses', 'total');
    const totalRequests = cacheHits + cacheMisses;
    
    const hitRate = totalRequests > 0 ? ((cacheHits / totalRequests) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        ...stats,
        performance: {
          hits: cacheHits,
          misses: cacheMisses,
          total_requests: totalRequests,
          hit_rate: `${hitRate}%`
        }
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cache statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/database/stats
 * Get database performance statistics
 */
router.get('/database/stats', async (req, res) => {
  try {
    const stats = dbPerformance.getPerformanceStats();
    const recommendations = await dbPerformance.optimizeQueries();

    res.json({
      success: true,
      data: {
        performance: stats,
        recommendations
      }
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get database statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/system/overview
 * Get overall system performance overview
 */
router.get('/system/overview', async (req, res) => {
  try {
    const [cacheStats, dbStats] = await Promise.all([
      cacheService.getCacheStats(),
      dbPerformance.getPerformanceStats()
    ]);

    // Get system metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      cpu: process.cpuUsage()
    };

    res.json({
      success: true,
      data: {
        system: systemMetrics,
        cache: cacheStats,
        database: dbStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting system overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system overview',
      error: error.message
    });
  }
});

/**
 * POST /api/performance/cache/clear
 * Clear cache by category
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const { category } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category is required'
      });
    }

    const result = await cacheService.clearCategory(category);

    res.json({
      success: result,
      message: result ? `Cache cleared for category: ${category}` : 'Failed to clear cache'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

/**
 * POST /api/performance/cache/flush
 * Flush all cache (admin only)
 */
router.post('/cache/flush', async (req, res) => {
  try {
    // Add admin check here if needed
    const result = await cacheService.flushAll();

    res.json({
      success: result,
      message: result ? 'All cache flushed' : 'Failed to flush cache'
    });
  } catch (error) {
    console.error('Error flushing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to flush cache',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/analytics/popular-apartments
 * Get popular apartments with caching
 */
router.get('/analytics/popular-apartments', 
  cacheMiddleware('analytics', (req) => 600), // 10 minute cache
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const result = await dbPerformance.getPopularApartments(limit);

      if (result.error) {
        return res.status(500).json({
          success: false,
          message: 'Failed to get popular apartments',
          error: result.error.message
        });
      }

      res.json({
        success: true,
        data: result.data,
        cached: result.cached || false
      });
    } catch (error) {
      console.error('Error getting popular apartments:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get popular apartments',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/performance/analytics/:metric
 * Get analytics data with caching
 */
router.get('/analytics/:metric',
  cacheMiddleware('analytics', (req) => 300), // 5 minute cache
  async (req, res) => {
    try {
      const { metric } = req.params;
      const { timeframe = '24h' } = req.query;

      const validMetrics = ['new_apartments', 'new_users', 'viewing_requests', 'messages'];
      if (!validMetrics.includes(metric)) {
        return res.status(400).json({
          success: false,
          message: `Invalid metric. Valid metrics: ${validMetrics.join(', ')}`
        });
      }

      const result = await dbPerformance.getAnalyticsData(metric, timeframe);

      if (result.error) {
        return res.status(500).json({
          success: false,
          message: `Failed to get ${metric} analytics`,
          error: result.error.message
        });
      }

      // Process data for chart display
      const processedData = processAnalyticsData(result.data, metric, timeframe);

      res.json({
        success: true,
        data: processedData,
        cached: result.cached || false,
        executionTime: result.executionTime
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics data',
        error: error.message
      });
    }
  }
);

/**
 * GET /api/performance/test/cache
 * Test cache performance
 */
router.get('/test/cache', async (req, res) => {
  try {
    const testData = {
      message: 'Cache test data',
      timestamp: new Date().toISOString(),
      random: Math.random()
    };

    // Test set/get operations
    const setResult = await cacheService.set('test', 'performance', testData, 60);
    const getData = await cacheService.get('test', 'performance');
    
    // Test counter operations
    const counterBefore = await cacheService.getCounter('test', 'counter');
    await cacheService.incrementCounter('test', 'counter', 5);
    const counterAfter = await cacheService.getCounter('test', 'counter');

    res.json({
      success: true,
      tests: {
        set_operation: setResult,
        get_operation: getData !== null,
        data_integrity: JSON.stringify(getData) === JSON.stringify(testData),
        counter_before: counterBefore,
        counter_after: counterAfter,
        counter_increment: counterAfter - counterBefore === 5
      },
      retrieved_data: getData
    });
  } catch (error) {
    console.error('Error testing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Cache test failed',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/leaderboard/:category
 * Get leaderboard data from sorted sets
 */
router.get('/leaderboard/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const leaderboard = await cacheService.getTopFromSortedSet(category, limit);

    res.json({
      success: true,
      data: leaderboard,
      category,
      limit
    });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leaderboard',
      error: error.message
    });
  }
});

/**
 * POST /api/performance/leaderboard/:category
 * Add score to leaderboard
 */
router.post('/leaderboard/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { member, score } = req.body;

    if (!member || score === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Member and score are required'
      });
    }

    const result = await cacheService.addToSortedSet(category, score, member);

    res.json({
      success: result,
      message: result ? 'Score added to leaderboard' : 'Failed to add score'
    });
  } catch (error) {
    console.error('Error adding to leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to leaderboard',
      error: error.message
    });
  }
});

/**
 * Helper function to process analytics data
 */
function processAnalyticsData(data, metric, timeframe) {
  if (!data || data.length === 0) {
    return {
      total: 0,
      chart_data: [],
      summary: `No ${metric} data available for ${timeframe}`
    };
  }

  const total = data.length;
  const chartData = [];

  // Group data by time intervals
  const now = new Date();
  let intervals;
  let formatKey;

  switch (timeframe) {
    case '1h':
      intervals = 12; // 5-minute intervals
      formatKey = (date) => date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      break;
    case '24h':
      intervals = 24; // hourly intervals
      formatKey = (date) => date.toLocaleTimeString('en-US', { 
        hour: '2-digit' 
      });
      break;
    case '7d':
      intervals = 7; // daily intervals
      formatKey = (date) => date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      break;
    case '30d':
      intervals = 30; // daily intervals
      formatKey = (date) => date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      break;
    default:
      intervals = 24;
      formatKey = (date) => date.toLocaleTimeString('en-US', { 
        hour: '2-digit' 
      });
  }

  // Create time buckets
  for (let i = intervals - 1; i >= 0; i--) {
    const bucketDate = new Date(now);
    
    switch (timeframe) {
      case '1h':
        bucketDate.setMinutes(bucketDate.getMinutes() - (i * 5));
        break;
      case '24h':
        bucketDate.setHours(bucketDate.getHours() - i);
        break;
      case '7d':
      case '30d':
        bucketDate.setDate(bucketDate.getDate() - i);
        break;
    }

    const label = formatKey(bucketDate);
    const count = data.filter(item => {
      const itemDate = new Date(item.created_at);
      const bucketStart = new Date(bucketDate);
      const bucketEnd = new Date(bucketDate);

      switch (timeframe) {
        case '1h':
          bucketEnd.setMinutes(bucketEnd.getMinutes() + 5);
          break;
        case '24h':
          bucketEnd.setHours(bucketEnd.getHours() + 1);
          break;
        case '7d':
        case '30d':
          bucketEnd.setDate(bucketEnd.getDate() + 1);
          break;
      }

      return itemDate >= bucketStart && itemDate < bucketEnd;
    }).length;

    chartData.push({ label, value: count });
  }

  return {
    total,
    chart_data: chartData,
    summary: `${total} ${metric.replace('_', ' ')} in the last ${timeframe}`
  };
}

module.exports = router;
