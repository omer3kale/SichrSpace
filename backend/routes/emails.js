const express = require('express');
const router = express.Router();
const EmailService = require('../services/emailService');
const ViewingRequestService = require('../services/ViewingRequestService');
const UserService = require('../services/UserService');

// Initialize email service
const emailService = new EmailService();

/**
 * Email Activity Logging Function
 * Logs email activities for tracking and audit purposes
 */
async function logEmailActivity(userEmail, emailType, messageId, requestId = null) {
    try {
        // Create log entry
        const logEntry = {
            userEmail,
            emailType,
            messageId,
            requestId,
            sentAt: new Date(),
            status: 'sent'
        };

        // You can implement database logging here
        // For now, we'll use console logging
        console.log('📧 Email Activity Logged:', logEntry);
        
        // TODO: Implement database logging
        // await EmailActivity.create(logEntry);
        
        return { success: true, logEntry };
    } catch (error) {
        console.error('Failed to log email activity:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Email Flow Integration for SichrPlace Viewing Requests
 * Handles all three email stages of the viewing process
 */

/**
 * General email sending endpoint
 */
router.post('/send', async (req, res) => {
    try {
        const { to, subject, message, type = 'general' } = req.body;

        if (!to || !subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: to, subject, message'
            });
        }

        // Use the appropriate email method based on type
        let result;
        switch (type) {
            case 'viewing_confirmation':
                result = await emailService.sendRequestConfirmation(to, { message });
                break;
            case 'viewing_ready':
                result = await emailService.sendViewingReadyEmail(to, { message });
                break;
            case 'payment_confirmation':
                result = await emailService.sendPaymentConfirmation(to, { message });
                break;
            default:
                result = await emailService.sendTestEmail(to, subject, message);
        }

        if (result.success) {
            res.json({
                success: true,
                message: 'Email sent successfully',
                messageId: result.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to send email'
            });
        }
    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({
            success: false,
            error: 'Email service error'
        });
    }
});

/**
 * Get available email templates
 */
router.get('/templates', async (req, res) => {
    try {
        const templates = {
            viewing_confirmation: {
                name: 'Viewing Request Confirmation',
                description: 'Sent when user submits a viewing request'
            },
            viewing_ready: {
                name: 'Viewing Ready Notification',
                description: 'Sent when landlord approves viewing request'
            },
            payment_confirmation: {
                name: 'Payment Confirmation',
                description: 'Sent when payment is successfully processed'
            },
            general: {
                name: 'General Email',
                description: 'Generic email template'
            }
        };

        res.json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Templates retrieval error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve templates'
        });
    }
});

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
 * Stage 4: Send payment confirmation email
 * Triggered when PayPal payment is successfully processed
 */
router.post('/send-payment-confirmation', async (req, res) => {
    try {
        const { userEmail, userData, paymentData } = req.body;

        if (!userEmail || !paymentData) {
            return res.status(400).json({
                success: false,
                error: 'User email and payment data are required'
            });
        }

        // Send Email #4: Payment Confirmation
        const emailResult = await emailService.sendPaymentConfirmation(
            userEmail, 
            userData, 
            paymentData
        );

        if (emailResult.success) {
            // Update viewing request status to payment confirmed
            try {
                if (userData.requestId) {
                    await ViewingRequest.findByIdAndUpdate(userData.requestId, {
                        status: 'payment_confirmed',
                        paymentConfirmed: true,
                        transactionId: paymentData.transactionId,
                        emailSent: {
                            paymentConfirmation: {
                                sentAt: new Date(),
                                messageId: emailResult.messageId
                            }
                        }
                    });
                }

                await logEmailActivity(userEmail, 'payment_confirmation', emailResult.messageId, userData.requestId);
            } catch (updateError) {
                console.warn('Failed to update viewing request:', updateError.message);
            }

            res.json({
                success: true,
                message: 'Payment confirmation email sent successfully',
                messageId: emailResult.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send payment confirmation email',
                details: emailResult.error
            });
        }

    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Stage 5: Send viewing reminder email
 * Triggered 24 hours before scheduled viewing
 */
router.post('/send-viewing-reminder', async (req, res) => {
    try {
        const { userEmail, userData, viewingData } = req.body;

        if (!userEmail || !viewingData) {
            return res.status(400).json({
                success: false,
                error: 'User email and viewing data are required'
            });
        }

        // Send Email #5: Viewing Reminder
        const emailResult = await emailService.sendViewingReminder(
            userEmail, 
            userData, 
            viewingData
        );

        if (emailResult.success) {
            // Update viewing request with reminder sent
            try {
                if (userData.requestId) {
                    await ViewingRequest.findByIdAndUpdate(userData.requestId, {
                        reminderSent: true,
                        emailSent: {
                            viewingReminder: {
                                sentAt: new Date(),
                                messageId: emailResult.messageId
                            }
                        }
                    });
                }

                await logEmailActivity(userEmail, 'viewing_reminder', emailResult.messageId, userData.requestId);
            } catch (updateError) {
                console.warn('Failed to update viewing request:', updateError.message);
            }

            res.json({
                success: true,
                message: 'Viewing reminder email sent successfully',
                messageId: emailResult.messageId
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send viewing reminder email',
                details: emailResult.error
            });
        }

    } catch (error) {
        console.error('Error sending viewing reminder email:', error);
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

module.exports = router;
