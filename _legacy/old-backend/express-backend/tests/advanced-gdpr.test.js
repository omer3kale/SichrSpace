const AdvancedGdprService = require('../utils/advancedGdprService');
const PrivacyComplianceScanner = require('../utils/privacyComplianceScanner');

// Mock models
jest.mock('../models/ConsentPurpose');
jest.mock('../models/DataBreach');
jest.mock('../models/DPIA');
jest.mock('../models/DataProcessingLog');

describe('Advanced GDPR Service Tests', () => {
  describe('Consent Management', () => {
    test('should calculate consent expiry correctly', () => {
      const expiryDate = AdvancedGdprService.calculateConsentExpiry('marketing');
      const oneYear = new Date();
      oneYear.setFullYear(oneYear.getFullYear() + 1);
      
      expect(expiryDate.getTime()).toBeCloseTo(oneYear.getTime(), -10000);
    });

    test('should record purpose-specific consent', async () => {
      const ConsentPurpose = require('../models/ConsentPurpose');
      
      // Mock existing consent
      ConsentPurpose.findOne = jest.fn().mockResolvedValue(null);
      ConsentPurpose.prototype.save = jest.fn().mockResolvedValue({
        id: 'consent-123',
        userId: 'user-123',
        purpose: 'analytics',
        consented: true
      });

      const result = await AdvancedGdprService.recordPurposeConsent(
        'user-123',
        'analytics',
        true,
        { 
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          method: 'web_form'
        }
      );

      expect(ConsentPurpose.prototype.save).toHaveBeenCalled();
      expect(result.purpose).toBe('analytics');
    });

    test('should get comprehensive consent status', async () => {
      const ConsentPurpose = require('../models/ConsentPurpose');
      
      ConsentPurpose.find = jest.fn().mockResolvedValue([
        {
          purpose: 'analytics',
          consented: true,
          consentTimestamp: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          renewalRequired: false,
          withdrawalTimestamp: null
        }
      ]);

      const status = await AdvancedGdprService.getConsentStatus('user-123');
      
      expect(status.analytics).toBeDefined();
      expect(status.analytics.consented).toBe(true);
      expect(status.analytics.needsRenewal).toBe(false);
    });
  });

  describe('Data Breach Management', () => {
    test('should assess breach risk correctly', async () => {
      const breachData = {
        dataTypesAffected: ['personal_data', 'financial_data'],
        accessLevel: 'external',
        scope: 'substantial'
      };

      const riskAssessment = await AdvancedGdprService.assessBreachRisk(breachData);
      
      expect(riskAssessment.riskScore).toBeGreaterThan(8);
      expect(riskAssessment.requiresAuthorityNotification).toBe(true);
      expect(riskAssessment.overallRisk).toBe('medium' || 'high');
    });

    test('should provide appropriate breach recommendations', () => {
      const highRiskRecommendations = AdvancedGdprService.getBreachRecommendations(15);
      const mediumRiskRecommendations = AdvancedGdprService.getBreachRecommendations(10);
      const lowRiskRecommendations = AdvancedGdprService.getBreachRecommendations(5);

      expect(highRiskRecommendations).toContain('Immediately notify data protection authority');
      expect(highRiskRecommendations).toContain('Notify affected individuals within 72 hours');
      expect(mediumRiskRecommendations).toContain('Notify data protection authority within 72 hours');
      expect(lowRiskRecommendations).toContain('Implement containment measures');
    });

    test('should report data breach with risk assessment', async () => {
      const DataBreach = require('../models/DataBreach');
      
      DataBreach.prototype.save = jest.fn().mockResolvedValue({
        id: 'breach-123',
        severity: 'high',
        status: 'discovered'
      });

      AdvancedGdprService.assessBreachRisk = jest.fn().mockResolvedValue({
        riskScore: 12,
        requiresAuthorityNotification: true
      });

      AdvancedGdprService.scheduleAuthorityNotification = jest.fn().mockResolvedValue();
      AdvancedGdprService.logDataProcessing = jest.fn().mockResolvedValue();

      const breachData = {
        description: 'Test breach',
        severity: 'high',
        dataTypesAffected: ['personal_data']
      };

      const result = await AdvancedGdprService.reportDataBreach(breachData);
      
      expect(result.status).toBe('discovered');
      expect(AdvancedGdprService.scheduleAuthorityNotification).toHaveBeenCalled();
    });
  });

  describe('DPIA Management', () => {
    test('should conduct comprehensive risk assessment', async () => {
      const processingActivity = {
        dataVolume: 'high',
        dataSensitivity: 'special_category',
        processingScope: 'systematic',
        technologyUsed: 'ai_automated'
      };

      const assessment = await AdvancedGdprService.conductRiskAssessment(processingActivity);
      
      expect(assessment.riskScore).toBeGreaterThan(10);
      expect(assessment.overallRisk).toBe('high');
      expect(assessment.mitigationRequired).toBe(true);
      expect(assessment.consultationRequired).toBe(true);
    });

    test('should recommend appropriate safeguards based on risk', () => {
      const highRiskSafeguards = AdvancedGdprService.getRecommendedSafeguards(16);
      const mediumRiskSafeguards = AdvancedGdprService.getRecommendedSafeguards(12);
      
      expect(highRiskSafeguards).toContain('Data Protection Officer involvement required');
      expect(highRiskSafeguards).toContain('End-to-end encryption');
      expect(mediumRiskSafeguards).toContain('Enhanced access controls');
    });

    test('should create DPIA with risk assessment', async () => {
      const DPIA = require('../models/DPIA');
      
      DPIA.prototype.save = jest.fn().mockResolvedValue({
        id: 'dpia-123',
        status: 'draft'
      });

      AdvancedGdprService.conductRiskAssessment = jest.fn().mockResolvedValue({
        riskScore: 12,
        overallRisk: 'medium'
      });

      const dpiaData = {
        processingActivity: {
          name: 'User Analytics',
          dataVolume: 'high'
        }
      };

      const result = await AdvancedGdprService.createDPIA(dpiaData);
      
      expect(result.status).toBe('draft');
      expect(DPIA.prototype.save).toHaveBeenCalled();
    });
  });

  describe('Compliance Monitoring', () => {
    test('should check for expired consents', async () => {
      const ConsentPurpose = require('../models/ConsentPurpose');
      
      ConsentPurpose.find = jest.fn().mockResolvedValue([
        { id: 'consent-1', expiryDate: new Date('2020-01-01') }
      ]);
      
      ConsentPurpose.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });

      const result = await AdvancedGdprService.checkExpiredConsents();
      
      expect(result.count).toBe(1);
      expect(result.action).toBe('auto_deactivated');
      expect(ConsentPurpose.updateMany).toHaveBeenCalled();
    });

    test('should identify overdue GDPR requests', async () => {
      const GdprRequest = require('../models/GdprRequest');
      
      GdprRequest.find = jest.fn().mockResolvedValue([
        {
          _id: 'request-1',
          requestType: 'access',
          expiresAt: new Date('2020-01-01')
        }
      ]);

      const result = await AdvancedGdprService.checkOverdueRequests();
      
      expect(result.count).toBe(1);
      expect(result.requests[0].daysOverdue).toBeGreaterThan(1000);
    });

    test('should check breach notification deadlines', async () => {
      const DataBreach = require('../models/DataBreach');
      
      DataBreach.find = jest.fn().mockResolvedValue([
        {
          _id: 'breach-1',
          severity: 'high',
          discoveredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
      ]);

      const result = await AdvancedGdprService.checkBreachDeadlines();
      
      expect(result.count).toBe(1);
      expect(result.breaches[0].hoursOverdue).toBeGreaterThan(72);
    });

    test('should run comprehensive daily compliance check', async () => {
      // Mock all check methods
      AdvancedGdprService.checkExpiredConsents = jest.fn().mockResolvedValue({ count: 0 });
      AdvancedGdprService.checkOverdueRequests = jest.fn().mockResolvedValue({ count: 1 });
      AdvancedGdprService.checkBreachDeadlines = jest.fn().mockResolvedValue({ count: 0 });
      AdvancedGdprService.checkDPIAReviews = jest.fn().mockResolvedValue({ count: 0 });
      AdvancedGdprService.checkDataRetention = jest.fn().mockResolvedValue({ issues: [] });
      AdvancedGdprService.sendComplianceAlerts = jest.fn().mockResolvedValue();

      const results = await AdvancedGdprService.runDailyComplianceCheck();
      
      expect(results.timestamp).toBeDefined();
      expect(results.checks.overdueRequests.count).toBe(1);
      expect(AdvancedGdprService.sendComplianceAlerts).toHaveBeenCalledWith(results);
    });
  });
});

describe('Privacy Compliance Scanner Tests', () => {
  test('should run comprehensive compliance check', async () => {
    const results = await PrivacyComplianceScanner.runComplianceCheck();
    
    expect(results.overallScore).toBeDefined();
    expect(results.checks).toBeDefined();
    expect(results.checks.consent).toBeDefined();
    expect(results.checks.dataRetention).toBeDefined();
    expect(results.checks.processingLogs).toBeDefined();
  });

  test('should generate compliance report with metadata', async () => {
    const report = await PrivacyComplianceScanner.generateComplianceReport('admin-123');
    
    expect(report.reportId).toBeDefined();
    expect(report.generatedAt).toBeDefined();
    expect(report.generatedBy).toBe('admin-123');
    expect(report.overallScore).toBeDefined();
  });

  test('should check for GDPR violations', async () => {
    const violations = await PrivacyComplianceScanner.checkGDPRViolations();
    
    expect(violations.violations).toBeDefined();
    expect(violations.warnings).toBeDefined();
    expect(violations.recommendations).toBeDefined();
    expect(Array.isArray(violations.violations)).toBe(true);
  });

  test('should identify consent compliance issues', async () => {
    const compliance = await PrivacyComplianceScanner.checkConsentCompliance();
    
    expect(compliance.score).toBeDefined();
    expect(compliance.issues).toBeDefined();
    expect(compliance.recommendations).toBeDefined();
    expect(compliance.score).toBeGreaterThan(0);
  });
});
