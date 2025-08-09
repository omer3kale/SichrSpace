const express = require('express');
const router = express.Router();
const { MessageService, ConversationService } = require('../services/MessageService');
const { sendMail } = require('../utils/mailer');
const authenticateToken = require('../middleware/auth');

/**
 * POST /api/send-message
 * Send a message/contact form or conversation message
 */
router.post('/', async (req, res) => {
    try {
        const { conversationId, content, messageType = 'text', to, subject, message: emailMessage } = req.body;

        // Check if this is a simple email request (for contact forms)
        if (to && subject && emailMessage) {
            const emailResult = await sendMail({
                to,
                subject,
                html: `<p>${emailMessage}</p>`,
                text: emailMessage
            });

            return res.status(200).json({
                success: true,
                message: 'Email sent successfully',
                data: { messageId: emailResult.messageId }
            });
        }

        // Otherwise, handle as conversation message
        // Validate required fields
        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required'
            });
        }

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                message: 'Conversation ID is required'
            });
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Create new message
        const message = await MessageService.create({
            conversation_id: conversationId,
            sender_id: req.user.id,
            content,
            message_type: messageType
        });

        // Update conversation last message time
        await ConversationService.updateLastMessage(conversationId);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: message
        });

    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
});

module.exports = router;
