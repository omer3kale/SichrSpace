const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL || 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Auth middleware
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
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// GET /api/recently-viewed - Get user's recently viewed apartments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from('recently_viewed')
      .select(`
        id,
        apartment_id,
        viewed_at,
        apartments:apartment_id (
          id,
          title,
          description,
          price,
          size,
          rooms,
          bathrooms,
          location,
          images,
          available_from
        )
      `)
      .eq('user_id', req.user.id)
      .order('viewed_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recently viewed apartments'
    });
  }
});

// POST /api/recently-viewed - Track apartment view
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { apartmentId } = req.body;

    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        error: 'Apartment ID is required'
      });
    }

    // Check if apartment exists
    const { data: apartment, error: apartmentError } = await supabase
      .from('apartments')
      .select('id')
      .eq('id', apartmentId)
      .single();

    if (apartmentError || !apartment) {
      return res.status(404).json({
        success: false,
        error: 'Apartment not found'
      });
    }

    // Check if user has already viewed this apartment recently
    const { data: existingView } = await supabase
      .from('recently_viewed')
      .select('id, viewed_at')
      .eq('user_id', req.user.id)
      .eq('apartment_id', apartmentId)
      .single();

    if (existingView) {
      // Update the viewed_at timestamp
      const { data, error } = await supabase
        .from('recently_viewed')
        .update({ viewed_at: new Date() })
        .eq('id', existingView.id)
        .select();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'View timestamp updated',
        data: data[0]
      });
    }

    // Create new view record
    const { data, error } = await supabase
      .from('recently_viewed')
      .insert([{
        user_id: req.user.id,
        apartment_id: apartmentId,
        viewed_at: new Date()
      }])
      .select();

    if (error) throw error;

    // Cleanup: Keep only the latest 50 views per user
    const { data: allViews } = await supabase
      .from('recently_viewed')
      .select('id')
      .eq('user_id', req.user.id)
      .order('viewed_at', { ascending: false });

    if (allViews && allViews.length > 50) {
      const viewsToDelete = allViews.slice(50).map(v => v.id);
      await supabase
        .from('recently_viewed')
        .delete()
        .in('id', viewsToDelete);
    }

    res.json({
      success: true,
      message: 'Apartment view tracked successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('Track apartment view error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track apartment view'
    });
  }
});

// DELETE /api/recently-viewed/:apartmentId - Remove specific apartment from recently viewed
router.delete('/:apartmentId', authenticateToken, async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const { error } = await supabase
      .from('recently_viewed')
      .delete()
      .eq('user_id', req.user.id)
      .eq('apartment_id', apartmentId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Apartment removed from recently viewed'
    });

  } catch (error) {
    console.error('Remove from recently viewed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove from recently viewed'
    });
  }
});

// DELETE /api/recently-viewed - Clear all recently viewed apartments
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('recently_viewed')
      .delete()
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'All recently viewed apartments cleared'
    });

  } catch (error) {
    console.error('Clear recently viewed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear recently viewed apartments'
    });
  }
});

module.exports = router;
