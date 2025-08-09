const express = require('express');
const router = express.Router();
const ViewingRequestService = require('../services/ViewingRequestService');

// POST /api/viewing-ready
// Mark a viewing request as ready (e.g., scheduled and ready for viewing)
router.post('/', async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) {
      return res.status(400).json({ success: false, error: 'Missing requestId' });
    }
    
    const viewing = await ViewingRequestService.findById(requestId);
    if (!viewing) {
      return res.status(404).json({ success: false, error: 'Viewing request not found' });
    }
    
    const updatedViewing = await ViewingRequestService.update(requestId, { status: 'approved' });
    
    res.json({ 
      success: true, 
      message: 'Viewing request marked as ready', 
      viewing: updatedViewing 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;