const express = require('express');
const router = express.Router();
const ViewingRequest = require('../models/ViewingRequest');
const EmailService = require('../services/emailService');

// Initialize email service
const emailService = new EmailService();

/**
 * Google Forms Integration for SichrPlace Viewing Requests
 * Handles form submissions from Google Forms via webhooks
 * 
 * Integration Flow:
 * 1. User fills Google Form
 * 2. Google Sheets receives response
 * 3. Google Apps Script sends webhook to this endpoint
 * 4. System processes request and sends Email #1
 * 5. Data is stored in MongoDB
 */

/**
 * Webhook endpoint for Google Forms submissions
 * This receives data from Google Apps Script when a form is submitted
 */
router.post('/google-forms-webhook', async (req, res) => {
    try {
        console.log('📋 Google Forms webhook received:', req.body);

        // Extract form data (adjust field names based on your Google Form)
        const formData = {
            timestamp: req.body.timestamp || new Date(),
            tenant_name: req.body.name || req.body.tenant_name,
            tenant_email: req.body.email || req.body.tenant_email,
            tenant_phone: req.body.phone || req.body.tenant_phone,
            apartmentId: req.body.apartment_id || req.body.apartmentId || 'google-form-' + Date.now(),
            apartment_address: req.body.apartment_address || req.body.address,
            requested_date: new Date(req.body.requested_date || req.body.viewing_date),
            preferred_time_range: req.body.preferred_time || req.body.time_preference,
            message: req.body.message || req.body.additional_info,
            special_requirements: req.body.special_requirements || req.body.requirements,
            additional_guests: parseInt(req.body.additional_guests || req.body.guests || 0),
            budget_range: req.body.budget_range,
            move_in_date: req.body.move_in_date ? new Date(req.body.move_in_date) : null,
            // Google Forms specific fields
            google_form_id: req.body.form_id,
            google_response_id: req.body.response_id,
            source: 'google_forms'
        };

        // Validate required fields
        const requiredFields = ['tenant_name', 'tenant_email', 'tenant_phone'];
        const missingFields = requiredFields.filter(field => !formData[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                missingFields: missingFields
            });
        }

        // Create viewing request in database
        const viewingRequest = new ViewingRequest({
            ...formData,
            status: 'submitted',
            createdAt: new Date()
        });

        await viewingRequest.save();
        console.log('✅ Viewing request created from Google Form:', viewingRequest._id);

        // Prepare user data for email
        const userData = {
            firstName: formData.tenant_name.split(' ')[0],
            apartmentAddress: formData.apartment_address || 'Details being processed',
            requestId: viewingRequest._id,
            viewingDate: formData.requested_date,
            timePreference: formData.preferred_time_range,
            source: 'Google Forms'
        };

        // Send Email #1: Request Confirmation
        const emailResult = await emailService.sendRequestConfirmation(
            formData.tenant_email,
            userData
        );

        if (emailResult.success) {
            console.log(`✅ Confirmation email sent to ${formData.tenant_email}`);
            
            // Update viewing request with email sent status
            await ViewingRequest.findByIdAndUpdate(viewingRequest._id, {
                'emailSent.requestConfirmation': {
                    sentAt: new Date(),
                    messageId: emailResult.messageId
                }
            });
        } else {
            console.error(`❌ Failed to send confirmation email: ${emailResult.error}`);
        }

        // Send success response to Google Apps Script
        res.json({
            success: true,
            message: 'Viewing request processed successfully',
            requestId: viewingRequest._id,
            emailSent: emailResult.success,
            data: {
                name: userData.firstName,
                email: formData.tenant_email,
                apartment: userData.apartmentAddress,
                status: 'confirmed'
            }
        });

        // Optional: Send notification to admin
        await sendAdminNotification(formData, viewingRequest._id);

    } catch (error) {
        console.error('❌ Google Forms webhook error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

/**
 * Get all viewing requests from Google Forms
 */
router.get('/google-forms-requests', async (req, res) => {
    try {
        const requests = await ViewingRequest.find({ source: 'google_forms' })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            success: true,
            count: requests.length,
            requests: requests
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get specific Google Forms request by ID
 */
router.get('/google-forms-requests/:id', async (req, res) => {
    try {
        const request = await ViewingRequest.findById(req.params.id);
        
        if (!request) {
            return res.status(404).json({
                success: false,
                error: 'Request not found'
            });
        }

        res.json({
            success: true,
            request: request
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Update request status (for admin panel)
 */
router.put('/google-forms-requests/:id/status', async (req, res) => {
    try {
        const { status, notes } = req.body;
        
        await ViewingRequest.findByIdAndUpdate(req.params.id, {
            status: status,
            adminNotes: notes,
            updatedAt: new Date()
        });

        res.json({
            success: true,
            message: 'Status updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Test endpoint for Google Forms integration
 */
router.post('/test-google-forms', async (req, res) => {
    try {
        // Simulate Google Forms submission
        const testData = {
            timestamp: new Date().toISOString(),
            tenant_name: 'John Doe',
            tenant_email: 'sichrplace@gmail.com',
            tenant_phone: '+49 123 456789',
            apartment_address: 'Musterstraße 123, 50667 Köln',
            apartmentId: 'test-apartment-123',
            requested_date: '2025-08-15',
            preferred_time_range: '14:00-16:00',
            additional_info: 'I am very interested in this apartment and would like to schedule a viewing.',
            additional_guests: '1',
            budget_range: '€800-1200',
            google_form_id: 'test_form_123',
            google_response_id: 'test_response_456'
        };

        // Call the webhook endpoint with test data
        req.body = testData;
        return router.handle({ ...req, method: 'POST', url: '/google-forms-webhook' }, res);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Send admin notification for new Google Forms submission
 */
async function sendAdminNotification(formData, requestId) {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'sichrplace@gmail.com';
        
        const subject = `🏠 New Viewing Request via Google Forms - ${formData.tenant_name}`;
        const html = `
            <h2>New Viewing Request Received</h2>
            <p><strong>Source:</strong> Google Forms</p>
            <p><strong>Name:</strong> ${formData.tenant_name}</p>
            <p><strong>Email:</strong> ${formData.tenant_email}</p>
            <p><strong>Phone:</strong> ${formData.tenant_phone}</p>
            <p><strong>Apartment:</strong> ${formData.apartment_address || 'Not specified'}</p>
            <p><strong>Preferred Date:</strong> ${formData.requested_date}</p>
            <p><strong>Time:</strong> ${formData.preferred_time_range || 'Flexible'}</p>
            <p><strong>Message:</strong> ${formData.message || 'None'}</p>
            <p><strong>Request ID:</strong> ${requestId}</p>
            
            <p><a href="http://localhost:3000/admin/requests/${requestId}">View Request Details</a></p>
        `;

        await emailService.sendEmail(
            adminEmail,
            subject,
            html,
            'admin_notification'
        );
    } catch (error) {
        console.error('Failed to send admin notification:', error);
    }
}

module.exports = router;
