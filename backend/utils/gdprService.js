const User = require('../models/User');
const Apartment = require('../models/Apartment');
const Message = require('../models/Message');
const ViewingRequest = require('../models/ViewingRequest');
const Feedback = require('../models/Feedback');
const GdprRequest = require('../models/GdprRequest');
const Consent = require('../models/Consent');
const DataProcessingLog = require('../models/DataProcessingLog');
const mongoose = require('mongoose');

class GdprService {
  /**
   * Log data processing activity for GDPR compliance
   */
  static async logDataProcessing(params) {
    try {
      const log = new DataProcessingLog({
        userId: params.userId,
        email: params.email,
        action: params.action,
        dataType: params.dataType,
        legalBasis: params.legalBasis,
        purpose: params.purpose,
        dataCategories: params.dataCategories || [],
        retentionPeriod: params.retentionPeriod,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        processingDetails: params.processingDetails || {}
      });
      
      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging data processing:', error);
      throw error;
    }
  }

  /**
   * Record user consent
   */
  static async recordConsent(params) {
    try {
      // Deactivate previous consent records
      await Consent.updateMany(
        { userId: params.userId, isActive: true },
        { isActive: false, withdrawnAt: new Date() }
      );

      const consent = new Consent({
        userId: params.userId,
        email: params.email,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        consentTypes: params.consentTypes,
        privacyPolicyVersion: params.privacyPolicyVersion || '1.0',
        termsVersion: params.termsVersion || '1.0',
        consentMethod: params.consentMethod || 'explicit'
      });

      await consent.save();

      // Log the consent action
      await this.logDataProcessing({
        userId: params.userId,
        email: params.email,
        action: 'consent_given',
        dataType: 'consent_record',
        legalBasis: 'consent',
        purpose: 'Record user consent for data processing',
        dataCategories: ['consent_data'],
        retentionPeriod: 'Until withdrawn or account deletion',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        processingDetails: { consentTypes: params.consentTypes }
      });

      return consent;
    } catch (error) {
      console.error('Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Create a GDPR request
   */
  static async createGdprRequest(params) {
    try {
      const request = new GdprRequest({
        userId: params.userId,
        email: params.email,
        requestType: params.requestType,
        description: params.description,
        requestData: params.requestData || {}
      });

      await request.save();

      // Log the GDPR request
      await this.logDataProcessing({
        userId: params.userId,
        email: params.email,
        action: 'data_accessed',
        dataType: 'user_profile',
        legalBasis: 'legal_obligation',
        purpose: `GDPR ${params.requestType} request initiated`,
        dataCategories: ['identity_data'],
        retentionPeriod: '30 days (processing period)',
        processingDetails: { requestType: params.requestType }
      });

      return request;
    } catch (error) {
      console.error('Error creating GDPR request:', error);
      throw error;
    }
  }

  /**
   * Export all user data (Right to Data Portability)
   */
  static async exportUserData(userId) {
    try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        throw new Error('User not found');
      }

      // Collect all user data
      const userData = {
        personal_information: {
          username: user.username,
          email: user.email,
          role: user.role,
          created_at: user.createdAt,
          account_status: user.blocked ? 'blocked' : 'active'
        },
        apartments: await Apartment.find({ owner: userId }),
        viewing_requests: await ViewingRequest.find({ 
          $or: [
            { tenant_email: user.email },
            { apartmentId: { $in: await Apartment.find({ owner: userId }).distinct('_id') } }
          ]
        }),
        messages: await Message.find({
          $or: [
            { sender: userId },
            { email: user.email }
          ]
        }),
        feedback: await Feedback.find({ /* Add criteria if feedback is linked to users */ }),
        consent_records: await Consent.find({ userId }),
        gdpr_requests: await GdprRequest.find({ userId }),
        data_processing_logs: await DataProcessingLog.find({ userId }).limit(100) // Last 100 logs
      };

      // Log the data export
      await this.logDataProcessing({
        userId,
        email: user.email,
        action: 'data_exported',
        dataType: 'user_profile',
        legalBasis: 'legal_obligation',
        purpose: 'GDPR data portability request - full user data export',
        dataCategories: ['identity_data', 'contact_data', 'transaction_data', 'communication_data'],
        retentionPeriod: 'Immediate deletion after delivery',
        processingDetails: { exportSize: JSON.stringify(userData).length }
      });

      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Delete all user data (Right to Erasure)
   */
  static async deleteUserData(userId, requestId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const session = await mongoose.startSession();
      await session.withTransaction(async () => {
        // Delete or anonymize user data
        await User.findByIdAndDelete(userId, { session });
        
        // Delete user's apartments
        await Apartment.deleteMany({ owner: userId }, { session });
        
        // Anonymize viewing requests
        await ViewingRequest.updateMany(
          { tenant_email: user.email },
          { 
            tenant_name: '[DELETED]',
            tenant_email: '[DELETED]',
            tenant_phone: '[DELETED]',
            message: '[DELETED]'
          },
          { session }
        );

        // Anonymize messages
        await Message.updateMany(
          { $or: [{ sender: userId }, { email: user.email }] },
          { 
            name: '[DELETED]',
            email: '[DELETED]',
            content: '[DELETED]'
          },
          { session }
        );

        // Deactivate consent records
        await Consent.updateMany(
          { userId },
          { isActive: false, withdrawnAt: new Date() },
          { session }
        );

        // Update GDPR request status
        if (requestId) {
          await GdprRequest.findByIdAndUpdate(
            requestId,
            { 
              status: 'completed',
              processedAt: new Date(),
              responseData: { deleted: true, deletedAt: new Date() }
            },
            { session }
          );
        }

        // Log the deletion
        await this.logDataProcessing({
          userId,
          email: user.email,
          action: 'data_deleted',
          dataType: 'user_profile',
          legalBasis: 'legal_obligation',
          purpose: 'GDPR right to erasure - complete user data deletion',
          dataCategories: ['identity_data', 'contact_data', 'transaction_data', 'communication_data'],
          retentionPeriod: 'Immediate deletion',
          processingDetails: { requestId, deletionMethod: 'hard_delete_and_anonymization' }
        });
      });

      await session.endSession();
      return { success: true, message: 'User data successfully deleted' };
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Get user's consent status
   */
  static async getUserConsent(userId) {
    try {
      const consent = await Consent.findOne({ userId, isActive: true });
      return consent;
    } catch (error) {
      console.error('Error getting user consent:', error);
      throw error;
    }
  }

  /**
   * Check data retention and clean up expired data
   */
  static async cleanupExpiredData() {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());

      // Clean up old data processing logs (keep for 1 year)
      await DataProcessingLog.deleteMany({ createdAt: { $lt: oneYearAgo } });

      // Clean up old completed GDPR requests (keep for 3 years)
      await GdprRequest.deleteMany({ 
        status: 'completed',
        processedAt: { $lt: threeYearsAgo }
      });

      // Clean up old inactive consent records (keep for 3 years)
      await Consent.deleteMany({
        isActive: false,
        withdrawnAt: { $lt: threeYearsAgo }
      });

      console.log('Data cleanup completed successfully');
    } catch (error) {
      console.error('Error during data cleanup:', error);
      throw error;
    }
  }

  /**
   * Get GDPR compliance report
   */
  static async getComplianceReport() {
    try {
      const report = {
        timestamp: new Date(),
        active_users: await User.countDocuments({ blocked: false }),
        active_consents: await Consent.countDocuments({ isActive: true }),
        pending_gdpr_requests: await GdprRequest.countDocuments({ status: 'pending' }),
        overdue_requests: await GdprRequest.countDocuments({ 
          status: { $in: ['pending', 'in_progress'] },
          expiresAt: { $lt: new Date() }
        }),
        data_processing_activities: await DataProcessingLog.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: '$action',
              count: { $sum: 1 }
            }
          }
        ]),
        consent_breakdown: await Consent.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              necessary: { $sum: { $cond: ['$consentTypes.necessary.given', 1, 0] } },
              analytics: { $sum: { $cond: ['$consentTypes.analytics.given', 1, 0] } },
              marketing: { $sum: { $cond: ['$consentTypes.marketing.given', 1, 0] } },
              functional: { $sum: { $cond: ['$consentTypes.functional.given', 1, 0] } }
            }
          }
        ])
      };

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw error;
    }
  }
}

module.exports = GdprService;
