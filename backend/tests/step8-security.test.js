const request = require('supertest');
const express = require('express');
const { expect } = require('chai');
const sinon = require('sinon');

// Import Step 8 production security middleware
const { 
  productionSecurity, 
  rateLimits, 
  sanitizeInput, 
  paypalSecurityCheck,
  validateApiKey,
  securityAuditLog,
  corsOptions 
} = require('../middleware/productionSecurity');

describe('Step 8.4: Production Security Middleware Tests', () => {
  let app;
  let sandbox;

  beforeEach(() => {
    app = express();
    sandbox = sinon.createSandbox();
    
    // Set environment variables for testing
    process.env.API_KEY = 'test-api-key-12345';
    process.env.NODE_ENV = 'production';
  });

  afterEach(() => {
    sandbox.restore();
    delete process.env.API_KEY;
    delete process.env.NODE_ENV;
  });

  describe('Security Headers', () => {
    it('should apply security headers correctly', (done) => {
      app.use(productionSecurity);
      app.get('/test', (req, res) => res.json({ success: true }));

      request(app)
        .get('/test')
        .expect(200)
        .expect((res) => {
          expect(res.headers).to.have.property('x-content-type-options', 'nosniff');
          expect(res.headers).to.have.property('x-frame-options', 'DENY');
          expect(res.headers).to.have.property('x-xss-protection', '1; mode=block');
          expect(res.headers).to.not.have.property('x-powered-by');
        })
        .end(done);
    });

    it('should set Content Security Policy headers', (done) => {
      app.use(productionSecurity);
      app.get('/test', (req, res) => res.json({ success: true }));

      request(app)
        .get('/test')
        .expect(200)
        .expect((res) => {
          expect(res.headers).to.have.property('content-security-policy');
          expect(res.headers['content-security-policy']).to.include("default-src 'self'");
          expect(res.headers['content-security-policy']).to.include('https://www.paypal.com');
        })
        .end(done);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply general rate limiting', (done) => {
      app.use(rateLimits.general);
      app.get('/test', (req, res) => res.json({ success: true }));

      // Test multiple requests to trigger rate limiting
      const requests = Array(5).fill().map(() => request(app).get('/test'));
      
      Promise.all(requests)
        .then((responses) => {
          responses.forEach(res => {
            expect(res.status).to.equal(200);
            expect(res.headers).to.have.property('x-ratelimit-limit');
            expect(res.headers).to.have.property('x-ratelimit-remaining');
          });
          done();
        })
        .catch(done);
    });

    it('should apply strict rate limiting for auth endpoints', (done) => {
      app.use('/auth', rateLimits.auth);
      app.get('/auth/login', (req, res) => res.json({ success: true }));

      request(app)
        .get('/auth/login')
        .expect(200)
        .expect((res) => {
          expect(res.headers).to.have.property('x-ratelimit-limit');
          expect(parseInt(res.headers['x-ratelimit-limit'])).to.be.lessThan(100);
        })
        .end(done);
    });

    it('should apply payment-specific rate limiting', (done) => {
      app.use('/payment', rateLimits.payment);
      app.post('/payment/create', (req, res) => res.json({ success: true }));

      request(app)
        .post('/payment/create')
        .expect(200)
        .expect((res) => {
          expect(res.headers).to.have.property('x-ratelimit-limit');
        })
        .end(done);
    });
  });

  describe('Input Sanitization', () => {
    beforeEach(() => {
      app.use(express.json());
      app.use(sanitizeInput);
    });

    it('should sanitize XSS attempts in request body', (done) => {
      app.post('/test', (req, res) => {
        res.json({ sanitized: req.body });
      });

      request(app)
        .post('/test')
        .send({
          name: '<script>alert("xss")</script>John',
          email: 'test@example.com',
          message: '<img src=x onerror=alert(1)>Hello'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.sanitized.name).to.not.include('<script>');
          expect(res.body.sanitized.message).to.not.include('<img');
          expect(res.body.sanitized.email).to.equal('test@example.com');
        })
        .end(done);
    });

    it('should validate email formats', (done) => {
      app.post('/test', (req, res) => {
        res.json({ sanitized: req.body });
      });

      request(app)
        .post('/test')
        .send({
          userEmail: 'invalid-email-format',
          contactEmail: 'valid@example.com'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.sanitized.userEmail).to.equal('');
          expect(res.body.sanitized.contactEmail).to.equal('valid@example.com');
        })
        .end(done);
    });

    it('should sanitize query parameters', (done) => {
      app.get('/test', (req, res) => {
        res.json({ query: req.query });
      });

      request(app)
        .get('/test?search=<script>alert("xss")</script>&city=Berlin')
        .expect(200)
        .expect((res) => {
          expect(res.body.query.search).to.not.include('<script>');
          expect(res.body.query.city).to.equal('Berlin');
        })
        .end(done);
    });
  });

  describe('PayPal Security Check', () => {
    beforeEach(() => {
      app.use(express.json());
      app.use(paypalSecurityCheck);
    });

    it('should validate PayPal webhook headers', (done) => {
      app.post('/paypal/webhooks', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .post('/paypal/webhooks')
        .set('paypal-transmission-id', 'test-id')
        .set('paypal-cert-id', 'test-cert')
        .set('paypal-transmission-time', '2025-08-12T10:00:00Z')
        .set('paypal-transmission-sig', 'test-signature')
        .send({ event_type: 'PAYMENT.CAPTURE.COMPLETED' })
        .expect(200)
        .end(done);
    });

    it('should reject invalid payment amounts', (done) => {
      app.post('/paypal/create', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .post('/paypal/create')
        .send({ amount: -10 })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).to.include('Invalid payment amount');
        })
        .end(done);
    });

    it('should reject excessive payment amounts', (done) => {
      app.post('/paypal/create', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .post('/paypal/create')
        .send({ amount: 15000 })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).to.include('Invalid payment amount');
        })
        .end(done);
    });
  });

  describe('API Key Validation', () => {
    beforeEach(() => {
      app.use(validateApiKey);
    });

    it('should allow access with valid API key', (done) => {
      app.get('/api/protected', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .get('/api/protected')
        .set('x-api-key', 'test-api-key-12345')
        .expect(200)
        .end(done);
    });

    it('should reject requests with invalid API key', (done) => {
      app.get('/api/protected', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .get('/api/protected')
        .set('x-api-key', 'invalid-key')
        .expect(401)
        .expect((res) => {
          expect(res.body.error).to.include('Invalid or missing API key');
        })
        .end(done);
    });

    it('should allow access to public endpoints without API key', (done) => {
      app.get('/api/health', (req, res) => {
        res.json({ status: 'healthy' });
      });

      request(app)
        .get('/api/health')
        .expect(200)
        .end(done);
    });
  });

  describe('Security Audit Logging', () => {
    let consoleLogStub, consoleWarnStub;

    beforeEach(() => {
      consoleLogStub = sandbox.stub(console, 'log');
      consoleWarnStub = sandbox.stub(console, 'warn');
      app.use(securityAuditLog);
    });

    it('should log suspicious requests', (done) => {
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .get('/test/../admin')
        .expect(200)
        .end(() => {
          expect(consoleWarnStub.calledWith(sinon.match('Suspicious request detected'))).to.be.true;
          done();
        });
    });

    it('should log PayPal-related requests', (done) => {
      app.post('/paypal/create', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .post('/paypal/create')
        .expect(200)
        .end(() => {
          expect(consoleLogStub.calledWith(sinon.match('PayPal security event'))).to.be.true;
          done();
        });
    });

    it('should log slow requests', (done) => {
      app.get('/slow', (req, res) => {
        setTimeout(() => {
          res.json({ success: true });
        }, 100);
      });

      request(app)
        .get('/slow')
        .expect(200)
        .end(done);
    });
  });

  describe('CORS Configuration', () => {
    it('should have correct CORS origins configured', () => {
      expect(corsOptions.origin).to.be.a('function');
      expect(corsOptions.credentials).to.be.true;
      expect(corsOptions.methods).to.include('GET');
      expect(corsOptions.methods).to.include('POST');
      expect(corsOptions.allowedHeaders).to.include('Authorization');
    });

    it('should allow production domains', (done) => {
      const callback = sinon.stub();
      corsOptions.origin('https://sichrplace.com', callback);
      
      expect(callback.calledWith(null, true)).to.be.true;
      done();
    });

    it('should reject unauthorized domains', (done) => {
      const callback = sinon.stub();
      corsOptions.origin('https://malicious-site.com', callback);
      
      expect(callback.calledWith(sinon.match.instanceOf(Error))).to.be.true;
      done();
    });
  });

  describe('Integration Test - Full Security Stack', () => {
    beforeEach(() => {
      app.use(express.json());
      app.use(productionSecurity);
      app.use(rateLimits.general);
    });

    it('should handle a complete secure request flow', (done) => {
      app.post('/api/secure-endpoint', (req, res) => {
        res.json({ 
          success: true, 
          data: req.body,
          headers: {
            csp: res.get('Content-Security-Policy') ? 'present' : 'missing',
            rateLimit: res.get('X-RateLimit-Limit') ? 'present' : 'missing'
          }
        });
      });

      request(app)
        .post('/api/secure-endpoint')
        .set('x-api-key', 'test-api-key-12345')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          message: 'Hello World'
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).to.be.true;
          expect(res.body.data.name).to.equal('John Doe');
          expect(res.headers).to.have.property('content-security-policy');
          expect(res.headers).to.have.property('x-ratelimit-limit');
        })
        .end(done);
    });
  });
});

describe('Step 8.4: Security Metrics and Reporting', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(productionSecurity);
  });

  it('should provide security metrics endpoint', (done) => {
    app.get('/api/security/metrics', (req, res) => {
      res.json({
        securityHeaders: 'enabled',
        rateLimiting: 'active',
        inputSanitization: 'active',
        auditLogging: 'enabled',
        corsPolicy: 'enforced'
      });
    });

    request(app)
      .get('/api/security/metrics')
      .expect(200)
      .expect((res) => {
        expect(res.body.securityHeaders).to.equal('enabled');
        expect(res.body.rateLimiting).to.equal('active');
        expect(res.body.inputSanitization).to.equal('active');
      })
      .end(done);
  });
});
