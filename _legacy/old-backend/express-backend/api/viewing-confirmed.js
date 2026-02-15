const express = require('express');
const router = express.Router();
const ViewingRequestService = require('../services/ViewingRequestService');

// POST /api/viewing-confirmed
// Mark a viewing request as confirmed
router.post('/', async (req, res) => {
  try {
    const { requestId, confirmedDate } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Missing requestId' });
    }
    
    const viewing = await ViewingRequestService.findById(requestId);
    if (!viewing) {
      return res.status(404).json({ success: false, error: 'Viewing request not found' });
    }
    
    const updatedViewing = await ViewingRequestService.approve(requestId, confirmedDate);
    
    res.json({ 
      success: true, 
      message: 'Viewing request confirmed', 
      viewing: updatedViewing 
    });
  } catch (err) {
    console.error('Viewing confirmation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;