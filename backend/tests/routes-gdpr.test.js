const request = require('supertest');
const express = require('express');
const gdprRoutes = require('../routes/gdpr');
const { GdprService } = require('../services/GdprService');

// Mock GdprService
jest.mock('../services/GdprService');

const app = express();
app.use(express.json());
app.use('/api/gdpr', gdprRoutes);

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { 
    id: 'test-user-123', 
    email: 'test@example.com',
    username: 'testuser'
  };
  next();
});

describe('GDPR Routes Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/gdpr/consent', () => {
    test('should record user consent successfully', async () => {
      // Mock GdprService methods
      GdprService.logDataProcessing = jest.fn().mockResolvedValue({ id: 'log-123' });
      GdprService.createConsent = jest.fn().mockResolvedValue({ 
        id: 'consent-123',
        user_id: 'test-user-123',
        granted: true
      });

      const response = await request(app)
        .post('/api/gdpr/consent')
        .send({
          consentTypes: {
            necessary: true,
            analytics: true,
            marketing: false,
            functional: true
          },
          privacyPolicyVersion: '2.1'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Consent recorded successfully');
      expect(GdprService.logDataProcessing).toHaveBeenCalled();
      expect(GdprService.createConsent).toHaveBeenCalledTimes(4); // Once for each consent type
    });

    test('should validate required consent types', async () => {
      const response = await request(app)
        .post('/api/gdpr/consent')
        .send({
          consentTypes: null
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    test('should handle consent recording errors', async () => {
      GdprService.logDataProcessing = jest.fn().mockResolvedValue({ id: 'log-123' });
      GdprService.createConsent = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/gdpr/consent')
        .send({
          consentTypes: {
            necessary: true,
            analytics: true
          }
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to record consent');
    });
  });

  describe('GET /api/gdpr/consent-status', () => {
    test('should return user consent status', async () => {
      const mockConsents = [
        {
          id: 'consent-1',
          purpose: 'analytics',
          granted: true,
          granted_at: '2025-01-01T00:00:00Z'
        },
        {
          id: 'consent-2',
          purpose: 'marketing',
          granted: false,
          granted_at: null
        }
      ];

      GdprService.getUserConsents = jest.fn().mockResolvedValue(mockConsents);

      const response = await request(app)
        .get('/api/gdpr/consent-status');

      expect(response.status).toBe(200);
      expect(response.body.consents).toEqual(mockConsents);
      expect(GdprService.getUserConsents).toHaveBeenCalledWith('test-user-123');
    });

    test('should handle errors when fetching consent status', async () => {
      GdprService.getUserConsents = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/gdpr/consent-status');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch consent status');
    });
  });

  describe('POST /api/gdpr/withdraw-consent', () => {
    test('should withdraw user consent successfully', async () => {
      GdprService.updateConsent = jest.fn().mockResolvedValue({
        id: 'consent-123',
        granted: false,
        withdrawn_at: '2025-08-06T00:00:00Z'
      });
      GdprService.logDataProcessing = jest.fn().mockResolvedValue({ id: 'log-123' });

      const response = await request(app)
        .post('/api/gdpr/withdraw-consent')
        .send({
          consentId: 'consent-123',
          reason: 'User requested withdrawal'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Consent withdrawn successfully');
      expect(GdprService.updateConsent).toHaveBeenCalledWith('consent-123', {
        granted: false,
        withdrawn_at: expect.any(String)
      });
    });

    test('should validate consent ID', async () => {
      const response = await request(app)
        .post('/api/gdpr/withdraw-consent')
        .send({
          consentId: '',
          reason: 'Test withdrawal'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/gdpr/request', () => {
    test('should create GDPR request successfully', async () => {
      GdprService.findExistingRequest = jest.fn().mockResolvedValue(null);
      GdprService.createRequest = jest.fn().mockResolvedValue({
        id: 'request-123',
        request_type: 'access',
        status: 'pending'
      });

      const response = await request(app)
        .post('/api/gdpr/request')
        .send({
          requestType: 'access',
          description: 'I want to access my personal data'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('GDPR request submitted successfully');
      expect(GdprService.createRequest).toHaveBeenCalled();
    });

    test('should prevent duplicate pending requests', async () => {
      GdprService.findExistingRequest = jest.fn().mockResolvedValue({
        id: 'existing-request',
        status: 'pending'
      });

      const response = await request(app)
        .post('/api/gdpr/request')
        .send({
          requestType: 'access',
          description: 'Duplicate request'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('You already have a pending request of this type');
    });

    test('should validate request type', async () => {
      const response = await request(app)
        .post('/api/gdpr/request')
        .send({
          requestType: '',
          description: 'Invalid request'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/gdpr/requests', () => {
    test('should return user GDPR requests', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          request_type: 'access',
          status: 'pending',
          created_at: '2025-08-01T00:00:00Z'
        },
        {
          id: 'request-2',
          request_type: 'deletion',
          status: 'completed',
          created_at: '2025-07-15T00:00:00Z'
        }
      ];

      GdprService.getRequests = jest.fn().mockResolvedValue(mockRequests);

      const response = await request(app)
        .get('/api/gdpr/requests');

      expect(response.status).toBe(200);
      expect(response.body.requests).toEqual(mockRequests);
      expect(GdprService.getRequests).toHaveBeenCalledWith({ 
        userId: 'test-user-123' 
      });
    });
  });

  describe('GET /api/gdpr/export-data', () => {
    test('should export user data successfully', async () => {
      const mockUserData = {
        profile: { name: 'Test User', email: 'test@example.com' },
        apartments: [],
        messages: [],
        viewingRequests: []
      };

      // Mock export function (would need to be implemented in routes)
      GdprService.exportUserData = jest.fn().mockResolvedValue(mockUserData);

      const response = await request(app)
        .get('/api/gdpr/export-data');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('POST /api/gdpr/delete-account', () => {
    test('should initiate account deletion request', async () => {
      GdprService.createRequest = jest.fn().mockResolvedValue({
        id: 'delete-request-123',
        request_type: 'deletion',
        status: 'pending'
      });

      const response = await request(app)
        .post('/api/gdpr/delete-account')
        .send({
          confirmation: 'DELETE_MY_ACCOUNT',
          reason: 'No longer need the service'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Account deletion request submitted');
      expect(GdprService.createRequest).toHaveBeenCalledWith({
        user_id: 'test-user-123',
        request_type: 'deletion',
        description: expect.stringContaining('Account deletion'),
        status: 'pending',
        created_at: expect.any(String)
      });
    });

    test('should validate deletion confirmation', async () => {
      const response = await request(app)
        .post('/api/gdpr/delete-account')
        .send({
          confirmation: 'WRONG_CONFIRMATION',
          reason: 'Test reason'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid confirmation phrase');
    });
  });

  describe('Middleware and Error Handling', () => {
    test('should handle missing user authentication', async () => {
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      appWithoutAuth.use('/api/gdpr', gdprRoutes);

      const response = await request(appWithoutAuth)
        .post('/api/gdpr/consent')
        .send({ consentTypes: { necessary: true } });

      expect(response.status).toBe(401);
    });

    test('should handle invalid JSON payload', async () => {
      const response = await request(app)
        .post('/api/gdpr/consent')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });

    test('should handle service unavailable errors', async () => {
      GdprService.logDataProcessing = jest.fn().mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const response = await request(app)
        .post('/api/gdpr/consent')
        .send({
          consentTypes: { necessary: true }
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to record consent');
    });
  });
});
