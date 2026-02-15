const express = require('express');
const router = express.Router();
const AdvancedSearchService = require('../services/AdvancedSearchService');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/search/advanced
 * @desc    Advanced apartment search with comprehensive filtering
 * @access  Public (enhanced features for authenticated users)
 */
router.get('/advanced', async (req, res) => {
  try {
    const searchParams = {
      query: req.query.q || req.query.query || '',
      location: req.query.location || '',
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : 0,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      minRooms: req.query.minRooms ? parseInt(req.query.minRooms) : null,
      maxRooms: req.query.maxRooms ? parseInt(req.query.maxRooms) : null,
      bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms) : null,
      bathrooms: req.query.bathrooms ? parseInt(req.query.bathrooms) : null,
      propertyType: req.query.propertyType || req.query.property_type || '',
      amenities: req.query.amenities ? req.query.amenities.split(',') : [],
      moveInDate: req.query.moveInDate || req.query.move_in_date || null,
      moveOutDate: req.query.moveOutDate || req.query.move_out_date || null,
      sortBy: req.query.sortBy || req.query.sort_by || 'created_at',
      sortOrder: req.query.sortOrder || req.query.sort_order || 'desc',
      limit: req.query.limit ? parseInt(req.query.limit) : 20,
      offset: req.query.offset ? parseInt(req.query.offset) : 0,
      userId: req.user ? req.user.id : null,
      includeUnavailable: req.query.includeUnavailable === 'true'
    };

    const results = await AdvancedSearchService.searchApartments(searchParams);

    res.json(results);

  } catch (error) {
    console.error('Advanced search API error:', error);
    res.status(500).json({
      success: false,
      error: 'Advanced search failed',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search autocomplete suggestions
 * @access  Public
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: [],
        message: 'Query must be at least 2 characters'
      });
    }

    const suggestions = await AdvancedSearchService.getSearchSuggestions(
      query, 
      parseInt(limit)
    );

    res.json(suggestions);

  } catch (error) {
    console.error('Search suggestions API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search suggestions',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/search/popular
 * @desc    Get popular search terms
 * @access  Public
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularSearches = await AdvancedSearchService.getPopularSearches(
      parseInt(limit)
    );

    res.json(popularSearches);

  } catch (error) {
    console.error('Popular searches API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular searches',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/search/save-alert
 * @desc    Save a search alert for notifications
 * @access  Private
 */
router.post('/save-alert', auth, async (req, res) => {
  try {
    const {
      name,
      query,
      filters = {},
      emailNotifications = true,
      smsNotifications = false
    } = req.body;

    if (!name || !query) {
      return res.status(400).json({
        success: false,
        error: 'Name and query are required'
      });
    }

    const alertData = {
      userId: req.user.id,
      name,
      query,
      filters,
      emailNotifications,
      smsNotifications
    };

    const result = await AdvancedSearchService.saveSearchAlert(alertData);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    console.error('Save search alert API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save search alert',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/search/analytics
 * @desc    Get search analytics and performance data
 * @access  Private (Admin only for detailed analytics)
 */
router.get('/analytics', auth, async (req, res) => {
  try {
    // For now, allow all authenticated users to see basic analytics
    // In production, this might be restricted to admins
    const {
      startDate,
      endDate,
      userId
    } = req.query;

    const analyticsParams = {
      startDate,
      endDate,
      userId: userId || req.user.id
    };

    const analytics = await AdvancedSearchService.getSearchAnalytics(analyticsParams);

    res.json(analytics);

  } catch (error) {
    console.error('Search analytics API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search analytics',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/search/filters
 * @desc    Get available filter options and their values
 * @access  Public
 */
router.get('/filters', async (req, res) => {
  try {
    // Return available filter options
    const filterOptions = {
      propertyTypes: [
        { value: 'apartment', label: 'Apartment', count: 45 },
        { value: 'studio', label: 'Studio', count: 32 },
        { value: 'shared-room', label: 'Shared Room', count: 28 },
        { value: 'private-room', label: 'Private Room', count: 18 }
      ],
      priceRanges: [
        { min: 0, max: 500, label: 'Under €500', count: 15 },
        { min: 500, max: 800, label: '€500 - €800', count: 35 },
        { min: 800, max: 1200, label: '€800 - €1,200', count: 42 },
        { min: 1200, max: null, label: 'Over €1,200', count: 23 }
      ],
      locations: [
        { value: 'Berlin', label: 'Berlin', count: 45 },
        { value: 'Munich', label: 'Munich', count: 32 },
        { value: 'Hamburg', label: 'Hamburg', count: 28 },
        { value: 'Cologne', label: 'Cologne', count: 18 }
      ],
      amenities: [
        { value: 'wifi', label: 'WiFi', count: 95 },
        { value: 'washing-machine', label: 'Washing Machine', count: 78 },
        { value: 'dishwasher', label: 'Dishwasher', count: 65 },
        { value: 'balcony', label: 'Balcony', count: 52 },
        { value: 'parking', label: 'Parking', count: 38 },
        { value: 'pet-friendly', label: 'Pet Friendly', count: 25 }
      ],
      roomCounts: [
        { value: 1, label: '1 Room', count: 45 },
        { value: 2, label: '2 Rooms', count: 38 },
        { value: 3, label: '3 Rooms', count: 25 },
        { value: 4, label: '4+ Rooms', count: 12 }
      ]
    };

    res.json({
      success: true,
      data: filterOptions
    });

  } catch (error) {
    console.error('Filter options API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filter options',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/search/quick
 * @desc    Quick search endpoint for simple queries
 * @access  Public
 */
router.post('/quick', async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const searchParams = {
      query,
      limit: parseInt(limit),
      sortBy: 'created_at',
      sortOrder: 'desc',
      userId: req.user ? req.user.id : null
    };

    const results = await AdvancedSearchService.searchApartments(searchParams);

    res.json(results);

  } catch (error) {
    console.error('Quick search API error:', error);
    res.status(500).json({
      success: false,
      error: 'Quick search failed',
      message: error.message
    });
  }
});

module.exports = router;
