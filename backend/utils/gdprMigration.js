const mongoose = require('mongoose');
const User = require('../models/User');
const GdprService = require('./gdprService');
require('dotenv').config();

/**
 * Migration script to update existing users with default GDPR consent
 * Run this once to ensure all existing users have proper consent records
 */

async function migrateExistingUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB for GDPR migration');

    // Find all users without consent records
    const users = await User.find({});
    console.log(`Found ${users.length} users to process`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        // Check if user already has consent record
        const existingConsent = await GdprService.getUserConsent(user._id);
        
        if (existingConsent) {
          console.log(`User ${user.username} already has consent record, skipping`);
          skippedCount++;
          continue;
        }

        // Create default consent for existing users (implied consent for necessary functions)
        const defaultConsent = {
          necessary: { given: true, timestamp: user.createdAt || new Date() },
          functional: { given: false, timestamp: user.createdAt || new Date() },
          analytics: { given: false, timestamp: user.createdAt || new Date() },
          marketing: { given: false, timestamp: user.createdAt || new Date() }
        };

        await GdprService.recordConsent({
          userId: user._id,
          email: user.email,
          ipAddress: '127.0.0.1', // Default IP for migration
          userAgent: 'GDPR Migration Script',
          consentTypes: defaultConsent,
          privacyPolicyVersion: '1.0',
          termsVersion: '1.0',
          consentMethod: 'implicit'
        });

        console.log(`Created consent record for user ${user.username}`);
        migratedCount++;

      } catch (error) {
        console.error(`Error processing user ${user.username}:`, error);
      }
    }

    console.log(`\nMigration completed:`);
    console.log(`- Users migrated: ${migratedCount}`);
    console.log(`- Users skipped: ${skippedCount}`);
    console.log(`- Total users: ${users.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Function to anonymize old data that has exceeded retention periods
 */
async function anonymizeExpiredData() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Starting data anonymization process...');

    const ViewingRequest = require('../models/ViewingRequest');
    const Message = require('../models/Message');

    // Anonymize viewing requests older than 3 years
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

    const oldViewingRequests = await ViewingRequest.updateMany(
      { 
        createdAt: { $lt: threeYearsAgo },
        tenant_name: { $ne: '[ANONYMIZED]' }
      },
      {
        tenant_name: '[ANONYMIZED]',
        tenant_email: '[ANONYMIZED]',
        tenant_phone: '[ANONYMIZED]',
        message: '[ANONYMIZED]'
      }
    );

    console.log(`Anonymized ${oldViewingRequests.modifiedCount} old viewing requests`);

    // Anonymize old messages (keep for 5 years, then anonymize)
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const oldMessages = await Message.updateMany(
      { 
        createdAt: { $lt: fiveYearsAgo },
        name: { $ne: '[ANONYMIZED]' }
      },
      {
        name: '[ANONYMIZED]',
        email: '[ANONYMIZED]',
        content: '[ANONYMIZED - Message content removed due to data retention policy]'
      }
    );

    console.log(`Anonymized ${oldMessages.modifiedCount} old messages`);

    // Run the general cleanup function
    await GdprService.cleanupExpiredData();

    console.log('Data anonymization completed successfully');

  } catch (error) {
    console.error('Data anonymization failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Function to generate a GDPR compliance report
 */
async function generateComplianceReport() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const report = await GdprService.getComplianceReport();
    
    console.log('\n=== GDPR COMPLIANCE REPORT ===');
    console.log(`Generated: ${report.timestamp}`);
    console.log(`Active Users: ${report.active_users}`);
    console.log(`Active Consents: ${report.active_consents}`);
    console.log(`Pending GDPR Requests: ${report.pending_gdpr_requests}`);
    console.log(`Overdue Requests: ${report.overdue_requests}`);
    
    console.log('\nData Processing Activities (Last 30 days):');
    report.data_processing_activities.forEach(activity => {
      console.log(`- ${activity._id}: ${activity.count}`);
    });

    if (report.consent_breakdown.length > 0) {
      const breakdown = report.consent_breakdown[0];
      console.log('\nConsent Breakdown:');
      console.log(`- Necessary: ${breakdown.necessary || 0}`);
      console.log(`- Analytics: ${breakdown.analytics || 0}`);
      console.log(`- Marketing: ${breakdown.marketing || 0}`);
      console.log(`- Functional: ${breakdown.functional || 0}`);
    }

    console.log('\n==============================');

  } catch (error) {
    console.error('Report generation failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    console.log('Starting GDPR migration for existing users...');
    migrateExistingUsers();
    break;
  case 'anonymize':
    console.log('Starting data anonymization...');
    anonymizeExpiredData();
    break;
  case 'report':
    console.log('Generating compliance report...');
    generateComplianceReport();
    break;
  default:
    console.log('GDPR Management Script');
    console.log('Usage: node utils/gdprMigration.js [command]');
    console.log('Commands:');
    console.log('  migrate   - Create consent records for existing users');
    console.log('  anonymize - Anonymize data that has exceeded retention periods');
    console.log('  report    - Generate GDPR compliance report');
    break;
}

module.exports = {
  migrateExistingUsers,
  anonymizeExpiredData,
  generateComplianceReport
};
