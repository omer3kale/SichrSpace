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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent OverwriteModelError in tests
module.exports = mongoose.models.ViewingRequest || mongoose.model('ViewingRequest', ViewingRequestSchema);