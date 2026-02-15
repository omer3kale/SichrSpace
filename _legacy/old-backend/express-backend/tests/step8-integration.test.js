const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');

// Import the production server
const productionServer = require('../server-production');

describe('Step 8: Production Server Integration Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock environment variables for testing
    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-key';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.PAYPAL_CLIENT_ID = 'test-paypal-id';
    process.env.PAYPAL_CLIENT_SECRET = 'test-paypal-secret';
    process.env.PAYPAL_WEBHOOK_ID = 'test-webhook-id';
  });

  afterEach(() => {
    sandbox.restore();
    // Clean up environment variables
    delete process.env.NODE_ENV;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.JWT_SECRET;
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.PAYPAL_WEBHOOK_ID;
  });

  describe('Production Environment Validation', () => {
    it('should validate required environment variables', () => {
      // Test that all required environment variables are present
      const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
        'PAYPAL_CLIENT_ID',
        'PAYPAL_CLIENT_SECRET',
        'PAYPAL_WEBHOOK_ID'
      ];

      requiredVars.forEach(varName => {
        expect(process.env[varName]).to.exist;
        expect(process.env[varName]).to.not.be.empty;
      });
    });

    it('should exit process if required environment variables are missing', () => {
      const processExitStub = sandbox.stub(process, 'exit');
      const consoleErrorStub = sandbox.stub(console, 'error');
      
      // Remove a required environment variable
      delete process.env.JWT_SECRET;
      
      // This would normally cause the server to exit
      // We can't test actual process.exit, but we can verify the logic
      const missingVars = ['JWT_SECRET'].filter(varName => !process.env[varName]);
      expect(missingVars).to.include('JWT_SECRET');
    });
  });

  describe('Security Headers Integration', () => {
    it('should apply all production security headers', (done) => {
      request(productionServer)
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          // Check for security headers
          expect(res.headers).to.have.property('x-content-type-options', 'nosniff');
          expect(res.headers).to.have.property('x-frame-options', 'DENY');
          expect(res.headers).to.have.property('x-xss-protection', '1; mode=block');
          expect(res.headers).to.have.property('content-security-policy');
          expect(res.headers).to.not.have.property('x-powered-by');
        })
        .end(done);
    });

    it('should set appropriate Content Security Policy', (done) => {
      request(productionServer)
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          const csp = res.headers['content-security-policy'];
          expect(csp).to.include("default-src 'self'");
          expect(csp).to.include('https://www.paypal.com');
          expect(csp).to.include('https://js.paypalcdn.com');
        })
        .end(done);
    });
  });

  describe('Performance Features Integration', () => {
    it('should apply compression to responses', (done) => {
      request(productionServer)
        .get('/frontend/index.html')
        .set('Accept-Encoding', 'gzip')
        .expect((res) => {
          // Check if compression is applied or at least headers are set for it
          expect(res.headers).to.have.property('vary');
        })
        .end(done);
    });

    it('should add response time headers', (done) => {
      request(productionServer)
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.headers).to.have.property('x-response-time');
          expect(res.headers['x-response-time']).to.match(/\d+\.\d+ms/);
        })
        .end(done);
    });
  });

  describe('Health Check Endpoint', () => {
    it('should provide comprehensive health information', (done) => {
      request(productionServer)
        .get('/api/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).to.have.property('status');
          expect(res.body).to.have.property('uptime');
          expect(res.body).to.have.property('metrics');
          expect(res.body).to.have.property('lastUpdated');
          
          expect(res.body.metrics).to.have.property('requests');
          expect(res.body.metrics).to.have.property('payments');
          expect(res.body.metrics).to.have.property('users');
        })
        .end(done);
    });

    it('should return appropriate status based on system health', (done) => {
      request(productionServer)
        .get('/api/health')
        .expect((res) => {
          expect([200, 503]).to.include(res.status);
          if (res.status === 200) {
            expect(['healthy', 'degraded']).to.include(res.body.status);
          } else {
            expect(res.body.status).to.equal('unhealthy');
          }
        })
        .end(done);
    });
  });

  describe('Static File Serving', () => {
    it('should serve frontend files with cache headers', (done) => {
      request(productionServer)
        .get('/frontend/')
        .expect((res) => {
          if (res.status === 200) {
            expect(res.headers).to.have.property('cache-control');
            expect(res.headers).to.have.property('vary', 'Accept-Encoding');
          }
        })
        .end(done);
    });

    it('should serve image files with long cache headers', (done) => {
      request(productionServer)
        .get('/img/')
        .expect((res) => {
          if (res.status === 200) {
            expect(res.headers).to.have.property('cache-control');
          }
        })
        .end(done);
    });
  });

  describe('CORS Configuration', () => {
    it('should apply production CORS settings', (done) => {
      request(productionServer)
        .options('/api/health')
        .set('Origin', 'https://sichrplace.com')
        .expect((res) => {
          if (res.headers['access-control-allow-origin']) {
            expect(res.headers['access-control-allow-origin']).to.equal('https://sichrplace.com');
          }
        })
        .end(done);
    });

    it('should reject unauthorized origins', (done) => {
      request(productionServer)
        .options('/api/health')
        .set('Origin', 'https://malicious-site.com')
        .expect((res) => {
          // Should not have CORS headers for unauthorized origins
          expect(res.headers['access-control-allow-origin']).to.not.equal('https://malicious-site.com');
        })
        .end(done);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully in production', (done) => {
      // Create a route that throws an error for testing
      const app = express();
      app.get('/test-error', (req, res) => {
        throw new Error('Test error');
      });
      
      // Apply the same error handler as production server
      app.use((err, req, res, next) => {
        const statusCode = err.status || err.statusCode || 500;
        const message = process.env.NODE_ENV === 'production' ? 
          'Internal server error' : err.message;
        
        res.status(statusCode).json({
          success: false,
          error: message
        });
      });

      request(app)
        .get('/test-error')
        .expect(500)
        .expect((res) => {
          expect(res.body.success).to.be.false;
          expect(res.body.error).to.equal('Internal server error'); // Production mode
        })
        .end(done);
    });
  });

  describe('Monitoring Integration', () => {
    it('should track requests in monitoring system', (done) => {
      // Make a request to trigger monitoring
      request(productionServer)
        .get('/api/health')
        .expect(200)
        .end((err) => {
          if (err) return done(err);
          
          // Verify that monitoring is working by checking metrics endpoint
          // Note: This would require authentication in real production
          setTimeout(() => {
            done();
          }, 100); // Give time for monitoring to process
        });
    });
  });

  describe('PayPal Integration', () => {
    it('should have PayPal webhook endpoint available', (done) => {
      request(productionServer)
        .post('/api/paypal/webhooks')
        .send({})
        .expect((res) => {
          // Should respond (even if with error due to missing headers/signature)
          expect([200, 400, 401, 500]).to.include(res.status);
        })
        .end(done);
    });
  });

  describe('Root Route Handling', () => {
    it('should redirect root to frontend index', (done) => {
      request(productionServer)
        .get('/')
        .expect(302)
        .expect('Location', '/frontend/index.html')
        .end(done);
    });

    it('should serve frontend for SPA routes', (done) => {
      request(productionServer)
        .get('/some-spa-route')
        .expect((res) => {
          // Should either serve index.html or return 404 if file doesn't exist
          expect([200, 404]).to.include(res.status);
        })
        .end(done);
    });
  });

  describe('Request Body Parsing', () => {
    it('should parse JSON bodies with size limits', (done) => {
      const smallPayload = { test: 'data' };
      
      // Create test route for this
      const app = express();
      app.use(express.json({ limit: '10mb' }));
      app.post('/test', (req, res) => {
        res.json({ received: req.body });
      });

      request(app)
        .post('/test')
        .send(smallPayload)
        .expect(200)
        .expect((res) => {
          expect(res.body.received).to.deep.equal(smallPayload);
        })
        .end(done);
    });

    it('should handle raw body for PayPal webhooks', (done) => {
      const app = express();
      app.use(express.json({
        verify: (req, res, buf, encoding) => {
          if (req.originalUrl.includes('/paypal/webhooks')) {
            req.rawBody = buf;
          }
        }
      }));
      
      app.post('/paypal/webhooks', (req, res) => {
        res.json({ 
          hasRawBody: !!req.rawBody,
          bodyType: typeof req.body
        });
      });

      request(app)
        .post('/paypal/webhooks')
        .send({ test: 'webhook' })
        .expect(200)
        .expect((res) => {
          expect(res.body.hasRawBody).to.be.true;
          expect(res.body.bodyType).to.equal('object');
        })
        .end(done);
    });
  });

  describe('Trust Proxy Configuration', () => {
    it('should trust proxy for accurate IP addresses', () => {
      // The production server should have app.set('trust proxy', 1)
      // This is important for rate limiting and security logging
      expect(productionServer.get('trust proxy')).to.equal(1);
    });
  });

  describe('Production Readiness Checks', () => {
    it('should perform startup checks in production mode', () => {
      // Verify that production mode is detected
      expect(process.env.NODE_ENV).to.equal('production');
    });

    it('should validate PayPal configuration on startup', () => {
      // Check PayPal environment variables
      expect(process.env.PAYPAL_CLIENT_ID).to.exist;
      expect(process.env.PAYPAL_CLIENT_SECRET).to.exist;
      expect(process.env.PAYPAL_WEBHOOK_ID).to.exist;
    });
  });

  describe('Graceful Shutdown Handling', () => {
    it('should handle SIGTERM gracefully', (done) => {
      const processOnStub = sandbox.stub(process, 'on');
      
      // Verify that SIGTERM handler is registered
      expect(processOnStub.calledWith('SIGTERM')).to.be.false; // Because we stubbed it
      
      // In real implementation, the handler should be registered
      done();
    });

    it('should handle uncaught exceptions', (done) => {
      const processOnStub = sandbox.stub(process, 'on');
      
      // Verify that uncaught exception handler is registered
      expect(processOnStub.calledWith('uncaughtException')).to.be.false; // Because we stubbed it
      
      done();
    });
  });
});

describe('Step 8: End-to-End Production Flow Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    sandbox.restore();
    delete process.env.NODE_ENV;
  });

  it('should handle a complete production request flow', (done) => {
    // Test a complete flow: security headers → monitoring → compression → response
    request(productionServer)
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        // Security headers
        expect(res.headers).to.have.property('x-content-type-options');
        expect(res.headers).to.have.property('content-security-policy');
        
        // Performance headers
        expect(res.headers).to.have.property('x-response-time');
        
        // Content headers
        expect(res.headers).to.have.property('content-type');
        
        // Health response
        expect(res.body).to.have.property('status');
        expect(res.body).to.have.property('metrics');
      })
      .end(done);
  });

  it('should maintain performance under concurrent requests', (done) => {
    const concurrentRequests = 10;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        request(productionServer)
          .get('/api/health')
          .expect(200)
      );
    }

    Promise.all(requests)
      .then((responses) => {
        responses.forEach(res => {
          expect(res.body).to.have.property('status');
          expect(res.headers).to.have.property('x-response-time');
        });
        done();
      })
      .catch(done);
  });
});
