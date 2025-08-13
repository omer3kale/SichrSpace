const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');

// Import Step 8 monitoring utilities
const {
  ApplicationMonitor,
  PayPalAnalytics,
  appMonitor,
  paypalAnalytics,
  monitoringMiddleware,
  healthCheckHandler,
  metricsHandler
} = require('../utils/monitoring');

describe('Step 8.5: Monitoring & Analytics Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Application Monitor', () => {
    let monitor;

    beforeEach(() => {
      monitor = new ApplicationMonitor();
    });

    describe('Request Tracking', () => {
      it('should track HTTP requests correctly', () => {
        const req = { 
          route: { path: '/api/test' }, 
          method: 'GET',
          path: '/api/test'
        };
        const res = { statusCode: 200 };
        const responseTime = 150;

        monitor.trackRequest(req, res, responseTime);

        expect(monitor.metrics.requests.total).to.equal(1);
        expect(monitor.metrics.requests.success).to.equal(1);
        expect(monitor.metrics.requests.byPath['/api/test']).to.equal(1);
        expect(monitor.metrics.requests.byMethod['GET']).to.equal(1);
      });

      it('should track error responses', () => {
        const req = { 
          route: { path: '/api/test' }, 
          method: 'POST',
          path: '/api/test'
        };
        const res = { statusCode: 500 };
        const responseTime = 300;

        monitor.trackRequest(req, res, responseTime);

        expect(monitor.metrics.requests.total).to.equal(1);
        expect(monitor.metrics.requests.errors).to.equal(1);
        expect(monitor.metrics.requests.success).to.equal(0);
      });

      it('should update average response time correctly', () => {
        const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
        const res = { statusCode: 200 };

        monitor.trackRequest(req, res, 100);
        monitor.trackRequest(req, res, 200);

        expect(monitor.metrics.performance.averageResponseTime).to.equal(150);
      });

      it('should count slow requests', () => {
        const req = { route: { path: '/slow' }, method: 'GET', path: '/slow' };
        const res = { statusCode: 200 };
        
        // Set threshold lower for testing
        monitor.alertThresholds.responseTime = 100;
        
        monitor.trackRequest(req, res, 250); // Slow request

        expect(monitor.metrics.performance.slowRequests).to.equal(1);
      });
    });

    describe('Payment Tracking', () => {
      it('should track successful payments', () => {
        const paymentData = {
          status: 'COMPLETED',
          amount: '25.00',
          currency: 'EUR'
        };

        const consoleLogStub = sandbox.stub(console, 'log');
        monitor.trackPayment(paymentData);

        expect(monitor.metrics.payments.total).to.equal(1);
        expect(monitor.metrics.payments.successful).to.equal(1);
        expect(monitor.metrics.payments.totalAmount).to.equal(25.00);
        expect(monitor.metrics.payments.byStatus['COMPLETED']).to.equal(1);
        expect(consoleLogStub.calledWith(sinon.match('Payment tracked: COMPLETED - 25.00 EUR'))).to.be.true;
      });

      it('should track failed payments', () => {
        const paymentData = {
          status: 'FAILED',
          amount: '50.00',
          currency: 'EUR'
        };

        monitor.trackPayment(paymentData);

        expect(monitor.metrics.payments.failed).to.equal(1);
        expect(monitor.metrics.payments.successful).to.equal(0);
        expect(monitor.metrics.payments.totalAmount).to.equal(0);
      });

      it('should check payment failure rate alerts', () => {
        const consoleWarnStub = sandbox.stub(console, 'warn');
        
        // Track multiple failed payments to trigger alert
        for (let i = 0; i < 3; i++) {
          monitor.trackPayment({ status: 'FAILED', amount: '25.00' });
        }
        for (let i = 0; i < 2; i++) {
          monitor.trackPayment({ status: 'COMPLETED', amount: '25.00' });
        }

        // Should trigger high failure rate alert (60% > 10% threshold)
        expect(monitor.metrics.alerts.length).to.be.greaterThan(0);
        expect(monitor.metrics.alerts[0].type).to.equal('HIGH_PAYMENT_FAILURE_RATE');
      });
    });

    describe('User Tracking', () => {
      it('should track user registrations', () => {
        monitor.trackUser('registration', 'user123');
        expect(monitor.metrics.users.registrations).to.equal(1);
      });

      it('should track user logins', () => {
        monitor.trackUser('login', 'user123');
        expect(monitor.metrics.users.logins).to.equal(1);
        expect(monitor.metrics.users.active.has('user123')).to.be.true;
      });

      it('should track user activity', () => {
        monitor.trackUser('activity', 'user456');
        expect(monitor.metrics.users.active.has('user456')).to.be.true;
      });
    });

    describe('Error Tracking', () => {
      it('should track errors with context', () => {
        const error = new Error('Test error');
        const context = { path: '/api/test', method: 'GET' };

        const consoleErrorStub = sandbox.stub(console, 'error');
        monitor.trackError(error, context);

        expect(monitor.metrics.errors).to.have.length(1);
        expect(monitor.metrics.errors[0].message).to.equal('Test error');
        expect(monitor.metrics.errors[0].context).to.deep.equal(context);
        expect(monitor.metrics.errors[0].count).to.equal(1);
        expect(consoleErrorStub.calledWith(sinon.match('Error tracked'))).to.be.true;
      });

      it('should increment count for duplicate errors', () => {
        const error = new Error('Duplicate error');
        const context = { path: '/api/test' };

        monitor.trackError(error, context);
        monitor.trackError(error, context);

        expect(monitor.metrics.errors).to.have.length(1);
        expect(monitor.metrics.errors[0].count).to.equal(2);
      });

      it('should limit error history to 100 entries', () => {
        // Add 105 different errors
        for (let i = 0; i < 105; i++) {
          monitor.trackError(new Error(`Error ${i}`), { id: i });
        }

        expect(monitor.metrics.errors).to.have.length(100);
      });
    });

    describe('Alert System', () => {
      it('should create alerts for high error rates', () => {
        // Create requests with high error rate
        const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
        
        // 7 error responses out of 10 (70% error rate)
        for (let i = 0; i < 7; i++) {
          monitor.trackRequest(req, { statusCode: 500 }, 100);
        }
        for (let i = 0; i < 3; i++) {
          monitor.trackRequest(req, { statusCode: 200 }, 100);
        }

        expect(monitor.metrics.alerts.length).to.be.greaterThan(0);
        const errorRateAlert = monitor.metrics.alerts.find(a => a.type === 'HIGH_ERROR_RATE');
        expect(errorRateAlert).to.exist;
      });

      it('should create alerts for slow response times', () => {
        const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
        
        // Set very low threshold for testing
        monitor.alertThresholds.responseTime = 10;
        
        monitor.trackRequest(req, { statusCode: 200 }, 100); // Slow response

        expect(monitor.metrics.alerts.length).to.be.greaterThan(0);
        const slowAlert = monitor.metrics.alerts.find(a => a.type === 'SLOW_RESPONSE_TIME');
        expect(slowAlert).to.exist;
      });

      it('should not create duplicate alerts within 10 minutes', () => {
        const consoleWarnStub = sandbox.stub(console, 'warn');
        
        // Create the same alert twice
        monitor.createAlert('TEST_ALERT', { test: 'data' });
        monitor.createAlert('TEST_ALERT', { test: 'data' });

        expect(monitor.metrics.alerts).to.have.length(1);
      });

      it('should limit alert history to 50 entries', () => {
        // Add 55 different alerts
        for (let i = 0; i < 55; i++) {
          monitor.createAlert(`TEST_ALERT_${i}`, { id: i });
        }

        expect(monitor.metrics.alerts).to.have.length(50);
      });
    });

    describe('Health Status', () => {
      it('should return healthy status with low error rate', () => {
        const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
        
        // 1 error out of 100 requests (1% error rate)
        monitor.trackRequest(req, { statusCode: 500 }, 100);
        for (let i = 0; i < 99; i++) {
          monitor.trackRequest(req, { statusCode: 200 }, 100);
        }

        const health = monitor.getHealthStatus();
        expect(health.status).to.equal('healthy');
      });

      it('should return degraded status with moderate error rate', () => {
        const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
        
        // 3 errors out of 100 requests (3% error rate)
        for (let i = 0; i < 3; i++) {
          monitor.trackRequest(req, { statusCode: 500 }, 100);
        }
        for (let i = 0; i < 97; i++) {
          monitor.trackRequest(req, { statusCode: 200 }, 100);
        }

        const health = monitor.getHealthStatus();
        expect(health.status).to.equal('degraded');
      });

      it('should return unhealthy status with high error rate', () => {
        const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
        
        // 6 errors out of 10 requests (60% error rate)
        for (let i = 0; i < 6; i++) {
          monitor.trackRequest(req, { statusCode: 500 }, 100);
        }
        for (let i = 0; i < 4; i++) {
          monitor.trackRequest(req, { statusCode: 200 }, 100);
        }

        const health = monitor.getHealthStatus();
        expect(health.status).to.equal('unhealthy');
      });

      it('should include uptime information', () => {
        const health = monitor.getHealthStatus();
        
        expect(health.uptime).to.have.property('ms');
        expect(health.uptime).to.have.property('human');
        expect(health.uptime.ms).to.be.a('number');
        expect(health.uptime.human).to.be.a('string');
      });
    });

    describe('Metrics Summary', () => {
      it('should provide comprehensive metrics summary', () => {
        // Add some test data
        const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
        monitor.trackRequest(req, { statusCode: 200 }, 150);
        monitor.trackPayment({ status: 'COMPLETED', amount: '25.00' });
        monitor.trackUser('registration', 'user123');

        const summary = monitor.getMetricsSummary();

        expect(summary.requests).to.have.property('total', 1);
        expect(summary.requests).to.have.property('errorRate', '0%');
        expect(summary.requests.averageResponseTime).to.include('150.00ms');
        
        expect(summary.payments).to.have.property('total', 1);
        expect(summary.payments).to.have.property('successRate', '100.00%');
        expect(summary.payments.totalAmount).to.include('€25.00');
        
        expect(summary.users).to.have.property('registrations', 1);
      });
    });

    describe('Daily Metrics Reset', () => {
      it('should clear active users and log summary on reset', () => {
        const consoleLogStub = sandbox.stub(console, 'log');
        
        monitor.trackUser('activity', 'user1');
        monitor.trackUser('activity', 'user2');
        expect(monitor.metrics.users.active.size).to.equal(2);

        monitor.resetDailyMetrics();

        expect(monitor.metrics.users.active.size).to.equal(0);
        expect(consoleLogStub.calledWith(sinon.match('Daily metrics summary'))).to.be.true;
      });
    });
  });

  describe('PayPal Analytics', () => {
    let analytics;

    beforeEach(() => {
      analytics = new PayPalAnalytics();
    });

    describe('Payment Tracking', () => {
      it('should track PayPal payments', () => {
        const paymentData = {
          id: 'PAYMENT-123',
          status: 'COMPLETED',
          amount: 25.00,
          currency: 'EUR',
          apartmentId: 'apt-456',
          userId: 'user-789'
        };

        analytics.trackPayment(paymentData);

        expect(analytics.payments).to.have.length(1);
        expect(analytics.payments[0]).to.include({
          id: 'PAYMENT-123',
          status: 'COMPLETED',
          amount: 25.00,
          currency: 'EUR'
        });
      });

      it('should limit payment history to 1000 entries', () => {
        // Add 1005 payments
        for (let i = 0; i < 1005; i++) {
          analytics.trackPayment({
            id: `PAYMENT-${i}`,
            status: 'COMPLETED',
            amount: 25.00
          });
        }

        expect(analytics.payments).to.have.length(1000);
      });
    });

    describe('Webhook Event Tracking', () => {
      it('should track webhook events', () => {
        const eventType = 'PAYMENT.CAPTURE.COMPLETED';
        const eventData = { payment_id: 'PAYMENT-123' };

        analytics.trackWebhookEvent(eventType, eventData);

        expect(analytics.webhookEvents).to.have.length(1);
        expect(analytics.webhookEvents[0]).to.include({
          type: eventType,
          data: eventData
        });
      });

      it('should limit webhook event history to 500 entries', () => {
        // Add 505 webhook events
        for (let i = 0; i < 505; i++) {
          analytics.trackWebhookEvent(`EVENT-${i}`, { id: i });
        }

        expect(analytics.webhookEvents).to.have.length(500);
      });
    });

    describe('Payment Analytics', () => {
      beforeEach(() => {
        // Add test payments with different timestamps
        const now = Date.now();
        const oneHourAgo = now - (60 * 60 * 1000);
        const oneDayAgo = now - (24 * 60 * 60 * 1000);

        analytics.payments = [
          {
            status: 'COMPLETED',
            amount: 25.00,
            timestamp: new Date(now).toISOString()
          },
          {
            status: 'COMPLETED',
            amount: 50.00,
            timestamp: new Date(oneHourAgo).toISOString()
          },
          {
            status: 'FAILED',
            amount: 30.00,
            timestamp: new Date(oneHourAgo).toISOString()
          },
          {
            status: 'COMPLETED',
            amount: 40.00,
            timestamp: new Date(oneDayAgo - 1000).toISOString() // Just outside 24h window
          }
        ];
      });

      it('should calculate 24h analytics correctly', () => {
        const analytics24h = analytics.getPaymentAnalytics('24h');

        expect(analytics24h.timeframe).to.equal('24h');
        expect(analytics24h.totalPayments).to.equal(3); // Excludes payment from >24h ago
        expect(analytics24h.successfulPayments).to.equal(2);
        expect(analytics24h.failedPayments).to.equal(1);
        expect(analytics24h.totalAmount).to.equal(75.00);
        expect(analytics24h.averageAmount).to.equal(37.50);
      });

      it('should calculate 1h analytics correctly', () => {
        const analytics1h = analytics.getPaymentAnalytics('1h');

        expect(analytics1h.totalPayments).to.equal(3); // Recent payments within 1h window
        expect(analytics1h.successfulPayments).to.equal(2);
        expect(analytics1h.totalAmount).to.equal(75.00);
      });

      it('should group payments by hour', () => {
        const analytics24h = analytics.getPaymentAnalytics('24h');
        
        expect(analytics24h.paymentsByHour).to.be.an('object');
        // Should have entries for different hours
        expect(Object.keys(analytics24h.paymentsByHour).length).to.be.greaterThan(0);
      });

      it('should provide status breakdown', () => {
        const analytics24h = analytics.getPaymentAnalytics('24h');
        
        expect(analytics24h.statusBreakdown).to.have.property('COMPLETED', 2);
        expect(analytics24h.statusBreakdown).to.have.property('FAILED', 1);
      });

      it('should handle zero average when no successful payments', () => {
        analytics.payments = [
          { status: 'FAILED', amount: 25.00, timestamp: new Date().toISOString() }
        ];

        const analyticsResult = analytics.getPaymentAnalytics('24h');
        expect(analyticsResult.averageAmount).to.equal(0);
      });
    });
  });

  describe('Monitoring Middleware', () => {
    let app;
    let consoleLogStub;

    beforeEach(() => {
      app = express();
      app.use(monitoringMiddleware);
      consoleLogStub = sandbox.stub(console, 'log');
    });

    it('should track requests automatically', (done) => {
      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      const initialTotal = appMonitor.metrics.requests.total;

      request(app)
        .get('/test')
        .expect(200)
        .end(() => {
          expect(appMonitor.metrics.requests.total).to.equal(initialTotal + 1);
          done();
        });
    });

    it('should track user activity when user is present', (done) => {
      app.use((req, res, next) => {
        req.user = { id: 'test-user-123' };
        next();
      });

      app.get('/test', (req, res) => {
        res.json({ success: true });
      });

      request(app)
        .get('/test')
        .expect(200)
        .end(() => {
          expect(appMonitor.metrics.users.active.has('test-user-123')).to.be.true;
          done();
        });
    });
  });

  describe('Health Check Handler', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.get('/health', healthCheckHandler);
    });

    it('should return health status', (done) => {
      request(app)
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).to.have.property('status');
          expect(res.body).to.have.property('uptime');
          expect(res.body).to.have.property('metrics');
          expect(res.body).to.have.property('lastUpdated');
        })
        .end(done);
    });

    it('should return 503 for unhealthy status', (done) => {
      // Force unhealthy status by creating high error rate
      const req = { route: { path: '/test' }, method: 'GET', path: '/test' };
      for (let i = 0; i < 10; i++) {
        appMonitor.trackRequest(req, { statusCode: 500 }, 100);
      }

      request(app)
        .get('/health')
        .expect(503)
        .expect((res) => {
          expect(res.body.status).to.equal('unhealthy');
        })
        .end(done);
    });
  });

  describe('Metrics Handler', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = { id: 'admin' }; // Mock authenticated user
        next();
      });
      app.get('/metrics', metricsHandler);
    });

    it('should return comprehensive metrics', (done) => {
      request(app)
        .get('/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body).to.have.property('application');
          expect(res.body).to.have.property('paypal');
          expect(res.body).to.have.property('system');
          
          expect(res.body.system).to.have.property('memory');
          expect(res.body.system).to.have.property('uptime');
          expect(res.body.system).to.have.property('pid');
          expect(res.body.system).to.have.property('platform');
          expect(res.body.system).to.have.property('nodeVersion');
        })
        .end(done);
    });

    it('should accept timeframe query parameter', (done) => {
      request(app)
        .get('/metrics?timeframe=1h')
        .expect(200)
        .expect((res) => {
          expect(res.body.paypal.timeframe).to.equal('1h');
        })
        .end(done);
    });
  });

  describe('Global Monitoring Instances', () => {
    it('should have initialized application monitor', () => {
      expect(appMonitor).to.be.an.instanceOf(ApplicationMonitor);
    });

    it('should have initialized PayPal analytics', () => {
      expect(paypalAnalytics).to.be.an.instanceOf(PayPalAnalytics);
    });
  });
});
