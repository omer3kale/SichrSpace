const express = require('express');
const router = express.Router();
const Message = require('../backend/models/Message');
const authenticateToken = require('../backend/middleware/auth');

/**
 * POST /api/send-message
 * Send a message/contact form
 */
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, content } = req.body;

        // Validate required fields
        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required'
            });
        }

        // Create new message
        const message = new Message({
            sender: req.user ? req.user._id : null, // Optional sender if authenticated
            name: name || (req.user ? req.user.name : null),
            email: email || (req.user ? req.user.email : null),
            subject: subject || 'New message',
            content,
            isRead: false
        });

        await message.save();

        res.json({
            success: true,
            message: 'Message sent successfully',
            messageId: message._id
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
