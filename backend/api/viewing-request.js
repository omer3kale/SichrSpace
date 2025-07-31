const express = require('express');
const router = express.Router();
const ViewingRequest = require('../models/ViewingRequest');
const EmailService = require('../services/emailService');

// Initialize email service
const emailService = new EmailService();

// POST /api/viewing-request
router.post('/', async (req, res, next) => {
  try {
    const viewingRequest = new ViewingRequest(req.body);
    await viewingRequest.save();

    // Prepare user data for email
    const userData = {
      firstName: req.body.tenant_name ? req.body.tenant_name.split(' ')[0] : 'there',
      apartmentAddress: req.body.apartment_address || 'Details being processed',
      requestId: viewingRequest._id
    };

    // Send Email #1: Request Confirmation
    const emailResult = await emailService.sendRequestConfirmation(
      req.body.tenant_email,
      userData
    );

    if (emailResult.success) {
      console.log(`✅ Request confirmation email sent to ${req.body.tenant_email}`);
      
      // Update viewing request with email sent status
      await ViewingRequest.findByIdAndUpdate(viewingRequest._id, {
        'emailSent.requestConfirmation': {
          sentAt: new Date(),
          messageId: emailResult.messageId
        }
      });
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