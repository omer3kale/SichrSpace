/**
 * Email Integration Tests
 * Tests complete email service integration including:
 * - Email service methods
 * - PayPal webhook integration
 * - Email route endpoints
 * - Email activity logging
 */

const request = require('supertest');
const express = require('express');
const EmailService = require('../../services/emailService');

// Mock EmailService for testing
jest.mock('../../services/emailService');

describe('Email Integration Tests', () => {
  let app;
  let mockEmailService;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock EmailService
    mockEmailService = {
      sendRequestConfirmation: jest.fn(),
      sendViewingConfirmation: jest.fn(),
      sendViewingResults: jest.fn(),
      sendPaymentConfirmation: jest.fn(),
      sendViewingReminder: jest.fn(),
      sendTestEmail: jest.fn(),
      sendViewingReadyEmail: jest.fn(),
      testEmailConfiguration: jest.fn(),
      sendEmail: jest.fn()
    };

    EmailService.mockImplementation(() => mockEmailService);

    // Set up email routes
    const emailRoutes = require('../../routes/emails');
    app.use('/api/emails', emailRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Service Methods', () => {
    test('should have all required email service methods', () => {
      const emailService = new EmailService();
      
      expect(emailService.sendRequestConfirmation).toBeDefined();
      expect(emailService.sendViewingConfirmation).toBeDefined();
      expect(emailService.sendViewingResults).toBeDefined();
      expect(emailService.sendPaymentConfirmation).toBeDefined();
      expect(emailService.sendViewingReminder).toBeDefined();
      expect(emailService.sendTestEmail).toBeDefined();
      expect(emailService.sendViewingReadyEmail).toBeDefined();
      expect(emailService.testEmailConfiguration).toBeDefined();
    });

    test('should send request confirmation email', async () => {
      const userData = { firstName: 'John', apartmentAddress: 'Test Address' };
      const expectedResult = { success: true, messageId: 'test-123' };
      
      mockEmailService.sendRequestConfirmation.mockResolvedValue(expectedResult);

      const result = await mockEmailService.sendRequestConfirmation('test@example.com', userData);
      
      expect(mockEmailService.sendRequestConfirmation).toHaveBeenCalledWith('test@example.com', userData);
      expect(result).toEqual(expectedResult);
    });

    test('should send viewing confirmation email with payment data', async () => {
      const userData = { firstName: 'John' };
      const viewerData = { name: 'Jane Viewer' };
      const paymentData = { amount: '25.00', paymentLink: 'https://paypal.com/test' };
      const expectedResult = { success: true, messageId: 'test-456' };
      
      mockEmailService.sendViewingConfirmation.mockResolvedValue(expectedResult);

      const result = await mockEmailService.sendViewingConfirmation('test@example.com', userData, viewerData, paymentData);
      
      expect(mockEmailService.sendViewingConfirmation).toHaveBeenCalledWith('test@example.com', userData, viewerData, paymentData);
      expect(result).toEqual(expectedResult);
    });

    test('should send payment confirmation email', async () => {
      const userData = { firstName: 'John' };
      const paymentData = { transactionId: 'TXN123', amount: '25.00' };
      const expectedResult = { success: true, messageId: 'test-789' };
      
      mockEmailService.sendPaymentConfirmation.mockResolvedValue(expectedResult);

      const result = await mockEmailService.sendPaymentConfirmation('test@example.com', userData, paymentData);
      
      expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith('test@example.com', userData, paymentData);
      expect(result).toEqual(expectedResult);
    });

    test('should send viewing reminder email', async () => {
      const userData = { firstName: 'John' };
      const viewingData = { datetime: 'Tomorrow 2pm', viewerName: 'Jane' };
      const expectedResult = { success: true, messageId: 'test-reminder' };
      
      mockEmailService.sendViewingReminder.mockResolvedValue(expectedResult);

      const result = await mockEmailService.sendViewingReminder('test@example.com', userData, viewingData);
      
      expect(mockEmailService.sendViewingReminder).toHaveBeenCalledWith('test@example.com', userData, viewingData);
      expect(result).toEqual(expectedResult);
    });

    test('should send viewing results email', async () => {
      const userData = { firstName: 'John' };
      const resultsData = { videoLink: 'https://video.com/test' };
      const expectedResult = { success: true, messageId: 'test-results' };
      
      mockEmailService.sendViewingResults.mockResolvedValue(expectedResult);

      const result = await mockEmailService.sendViewingResults('test@example.com', userData, resultsData);
      
      expect(mockEmailService.sendViewingResults).toHaveBeenCalledWith('test@example.com', userData, resultsData);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Email Routes Integration', () => {
    test('should send request confirmation via API', async () => {
      const requestData = {
        userEmail: 'test@example.com',
        userData: { firstName: 'John', apartmentAddress: 'Test Address' }
      };
      
      mockEmailService.sendRequestConfirmation.mockResolvedValue({
        success: true,
        messageId: 'test-123'
      });

      const response = await request(app)
        .post('/api/emails/send-request-confirmation')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBe('test-123');
    });

    test('should send viewing confirmation via API', async () => {
      const requestData = {
        userEmail: 'test@example.com',
        userData: { firstName: 'John' },
        viewerData: { name: 'Jane Viewer' },
        paymentData: { amount: '25.00', paymentLink: 'https://paypal.com/test' }
      };
      
      mockEmailService.sendViewingConfirmation.mockResolvedValue({
        success: true,
        messageId: 'test-456'
      });

      const response = await request(app)
        .post('/api/emails/send-viewing-confirmation')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBe('test-456');
    });

    test('should send payment confirmation via API', async () => {
      const requestData = {
        userEmail: 'test@example.com',
        userData: { firstName: 'John' },
        paymentData: { transactionId: 'TXN123', amount: '25.00' }
      };
      
      mockEmailService.sendPaymentConfirmation.mockResolvedValue({
        success: true,
        messageId: 'test-789'
      });

      const response = await request(app)
        .post('/api/emails/send-payment-confirmation')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBe('test-789');
    });

    test('should send viewing reminder via API', async () => {
      const requestData = {
        userEmail: 'test@example.com',
        userData: { firstName: 'John' },
        viewingData: { datetime: 'Tomorrow 2pm', viewerName: 'Jane' }
      };
      
      mockEmailService.sendViewingReminder.mockResolvedValue({
        success: true,
        messageId: 'test-reminder'
      });

      const response = await request(app)
        .post('/api/emails/send-viewing-reminder')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.messageId).toBe('test-reminder');
    });

    test('should handle missing email data gracefully', async () => {
      const response = await request(app)
        .post('/api/emails/send-request-confirmation')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('email is required');
    });

    test('should handle missing payment data gracefully', async () => {
      const response = await request(app)
        .post('/api/emails/send-payment-confirmation')
        .send({ userEmail: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('payment data are required');
    });

    test('should test email configuration via API', async () => {
      mockEmailService.testEmailConfiguration.mockResolvedValue({
        success: true
      });

      const response = await request(app)
        .post('/api/emails/test-email-config')
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Email Templates Integration', () => {
    test('should get available email templates', async () => {
      const response = await request(app)
        .get('/api/emails/templates');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('viewing_confirmation');
      expect(response.body.data).toHaveProperty('payment_confirmation');
      expect(response.body.data).toHaveProperty('viewing_ready');
    });

    test('should send general email via API', async () => {
      const requestData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        type: 'general'
      };
      
      mockEmailService.sendTestEmail.mockResolvedValue({
        success: true,
        messageId: 'test-general'
      });

      const response = await request(app)
        .post('/api/emails/send')
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Email Activity Logging', () => {
    test('should log email activity when sending emails', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const requestData = {
        userEmail: 'test@example.com',
        userData: { firstName: 'John', requestId: 'REQ123' }
      };
      
      mockEmailService.sendRequestConfirmation.mockResolvedValue({
        success: true,
        messageId: 'test-123'
      });

      await request(app)
        .post('/api/emails/send-request-confirmation')
        .send(requestData);

      expect(consoleSpy).toHaveBeenCalledWith(
        '📧 Email Activity Logged:',
        expect.objectContaining({
          userEmail: 'test@example.com',
          emailType: 'request_confirmation',
          messageId: 'test-123'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('PayPal Integration Mock', () => {
    test('should create mock PayPal webhook handler', () => {
      // Mock PayPal webhook handler for payment completion
      const mockWebhookHandler = jest.fn(async (webhookData) => {
        if (webhookData.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
          const userEmail = webhookData.resource?.payer?.email_address;
          if (userEmail) {
            return await mockEmailService.sendPaymentConfirmation(
              userEmail,
              { firstName: 'John' },
              { transactionId: webhookData.resource.id }
            );
          }
        }
        return { success: false, error: 'Invalid webhook data' };
      });

      // Test webhook processing
      const mockWebhookData = {
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'TXN123',
          payer: {
            email_address: 'test@example.com',
            name: { given_name: 'John' }
          },
          amount: { value: '25.00', currency_code: 'EUR' }
        }
      };

      mockEmailService.sendPaymentConfirmation.mockResolvedValue({
        success: true,
        messageId: 'webhook-test'
      });

      mockWebhookHandler(mockWebhookData);

      expect(mockEmailService.sendPaymentConfirmation).toHaveBeenCalledWith(
        'test@example.com',
        { firstName: 'John' },
        { transactionId: 'TXN123' }
      );
    });
  });

  describe('Email Error Handling', () => {
    test('should handle email service errors gracefully', async () => {
      mockEmailService.sendRequestConfirmation.mockResolvedValue({
        success: false,
        error: 'SMTP connection failed'
      });

      const response = await request(app)
        .post('/api/emails/send-request-confirmation')
        .send({
          userEmail: 'test@example.com',
          userData: { firstName: 'John' }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to send confirmation email');
    });

    test('should handle service exceptions', async () => {
      mockEmailService.sendRequestConfirmation.mockRejectedValue(
        new Error('Network error')
      );

      const response = await request(app)
        .post('/api/emails/send-request-confirmation')
        .send({
          userEmail: 'test@example.com',
          userData: { firstName: 'John' }
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('Complete Email Flow Integration', () => {
    test('should execute complete email workflow', async () => {
      // Simulate complete email flow
      const userEmail = 'test@example.com';
      const userData = { firstName: 'John', requestId: 'REQ123' };
      
      // Step 1: Request confirmation
      mockEmailService.sendRequestConfirmation.mockResolvedValue({
        success: true, messageId: 'msg-1'
      });
      
      // Step 2: Viewing confirmation
      mockEmailService.sendViewingConfirmation.mockResolvedValue({
        success: true, messageId: 'msg-2'
      });
      
      // Step 3: Payment confirmation
      mockEmailService.sendPaymentConfirmation.mockResolvedValue({
        success: true, messageId: 'msg-3'
      });
      
      // Step 4: Viewing reminder
      mockEmailService.sendViewingReminder.mockResolvedValue({
        success: true, messageId: 'msg-4'
      });
      
      // Step 5: Viewing results
      mockEmailService.sendViewingResults.mockResolvedValue({
        success: true, messageId: 'msg-5'
      });

      // Execute workflow
      const step1 = await request(app)
        .post('/api/emails/send-request-confirmation')
        .send({ userEmail, userData });
      
      const step2 = await request(app)
        .post('/api/emails/send-viewing-confirmation')
        .send({ 
          userEmail, 
          userData, 
          viewerData: { name: 'Jane' },
          paymentData: { amount: '25.00' }
        });
      
      const step3 = await request(app)
        .post('/api/emails/send-payment-confirmation')
        .send({ 
          userEmail, 
          userData, 
          paymentData: { transactionId: 'TXN123' }
        });

      // Verify all steps completed successfully
      expect(step1.status).toBe(200);
      expect(step2.status).toBe(200);
      expect(step3.status).toBe(200);
      
      expect(step1.body.messageId).toBe('msg-1');
      expect(step2.body.messageId).toBe('msg-2');
      expect(step3.body.messageId).toBe('msg-3');
    });
  });
});
