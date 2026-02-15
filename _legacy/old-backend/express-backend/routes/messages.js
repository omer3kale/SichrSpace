const express = require('express');
const router = express.Router();
const { MessageService, ConversationService } = require('../services/MessageService');
const UserService = require('../services/UserService');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/messages/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Allow images and PDFs
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  }
});

// GET /api/conversations - Get all conversations for the authenticated user
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const conversations = await ConversationService.findByUserId(userId, { skip, limit });

    // Get unread counts for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await MessageService.getUnreadCount(conv.id, userId);
        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    res.json({
      success: true,
      conversations: conversationsWithUnread,
      pagination: {
        page,
        limit,
        total: conversations.length
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// GET /api/conversations/:conversationId - Get a specific conversation with messages
router.get('/conversations/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    
    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    })
    .populate('participants.user', 'name email profilePicture userType')
    .populate('apartmentId', 'title address images price')
    .populate('offerId', 'title description price');
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    // Get messages
    const messages = await Message.getConversationMessages(conversationId, {
      limit,
      skip: (page - 1) * limit,
      sortOrder: 'asc'
    });
    
    // Mark messages as read
    await Message.markConversationAsRead(conversationId, userId);
    await conversation.markAsRead(userId);
    await conversation.save();
    
    res.json({
      success: true,
      conversation,
      messages,
      pagination: {
        page,
        limit,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

// POST /api/conversations - Create a new conversation
router.post('/conversations', auth, async (req, res) => {
  try {
    const { participantId, apartmentId, subject, initialMessage } = req.body;
    const userId = req.user.id;
    
    if (!participantId || !initialMessage) {
      return res.status(400).json({ 
        success: false, 
        error: 'Participant ID and initial message are required' 
      });
    }
    
    // Check if participant exists
    const participant = await UserService.findById(participantId);
    if (!participant) {
      return res.status(404).json({ success: false, error: 'Participant not found' });
    }
    
    // Find or create conversation
    let conversation;
    if (apartmentId) {
      conversation = await ConversationService.findOrCreate(apartmentId, userId, participantId);
    } else {
      // Create direct conversation without apartment
      conversation = await ConversationService.create({
        apartment_id: null,
        participant_1_id: userId,
        participant_2_id: participantId
      });
    }
    
    // Create initial message
    const message = await MessageService.create({
      conversation_id: conversation.id,
      sender_id: userId,
      content: initialMessage,
      message_type: 'text'
    });
    
    // Update conversation last message time
    await ConversationService.updateLastMessage(conversation.id);
    
    // Return conversation with populated data
    res.status(201).json({
      success: true,
      conversation,
      message
    });
    
    // Populate and return
    await conversation.populate('participants.user', 'name email profilePicture userType');
    
    res.status(201).json({
      success: true,
      conversation,
      message
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// POST /api/conversations/:conversationId/messages - Send a message in a conversation
router.post('/conversations/:conversationId/messages', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, replyTo } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }
    
    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId,
      status: 'active'
    });
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found or inactive' });
    }
    
    // Process attachments
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl: `/uploads/messages/${file.filename}`
        });
      }
    }
    
    // Create message
    const message = new Message({
      conversationId,
      sender: userId,
      content: content.trim(),
      type: attachments.length > 0 ? 'file' : 'text',
      attachments,
      replyTo: replyTo || null
    });
    
    await message.save();
    
    // Update conversation
    conversation.updateLastMessage(content, userId);
    await conversation.save();
    
    // Populate message for response
    await message.populate('sender', 'name email profilePicture userType');
    if (replyTo) {
      await message.populate('replyTo', 'content sender createdAt');
    }
    
    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// PUT /api/messages/:messageId - Edit a message
router.put('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }
    
    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: false
    });
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found or cannot be edited' });
    }
    
    // Check if message is older than 15 minutes (edit time limit)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      return res.status(400).json({ success: false, error: 'Message is too old to edit' });
    }
    
    message.content = content.trim();
    await message.save();
    
    await message.populate('sender', 'name email profilePicture userType');
    
    res.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, error: 'Failed to edit message' });
  }
});

// DELETE /api/messages/:messageId - Delete a message
router.delete('/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: false
    });
    
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    message.softDelete(userId);
    await message.save();
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Failed to delete message' });
  }
});

// POST /api/messages/:messageId/react - Add reaction to message
router.post('/messages/:messageId/react', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user.id;
    
    if (!emoji) {
      return res.status(400).json({ success: false, error: 'Emoji is required' });
    }
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    
    // Check if user is participant in the conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      'participants.user': userId
    });
    
    if (!conversation) {
      return res.status(403).json({ success: false, error: 'Not authorized to react to this message' });
    }
    
    message.addReaction(userId, emoji);
    await message.save();
    
    res.json({
      success: true,
      reactions: message.reactions
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ success: false, error: 'Failed to add reaction' });
  }
});

// PUT /api/conversations/:conversationId/archive - Archive a conversation
router.put('/conversations/:conversationId/archive', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    });
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    conversation.status = 'archived';
    await conversation.save();
    
    res.json({
      success: true,
      message: 'Conversation archived successfully'
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to archive conversation' });
  }
});

// POST /api/conversations/:conversationId/report - Report a conversation
router.post('/conversations/:conversationId/report', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Report reason is required' });
    }
    
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId
    });
    
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    
    // Check if user already reported this conversation
    const alreadyReported = conversation.reportedBy.some(
      report => report.user.toString() === userId.toString()
    );
    
    if (alreadyReported) {
      return res.status(400).json({ success: false, error: 'You have already reported this conversation' });
    }
    
    conversation.reportedBy.push({
      user: userId,
      reason,
      reportedAt: new Date()
    });
    
    conversation.isReported = true;
    await conversation.save();
    
    res.json({
      success: true,
      message: 'Conversation reported successfully'
    });
  } catch (error) {
    console.error('Error reporting conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to report conversation' });
  }
});

// GET /api/messages/search - Search messages
router.get('/messages/search', auth, async (req, res) => {
  try {
    const { query, conversationId } = req.query;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Query must be at least 2 characters' });
    }
    
    // Build search query
    const searchQuery = {
      content: { $regex: query.trim(), $options: 'i' },
      isDeleted: false
    };
    
    // If conversationId specified, search within that conversation
    if (conversationId) {
      // Verify user is participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        'participants.user': userId
      });
      
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
      
      searchQuery.conversationId = conversationId;
    } else {
      // Search across all user's conversations
      const userConversations = await Conversation.find({
        'participants.user': userId
      }).select('_id');
      
      searchQuery.conversationId = { 
        $in: userConversations.map(conv => conv._id) 
      };
    }
    
    const messages = await Message.find(searchQuery)
      .populate('sender', 'name email profilePicture')
      .populate('conversationId', 'subject type participants')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    res.json({
      success: true,
      messages,
      pagination: {
        page,
        limit,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to search messages' });
  }
});

module.exports = router;