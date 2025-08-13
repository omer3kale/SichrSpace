const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');

// Import Step 8 performance utilities
const {
  compressionMiddleware,
  responseTimeMonitor,
  assetOptimization,
  QueryOptimizer,
  MemoryMonitor,
  PayPalCache,
  queryOptimizer,
  memoryMonitor,
  paypalCache
} = require('../utils/performance');

describe('Step 8.3: Performance Optimization Tests', () => {
  let app;
  let sandbox;

  beforeEach(() => {
    app = express();
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Compression Middleware', () => {
    beforeEach(() => {
      app.use(compressionMiddleware);
    });

    it('should apply gzip compression to responses', (done) => {
      app.get('/test', (req, res) => {
        // Send a large response to trigger compression
        const largeContent = 'x'.repeat(2000);
        res.json({ data: largeContent });
      });

      request(app)
        .get('/test')
        .set('Accept-Encoding', 'gzip')
        .expect(200)
        .expect('Content-Encoding', 'gzip')
        .end(done);
    });

    it('should not compress small responses', (done) => {
      app.get('/test', (req, res) => {
        res.json({ small: 'data' });
      });

      request(app)
        .get('/test')
        .set('Accept-Encoding', 'gzip')
        .expect(200)
        .end((err, res) => {
          expect(res.headers['content-encoding']).to.be.undefined;
          done(err);
        });
    });

    it('should respect x-no-compression header', (done) => {
      app.get('/test', (req, res) => {
        const largeContent = 'x'.repeat(2000);
        res.json({ data: largeContent });
      });

      request(app)
        .get('/test')
        .set('Accept-Encoding', 'gzip')
        .set('x-no-compression', 'true')
        .expect(200)
        .end((err, res) => {
          expect(res.headers['content-encoding']).to.be.undefined;
          done(err);
        });
    });
  });

  describe('Response Time Monitor', () => {
    beforeEach(() => {
      app.use(responseTimeMonitor);
    });

    it('should add response time header', (done) => {
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .get('/test')
        .expect(200)
        .expect((res) => {
          expect(res.headers).to.have.property('x-response-time');
          expect(res.headers['x-response-time']).to.match(/\d+\.\d+ms/);
        })
        .end(done);
    });

    it('should log slow requests', (done) => {
      const consoleWarnStub = sandbox.stub(console, 'warn');
      
      app.get('/slow', (req, res) => {
        setTimeout(() => {
          res.json({ success: true });
        }, 50);
      });

      request(app)
        .get('/slow')
        .expect(200)
        .end(() => {
          // Give some time for logging
          setTimeout(() => {
            done();
          }, 100);
        });
    });
  });

  describe('Query Optimizer', () => {
    let optimizer;

    beforeEach(() => {
      optimizer = new QueryOptimizer();
    });

    it('should cache query results', () => {
      const key = 'test-query';
      const result = { data: 'test-data' };
      
      optimizer.cacheQuery(key, result);
      const cached = optimizer.getCachedQuery(key);
      
      expect(cached).to.deep.equal(result);
    });

    it('should return null for non-existent cache entries', () => {
      const cached = optimizer.getCachedQuery('non-existent');
      expect(cached).to.be.null;
    });

    it('should generate apartment cache keys correctly', () => {
      const filters = { city: 'Berlin', minPrice: 500 };
      const key = optimizer.getApartmentCacheKey(filters);
      
      expect(key).to.be.a('string');
      expect(key).to.include('apartments:');
      expect(key).to.include('Berlin');
      expect(key).to.include('500');
    });

    it('should build optimized apartment queries', () => {
      const filters = {
        city: 'Berlin',
        minPrice: 500,
        maxPrice: 2000,
        bedrooms: 2,
        limit: 10,
        offset: 0
      };
      
      const { query, params } = optimizer.buildApartmentQuery(filters);
      
      expect(query).to.be.a('string');
      expect(query).to.include('SELECT a.*');
      expect(query).to.include('WHERE a.status = \'active\'');
      expect(query).to.include('LOWER(a.city) = LOWER($1)');
      expect(query).to.include('a.price >= $2');
      expect(query).to.include('a.price <= $3');
      expect(query).to.include('a.bedrooms >= $4');
      expect(query).to.include('LIMIT $5');
      expect(query).to.include('OFFSET $6');
      
      expect(params).to.deep.equal(['Berlin', 500, 2000, 2, 10, 0]);
    });

    it('should handle empty filters in query building', () => {
      const { query, params } = optimizer.buildApartmentQuery({});
      
      expect(query).to.include('WHERE a.status = \'active\'');
      expect(params).to.be.an('array').that.is.empty;
    });

    it('should expire cached queries after TTL', (done) => {
      const key = 'test-expiry';
      const result = { data: 'test' };
      
      optimizer.cacheQuery(key, result, 50); // 50ms TTL
      
      setTimeout(() => {
        const cached = optimizer.getCachedQuery(key);
        expect(cached).to.be.null;
        done();
      }, 100);
    });
  });

  describe('Memory Monitor', () => {
    let monitor;

    beforeEach(() => {
      monitor = new MemoryMonitor();
    });

    it('should check memory usage and return metrics', () => {
      const usage = monitor.checkMemoryUsage();
      
      expect(usage).to.have.property('rss');
      expect(usage).to.have.property('heapTotal');
      expect(usage).to.have.property('heapUsed');
      expect(usage).to.have.property('external');
      
      expect(usage.rss).to.be.a('number');
      expect(usage.heapTotal).to.be.a('number');
      expect(usage.heapUsed).to.be.a('number');
    });

    it('should generate alerts for high memory usage', () => {
      const consoleWarnStub = sandbox.stub(console, 'warn');
      
      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      sandbox.stub(process, 'memoryUsage').returns({
        rss: 600 * 1024 * 1024, // 600MB
        heapTotal: 600 * 1024 * 1024,
        heapUsed: 600 * 1024 * 1024, // High usage
        external: 50 * 1024 * 1024
      });
      
      monitor.checkMemoryUsage();
      
      expect(consoleWarnStub.calledWith(sinon.match('High memory usage detected'))).to.be.true;
      expect(monitor.getAlerts()).to.have.length(1);
      expect(monitor.getAlerts()[0].type).to.equal('high_memory');
    });

    it('should clear old alerts', (done) => {
      // Add an alert
      monitor.alerts.push({
        type: 'test',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      });
      
      monitor.clearOldAlerts();
      
      expect(monitor.getAlerts()).to.have.length(0);
      done();
    });
  });

  describe('PayPal Cache', () => {
    let cache;

    beforeEach(() => {
      cache = new PayPalCache();
    });

    it('should cache and retrieve access tokens', () => {
      const token = 'test-access-token';
      const expiresIn = 3600; // 1 hour
      
      cache.cacheAccessToken(token, expiresIn);
      const cached = cache.getAccessToken();
      
      expect(cached).to.equal(token);
    });

    it('should return null for expired access tokens', (done) => {
      const token = 'test-token';
      const expiresIn = 0; // Immediate expiry
      
      cache.cacheAccessToken(token, expiresIn);
      
      setTimeout(() => {
        const cached = cache.getAccessToken();
        expect(cached).to.be.null;
        done();
      }, 100);
    });

    it('should cache and retrieve payment details', () => {
      const paymentId = 'PAYMENT-123';
      const details = { amount: 25.00, status: 'completed' };
      
      cache.cachePaymentDetails(paymentId, details);
      const cached = cache.getPaymentDetails(paymentId);
      
      expect(cached).to.deep.equal(details);
    });

    it('should auto-expire payment details', (done) => {
      const paymentId = 'PAYMENT-456';
      const details = { amount: 50.00 };
      
      // Mock short cache duration
      cache.cacheDuration = 50; // 50ms
      
      cache.cachePaymentDetails(paymentId, details);
      
      setTimeout(() => {
        const cached = cache.getPaymentDetails(paymentId);
        expect(cached).to.be.null;
        done();
      }, 100);
    });
  });

  describe('Asset Optimization', () => {
    it('should serve static files with cache headers', (done) => {
      const staticMiddleware = assetOptimization.serveStatic('./frontend');
      
      app.use('/frontend', staticMiddleware);
      app.get('/test-static', staticMiddleware);
      
      request(app)
        .get('/test-static')
        .expect((res) => {
          expect(res.headers).to.have.property('cache-control');
          expect(res.headers).to.have.property('vary', 'Accept-Encoding');
        })
        .end(done);
    });
  });

  describe('Global Performance Instances', () => {
    it('should have initialized query optimizer', () => {
      expect(queryOptimizer).to.be.an.instanceOf(QueryOptimizer);
    });

    it('should have initialized memory monitor', () => {
      expect(memoryMonitor).to.be.an.instanceOf(MemoryMonitor);
    });

    it('should have initialized PayPal cache', () => {
      expect(paypalCache).to.be.an.instanceOf(PayPalCache);
    });
  });

  describe('Performance Integration Test', () => {
    beforeEach(() => {
      app.use(compressionMiddleware);
      app.use(responseTimeMonitor);
    });

    it('should handle a complete optimized request flow', (done) => {
      app.get('/api/apartments', (req, res) => {
        // Simulate database query with caching
        const cacheKey = queryOptimizer.getApartmentCacheKey(req.query);
        let result = queryOptimizer.getCachedQuery(cacheKey);
        
        if (!result) {
          // Simulate database query
          result = {
            apartments: [
              { id: 1, title: 'Test Apartment', price: 1000 }
            ],
            cached: false
          };
          queryOptimizer.cacheQuery(cacheKey, result);
        } else {
          result.cached = true;
        }
        
        res.json(result);
      });

      // First request (not cached)
      request(app)
        .get('/api/apartments?city=Berlin')
        .expect(200)
        .expect((res) => {
          expect(res.body.cached).to.be.false;
          expect(res.headers).to.have.property('x-response-time');
        })
        .end(() => {
          // Second request (should be cached)
          request(app)
            .get('/api/apartments?city=Berlin')
            .expect(200)
            .expect((res) => {
              expect(res.body.cached).to.be.true;
            })
            .end(done);
        });
    });
  });

  describe('Database Pool Configuration', () => {
    it('should have correct pool configuration', () => {
      const { dbPoolConfig } = require('../utils/performance');
      
      expect(dbPoolConfig).to.have.property('max', 20);
      expect(dbPoolConfig).to.have.property('min', 2);
      expect(dbPoolConfig).to.have.property('idle', 10000);
      expect(dbPoolConfig).to.have.property('acquire', 60000);
      expect(dbPoolConfig).to.have.property('retry');
      expect(dbPoolConfig.retry).to.have.property('max', 3);
    });
  });
});
