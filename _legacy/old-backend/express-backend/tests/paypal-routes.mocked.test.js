const proxyquire = require('proxyquire');
const express = require('express');
const request = require('supertest');

// Mock PayPal SDK
const mockPayPal = {
  core: {
    SandboxEnvironment: function () {},
    PayPalHttpClient: function () {
      return {
        execute: async () => ({
          result: {
            id: 'PAYID-123',
            links: [{ rel: 'approve', href: 'https://paypal.com/approve' }]
          }
        })
      };
    }
  },
  orders: {
    OrdersCreateRequest: function () {
      return { prefer: () => {}, requestBody: () => {} };
    }
  }
};

const paypalRouter = proxyquire('../routes/paypal', {
  '@paypal/checkout-server-sdk': mockPayPal,
  '../middleware/auth': (req, res, next) => next()
});

const app = express();
app.use(express.json());
app.use('/', paypalRouter);

describe('PayPal Routes (Mocked)', () => {
  it('GET /config returns config', async () => {
    const res = await request(app).get('/config');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('clientId');
  });

  it('POST /create returns approvalUrl', async () => {
    const res = await request(app).post('/create').send({ amount: 10 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('approvalUrl');
  });

  it('POST /execute returns completed', async () => {
    const res = await request(app).post('/execute').send({ paymentId: 'PAYID-123', payerId: 'PAYERID-456' });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('POST /webhook returns received', async () => {
    const res = await request(app).post('/webhook').send({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'TXN-789' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('received', true);
  });
});
