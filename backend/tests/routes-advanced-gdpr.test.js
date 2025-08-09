const request = require('supertest');
const express = require('express');
const advancedGdprRoutes = require('../routes/advancedGdpr');
const AdvancedGdprService = require('../utils/advancedGdprService');
const PrivacyComplianceScanner = require('../utils/privacyComplianceScanner');
const GdprService = require('../services/GdprService');

// Mock services
jest.mock('../utils/advancedGdprService');
jest.mock('../utils/privacyComplianceScanner');
jest.mock('../services/GdprService');

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { 
    id: 'test-admin-123', 
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin'
  };
  next();
});

app.use('/api/advanced-gdpr', advancedGdprRoutes);

describe('Advanced GDPR Routes Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/advanced-gdpr/requests', () => {
    test('should create GDPR request successfully', async () => {
      const mockRequest = {
        id: 'request-123',
        request_type: 'access',
        status: 'pending',
        created_at: '2025-08-06T00:00:00Z'
      };

      GdprService.createRequest = jest.fn().mockResolvedValue(mockRequest);

      const response = await request(app)
        .post('/api/advanced-gdpr/requests')
        .send({
          request_type: 'access',
          description: 'I want to access my data'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('GDPR request created successfully');
      expect(response.body.data).toEqual(mockRequest);
    });

    test('should validate required request type', async () => {
      const response = await request(app)
        .post('/api/advanced-gdpr/requests')
        .send({
          description: 'Missing request type'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Request type is required');
    });

    test('should handle service errors', async () => {
      GdprService.createRequest = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/advanced-gdpr/requests')
        .send({
          request_type: 'deletion',
          description: 'Delete my data'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create GDPR request');
    });
  });

  describe('GET /api/advanced-gdpr/consent-purposes', () => {
    test('should return consent purposes with pagination', async () => {
      const mockConsents = [
        {
          id: 'consent-1',
          purpose: 'analytics',
          granted: true,
          user: { id: 'user-1', email: 'user1@example.com' }
        }
      ];

      const mockStats = [
        { _id: 'analytics', total: 100, consented: 80, withdrawn: 5, expired: 3 }
      ];

      GdprService.getConsentPurposes = jest.fn().mockResolvedValue(mockConsents);
      GdprService.countConsentPurposes = jest.fn().mockResolvedValue(1);
      GdprService.getConsentStatistics = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/advanced-gdpr/consent-purposes?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.consents).toEqual(mockConsents);
      expect(response.body.total).toBe(1);
      expect(response.body.statistics).toEqual(mockStats);
    });

    test('should handle invalid pagination parameters', async () => {
      GdprService.getConsentPurposes = jest.fn().mockResolvedValue([]);
      GdprService.countConsentPurposes = jest.fn().mockResolvedValue(0);
      GdprService.getConsentStatistics = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/advanced-gdpr/consent-purposes?page=abc&limit=xyz');

      expect(response.status).toBe(200);
      expect(GdprService.getConsentPurposes).toHaveBeenCalledWith({ skip: 0, limit: 20 });
    });
  });

  describe('GET /api/advanced-gdpr/requests', () => {
    test('should return all GDPR requests for admin', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          request_type: 'access',
          status: 'pending',
          user: { id: 'user-1', email: 'user1@example.com' }
        },
        {
          id: 'request-2',
          request_type: 'deletion',
          status: 'completed',
          user: { id: 'user-2', email: 'user2@example.com' }
        }
      ];

      GdprService.getRequests = jest.fn().mockResolvedValue(mockRequests);

      const response = await request(app)
        .get('/api/advanced-gdpr/requests');

      expect(response.status).toBe(200);
      expect(response.body.requests).toEqual(mockRequests);
      expect(GdprService.getRequests).toHaveBeenCalledWith({});
    });

    test('should filter requests by status', async () => {
      const mockRequests = [
        {
          id: 'request-1',
          request_type: 'access',
          status: 'pending'
        }
      ];

      GdprService.getRequests = jest.fn().mockResolvedValue(mockRequests);

      const response = await request(app)
        .get('/api/advanced-gdpr/requests?status=pending');

      expect(response.status).toBe(200);
      expect(GdprService.getRequests).toHaveBeenCalledWith({ status: 'pending' });
    });
  });

  describe('PUT /api/advanced-gdpr/requests/:id/status', () => {
    test('should update request status successfully', async () => {
      const mockUpdatedRequest = {
        id: 'request-123',
        status: 'completed',
        notes: 'Request processed successfully',
        completed_at: '2025-08-06T12:00:00Z'
      };

      GdprService.updateRequestStatus = jest.fn().mockResolvedValue(mockUpdatedRequest);

      const response = await request(app)
        .put('/api/advanced-gdpr/requests/request-123/status')
        .send({
          status: 'completed',
          notes: 'Request processed successfully'
        });

      expect(response.status).toBe(200);
      expect(response.body.request).toEqual(mockUpdatedRequest);
      expect(GdprService.updateRequestStatus).toHaveBeenCalledWith(
        'request-123',
        'completed',
        'Request processed successfully'
      );
    });

    test('should validate status field', async () => {
      const response = await request(app)
        .put('/api/advanced-gdpr/requests/request-123/status')
        .send({
          status: '',
          notes: 'Some notes'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    test('should handle non-existent request', async () => {
      GdprService.updateRequestStatus = jest.fn().mockRejectedValue(
        new Error('Request not found')
      );

      const response = await request(app)
        .put('/api/advanced-gdpr/requests/non-existent/status')
        .send({
          status: 'completed'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update request status');
    });
  });

  describe('POST /api/advanced-gdpr/breach', () => {
    test('should report data breach successfully', async () => {
      const mockBreach = {
        id: 'breach-123',
        severity: 'high',
        status: 'discovered',
        riskAssessment: {
          riskScore: 12,
          requiresAuthorityNotification: true
        }
      };

      AdvancedGdprService.reportDataBreach = jest.fn().mockResolvedValue(mockBreach);

      const response = await request(app)
        .post('/api/advanced-gdpr/breach')
        .send({
          description: 'Unauthorized access to user data',
          severity: 'high',
          dataTypesAffected: ['personal_data', 'contact_data'],
          affectedUsers: 150
        });

      expect(response.status).toBe(201);
      expect(response.body.breach).toEqual(mockBreach);
      expect(AdvancedGdprService.reportDataBreach).toHaveBeenCalled();
    });

    test('should validate breach data', async () => {
      const response = await request(app)
        .post('/api/advanced-gdpr/breach')
        .send({
          severity: 'invalid_severity'
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/advanced-gdpr/breaches', () => {
    test('should return data breaches', async () => {
      const mockBreaches = [
        {
          id: 'breach-1',
          severity: 'high',
          status: 'reported',
          discoveredAt: '2025-08-01T00:00:00Z'
        }
      ];

      GdprService.getDataBreaches = jest.fn().mockResolvedValue(mockBreaches);

      const response = await request(app)
        .get('/api/advanced-gdpr/breaches');

      expect(response.status).toBe(200);
      expect(response.body.breaches).toEqual(mockBreaches);
    });

    test('should filter breaches by severity', async () => {
      GdprService.getDataBreaches = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/advanced-gdpr/breaches?severity=high');

      expect(response.status).toBe(200);
      expect(GdprService.getDataBreaches).toHaveBeenCalledWith({ severity: 'high' });
    });
  });

  describe('POST /api/advanced-gdpr/dpia', () => {
    test('should create DPIA successfully', async () => {
      const mockDPIA = {
        id: 'dpia-123',
        processingActivity: {
          name: 'User Analytics Processing',
          description: 'Analysis of user behavior'
        },
        status: 'draft',
        riskAssessment: {
          riskScore: 8,
          overallRisk: 'medium'
        }
      };

      AdvancedGdprService.createDPIA = jest.fn().mockResolvedValue(mockDPIA);

      const response = await request(app)
        .post('/api/advanced-gdpr/dpia')
        .send({
          processingActivity: {
            name: 'User Analytics Processing',
            description: 'Analysis of user behavior',
            dataVolume: 'high',
            dataSensitivity: 'medium'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.dpia).toEqual(mockDPIA);
    });

    test('should validate DPIA data', async () => {
      const response = await request(app)
        .post('/api/advanced-gdpr/dpia')
        .send({
          processingActivity: {
            name: '' // Empty name should fail validation
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/advanced-gdpr/compliance/scan', () => {
    test('should run compliance scan successfully', async () => {
      const mockReport = {
        timestamp: new Date(),
        overallScore: 85,
        issues: [],
        recommendations: ['Implement regular consent renewal'],
        checks: {
          consent: { score: 90, issues: [] },
          dataRetention: { score: 80, issues: [] }
        }
      };

      PrivacyComplianceScanner.generateDetailedReport = jest.fn().mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/advanced-gdpr/compliance/scan');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockReport);
    });

    test('should handle compliance scan errors', async () => {
      PrivacyComplianceScanner.generateDetailedReport = jest.fn().mockRejectedValue(
        new Error('Scan failed')
      );

      const response = await request(app)
        .get('/api/advanced-gdpr/compliance/scan');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Scan failed');
    });
  });

  describe('GET /api/advanced-gdpr/compliance/dashboard', () => {
    test('should return compliance dashboard data', async () => {
      const mockConsentStats = [
        { _id: 'analytics', total: 100, consented: 80 }
      ];
      const mockBreachStats = [
        { _id: 'high', count: 2 }
      ];
      const mockDPIAStats = [
        { _id: 'approved', count: 5 }
      ];
      const mockRecentLogs = [
        { action: 'consent_given', count: 25 }
      ];

      // Mock aggregation methods (these would need to be implemented)
      const mockAggregate = jest.fn()
        .mockResolvedValueOnce(mockConsentStats)
        .mockResolvedValueOnce(mockBreachStats)
        .mockResolvedValueOnce(mockDPIAStats)
        .mockResolvedValueOnce(mockRecentLogs);

      const response = await request(app)
        .get('/api/advanced-gdpr/compliance/dashboard');

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/advanced-gdpr/compliance/report', () => {
    test('should export compliance report as JSON', async () => {
      const mockReportData = {
        generatedAt: '2025-08-06T12:00:00Z',
        consents: [],
        requests: [],
        breaches: [],
        dpias: [],
        processingLogs: []
      };

      GdprService.getConsentPurposes = jest.fn().mockResolvedValue([]);
      GdprService.getRequests = jest.fn().mockResolvedValue([]);
      GdprService.getDataBreaches = jest.fn().mockResolvedValue([]);
      GdprService.getDataProcessingLogs = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/advanced-gdpr/compliance/report?format=json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    test('should handle CSV format request', async () => {
      const response = await request(app)
        .get('/api/advanced-gdpr/compliance/report?format=csv');

      expect(response.status).toBe(200);
      expect(response.text).toBe('CSV export not implemented yet');
    });
  });

  describe('POST /api/advanced-gdpr/compliance/daily-check', () => {
    test('should run daily compliance check', async () => {
      const mockResults = {
        timestamp: new Date(),
        checks: {
          expiredConsents: { count: 0 },
          overdueRequests: { count: 1 },
          breachDeadlines: { count: 0 }
        }
      };

      AdvancedGdprService.runDailyComplianceCheck = jest.fn().mockResolvedValue(mockResults);

      const response = await request(app)
        .post('/api/advanced-gdpr/compliance/daily-check');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/advanced-gdpr/requests')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    test('should handle unauthorized access', async () => {
      const appWithoutAuth = express();
      appWithoutAuth.use(express.json());
      appWithoutAuth.use('/api/advanced-gdpr', advancedGdprRoutes);

      const response = await request(appWithoutAuth)
        .get('/api/advanced-gdpr/requests');

      expect(response.status).toBe(401);
    });
  });
});
