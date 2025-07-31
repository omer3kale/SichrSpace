const express = require('express');
const router = express.Router();
const EmailService = require('../services/emailService');
const ViewingRequest = require('../models/ViewingRequest');
const User = require('../models/User');

// Initialize email service
const emailService = new EmailService();

/**
 * Email Flow Integration for SichrPlace Viewing Requests
 * Handles all three email stages of the viewing process
 */

/**
 * Stage 1: Send request confirmation email
 * Triggered when user submits a viewing request
 */
router.post('/send-request-confirmation', async (req, res) => {
    try {
        const { userEmail, userData } = req.body;

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                error: 'User email is required'
            });
        }

        // Send Email #1: Request Confirmation
        const emailResult = await emailService.sendRequestConfirmation(userEmail, userData);

        if (emailResult.success) {
            // Log email sent in database
            try {
                await logEmailActivity(userEmail, 'request_confirmation', emailResult.messageId, userData.requestId);
            } catch (logError) {
                console.warn('Failed to log email activity:', logError.message);
            }

            res.json({
                success: true,
                message: 'Request confirmation email sent successfully',
                messageId: emailResult.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send confirmation email',
                details: emailResult.error
            });
        }

    } catch (error) {
        console.error('Error sending request confirmation email:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Stage 2: Send viewing confirmation with payment link
 * Triggered when viewer is assigned and payment is required
 */
router.post('/send-viewing-confirmation', async (req, res) => {
    try {
        const { userEmail, userData, viewerData, paymentData } = req.body;

        if (!userEmail || !paymentData) {
            return res.status(400).json({
                success: false,
                error: 'User email and payment data are required'
            });
        }

        // Send Email #2: Viewing Confirmation with Payment
        const emailResult = await emailService.sendViewingConfirmation(
            userEmail, 
            userData, 
            viewerData, 
            paymentData
        );

        if (emailResult.success) {
            // Update viewing request status
            try {
                if (userData.requestId) {
                    await ViewingRequest.findByIdAndUpdate(userData.requestId, {
                        status: 'payment_pending',
                        viewerAssigned: viewerData.name,
                        paymentLink: paymentData.paymentLink,
                        emailSent: {
                            viewingConfirmation: {
                                sentAt: new Date(),
                                messageId: emailResult.messageId
                            }
                        }
                    });
                }

                await logEmailActivity(userEmail, 'viewing_confirmation', emailResult.messageId, userData.requestId);
            } catch (updateError) {
                console.warn('Failed to update viewing request:', updateError.message);
            }

            res.json({
                success: true,
                message: 'Viewing confirmation email sent successfully',
                messageId: emailResult.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send viewing confirmation email',
                details: emailResult.error
            });
        }

    } catch (error) {
        console.error('Error sending viewing confirmation email:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Stage 3: Send viewing results with video/feedback
 * Triggered when viewing is completed and results are ready
 */
router.post('/send-viewing-results', async (req, res) => {
    try {
        const { userEmail, userData, resultsData } = req.body;

        if (!userEmail || !resultsData) {
            return res.status(400).json({
                success: false,
                error: 'User email and results data are required'
            });
        }

        // Send Email #3: Viewing Results
        const emailResult = await emailService.sendViewingResults(
            userEmail, 
            userData, 
            resultsData
        );

        if (emailResult.success) {
            // Update viewing request status to completed
            try {
                if (userData.requestId) {
                    await ViewingRequest.findByIdAndUpdate(userData.requestId, {
                        status: 'completed',
                        resultsDelivered: true,
                        videoLink: resultsData.videoLink,
                        completedAt: new Date(),
                        'emailSent.viewingResults': {
                            sentAt: new Date(),
                            messageId: emailResult.messageId
                        }
                    });
                }

                await logEmailActivity(userEmail, 'viewing_results', emailResult.messageId, userData.requestId);
            } catch (updateError) {
                console.warn('Failed to update viewing request:', updateError.message);
            }

            res.json({
                success: true,
                message: 'Viewing results email sent successfully',
                messageId: emailResult.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send viewing results email',
                details: emailResult.error
            });
        }

    } catch (error) {
        console.error('Error sending viewing results email:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Test email configuration endpoint
 */
router.post('/test-email-config', async (req, res) => {
    try {
        const testResult = await emailService.testEmailConfiguration();
        
        res.json({
            success: testResult.success,
            message: testResult.success ? 'Email configuration is working' : 'Email configuration failed',
            details: testResult.error || 'Test email sent successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to test email configuration',
            details: error.message
        });
    }
});

/**
 * Get email status for a viewing request
 */
router.get('/email-status/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        
        const viewingRequest = await ViewingRequest.findById(requestId);
        if (!viewingRequest) {
            return res.status(404).json({
                success: false,
                error: 'Viewing request not found'
            });
        }

        res.json({
            success: true,
            emailStatus: {
                requestConfirmation: viewingRequest.emailSent?.requestConfirmation || null,
                viewingConfirmation: viewingRequest.emailSent?.viewingConfirmation || null,
                viewingResults: viewingRequest.emailSent?.viewingResults || null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get email status',
            details: error.message
        });
    }
});

/**
 * Helper function to log email activity
 */
async function logEmailActivity(email, emailType, messageId, requestId = null) {
    try {
        // Create email log entry (you can create a separate EmailLog model if needed)
        const logEntry = {
            email: email,
            emailType: emailType,
            messageId: messageId,
            requestId: requestId,
            sentAt: new Date(),
            status: 'sent'
        };

        console.log('📧 Email Activity Logged:', logEntry);
        
        // You can save to database if you want to track email history
        // await EmailLog.create(logEntry);
        
    } catch (error) {
        console.error('Failed to log email activity:', error);
    }
}

module.exports = router;
