const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'changeme';

// POST /api/feedback
router.post('/', async (req, res) => {
  const { feedback, session } = req.body;
  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required.' });
  }
  try {
    await Feedback.create({ feedback, session });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// GET /api/feedback (view all feedback, admin only)
router.get('/', async (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    const log = await Feedback.find().sort({ time: 1 });
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

// GET /api/feedback/download (download feedback log as file, admin only)
router.get('/download', async (req, res) => {
  if (req.query.token !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
  try {
    const log = await Feedback.find().sort({ time: 1 });
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
