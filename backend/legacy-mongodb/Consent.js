const mongoose = require('mongoose');

const ConsentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  consentTypes: {
    necessary: {
      given: { type: Boolean, default: true }, // Always required
      timestamp: { type: Date, default: Date.now }
    },
    analytics: {
      given: { type: Boolean, default: false },
      timestamp: { type: Date }
    },
    marketing: {
      given: { type: Boolean, default: false },
      timestamp: { type: Date }
    },
    functional: {
      given: { type: Boolean, default: false },
      timestamp: { type: Date }
    }
  },
  privacyPolicyVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  termsVersion: {
    type: String,
    required: true,
    default: '1.0'
  },
  consentMethod: {
    type: String,
    enum: ['explicit', 'implicit', 'updated'],
    default: 'explicit'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  withdrawnAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
ConsentSchema.index({ userId: 1, isActive: 1 });
ConsentSchema.index({ email: 1, isActive: 1 });
ConsentSchema.index({ createdAt: 1 });

module.exports = mongoose.models.Consent || mongoose.model('Consent', ConsentSchema);
