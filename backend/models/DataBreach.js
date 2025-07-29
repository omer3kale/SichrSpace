const mongoose = require('mongoose');

const DataBreachSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'BREACH-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  breachType: {
    type: String,
    enum: [
      'unauthorized_access',
      'data_loss',
      'accidental_disclosure',
      'system_compromise',
      'malware_attack',
      'insider_threat',
      'third_party_breach'
    ],
    required: true
  },
  affectedDataTypes: [{
    type: String,
    enum: [
      'personal_identifiers',
      'contact_information',
      'financial_data',
      'authentication_credentials',
      'location_data',
      'communication_records',
      'profile_data',
      'transaction_history'
    ]
  }],
  affectedUserCount: {
    type: Number,
    required: true,
    min: 0
  },
  affectedUsers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    dataTypes: [String],
    notified: { type: Boolean, default: false },
    notifiedAt: Date
  }],
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  technicalDetails: {
    type: String,
    maxlength: 5000
  },
  discoveredAt: {
    type: Date,
    required: true
  },
  reportedToAuthority: {
    type: Boolean,
    default: false
  },
  reportedToAuthorityAt: {
    type: Date
  },
  authorityReference: {
    type: String // Reference number from DPA
  },
  containmentActions: [{
    action: String,
    performedAt: Date,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'completed', 'failed'] }
  }],
  riskAssessment: {
    likelihoodOfHarm: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    severityOfHarm: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    overallRisk: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    riskFactors: [String]
  },
  notificationRequired: {
    authority: { type: Boolean, default: true }, // 72 hours to DPA
    individuals: { type: Boolean, default: false } // If high risk
  },
  status: {
    type: String,
    enum: ['discovered', 'investigating', 'contained', 'resolved', 'closed'],
    default: 'discovered'
  },
  investigationNotes: [{
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
  }],
  lessonsLearned: {
    type: String,
    maxlength: 2000
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});

// Indexes for efficient querying
DataBreachSchema.index({ severity: 1, status: 1 });
DataBreachSchema.index({ discoveredAt: -1 });
DataBreachSchema.index({ 'affectedUsers.userId': 1 });

module.exports = mongoose.models.DataBreach || mongoose.model('DataBreach', DataBreachSchema);
