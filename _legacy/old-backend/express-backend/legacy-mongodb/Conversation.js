const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['applicant', 'landlord', 'admin'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Related to apartment/offer if applicable
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: false
  },
  
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: false
  },
  
  // Conversation metadata
  subject: {
    type: String,
    maxlength: 200,
    required: false
  },
  
  type: {
    type: String,
    enum: ['apartment_inquiry', 'offer_inquiry', 'general', 'support'],
    default: 'general'
  },
  
  status: {
    type: String,
    enum: ['active', 'archived', 'closed'],
    default: 'active'
  },
  
  // Last message info for quick access
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  
  // Message count
  messageCount: {
    type: Number,
    default: 0
  },
  
  // Privacy and moderation
  isReported: {
    type: Boolean,
    default: false
  },
  
  reportReason: String,
  reportedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // GDPR compliance
  dataRetentionDate: {
    type: Date,
    // Auto-delete conversations after 2 years of inactivity
    default: () => new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance
ConversationSchema.index({ 'participants.user': 1, status: 1, updatedAt: -1 });
ConversationSchema.index({ apartmentId: 1 });
ConversationSchema.index({ offerId: 1 });
ConversationSchema.index({ type: 1, status: 1 });
ConversationSchema.index({ dataRetentionDate: 1 }); // For automated cleanup

// Update the updatedAt field before saving
ConversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for unread message count per user
ConversationSchema.virtual('unreadCount').get(function() {
  // This would be calculated based on lastReadAt vs message timestamps
  // Implementation depends on your specific needs
  return 0;
});

// Methods
ConversationSchema.methods.addParticipant = function(userId, role) {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  if (!existingParticipant) {
    this.participants.push({ user: userId, role });
  }
  return this;
};

ConversationSchema.methods.removeParticipant = function(userId) {
  this.participants = this.participants.filter(p => p.user.toString() !== userId.toString());
  return this;
};

ConversationSchema.methods.markAsRead = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastReadAt = new Date();
  }
  return this;
};

ConversationSchema.methods.updateLastMessage = function(messageContent, senderId) {
  this.lastMessage = {
    content: messageContent.substring(0, 100) + (messageContent.length > 100 ? '...' : ''),
    sender: senderId,
    timestamp: new Date()
  };
  this.messageCount += 1;
  this.updatedAt = new Date();
  return this;
};

// Static methods
ConversationSchema.statics.findByParticipant = function(userId, options = {}) {
  const query = {
    'participants.user': userId,
    status: options.status || { $ne: 'closed' }
  };
  
  return this.find(query)
    .populate('participants.user', 'name email profilePicture')
    .populate('apartmentId', 'title address images')
    .populate('offerId', 'title description price')
    .sort({ updatedAt: -1 })
    .limit(options.limit || 50);
};

ConversationSchema.statics.findBetweenUsers = function(user1Id, user2Id, apartmentId = null) {
  const query = {
    'participants.user': { $all: [user1Id, user2Id] },
    status: { $ne: 'closed' }
  };
  
  if (apartmentId) {
    query.apartmentId = apartmentId;
  }
  
  return this.findOne(query)
    .populate('participants.user', 'name email profilePicture')
    .populate('apartmentId', 'title address images');
};

// Prevent OverwriteModelError in tests and hot reloads
module.exports = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
