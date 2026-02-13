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

// GET /api/saved-searches - Get user's saved searches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Get saved searches error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch saved searches'
    });
  }
});

// POST /api/saved-searches - Create new saved search
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      searchCriteria,
      alertsEnabled = true,
      alertFrequency = 'daily'
    } = req.body;

    if (!name || !searchCriteria) {
      return res.status(400).json({
        success: false,
        error: 'Name and search criteria are required'
      });
    }

    const { data, error } = await supabase
      .from('saved_searches')
      .insert([{
        user_id: req.user.id,
        name,
        search_criteria: searchCriteria,
        alerts_enabled: alertsEnabled,
        alert_frequency: alertFrequency
      }])
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Saved search created successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('Create saved search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create saved search'
    });
  }
});

// PUT /api/saved-searches/:id - Update saved search
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      searchCriteria,
      alertsEnabled,
      alertFrequency
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (searchCriteria !== undefined) updateData.search_criteria = searchCriteria;
    if (alertsEnabled !== undefined) updateData.alerts_enabled = alertsEnabled;
    if (alertFrequency !== undefined) updateData.alert_frequency = alertFrequency;

    const { data, error } = await supabase
      .from('saved_searches')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Saved search not found'
      });
    }

    res.json({
      success: true,
      message: 'Saved search updated successfully',
      data: data[0]
    });

  } catch (error) {
    console.error('Update saved search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update saved search'
    });
  }
});

// DELETE /api/saved-searches/:id - Delete saved search
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Saved search deleted successfully'
    });

  } catch (error) {
    console.error('Delete saved search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete saved search'
    });
  }
});

// POST /api/saved-searches/:id/execute - Execute saved search
router.post('/:id/execute', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get saved search
    const { data: savedSearch, error: searchError } = await supabase
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (searchError || !savedSearch) {
      return res.status(404).json({
        success: false,
        error: 'Saved search not found'
      });
    }

    // Build query based on search criteria
    let query = supabase
      .from('apartments')
      .select(`
        id,
        title,
        description,
        price,
        size,
        rooms,
        bathrooms,
        location,
        images,
        created_at,
        move_in_date
      `);

    const criteria = savedSearch.search_criteria;

    // Apply filters
    if (criteria.minPrice) {
      query = query.gte('price', criteria.minPrice);
    }
    if (criteria.maxPrice) {
      query = query.lte('price', criteria.maxPrice);
    }
    if (criteria.minRooms) {
      query = query.gte('rooms', criteria.minRooms);
    }
    if (criteria.maxRooms) {
      query = query.lte('rooms', criteria.maxRooms);
    }
    if (criteria.location) {
      query = query.ilike('location', `%${criteria.location}%`);
    }
    if (criteria.propertyType) {
      query = query.eq('property_type', criteria.propertyType);
    }

    const { data: apartments, error: apartmentError } = await query;

    if (apartmentError) throw apartmentError;

    // Update last executed timestamp
    await supabase
      .from('saved_searches')
      .update({ last_executed: new Date() })
      .eq('id', id);

    res.json({
      success: true,
      searchName: savedSearch.name,
      resultsCount: apartments.length,
      data: apartments
    });

  } catch (error) {
    console.error('Execute saved search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute saved search'
    });
  }
});

module.exports = router;
