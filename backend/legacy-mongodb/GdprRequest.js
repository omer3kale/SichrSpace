const mongoose = require('mongoose');

const GdprRequestSchema = new mongoose.Schema({
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
  requestType: {
    type: String,
    enum: ['access', 'rectification', 'deletion', 'portability', 'restriction', 'objection'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'rejected'],
    default: 'pending'
  },
  description: {
    type: String,
    maxlength: 1000
  },
  requestData: {
    type: mongoose.Schema.Types.Mixed, // Flexible data storage for specific request details
    default: {}
  },
  responseData: {
    type: mongoose.Schema.Types.Mixed, // Store response/export data
    default: {}
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    default: function() {
      // GDPR requests should be processed within 30 days
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
GdprRequestSchema.index({ userId: 1, status: 1 });
GdprRequestSchema.index({ expiresAt: 1 });

module.exports = mongoose.models.GdprRequest || mongoose.model('GdprRequest', GdprRequestSchema);
