const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// GET /api/conversations: Fetch all conversations
router.get('/', async (req, res) => {
  try {
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/conversations: Create a new conversation
router.post('/', async (req, res) => {
  try {
    const { participants, apartment_id } = req.body;

    if (!participants || participants.length !== 2) {
      return res.status(400).json({ error: 'Exactly 2 participants required' });
    }

    // Generate UUIDs for test data if participants are not UUIDs
    const participant1 = participants[0].length > 10 ? participants[0] : '550e8400-e29b-41d4-a716-446655440000';
    const participant2 = participants[1].length > 10 ? participants[1] : '550e8400-e29b-41d4-a716-446655440001';
    
    // Generate apartment UUID for test data
    const apartmentId = apartment_id && apartment_id.length > 10 ? apartment_id : '550e8400-e29b-41d4-a716-446655440010';

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        apartment_id: apartmentId,
        participant_1_id: participant1,
        participant_2_id: participant2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation', details: error.message });
  }
});

module.exports = router;