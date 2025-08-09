const mongoose = require('mongoose');

const DPIASchema = new mongoose.Schema({
  assessmentId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return 'DPIA-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    }
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  processingActivity: {
    name: String,
    purpose: String,
    legalBasis: {
      type: String,
      enum: ['consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests']
    },
    dataTypes: [String],
    dataSubjects: [String], // children, employees, customers, etc.
    recipients: [String],
    transfers: {
      isInternational: Boolean,
      countries: [String],
      safeguards: String
    },
    retentionPeriod: String,
    technicalMeasures: [String],
    organizationalMeasures: [String]
  },
  riskAssessment: {
    identifiedRisks: [{
      riskDescription: String,
      likelihood: { type: String, enum: ['low', 'medium', 'high'] },
      severity: { type: String, enum: ['low', 'medium', 'high'] },
      overallRisk: { type: String, enum: ['low', 'medium', 'high'] },
      mitigationMeasures: [String],
      residualRisk: { type: String, enum: ['low', 'medium', 'high'] }
    }],
    overallRiskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true
    }
  },
  stakeholderConsultation: {
    dataSubjectsConsulted: Boolean,
    dpoConsulted: Boolean,
    securityTeamConsulted: Boolean,
    legalTeamConsulted: Boolean,
    consultationNotes: String,
    consultationDate: Date
  },
  safeguards: [{
    measure: String,
    implementation: String,
    effectiveness: { type: String, enum: ['low', 'medium', 'high'] },
    implementedAt: Date
  }],
  reviewSchedule: {
    nextReview: Date,
    reviewFrequency: { 
      type: String, 
      enum: ['monthly', 'quarterly', 'biannually', 'annually'],
      default: 'annually'
    },
    triggeredReviews: [{
      trigger: String,
      scheduledFor: Date,
      completed: Boolean,
      completedAt: Date
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'under_review', 'approved', 'requires_revision', 'archived'],
    default: 'draft'
  },
  authorityConsultation: {
    required: Boolean,
    requested: Boolean,
    requestedAt: Date,
    authorityResponse: String,
    receivedAt: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewedBy: [{
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    status: { type: String, enum: ['approved', 'rejected', 'requires_changes'] },
    comments: String
  }],
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Indexes
DPIASchema.index({ status: 1, createdAt: -1 });
DPIASchema.index({ 'reviewSchedule.nextReview': 1 });
DPIASchema.index({ createdBy: 1 });

// Pre-save middleware to update lastUpdated
DPIASchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Method to check if DPIA needs review
DPIASchema.methods.needsReview = function() {
  return this.reviewSchedule.nextReview && this.reviewSchedule.nextReview <= new Date();
};

// Method to schedule next review
DPIASchema.methods.scheduleNextReview = function() {
  const now = new Date();
  switch(this.reviewSchedule.reviewFrequency) {
    case 'monthly':
      this.reviewSchedule.nextReview = new Date(now.setMonth(now.getMonth() + 1));
      break;
    case 'quarterly':
      this.reviewSchedule.nextReview = new Date(now.setMonth(now.getMonth() + 3));
      break;
    case 'biannually':
      this.reviewSchedule.nextReview = new Date(now.setMonth(now.getMonth() + 6));
      break;
    case 'annually':
      this.reviewSchedule.nextReview = new Date(now.setFullYear(now.getFullYear() + 1));
      break;
  }
  return this.save();
};

module.exports = mongoose.models.DPIA || mongoose.model('DPIA', DPIASchema);
