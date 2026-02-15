const express = require('express');
const router = express.Router();
const { FeedbackService } = require('../services/GdprService');
const auth = require('../middleware/auth');

// POST /api/feedback
router.post('/', async (req, res) => {
  const { feedback, rating, category, email } = req.body;
  
  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }
  
  try {
    const feedbackData = {
      comment: feedback,
      rating: rating || null,
      category: category || 'general',
      email: email || null,
      user_id: req.user ? req.user.id : null
    };
    
    const result = await FeedbackService.create(feedbackData);
    res.json({ success: true, feedback: result });
  } catch (err) {
    console.error('Feedback creation error:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// GET /api/feedback (view all feedback, admin only)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  try {
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      category: req.query.category,
      resolved: req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined
    };
    
    const feedback = await FeedbackService.list(options);
    res.json(feedback);
  } catch (err) {
    console.error('Feedback retrieval error:', err);
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

// GET /api/feedback/download (download feedback log as file, admin only)
router.get('/download', async (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    const log = await FeedbackService.getAll();
    res.setHeader('Content-Disposition', 'attachment; filename=feedback-log.json');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(log, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Failed to download feedback' });
  }
});

// DELETE /api/feedback (clear all feedback, admin only)
router.delete('/', async (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    await Feedback.deleteMany({});
    res.json({ success: true, cleared: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear feedback' });
  }
});

module.exports = router;
