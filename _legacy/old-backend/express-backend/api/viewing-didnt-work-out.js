const express = require('express');
const router = express.Router();
const { sendViewingDidntWorkOutEmail } = require('../utils/mailer');

// POST /api/viewing-didnt-work-out
router.post('/', async (req, res) => {
  const { email, firstName } = req.body;

  if (!email || !firstName) {
    return res.status(400).json({ success: false, message: 'Email and firstName are required.' });
  }

  try {
    await sendViewingDidntWorkOutEmail({
      to: email,
      firstName
    });
    res.status(200).json({ success: true, message: 'Didn’t work out email sent.' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, message: 'Failed to send didn’t work out email.' });
  }
});

module.exports = router;