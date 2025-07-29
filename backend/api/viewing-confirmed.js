const express = require('express');
const router = express.Router();
const ViewingRequest = require('../models/ViewingRequest');

// POST /api/viewing-confirmed
// Mark a viewing request as confirmed
router.post('/', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Missing requestId' });
    }
    const viewing = await ViewingRequest.findById(requestId);
    if (!viewing) {
      return res.status(404).json({ success: false, error: 'Viewing request not found' });
    }
    viewing.status = 'accepted';
    await viewing.save();
    res.json({ success: true, message: 'Viewing request confirmed', viewing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;