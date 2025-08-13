const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const supabaseUrl = process.env.SUPABASE_URL || 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna3Vtd3RpYmtuZnJoeWlpY29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwMTc4NiwiZXhwIjoyMDY5ODc3Nzg2fQ.5piAC3CPud7oRvA1Rtypn60dfz5J1ydqoG2oKj-Su3M';
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
      .select('id, email, role, username')
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

// Validation rules
const validateReview = [
  body('apartmentId').notEmpty().withMessage('Apartment ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),
  body('comment').isLength({ min: 10, max: 1000 }).withMessage('Comment must be between 10 and 1000 characters')
];

// GET /api/reviews - Get reviews (with filters)
router.get('/', async (req, res) => {
  try {
    const { 
      apartmentId, 
      userId, 
      rating, 
      limit = 10, 
      offset = 0,
      status = 'approved' 
    } = req.query;

    let query = supabase
      .from('reviews')
      .select(`
        id,
        apartment_id,
        user_id,
        rating,
        title,
        comment,
        status,
        created_at,
        updated_at,
        users:user_id (
          id,
          username,
          first_name,
          last_name,
          profile_picture
        ),
        apartments:apartment_id (
          id,
          title,
          location
        )
      `)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters
    if (apartmentId) {
      query = query.eq('apartment_id', apartmentId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (rating) {
      query = query.eq('rating', parseInt(rating));
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: data ? data.length : 0
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reviews'
    });
  }
});

// GET /api/reviews/apartment/:apartmentId/stats - Get apartment review statistics
router.get('/apartment/:apartmentId/stats', async (req, res) => {
  try {
    const { apartmentId } = req.params;

    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('apartment_id', apartmentId)
      .eq('status', 'approved');

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        stats: {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      });
    }

    const totalReviews = data.length;
    const averageRating = data.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    res.json({
      success: true,
      stats: {
        totalReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingDistribution
      }
    });

  } catch (error) {
    console.error('Get review stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review statistics'
    });
  }
});

// POST /api/reviews - Create new review
router.post('/', authenticateToken, validateReview, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { apartmentId, rating, title, comment, viewingRequestId } = req.body;

    // Check if user has already reviewed this apartment
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('apartment_id', apartmentId)
      .eq('user_id', req.user.id)
      .single();

    if (existingReview) {
      return res.status(409).json({
        success: false,
        error: 'You have already reviewed this apartment'
      });
    }

    // Verify apartment exists
    const { data: apartment, error: apartmentError } = await supabase
      .from('apartments')
      .select('id, title')
      .eq('id', apartmentId)
      .single();

    if (apartmentError || !apartment) {
      return res.status(404).json({
        success: false,
        error: 'Apartment not found'
      });
    }

    // Create review
    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        apartment_id: apartmentId,
        user_id: req.user.id,
        rating,
        title,
        comment,
        viewing_request_id: viewingRequestId,
        status: 'pending' // Reviews require moderation
      }])
      .select(`
        id,
        apartment_id,
        rating,
        title,
        comment,
        status,
        created_at,
        users:user_id (username, first_name, last_name)
      `);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Review submitted successfully and is pending moderation',
      data: data[0]
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create review'
    });
  }
});

// PUT /api/reviews/:id - Update review (user can only update their own)
router.put('/:id', authenticateToken, validateReview, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { rating, title, comment } = req.body;

    const { data, error } = await supabase
      .from('reviews')
      .update({
        rating,
        title,
        comment,
        status: 'pending', // Reset to pending after edit
        updated_at: new Date()
      })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Review not found or you are not authorized to update it'
      });
    }

    res.json({
      success: true,
      message: 'Review updated successfully and is pending moderation',
      data: data[0]
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update review'
    });
  }
});

// DELETE /api/reviews/:id - Delete review (user can only delete their own)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete review'
    });
  }
});

// ADMIN ROUTES

// PUT /api/reviews/:id/moderate - Moderate review (admin only)
router.put('/:id/moderate', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { id } = req.params;
    const { status, moderationNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be approved or rejected'
      });
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({
        status,
        moderation_note: moderationNote,
        moderated_at: new Date(),
        moderated_by: req.user.id
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      message: `Review ${status} successfully`,
      data: data[0]
    });

  } catch (error) {
    console.error('Moderate review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to moderate review'
    });
  }
});

// GET /api/reviews/pending - Get pending reviews for moderation (admin only)
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        apartment_id,
        user_id,
        rating,
        title,
        comment,
        created_at,
        users:user_id (username, email, first_name, last_name),
        apartments:apartment_id (title, location)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending reviews'
    });
  }
});

module.exports = router;
