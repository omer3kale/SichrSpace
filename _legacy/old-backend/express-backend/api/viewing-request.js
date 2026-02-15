const express = require('express');
const router = express.Router();
const ViewingRequestService = require('../services/ViewingRequestService');
const EmailService = require('../services/emailService');

// Initialize email service
const emailService = new EmailService();

// POST /api/viewing-request
router.post('/viewing-request', async (req, res, next) => {
  try {
    // Generate test UUIDs for apartment_id and user IDs if not provided or not UUID format
    const apartmentId = req.body.apartment_id && req.body.apartment_id.length > 10 ? 
      req.body.apartment_id : '550e8400-e29b-41d4-a716-446655440010';
    
    const requesterId = req.body.requester_id && req.body.requester_id.length > 10 ? 
      req.body.requester_id : '550e8400-e29b-41d4-a716-446655440000';
      
    const landlordId = req.body.landlord_id && req.body.landlord_id.length > 10 ? 
      req.body.landlord_id : '550e8400-e29b-41d4-a716-446655440001';

    // Create viewing request data structure for Supabase
    const requestData = {
      apartment_id: apartmentId,
      requester_id: requesterId,
      landlord_id: landlordId,
      requested_date: req.body.requested_date,
      alternative_date_1: req.body.alternative_date_1,
      alternative_date_2: req.body.alternative_date_2,
      message: req.body.message,
      phone: req.body.phone,
      email: req.body.tenant_email,
      booking_fee: req.body.booking_fee || 10.00
    };

    const viewingRequest = await ViewingRequestService.create(requestData);

    // Prepare user data for email
    const userData = {
      firstName: req.body.tenant_name ? req.body.tenant_name.split(' ')[0] : 'there',
      apartmentAddress: req.body.apartment_address || 'Details being processed',
      requestId: viewingRequest.id
    };

    // Send Email #1: Request Confirmation
    const emailResult = await emailService.sendRequestConfirmation(
      req.body.tenant_email,
      userData
    );

    if (emailResult.success) {
      console.log(`✅ Request confirmation email sent to ${req.body.tenant_email}`);
      
      // Note: Email tracking can be added to the database if needed
      // Update viewing request with email sent status if required
    } else {
      console.error(`❌ Failed to send request confirmation email: ${emailResult.error}`);
    }

    res.status(201).json({ 
      success: true, 
      viewingRequest,
      emailSent: emailResult.success
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;