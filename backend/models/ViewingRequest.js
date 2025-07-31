const mongoose = require('mongoose');

const ViewingRequestSchema = new mongoose.Schema({
  apartmentId: {
    type: String,
    required: true
  },
  requested_date: {
    type: Date,
    required: true
  },
  tenant_name: {
    type: String,
    required: true
  },
  tenant_email: {
    type: String,
    required: true
  },
  tenant_phone: {
    type: String,
    required: true
  },
  message: {
    type: String,
    maxlength: 1000
  },
  preferred_time_range: {
    type: String
  },
  additional_guests: {
    type: Number
  },
  special_requirements: {
    type: String
  },
  // Email tracking and status
  status: {
    type: String,
    enum: ['submitted', 'confirmed', 'payment_pending', 'payment_received', 'viewing_scheduled', 'completed', 'cancelled'],
    default: 'submitted'
  },
  viewerAssigned: {
    type: String
  },
  paymentLink: {
    type: String
  },
  videoLink: {
    type: String
  },
  resultsDelivered: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  // Email tracking
  emailSent: {
    requestConfirmation: {
      sentAt: Date,
      messageId: String
    },
    viewingConfirmation: {
      sentAt: Date,
      messageId: String
    },
    viewingResults: {
      sentAt: Date,
      messageId: String
    }
  },
  // PayPal payment tracking
  paymentDetails: {
    paypalOrderId: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    amount: {
      type: Number,
      default: 25.00
    },
    currency: {
      type: String,
      default: 'EUR'
    },
    paidAt: Date
  },
  // Google Forms integration fields
  google_form_id: String,
  google_response_id: String,
  source: {
    type: String,
    enum: ['web_form', 'google_forms', 'admin', 'api'],
    default: 'web_form'
  },
  budget_range: String,
  move_in_date: Date,
  adminNotes: String,
  updatedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent OverwriteModelError in tests
module.exports = mongoose.models.ViewingRequest || mongoose.model('ViewingRequest', ViewingRequestSchema);