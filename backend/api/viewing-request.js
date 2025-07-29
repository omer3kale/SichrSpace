const express = require('express');
const router = express.Router();
const ViewingRequest = require('../models/ViewingRequest');
const { sendMail } = require('../utils/mailer');
const emailTemplates = require('../utils/emailTemplates');

// POST /api/viewing-request
router.post('/', async (req, res, next) => {
  try {
    const viewingRequest = new ViewingRequest(req.body);
    await viewingRequest.save();

    // Extract first name for the email
    const firstName = req.body.tenant_name ? req.body.tenant_name.split(' ')[0] : 'there';
    const { subject, html } = emailTemplates.confirmationRequestReceived({ firstName });

    // Send confirmation email to the tenant
    await sendMail({
      to: req.body.tenant_email,
      subject,
      html
    });

    res.status(201).json({ success: true, viewingRequest });
  } catch (err) {
    next(err);
  }
});

module.exports = router;