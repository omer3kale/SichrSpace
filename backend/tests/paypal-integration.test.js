// Comprehensive PayPal backend tests using Mocha + Supertest
const request = require('supertest');
const express = require('express');
const { expect } = require('chai');

// Create test app with PayPal routes
const app = express();
app.use(express.json());

// Mock auth middleware for testing
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-123', email: 'test@example.com' };
  next();
};

// Apply mock auth to all routes
app.use(mockAuth);

// Import PayPal routes with mocked dependencies
const paypalRoutes = require('../routes/paypal');
app.use('/api/paypal', paypalRoutes);

describe('PayPal Integration Tests', function() {
  this.timeout(10000);

  describe('GET /api/paypal/config', () => {
    it('should return PayPal configuration', async () => {
      const res = await request(app).get('/api/paypal/config');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('environment');
      expect(res.body.environment).to.be.oneOf(['sandbox', 'production']);
    });

    it('should include currency and supported payment methods', async () => {
      const res = await request(app).get('/api/paypal/config');
      expect(res.body).to.have.property('currency', 'EUR');
      expect(res.body).to.have.property('supportedPaymentMethods');
      expect(res.body.supportedPaymentMethods).to.include('paypal');
    });
  });

  describe('POST /api/paypal/create', () => {
    it('should create PayPal order with valid amount', async () => {
      const orderData = {
        amount: 25.00,
        currency: 'EUR',
        description: 'SichrPlace Viewing Fee',
        apartmentId: 'apt-123',
        viewingRequestId: 'vr-456'
      };

      const res = await request(app)
        .post('/api/paypal/create')
        .send(orderData);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('paymentId');
      expect(res.body).to.have.property('approvalUrl');
      expect(res.body.amount.value).to.equal(25.00);
    });

    it('should reject invalid amount', async () => {
      const res = await request(app)
        .post('/api/paypal/create')
        .send({ amount: 0 });

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('error');
      expect(res.body.error).to.match(/amount/i);
    });

    it('should reject negative amount', async () => {
      const res = await request(app)
        .post('/api/paypal/create')
        .send({ amount: -10 });

      expect(res.status).to.equal(400);
      expect(res.body).to.have.property('error');
    });

    it('should handle missing amount gracefully', async () => {
      const res = await request(app)
        .post('/api/paypal/create')
        .send({});

      expect(res.status).to.equal(400);
      expect(res.body.error).to.match(/amount/i);
    });
  });

  describe('POST /api/paypal/execute', () => {
    it('should execute payment with valid IDs', async () => {
      const executionData = {
        paymentId: 'PAYID-TEST-123',
        payerId: 'PAYERID-TEST-456'
      };

      const res = await request(app)
        .post('/api/paypal/execute')
        .send(executionData);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('status', 'completed');
      expect(res.body).to.have.property('transactionId');
    });

    it('should reject missing payment ID', async () => {
      const res = await request(app)
        .post('/api/paypal/execute')
        .send({ payerId: 'PAYERID-TEST-456' });

      expect(res.status).to.equal(400);
      expect(res.body.error).to.match(/payment ID/i);
    });

    it('should reject missing payer ID', async () => {
      const res = await request(app)
        .post('/api/paypal/execute')
        .send({ paymentId: 'PAYID-TEST-123' });

      expect(res.status).to.equal(400);
      expect(res.body.error).to.match(/payer ID/i);
    });
  });

  describe('POST /api/paypal/webhook', () => {
    it('should handle payment completion webhook', async () => {
      const webhookData = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE-123',
          amount: { value: '25.00', currency_code: 'EUR' },
          payer: {
            email_address: 'test@example.com',
            name: { given_name: 'John', surname: 'Doe' },
            payer_id: 'PAYER-123'
          }
        }
      };

      const res = await request(app)
        .post('/api/paypal/webhook')
        .send(webhookData);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('received', true);
    });

    it('should handle payment denial webhook', async () => {
      const webhookData = {
        event_type: 'PAYMENT.CAPTURE.DENIED',
        resource: {
          id: 'CAPTURE-456',
          amount: { value: '25.00', currency_code: 'EUR' }
        }
      };

      const res = await request(app)
        .post('/api/paypal/webhook')
        .send(webhookData);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('received', true);
    });

    it('should handle unknown webhook events', async () => {
      const webhookData = {
        event_type: 'UNKNOWN.EVENT.TYPE',
        resource: { id: 'TEST-789' }
      };

      const res = await request(app)
        .post('/api/paypal/webhook')
        .send(webhookData);

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('received', true);
    });

    it('should handle malformed webhook data', async () => {
      const res = await request(app)
        .post('/api/paypal/webhook')
        .send({ invalid: 'data' });

      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('received', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle PayPal API errors gracefully', async () => {
      // Test with data that would cause PayPal API to fail
      const res = await request(app)
        .post('/api/paypal/create')
        .send({ 
          amount: 'invalid-amount-type',
          currency: 'INVALID'
        });

      expect(res.status).to.equal(500);
      expect(res.body).to.have.property('error');
    });
  });

  describe('Integration with Viewing Requests', () => {
    it('should create order for viewing request with correct amount', async () => {
      const viewingOrderData = {
        amount: 25.00,
        currency: 'EUR',
        description: 'SichrPlace Viewing Service - Apartment APT-123',
        apartmentId: 'APT-123',
        viewingRequestId: 'VR-789'
      };

      const res = await request(app)
        .post('/api/paypal/create')
        .send(viewingOrderData);

      expect(res.status).to.equal(200);
      expect(res.body.success).to.be.true;
      expect(res.body.amount.value).to.equal(25.00);
      expect(res.body.amount.currency).to.equal('EUR');
    });
  });
});

module.exports = { app };
