const mongoose = require('mongoose');

const DataProcessingLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  email: {
    type: String,
    lowercase: true
  },
  action: {
    type: String,
    enum: [
      'data_collected',
      'data_accessed',
      'data_updated',
      'data_deleted',
      'data_exported',
      'consent_given',
      'consent_withdrawn',
      'data_shared',
      'data_anonymized'
    ],
    required: true
  },
  dataType: {
    type: String,
    enum: [
      'user_profile',
      'apartment_data',
      'viewing_request',
      'message',
      'booking_request',
      'feedback',
      'consent_record',
      'system_logs'
    ],
    required: true
  },
  legalBasis: {
    type: String,
    enum: [
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ],
    required: true
  },
  purpose: {
    type: String,
    required: true,
    maxlength: 500
  },
  dataCategories: [{
    type: String,
    enum: [
      'identity_data',
      'contact_data',
      'location_data',
      'transaction_data',
      'communication_data',
      'technical_data',
      'usage_data',
      'marketing_data'
    ]
  }],
  retentionPeriod: {
    type: String,
    required: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  processingDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying and compliance reporting
DataProcessingLogSchema.index({ userId: 1, createdAt: -1 });
DataProcessingLogSchema.index({ action: 1, createdAt: -1 });
DataProcessingLogSchema.index({ dataType: 1, createdAt: -1 });
DataProcessingLogSchema.index({ createdAt: 1 }); // For TTL and retention

module.exports = mongoose.models.DataProcessingLog || mongoose.model('DataProcessingLog', DataProcessingLogSchema);
