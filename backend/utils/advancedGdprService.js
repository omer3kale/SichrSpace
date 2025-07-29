const ConsentPurpose = require('../models/ConsentPurpose');
const DataBreach = require('../models/DataBreach');
const DPIA = require('../models/DPIA');
const DataProcessingLog = require('../models/DataProcessingLog');
const User = require('../models/User');
const nodemailer = require('nodemailer');

class AdvancedGdprService {

  /**
   * Enhanced Consent Management
   */
  static async recordPurposeConsent(userId, purpose, consented, metadata = {}) {
    try {
      // Find existing consent for this purpose
      let consent = await ConsentPurpose.findOne({ userId, purpose });

      if (consent) {
        // Update existing consent
        consent.consented = consented;
        consent.consentTimestamp = new Date();
        consent.ipAddress = metadata.ipAddress;
        consent.userAgent = metadata.userAgent;
        consent.consentProof = {
          method: metadata.method || 'web_form',
          timestamp: new Date(),
          evidence: metadata.evidence || 'User clicked consent button'
        };

        if (!consented) {
          consent.withdrawalTimestamp = new Date();
          consent.withdrawalReason = metadata.withdrawalReason;
        }

        await consent.save();
      } else {
        // Create new consent record
        consent = new ConsentPurpose({
          userId,
          purpose,
          consented,
          consentTimestamp: new Date(),
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
          consentProof: {
            method: metadata.method || 'web_form',
            timestamp: new Date(),
            evidence: metadata.evidence || 'User provided consent'
          },
          privacyPolicyVersion: metadata.privacyPolicyVersion || '1.0',
          expiryDate: this.calculateConsentExpiry(purpose)
        });

        await consent.save();
      }

      // Log the consent action
      await this.logDataProcessing(userId, 'consent_recorded', {
        purpose,
        consented,
        legalBasis: 'consent'
      });

      return consent;
    } catch (error) {
      throw new Error(`Failed to record consent: ${error.message}`);
    }
  }

  static calculateConsentExpiry(purpose) {
    const expiryPeriods = {
      marketing: 365, // 1 year
      analytics: 730, // 2 years
      personalization: 365, // 1 year
      communication: 1095, // 3 years
      service_improvement: 730, // 2 years
      legal_compliance: 2555, // 7 years
      security: 1095, // 3 years
      research: 1825, // 5 years
      third_party_sharing: 365, // 1 year
      profiling: 365, // 1 year
      location_tracking: 365, // 1 year
      biometric_processing: 1095 // 3 years
    };

    const days = expiryPeriods[purpose] || 365;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);
    return expiryDate;
  }

  static async getConsentStatus(userId) {
    try {
      const consents = await ConsentPurpose.find({ userId, isActive: true });
      
      const consentMap = {};
      consents.forEach(consent => {
        consentMap[consent.purpose] = {
          consented: consent.consented,
          timestamp: consent.consentTimestamp,
          expiryDate: consent.expiryDate,
          needsRenewal: consent.renewalRequired && new Date() > consent.expiryDate,
          withdrawn: !!consent.withdrawalTimestamp
        };
      });

      return consentMap;
    } catch (error) {
      throw new Error(`Failed to get consent status: ${error.message}`);
    }
  }

  /**
   * Data Breach Management
   */
  static async reportDataBreach(breachData) {
    try {
      const breach = new DataBreach({
        ...breachData,
        discoveredAt: breachData.discoveredAt || new Date(),
        status: 'discovered',
        riskAssessment: await this.assessBreachRisk(breachData)
      });

      await breach.save();

      // Auto-schedule authority notification if required
      if (breach.riskAssessment.requiresAuthorityNotification) {
        await this.scheduleAuthorityNotification(breach._id);
      }

      // Log the breach discovery
      await this.logDataProcessing(null, 'breach_discovered', {
        breachId: breach._id,
        severity: breach.severity,
        legalBasis: 'legal_obligation'
      });

      return breach;
    } catch (error) {
      throw new Error(`Failed to report breach: ${error.message}`);
    }
  }

  static async assessBreachRisk(breachData) {
    const riskFactors = {
      dataTypes: {
        personal_data: 2,
        sensitive_data: 4,
        financial_data: 5,
        health_data: 5,
        biometric_data: 5
      },
      accessLevel: {
        internal: 1,
        external: 3,
        public: 5
      },
      scope: {
        individual: 1,
        limited: 2,
        substantial: 4,
        massive: 5
      }
    };

    let riskScore = 0;
    
    // Calculate risk based on data types
    breachData.dataTypesAffected?.forEach(dataType => {
      riskScore += riskFactors.dataTypes[dataType] || 1;
    });

    // Add access level risk
    riskScore += riskFactors.accessLevel[breachData.accessLevel] || 1;

    // Add scope risk
    riskScore += riskFactors.scope[breachData.scope] || 1;

    // Determine overall risk level
    let overallRisk = 'low';
    if (riskScore >= 12) overallRisk = 'high';
    else if (riskScore >= 8) overallRisk = 'medium';

    return {
      riskScore,
      overallRisk,
      requiresAuthorityNotification: riskScore >= 8,
      requiresIndividualNotification: riskScore >= 12,
      recommendedActions: this.getBreachRecommendations(riskScore)
    };
  }

  static getBreachRecommendations(riskScore) {
    const recommendations = [];
    
    if (riskScore >= 12) {
      recommendations.push('Immediately notify data protection authority');
      recommendations.push('Notify affected individuals within 72 hours');
      recommendations.push('Consider offering credit monitoring services');
    } else if (riskScore >= 8) {
      recommendations.push('Notify data protection authority within 72 hours');
      recommendations.push('Document breach details thoroughly');
    }
    
    recommendations.push('Implement containment measures');
    recommendations.push('Conduct security review');
    recommendations.push('Update incident response procedures');
    
    return recommendations;
  }

  static async updateBreachStatus(breachId, status, notes = '') {
    try {
      const breach = await DataBreach.findById(breachId);
      if (!breach) throw new Error('Breach not found');

      breach.status = status;
      breach.lastUpdated = new Date();

      if (notes) {
        breach.containmentActions.push({
          action: notes,
          timestamp: new Date()
        });
      }

      if (status === 'resolved') {
        breach.resolvedAt = new Date();
      }

      await breach.save();

      // Log status update
      await this.logDataProcessing(null, 'breach_status_updated', {
        breachId,
        newStatus: status,
        legalBasis: 'legal_obligation'
      });

      return breach;
    } catch (error) {
      throw new Error(`Failed to update breach status: ${error.message}`);
    }
  }

  /**
   * DPIA Management
   */
  static async createDPIA(dpiaData) {
    try {
      const dpia = new DPIA({
        ...dpiaData,
        status: 'draft',
        riskAssessment: await this.conductRiskAssessment(dpiaData.processingActivity)
      });

      await dpia.save();

      // Log DPIA creation
      await this.logDataProcessing(null, 'dpia_created', {
        dpiaId: dpia._id,
        processingActivity: dpiaData.processingActivity.name,
        legalBasis: 'legal_obligation'
      });

      return dpia;
    } catch (error) {
      throw new Error(`Failed to create DPIA: ${error.message}`);
    }
  }

  static async conductRiskAssessment(processingActivity) {
    const riskCriteria = {
      dataVolume: processingActivity.dataVolume || 'low',
      dataSensitivity: processingActivity.dataSensitivity || 'low',
      processingScope: processingActivity.processingScope || 'limited',
      technologyUsed: processingActivity.technologyUsed || 'standard'
    };

    let riskScore = 0;
    
    // Volume risk
    const volumeRisk = { low: 1, medium: 2, high: 3, massive: 4 };
    riskScore += volumeRisk[riskCriteria.dataVolume] || 1;
    
    // Sensitivity risk
    const sensitivityRisk = { low: 1, medium: 3, high: 5, special_category: 6 };
    riskScore += sensitivityRisk[riskCriteria.dataSensitivity] || 1;
    
    // Scope risk
    const scopeRisk = { limited: 1, substantial: 3, systematic: 4, largescale: 5 };
    riskScore += scopeRisk[riskCriteria.processingScope] || 1;
    
    // Technology risk
    const techRisk = { standard: 1, emerging: 2, ai_automated: 3, biometric: 4 };
    riskScore += techRisk[riskCriteria.technologyUsed] || 1;

    let overallRisk = 'low';
    if (riskScore >= 15) overallRisk = 'high';
    else if (riskScore >= 10) overallRisk = 'medium';

    return {
      riskScore,
      overallRisk,
      riskCriteria,
      mitigationRequired: riskScore >= 10,
      consultationRequired: riskScore >= 15,
      recommendedSafeguards: this.getRecommendedSafeguards(riskScore)
    };
  }

  static getRecommendedSafeguards(riskScore) {
    const safeguards = [];
    
    if (riskScore >= 15) {
      safeguards.push('Data Protection Officer involvement required');
      safeguards.push('Regular external audits');
      safeguards.push('End-to-end encryption');
      safeguards.push('Pseudonymization');
    } else if (riskScore >= 10) {
      safeguards.push('Enhanced access controls');
      safeguards.push('Regular security assessments');
      safeguards.push('Data minimization measures');
    }
    
    safeguards.push('Staff training');
    safeguards.push('Incident response procedures');
    safeguards.push('Regular compliance reviews');
    
    return safeguards;
  }

  /**
   * Automated Compliance Monitoring
   */
  static async runDailyComplianceCheck() {
    try {
      const results = {
        timestamp: new Date(),
        checks: {
          expiredConsents: await this.checkExpiredConsents(),
          overdueRequests: await this.checkOverdueRequests(),
          breachDeadlines: await this.checkBreachDeadlines(),
          dpiaReviews: await this.checkDPIAReviews(),
          dataRetention: await this.checkDataRetention()
        }
      };

      // Send alerts for critical issues
      await this.sendComplianceAlerts(results);

      return results;
    } catch (error) {
      throw new Error(`Daily compliance check failed: ${error.message}`);
    }
  }

  static async checkExpiredConsents() {
    const expiredConsents = await ConsentPurpose.find({
      expiryDate: { $lt: new Date() },
      isActive: true
    });

    // Auto-deactivate expired consents
    await ConsentPurpose.updateMany(
      { expiryDate: { $lt: new Date() }, isActive: true },
      { isActive: false, updatedAt: new Date() }
    );

    return {
      count: expiredConsents.length,
      action: 'auto_deactivated'
    };
  }

  static async checkOverdueRequests() {
    const GdprRequest = require('../models/GdprRequest');
    
    const overdueRequests = await GdprRequest.find({
      expiresAt: { $lt: new Date() },
      status: { $in: ['pending', 'in_progress'] }
    });

    return {
      count: overdueRequests.length,
      requests: overdueRequests.map(req => ({
        id: req._id,
        type: req.requestType,
        daysOverdue: Math.ceil((new Date() - req.expiresAt) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  static async checkBreachDeadlines() {
    const seventyTwoHours = new Date(Date.now() - 72 * 60 * 60 * 1000);
    
    const overdueNotifications = await DataBreach.find({
      discoveredAt: { $lt: seventyTwoHours },
      reportedToAuthority: false,
      'riskAssessment.requiresAuthorityNotification': true
    });

    return {
      count: overdueNotifications.length,
      breaches: overdueNotifications.map(breach => ({
        id: breach._id,
        severity: breach.severity,
        hoursOverdue: Math.ceil((new Date() - breach.discoveredAt) / (1000 * 60 * 60))
      }))
    };
  }

  static async checkDPIAReviews() {
    const overdueReviews = await DPIA.find({
      'reviewSchedule.nextReview': { $lt: new Date() },
      status: 'approved'
    });

    return {
      count: overdueReviews.length,
      dpias: overdueReviews.map(dpia => ({
        id: dpia._id,
        processingActivity: dpia.processingActivity.name,
        daysOverdue: Math.ceil((new Date() - dpia.reviewSchedule.nextReview) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  static async checkDataRetention() {
    const issues = [];
    
    // Check for old data that should be anonymized or deleted
    const retentionPeriods = {
      messages: 3 * 365, // 3 years
      viewingRequests: 3 * 365, // 3 years
      inactiveUsers: 5 * 365 // 5 years
    };

    for (const [dataType, days] of Object.entries(retentionPeriods)) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // This would need to be customized based on your data models
      // Example implementation shown
    }

    return { issues };
  }

  /**
   * Utility Methods
   */
  static async logDataProcessing(userId, action, metadata = {}) {
    try {
      const log = new DataProcessingLog({
        userId,
        action,
        dataType: metadata.dataType || 'user_data',
        legalBasis: metadata.legalBasis || 'consent',
        purpose: metadata.purpose || action,
        retentionPeriod: metadata.retentionPeriod || 365,
        metadata
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Failed to log data processing:', error);
    }
  }

  static async sendComplianceAlerts(results) {
    // Implementation would depend on your notification system
    // Could send emails, Slack messages, etc.
    console.log('Compliance check results:', results);
  }

  static async scheduleAuthorityNotification(breachId) {
    // Implementation would schedule automatic notification
    // Could use job queues, cron jobs, etc.
    console.log(`Scheduled authority notification for breach: ${breachId}`);
  }
}

module.exports = AdvancedGdprService;
