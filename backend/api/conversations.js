const express = require('express');
const router = express.Router();

// Example conversation data (replace with database logic if needed)
const conversations = [
  { id: '1', name: 'Landlord 1' },
  { id: '2', name: 'Landlord 2' },
];

// GET /api/conversations: Fetch all conversations
router.get('/', (req, res) => {
  res.status(200).json(conversations); // Fixed typo: conversaxtions -> conversations
});

module.exports = router;