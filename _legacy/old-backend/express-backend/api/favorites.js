const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL || 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (() => {
    console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
    process.exit(1);
})();
const supabase = createClient(supabaseUrl, supabaseKey);

// Simple auth middleware for this endpoint
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Malformed token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fNcgmCwu7lIbCYoxUy3zbDNyWFpfjmJrUtLLAhPq+2mDNyN/p//FnxhSmTgvnp2Fh51+eJJKAIkqJnFu/xf93Q==');
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      console.error('User lookup error:', error);
      console.error('Looking for user ID:', decoded.id);
      return res.status(401).json({ error: 'User not found', details: error?.message, userId: decoded.id });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET user favorites
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select(`
        id,
        apartment_id,
        created_at,
        apartments:apartment_id (
          id,
          title,
          description,
          price,
          images,
          size,
          rooms,
          location
        )
      `)
      .eq('user_id', req.user.id);

    if (error) {
      console.error('Error fetching favorites:', error);
      return res.status(500).json({ error: 'Failed to fetch favorites', details: error.message });
    }

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Favorites fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST toggle favorite (add/remove)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { apartmentId } = req.body;
    
    if (!apartmentId) {
      return res.status(400).json({ error: 'Apartment ID is required' });
    }

    // Check if already favorite
    const { data: existing } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('apartment_id', apartmentId)
      .single();

    let result;
    let action;

    if (existing) {
      // Remove from favorites
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', req.user.id)
        .eq('apartment_id', apartmentId);

      if (error) throw error;
      
      result = { removed: true };
      action = 'removed';
    } else {
      // Add to favorites
      const { data, error } = await supabase
        .from('user_favorites')
        .insert([{
          user_id: req.user.id,
          apartment_id: apartmentId
        }])
        .select();

      if (error) throw error;
      
      result = data[0];
      action = 'added';
    }

    res.json({
      success: true,
      action,
      data: result
    });
  } catch (error) {
    console.error('Favorites toggle error:', error);
    res.status(500).json({ error: 'Failed to update favorites', details: error.message });
  }
});

// DELETE specific favorite
router.delete('/:apartmentId', authenticateToken, async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('apartment_id', apartmentId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Favorite removed successfully'
    });
  } catch (error) {
    console.error('Favorites delete error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

module.exports = router;
