const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  address: {
    type: String,
    required: true,
    maxlength: 255
  },
  city: {
    type: String,
    required: true,
    maxlength: 64
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String // URLs to images
  }],
  landlord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  availableFrom: {
    type: Date,
    required: true
  },
  availableTo: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('Offer', OfferSchema);