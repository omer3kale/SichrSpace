const compression = require('compression');
const express = require('express');
const path = require('path');

/**
 * Performance Optimization Utilities
 * Step 8.3: Production performance enhancements
 */

// Static file caching configuration
const staticCacheConfig = {
  // Cache images for 1 year
  images: {
    maxAge: '1y',
    etag: true,
    lastModified: true
  },
  
  // Cache CSS/JS for 1 month
  assets: {
    maxAge: '1M',
    etag: true,
    lastModified: true
  },
  
  // Cache HTML for 1 hour
  html: {
    maxAge: '1h',
    etag: true,
    lastModified: true
  }
};

// Compression middleware with optimized settings
const compressionMiddleware = compression({
  // Compression level (1-9, 6 is good balance)
  level: 6,
  
  // Only compress files larger than 1KB
  threshold: 1024,
  
  // Compression filter
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use compression filter function
    return compression.filter(req, res);
  },
  
  // Custom compression types
  chunkSize: 1024,
  windowBits: 15,
  memLevel: 8
});

// Database query optimization helpers
class QueryOptimizer {
  constructor() {
    this.queryCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  // Cache frequently used queries
  cacheQuery(key, result, ttl = this.cacheTimeout) {
    const cacheEntry = {
      data: result,
      timestamp: Date.now(),
      ttl: ttl
    };
    
    this.queryCache.set(key, cacheEntry);
    
    // Clean up expired entries
    setTimeout(() => {
      this.queryCache.delete(key);
    }, ttl);
  }
  
  // Retrieve cached query result
  getCachedQuery(key) {
    const entry = this.queryCache.get(key);
    
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  // Generate cache key for apartment listings
  getApartmentCacheKey(filters = {}) {
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        result[key] = filters[key];
        return result;
      }, {});
    
    return `apartments:${JSON.stringify(sortedFilters)}`;
  }
  
  // Optimized apartment query builder
  buildApartmentQuery(filters = {}) {
    let query = `
      SELECT a.*, 
             u.name as landlord_name,
             u.email as landlord_email,
             COUNT(vr.id) as viewing_requests_count
      FROM apartments a
      LEFT JOIN users u ON a.landlord_id = u.id
      LEFT JOIN viewing_requests vr ON a.id = vr.apartment_id
      WHERE a.status = 'active'
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Add filters efficiently
    if (filters.city) {
      query += ` AND LOWER(a.city) = LOWER($${paramIndex})`;
      params.push(filters.city);
      paramIndex++;
    }
    
    if (filters.minPrice) {
      query += ` AND a.price >= $${paramIndex}`;
      params.push(filters.minPrice);
      paramIndex++;
    }
    
    if (filters.maxPrice) {
      query += ` AND a.price <= $${paramIndex}`;
      params.push(filters.maxPrice);
      paramIndex++;
    }
    
    if (filters.bedrooms) {
      query += ` AND a.bedrooms >= $${paramIndex}`;
      params.push(filters.bedrooms);
      paramIndex++;
    }
    
    if (filters.bathrooms) {
      query += ` AND a.bathrooms >= $${paramIndex}`;
      params.push(filters.bathrooms);
      paramIndex++;
    }
    
    // Group by for aggregate functions
    query += ` GROUP BY a.id, u.name, u.email`;
    
    // Default sorting by creation date
    query += ` ORDER BY a.created_at DESC`;
    
    // Pagination
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }
    
    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }
    
    return { query, params };
  }
}

// Memory usage monitoring
class MemoryMonitor {
  constructor() {
    this.alerts = [];
  }
  
  // Check memory usage
  checkMemoryUsage() {
    const usage = process.memoryUsage();
    const mbUsage = {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100
    };
    
    // Alert if memory usage is high
    if (mbUsage.heapUsed > 500) { // 500MB threshold
      console.warn('⚠️ High memory usage detected:', mbUsage);
      this.alerts.push({
        type: 'high_memory',
        usage: mbUsage,
        timestamp: new Date().toISOString()
      });
    }
    
    return mbUsage;
  }
  
  // Get memory alerts
  getAlerts() {
    return this.alerts;
  }
  
  // Clear old alerts
  clearOldAlerts() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > oneHourAgo
    );
  }
}

// Response time monitoring middleware
const responseTimeMonitor = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    // Log slow requests
    if (duration > 1000) { // 1 second threshold
      console.warn('🐌 Slow request:', {
        method: req.method,
        path: req.path,
        duration: `${duration.toFixed(2)}ms`,
        userAgent: req.headers['user-agent']?.substring(0, 50)
      });
    }
    
    // Add response time header
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  });
  
  next();
};

// Asset optimization helpers
const assetOptimization = {
  // Serve optimized static files
  serveStatic: (staticPath) => {
    return express.static(staticPath, {
      maxAge: staticCacheConfig.assets.maxAge,
      etag: staticCacheConfig.assets.etag,
      lastModified: staticCacheConfig.assets.lastModified,
      
      // Set specific cache headers based on file type
      setHeaders: (res, path) => {
        const ext = path.split('.').pop().toLowerCase();
        
        switch (ext) {
          case 'jpg':
          case 'jpeg':
          case 'png':
          case 'gif':
          case 'webp':
          case 'svg':
            res.set('Cache-Control', `public, max-age=${365 * 24 * 60 * 60}`); // 1 year
            break;
            
          case 'css':
          case 'js':
            res.set('Cache-Control', `public, max-age=${30 * 24 * 60 * 60}`); // 30 days
            break;
            
          case 'html':
            res.set('Cache-Control', `public, max-age=${60 * 60}`); // 1 hour
            break;
            
          default:
            res.set('Cache-Control', `public, max-age=${24 * 60 * 60}`); // 1 day
        }
        
        // Enable gzip compression hint
        res.set('Vary', 'Accept-Encoding');
      }
    });
  }
};

// Database connection pool optimization
const dbPoolConfig = {
  // Connection pool settings
  max: 20, // Maximum number of connections
  min: 2,  // Minimum number of connections
  idle: 10000, // Maximum time a connection can be idle
  acquire: 60000, // Maximum time to acquire connection
  evict: 1000, // Time interval to run eviction
  
  // Query optimization
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  benchmark: true,
  
  // Connection retry
  retry: {
    max: 3,
    match: [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ]
  }
};

// PayPal API response caching
class PayPalCache {
  constructor() {
    this.cache = new Map();
    this.cacheDuration = 10 * 60 * 1000; // 10 minutes
  }
  
  // Cache PayPal access tokens
  cacheAccessToken(token, expiresIn) {
    const expiryTime = Date.now() + (expiresIn * 1000) - 60000; // 1 minute buffer
    
    this.cache.set('access_token', {
      token,
      expiryTime
    });
  }
  
  // Get cached access token
  getAccessToken() {
    const cached = this.cache.get('access_token');
    
    if (!cached || Date.now() >= cached.expiryTime) {
      this.cache.delete('access_token');
      return null;
    }
    
    return cached.token;
  }
  
  // Cache payment details
  cachePaymentDetails(paymentId, details) {
    this.cache.set(`payment_${paymentId}`, {
      details,
      timestamp: Date.now()
    });
    
    // Auto-cleanup after cache duration
    setTimeout(() => {
      this.cache.delete(`payment_${paymentId}`);
    }, this.cacheDuration);
  }
  
  // Get cached payment details
  getPaymentDetails(paymentId) {
    const cached = this.cache.get(`payment_${paymentId}`);
    
    if (!cached || Date.now() - cached.timestamp > this.cacheDuration) {
      this.cache.delete(`payment_${paymentId}`);
      return null;
    }
    
    return cached.details;
  }
}

// Initialize performance monitoring instances
const queryOptimizer = new QueryOptimizer();
const memoryMonitor = new MemoryMonitor();
const paypalCache = new PayPalCache();

// Start memory monitoring
setInterval(() => {
  memoryMonitor.checkMemoryUsage();
  memoryMonitor.clearOldAlerts();
}, 60000); // Check every minute

module.exports = {
  compressionMiddleware,
  responseTimeMonitor,
  assetOptimization,
  staticCacheConfig,
  dbPoolConfig,
  QueryOptimizer,
  MemoryMonitor,
  PayPalCache,
  queryOptimizer,
  memoryMonitor,
  paypalCache
};
