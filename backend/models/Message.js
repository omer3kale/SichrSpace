const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  // Conversation threading
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  
  // Message sender
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  
  // Message type
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'automated'],
    default: 'text'
  },
  
  // File attachments
  attachments: [{
    fileName: String,
    originalName: String,
    fileSize: Number,
    mimeType: String,
    fileUrl: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Message status
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  
  // Read receipts
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reply to another message (threading)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  // Message reactions (future feature)
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Moderation
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: Date,
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // System/automated message data
  systemData: {
    action: String, // 'viewing_scheduled', 'application_received', etc.
    metadata: mongoose.Schema.Types.Mixed
  },
  
  // GDPR compliance
  isAnonymized: {
    type: Boolean,
    default: false
  },
  
  // Legacy fields for backward compatibility
  name: {
    type: String,  
    maxlength: 64
  },
  email: {
    type: String,
    maxlength: 128  
  },
  subject: {
    type: String,
    maxlength: 128
  },
  isRead: {
    type: Boolean,
    default: false
  },
  adminReply: {
    type: String,
    maxlength: 2000
  },
  repliedAt: Date,
  
  // Timestamps
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
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });
MessageSchema.index({ 'readBy.user': 1 });
MessageSchema.index({ type: 1 });
MessageSchema.index({ isDeleted: 1, createdAt: -1 });

// Update the updatedAt field before saving
MessageSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Methods
MessageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
  }
  return this;
};

MessageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  // Add new reaction
  this.reactions.push({ user: userId, emoji, reactedAt: new Date() });
  return this;
};

MessageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this;
};

MessageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  this.content = '[Message deleted]';
  return this;
};

MessageSchema.methods.anonymize = function() {
  this.isAnonymized = true;
  this.content = '[Message anonymized for GDPR compliance]';
  this.sender = null;
  this.name = null;
  this.email = null;
  return this;
};

// Static methods
MessageSchema.statics.getConversationMessages = function(conversationId, options = {}) {
  const query = {
    conversationId,
    isDeleted: false
  };
  
  return this.find(query)
    .populate('sender', 'name email profilePicture userType')
    .populate('replyTo', 'content sender createdAt')
    .sort({ createdAt: options.sortOrder === 'desc' ? -1 : 1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

MessageSchema.statics.getUnreadCount = function(conversationId, userId) {
  return this.countDocuments({
    conversationId,
    isDeleted: false,
    sender: { $ne: userId },
    'readBy.user': { $ne: userId }
  });
};

MessageSchema.statics.markConversationAsRead = function(conversationId, userId) {
  return this.updateMany(
    {
      conversationId,
      sender: { $ne: userId },
      'readBy.user': { $ne: userId },
      isDeleted: false
    },
    {
      $push: {
        readBy: {
          user: userId,
          readAt: new Date()
        }
      }
    }
  );
};

// Prevent OverwriteModelError in tests and hot reloads
module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);