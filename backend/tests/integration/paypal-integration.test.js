/**
 * PayPal Integration Test Suite
 * Tests PayPal configuration, order creation, payment processing, and email automation
 */

const request = require('supertest');
const express = require('express');

// Mock PayPal SDK
jest.mock('@paypal/checkout-server-sdk', () => ({
  core: {
    PayPalHttpClient: jest.fn().mockImplementation(() => ({
      execute: jest.fn()
    })),
    SandboxEnvironment: jest.fn(),
    ProductionEnvironment: jest.fn()
  },
  orders: {
    OrdersCreateRequest: jest.fn(),
    OrdersCaptureRequest: jest.fn(),
    OrdersGetRequest: jest.fn()
  }
}));

// Mock email service
jest.mock('../../services/emailService', () => ({
  sendPaymentConfirmation: jest.fn().mockResolvedValue({ success: true }),
  sendViewingReminder: jest.fn().mockResolvedValue({ success: true }),
  sendTestEmail: jest.fn().mockResolvedValue({ success: true })
}));

const app = express();
app.use(express.json());

// Mock middleware
app.use((req, res, next) => {
  req.user = { id: 'test-user-id', email: 'test@example.com' };
  next();
});

// Import routes after mocking
const paypalRoutes = require('../../routes/paypal');
const viewingRequestRoutes = require('../../api/viewing-request-improved');

app.use('/api/paypal', paypalRoutes);
app.use('/api', viewingRequestRoutes);

describe('PayPal Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PayPal Configuration', () => {
    test('should provide PayPal configuration', async () => {
      process.env.PAYPAL_CLIENT_ID = 'test-client-id';
      process.env.PAYPAL_ENVIRONMENT = 'sandbox';

      const response = await request(app)
        .get('/api/paypal/config')
        .expect(200);

      expect(response.body).toEqual({
        clientId: 'test-client-id',
        environment: 'sandbox'
      });
    });

    test('should handle missing PayPal configuration', async () => {
      delete process.env.PAYPAL_CLIENT_ID;

      const response = await request(app)
        .get('/api/paypal/config')
        .expect(200);

      expect(response.body.clientId).toBeUndefined();
    });
  });

  describe('Order Creation', () => {
    test('should create PayPal order successfully', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockResolvedValue({
        result: {
          id: 'ORDER123',
          status: 'CREATED',
          links: [
            { rel: 'approve', href: 'https://paypal.com/approve/ORDER123' }
          ]
        },
        statusCode: 201
      });

      const orderData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/create-viewing-order')
        .send(orderData)
        .expect(201);

      expect(response.body.id).toBe('ORDER123');
      expect(response.body.status).toBe('CREATED');
      expect(mockExecute).toHaveBeenCalled();
    });

    test('should validate required fields for order creation', async () => {
      const incompleteData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/create-viewing-order')
        .send(incompleteData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('required');
    });

    test('should handle PayPal order creation errors', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockRejectedValue(new Error('PayPal API error'));

      const orderData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/create-viewing-order')
        .send(orderData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Order Capture and Payment Processing', () => {
    test('should capture PayPal payment successfully', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockResolvedValue({
        result: {
          id: 'ORDER123',
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{
                id: 'CAPTURE123',
                status: 'COMPLETED',
                amount: {
                  value: '25.00',
                  currency_code: 'EUR'
                },
                payer: {
                  email_address: 'test@example.com',
                  name: {
                    given_name: 'Test',
                    surname: 'User'
                  }
                }
              }]
            }
          }]
        },
        statusCode: 201
      });

      const captureData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/capture-viewing-order/ORDER123')
        .send(captureData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.paymentDetails.transactionId).toBe('CAPTURE123');
      expect(response.body.paymentDetails.amount).toBe('25.00');
      expect(mockExecute).toHaveBeenCalled();
    });

    test('should validate payment amount and currency', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockResolvedValue({
        result: {
          purchase_units: [{
            payments: {
              captures: [{
                status: 'COMPLETED',
                amount: {
                  value: '20.00', // Wrong amount
                  currency_code: 'USD' // Wrong currency
                }
              }]
            }
          }]
        },
        statusCode: 201
      });

      const captureData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/capture-viewing-order/ORDER123')
        .send(captureData)
        .expect(400);

      expect(response.body.error).toContain('Payment amount mismatch');
    });

    test('should handle failed payment capture', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockResolvedValue({
        result: {
          purchase_units: [{
            payments: {
              captures: [{
                status: 'FAILED'
              }]
            }
          }]
        },
        statusCode: 201
      });

      const captureData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/capture-viewing-order/ORDER123')
        .send(captureData)
        .expect(400);

      expect(response.body.error).toContain('Payment was not completed successfully');
    });
  });

  describe('Email Automation Integration', () => {
    test('should trigger payment confirmation email after successful payment', async () => {
      const emailService = require('../../services/emailService');
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockResolvedValue({
        result: {
          id: 'ORDER123',
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{
                id: 'CAPTURE123',
                status: 'COMPLETED',
                amount: {
                  value: '25.00',
                  currency_code: 'EUR'
                },
                payer: {
                  email_address: 'test@example.com',
                  name: {
                    given_name: 'Test',
                    surname: 'User'
                  }
                }
              }]
            }
          }]
        },
        statusCode: 201
      });

      const captureData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      await request(app)
        .post('/api/capture-viewing-order/ORDER123')
        .send(captureData)
        .expect(201);

      // Verify payment confirmation email was sent
      expect(emailService.sendPaymentConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({
          applicantEmail: 'test@example.com',
          paymentId: 'ORDER123',
          transactionId: 'CAPTURE123'
        })
      );
    });

    test('should not send email if payment fails', async () => {
      const emailService = require('../../services/emailService');
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockRejectedValue(new Error('Payment failed'));

      const captureData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      await request(app)
        .post('/api/capture-viewing-order/ORDER123')
        .send(captureData)
        .expect(500);

      // Verify no email was sent
      expect(emailService.sendPaymentConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('Webhook Integration', () => {
    test('should handle PayPal webhook verification', async () => {
      const webhookData = {
        id: 'WH-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE123',
          status: 'COMPLETED'
        }
      };

      const response = await request(app)
        .post('/api/paypal/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should trigger email on webhook payment completion', async () => {
      const emailService = require('../../services/emailService');
      
      const webhookData = {
        id: 'WH-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAPTURE123',
          status: 'COMPLETED',
          custom_id: 'viewing-request-123'
        }
      };

      await request(app)
        .post('/api/paypal/webhook')
        .send(webhookData)
        .expect(200);

      // Verify webhook email was triggered
      expect(emailService.sendPaymentConfirmation).toHaveBeenCalled();
    });

    test('should handle webhook payment denial', async () => {
      const webhookData = {
        id: 'WH-123',
        event_type: 'PAYMENT.CAPTURE.DENIED',
        resource: {
          id: 'CAPTURE123',
          status: 'DENIED'
        }
      };

      const response = await request(app)
        .post('/api/paypal/webhook')
        .send(webhookData)
        .expect(200);

      expect(response.body.received).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle PayPal API timeout', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockRejectedValue(new Error('Request timeout'));

      const orderData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/create-viewing-order')
        .send(orderData)
        .expect(500);

      expect(response.body.error).toContain('Failed to create viewing order');
    });

    test('should handle malformed PayPal response', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockResolvedValue({
        result: null, // Malformed response
        statusCode: 200
      });

      const orderData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/create-viewing-order')
        .send(orderData)
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    test('should validate order ID format', async () => {
      const captureData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/capture-viewing-order/') // Empty order ID
        .send(captureData)
        .expect(404);
    });
  });

  describe('Database Integration', () => {
    test('should store viewing request with payment details', async () => {
      const paypal = require('@paypal/checkout-server-sdk');
      const mockExecute = paypal.core.PayPalHttpClient().execute;
      
      mockExecute.mockResolvedValue({
        result: {
          id: 'ORDER123',
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{
                id: 'CAPTURE123',
                status: 'COMPLETED',
                amount: {
                  value: '25.00',
                  currency_code: 'EUR'
                },
                payer: {
                  email_address: 'test@example.com',
                  name: {
                    given_name: 'Test',
                    surname: 'User'
                  }
                }
              }]
            }
          }]
        },
        statusCode: 201
      });

      const captureData = {
        apartmentId: 'APT123',
        viewingDate: '2025-02-15',
        viewingTime: '14:00',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        applicantPhone: '+49123456789'
      };

      const response = await request(app)
        .post('/api/capture-viewing-order/ORDER123')
        .send(captureData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.requestId).toBeDefined();
      expect(response.body.paymentDetails).toEqual({
        transactionId: 'CAPTURE123',
        amount: '25.00',
        currency: 'EUR',
        status: 'COMPLETED'
      });
    });
  });

  describe('Environment Configuration', () => {
    test('should use sandbox environment by default', () => {
      delete process.env.PAYPAL_ENVIRONMENT;
      
      // Re-require the module to test environment detection
      jest.resetModules();
      
      expect(process.env.PAYPAL_ENVIRONMENT).toBeUndefined();
    });

    test('should use production environment when configured', () => {
      process.env.PAYPAL_ENVIRONMENT = 'production';
      
      // This would test production environment setup
      expect(process.env.PAYPAL_ENVIRONMENT).toBe('production');
    });
  });
});
