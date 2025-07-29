const mongoose = require('mongoose');

const ConsentPurposeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  purposeId: {
    type: String,
    required: true,
    enum: [
      'marketing_emails',
      'sms_notifications',
      'push_notifications',
      'analytics_tracking',
      'personalized_recommendations',
      'third_party_sharing',
      'location_tracking',
      'behavioral_profiling',
      'advertising_targeting',
      'social_media_integration',
      'newsletter_subscription',
      'research_participation'
    ]
  },
  purposeName: {
    type: String,
    required: true
  },
  purposeDescription: {
    type: String,
    required: true
  },
  legalBasis: {
    type: String,
    enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests'],
    required: true
  },
  isOptional: {
    type: Boolean,
    default: true
  },
  consentGiven: {
    type: Boolean,
    required: true
  },
  consentMethod: {
    type: String,
    enum: ['explicit_checkbox', 'opt_in_form', 'cookie_banner', 'settings_page', 'registration_form'],
    required: true
  },
  consentTimestamp: {
    type: Date,
    required: true,
    default: Date.now
  },
  withdrawnAt: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  consentProof: {
    formData: mongoose.Schema.Types.Mixed,
    checkboxState: Boolean,
    timestamp: Date,
    sessionId: String
  },
  expiryDate: {
    type: Date // For time-limited consent
  },
  renewalRequired: {
    type: Boolean,
    default: false
  },
  renewalReminders: [{
    sentAt: Date,
    reminderType: { type: String, enum: ['email', 'push', 'in_app'] }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
});

// Compound index for efficient querying
ConsentPurposeSchema.index({ userId: 1, purposeId: 1, isActive: 1 });
ConsentPurposeSchema.index({ consentTimestamp: -1 });
ConsentPurposeSchema.index({ expiryDate: 1 });

// Method to check if consent is still valid
ConsentPurposeSchema.methods.isValidConsent = function() {
  if (!this.isActive || !this.consentGiven) return false;
  if (this.withdrawnAt) return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  return true;
};

// Method to withdraw consent
ConsentPurposeSchema.methods.withdraw = function() {
  this.consentGiven = false;
  this.withdrawnAt = new Date();
  this.lastUpdated = new Date();
  return this.save();
};

module.exports = mongoose.models.ConsentPurpose || mongoose.model('ConsentPurpose', ConsentPurposeSchema);
