const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 32
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 64
  },
  password: {
    type: String,
    required: true // Store hashed password
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  blocked: {
    type: Boolean,
    default: false
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLoginAt: {
    type: Date
  },
  gdprConsent: {
    type: Boolean,
    default: false
  },
  dataProcessingConsent: {
    type: Date // When user gave consent for data processing
  },
  privacyPolicyAccepted: {
    version: {
      type: String,
      default: '1.0'
    },
    acceptedAt: {
      type: Date
    }
  }
});

// Helper method to check if account is locked
UserSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// GDPR-related methods
UserSchema.methods.hasValidConsent = function () {
  return this.gdprConsent && this.dataProcessingConsent;
};

UserSchema.methods.acceptPrivacyPolicy = function (version = '1.0') {
  this.privacyPolicyAccepted = {
    version: version,
    acceptedAt: new Date()
  };
  this.gdprConsent = true;
  this.dataProcessingConsent = new Date();
  return this.save();
};

UserSchema.methods.getRetentionPeriod = function () {
  // Users data is kept until account deletion
  // Inactive accounts after 5 years may be subject to deletion
  return {
    type: 'until_deletion',
    inactiveThreshold: 5 * 365 * 24 * 60 * 60 * 1000 // 5 years in milliseconds
  };
};

module.exports = mongoose.model('User', UserSchema);