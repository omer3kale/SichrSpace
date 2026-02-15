const DataProcessingLog = require('../models/DataProcessingLog');
const ConsentPurpose = require('../models/ConsentPurpose');
const DPIA = require('../models/DPIA');
const DataBreach = require('../models/DataBreach');

class PrivacyComplianceScanner {
  
  /**
   * Run comprehensive privacy compliance checks
   */
  static async runComplianceCheck() {
    const results = {
      timestamp: new Date(),
      overallScore: 0,
      issues: [],
      recommendations: [],
      checks: {
        consent: await this.checkConsentCompliance(),
        dataRetention: await this.checkDataRetention(),
        processingLogs: await this.checkProcessingLogs(),
        breachResponse: await this.checkBreachResponse(),
        dpia: await this.checkDPIACompliance(),
        userRights: await this.checkUserRightsResponse()
      }
    };

    // Calculate overall compliance score
    const checkScores = Object.values(results.checks).map(check => check.score);
    results.overallScore = Math.round(checkScores.reduce((a, b) => a + b, 0) / checkScores.length);

    // Aggregate issues and recommendations
    Object.values(results.checks).forEach(check => {
      results.issues.push(...check.issues);
      results.recommendations.push(...check.recommendations);
    });

    return results;
  }

  /**
   * Check consent compliance
   */
  static async checkConsentCompliance() {
    const issues = [];
    const recommendations = [];
    let score = 100;

    try {
      // Check for expired consents
      const expiredConsents = await ConsentPurpose.countDocuments({
        expiryDate: { $lt: new Date() },
        isActive: true
      });

      if (expiredConsents > 0) {
        issues.push(`${expiredConsents} expired consents still marked as active`);
        recommendations.push('Run consent cleanup to deactivate expired consents');
        score -= 20;
      }

      // Check for consents without proper documentation
      const undocumentedConsents = await ConsentPurpose.countDocuments({
        $or: [
          { 'consentProof.timestamp': { $exists: false } },
          { ipAddress: { $exists: false } },
          { userAgent: { $exists: false } }
        ]
      });

      if (undocumentedConsents > 0) {
        issues.push(`${undocumentedConsents} consents lack proper documentation`);
        recommendations.push('Ensure all consents are properly documented with proof');
        score -= 15;
      }

      // Check consent renewal requirements
      const needsRenewal = await ConsentPurpose.countDocuments({
        renewalRequired: true,
        consentTimestamp: { $lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // 1 year old
      });

      if (needsRenewal > 0) {
        issues.push(`${needsRenewal} consents require renewal`);
        recommendations.push('Send consent renewal requests to users');
        score -= 10;
      }

    } catch (error) {
      issues.push('Error checking consent compliance: ' + error.message);
      score -= 30;
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Check data retention compliance
   */
  static async checkDataRetention() {
    const issues = [];
    const recommendations = [];
    let score = 100;

    try {
      const User = require('../models/User');
      const Message = require('../models/Message');
      const ViewingRequest = require('../models/ViewingRequest');

      // Check for users who haven't logged in for over 5 years
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const inactiveUsers = await User.countDocuments({
        $or: [
          { lastLoginAt: { $lt: fiveYearsAgo } },
          { lastLoginAt: { $exists: false }, createdAt: { $lt: fiveYearsAgo } }
        ]
      });

      if (inactiveUsers > 0) {
        issues.push(`${inactiveUsers} users inactive for over 5 years`);
        recommendations.push('Consider anonymizing or deleting inactive user data');
        score -= 25;
      }

      // Check for old messages that should be anonymized
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      const oldMessages = await Message.countDocuments({
        createdAt: { $lt: threeYearsAgo },
        name: { $ne: '[ANONYMIZED]' }
      });

      if (oldMessages > 0) {
        issues.push(`${oldMessages} messages older than 3 years not anonymized`);
        recommendations.push('Run data anonymization for old messages');
        score -= 15;
      }

      // Check for old viewing requests
      const oldViewingRequests = await ViewingRequest.countDocuments({
        createdAt: { $lt: threeYearsAgo },
        tenant_name: { $ne: '[ANONYMIZED]' }
      });

      if (oldViewingRequests > 0) {
        issues.push(`${oldViewingRequests} viewing requests older than 3 years not anonymized`);
        recommendations.push('Run data anonymization for old viewing requests');
        score -= 10;
      }

    } catch (error) {
      issues.push('Error checking data retention: ' + error.message);
      score -= 30;
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Check processing logs compliance
   */
  static async checkProcessingLogs() {
    const issues = [];
    const recommendations = [];
    let score = 100;

    try {
      // Check if logging is active (recent logs exist)
      const recentLogs = await DataProcessingLog.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (recentLogs === 0) {
        issues.push('No data processing logs found in the last 24 hours');
        recommendations.push('Verify GDPR logging middleware is active');
        score -= 40;
      }

      // Check for logs without proper legal basis
      const logsWithoutBasis = await DataProcessingLog.countDocuments({
        $or: [
          { legalBasis: { $exists: false } },
          { legalBasis: '' }
        ]
      });

      if (logsWithoutBasis > 0) {
        issues.push(`${logsWithoutBasis} processing logs without legal basis`);
        recommendations.push('Ensure all processing activities have documented legal basis');
        score -= 20;
      }

      // Check log retention (should not keep logs for more than 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const oldLogs = await DataProcessingLog.countDocuments({
        createdAt: { $lt: oneYearAgo }
      });

      if (oldLogs > 0) {
        issues.push(`${oldLogs} processing logs older than 1 year should be cleaned up`);
        recommendations.push('Run log cleanup to remove old processing logs');
        score -= 10;
      }

    } catch (error) {
      issues.push('Error checking processing logs: ' + error.message);
      score -= 30;
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Check breach response compliance
   */
  static async checkBreachResponse() {
    const issues = [];
    const recommendations = [];
    let score = 100;

    try {
      // Check for unreported breaches (discovered more than 72 hours ago)
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

      const unreportedBreaches = await DataBreach.countDocuments({
        discoveredAt: { $lt: seventyTwoHoursAgo },
        reportedToAuthority: false,
        severity: { $in: ['medium', 'high', 'critical'] }
      });

      if (unreportedBreaches > 0) {
        issues.push(`${unreportedBreaches} breaches not reported to authority within 72 hours`);
        recommendations.push('Immediately report outstanding breaches to data protection authority');
        score -= 50;
      }

      // Check for breaches requiring individual notification
      const unnotifiedHighRiskBreaches = await DataBreach.countDocuments({
        'riskAssessment.overallRisk': 'high',
        'affectedUsers.notified': false
      });

      if (unnotifiedHighRiskBreaches > 0) {
        issues.push(`${unnotifiedHighRiskBreaches} high-risk breaches without individual notifications`);
        recommendations.push('Send breach notifications to affected individuals');
        score -= 30;
      }

      // Check for unresolved breaches older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const unresolvedBreaches = await DataBreach.countDocuments({
        discoveredAt: { $lt: thirtyDaysAgo },
        status: { $in: ['discovered', 'investigating', 'contained'] }
      });

      if (unresolvedBreaches > 0) {
        issues.push(`${unresolvedBreaches} breaches unresolved for over 30 days`);
        recommendations.push('Review and resolve outstanding breach investigations');
        score -= 20;
      }

    } catch (error) {
      issues.push('Error checking breach response: ' + error.message);
      score -= 30;
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Check DPIA compliance
   */
  static async checkDPIACompliance() {
    const issues = [];
    const recommendations = [];
    let score = 100;

    try {
      // Check for DPIAs requiring review
      const overdueReviews = await DPIA.countDocuments({
        'reviewSchedule.nextReview': { $lt: new Date() },
        status: 'approved'
      });

      if (overdueReviews > 0) {
        issues.push(`${overdueReviews} DPIAs have overdue reviews`);
        recommendations.push('Schedule DPIA reviews for overdue assessments');
        score -= 20;
      }

      // Check for high-risk processing without DPIA
      const highRiskActivities = await DataProcessingLog.distinct('dataType', {
        legalBasis: 'legitimate_interests',
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      });

      const existingDPIAs = await DPIA.distinct('processingActivity.name');
      const missingDPIAs = highRiskActivities.filter(activity => 
        !existingDPIAs.some(dpia => dpia.toLowerCase().includes(activity.toLowerCase()))
      );

      if (missingDPIAs.length > 0) {
        issues.push(`High-risk processing activities without DPIA: ${missingDPIAs.join(', ')}`);
        recommendations.push('Conduct DPIAs for high-risk processing activities');
        score -= 30;
      }

      // Check for draft DPIAs not approved within 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const staleDrafts = await DPIA.countDocuments({
        status: 'draft',
        createdAt: { $lt: thirtyDaysAgo }
      });

      if (staleDrafts > 0) {
        issues.push(`${staleDrafts} DPIA drafts pending approval for over 30 days`);
        recommendations.push('Review and approve pending DPIA drafts');
        score -= 15;
      }

    } catch (error) {
      issues.push('Error checking DPIA compliance: ' + error.message);
      score -= 30;
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Check user rights response compliance
   */
  static async checkUserRightsResponse() {
    const issues = [];
    const recommendations = [];
    let score = 100;

    try {
      const GdprRequest = require('../models/GdprRequest');

      // Check for overdue GDPR requests (more than 30 days)
      const overdueRequests = await GdprRequest.countDocuments({
        expiresAt: { $lt: new Date() },
        status: { $in: ['pending', 'in_progress'] }
      });

      if (overdueRequests > 0) {
        issues.push(`${overdueRequests} GDPR requests are overdue (>30 days)`);
        recommendations.push('Immediately process overdue GDPR requests');
        score -= 40;
      }

      // Check for requests nearing deadline (25-30 days old)
      const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const nearDeadlineRequests = await GdprRequest.countDocuments({
        expiresAt: { $lt: fiveDaysFromNow },
        status: { $in: ['pending', 'in_progress'] }
      });

      if (nearDeadlineRequests > 0) {
        issues.push(`${nearDeadlineRequests} GDPR requests nearing deadline`);
        recommendations.push('Prioritize processing of requests nearing deadline');
        score -= 15;
      }

      // Check average response time
      const completedRequests = await GdprRequest.find({
        status: 'completed',
        processedAt: { $exists: true },
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      });

      if (completedRequests.length > 0) {
        const avgResponseTime = completedRequests.reduce((sum, req) => {
          return sum + (req.processedAt - req.createdAt);
        }, 0) / completedRequests.length;

        const avgDays = avgResponseTime / (24 * 60 * 60 * 1000);

        if (avgDays > 20) {
          issues.push(`Average GDPR response time is ${Math.round(avgDays)} days`);
          recommendations.push('Improve GDPR request processing efficiency');
          score -= 10;
        }
      }

    } catch (error) {
      issues.push('Error checking user rights response: ' + error.message);
      score -= 30;
    }

    return { score: Math.max(0, score), issues, recommendations };
  }

  /**
   * Generate compliance report
   */
  static async generateDetailedReport() {
    const complianceCheck = await this.runComplianceCheck();
    
    const report = {
      ...complianceCheck,
      summary: {
        totalIssues: complianceCheck.issues.length,
        criticalIssues: complianceCheck.issues.filter(issue => 
          issue.includes('overdue') || issue.includes('unreported') || issue.includes('72 hours')
        ).length,
        complianceLevel: this.getComplianceLevel(complianceCheck.overallScore),
        nextActions: complianceCheck.recommendations.slice(0, 5) // Top 5 recommendations
      },
      recommendations: {
        immediate: complianceCheck.recommendations.filter(rec => 
          rec.includes('Immediately') || rec.includes('urgent')
        ),
        shortTerm: complianceCheck.recommendations.filter(rec => 
          rec.includes('Review') || rec.includes('Schedule')
        ),
        longTerm: complianceCheck.recommendations.filter(rec => 
          rec.includes('Consider') || rec.includes('Improve')
        )
      }
    };

    return report;
  }

  static getComplianceLevel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Acceptable';
    if (score >= 60) return 'Needs Improvement';
    return 'Critical';
  }
}

module.exports = PrivacyComplianceScanner;
