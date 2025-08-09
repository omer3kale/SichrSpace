const express = require('express');
const router = express.Router();
const ApartmentService = require('../services/ApartmentService');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/apartments
 * @desc    Get all available apartments with optional filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { 
      city, 
      minPrice, 
      maxPrice, 
      minRooms, 
      maxRooms, 
      furnished, 
      petFriendly,
      limit = 20,
      offset = 0 
    } = req.query;

    // Build filter object
    const filters = {};
    if (city) filters.city = city;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (minRooms) filters.minRooms = parseInt(minRooms);
    if (maxRooms) filters.maxRooms = parseInt(maxRooms);
    if (furnished !== undefined) filters.furnished = furnished === 'true';
    if (petFriendly !== undefined) filters.petFriendly = petFriendly === 'true';

    const apartments = await ApartmentService.list({
      ...filters,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: apartments,
      count: apartments.length
    });
  } catch (error) {
    console.error('Apartment listing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve apartments'
    });
  }
});

/**
 * @route   GET /api/apartments/user/:userId
 * @desc    Get apartments owned by specific user
 * @access  Private (user or admin only)
 */
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Users can only see their own apartments unless they're admin
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const apartments = await ApartmentService.findByOwner(req.params.userId);

    res.json({
      success: true,
      data: apartments,
      count: apartments.length
    });
  } catch (error) {
    console.error('User apartments retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user apartments'
    });
  }
});

/**
 * @route   GET /api/apartments/:id
 * @desc    Get apartment by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const apartment = await ApartmentService.findById(req.params.id);
    
    if (!apartment) {
      return res.status(404).json({
        success: false,
        error: 'Apartment not found'
      });
    }

    res.json({
      success: true,
      data: apartment
    });
  } catch (error) {
    console.error('Apartment retrieval error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve apartment'
    });
  }
});

/**
 * @route   POST /api/apartments
 * @desc    Create new apartment
 * @access  Private (authenticated users only)
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      price,
      rooms,
      size,
      deposit,
      available_from,
      available_to,
      amenities,
      furnished,
      pet_friendly
    } = req.body;

    // Basic validation
    if (!title || !description || !location || !price) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, location, and price are required'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be greater than 0'
      });
    }

    // Create apartment data
    const apartmentData = {
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      price: parseFloat(price),
      rooms: parseInt(rooms) || 1,
      size: parseInt(size) || null,
      deposit: parseFloat(deposit) || 0,
      available_from: available_from ? new Date(available_from).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      available_to: available_to ? new Date(available_to).toISOString().split('T')[0] : null,
      owner_id: req.user.id,
      status: 'available',
      furnished: Boolean(furnished),
      pet_friendly: Boolean(pet_friendly),
      amenities: Array.isArray(amenities) ? amenities : [],
      images: []
    };

    const apartment = await ApartmentService.create(apartmentData);

    res.status(201).json({
      success: true,
      message: 'Apartment created successfully',
      data: apartment
    });
  } catch (error) {
    console.error('Apartment creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create apartment'
    });
  }
});

/**
 * @route   PUT /api/apartments/:id
 * @desc    Update apartment
 * @access  Private (owner or admin only)
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const apartment = await ApartmentService.findById(req.params.id);
    
    if (!apartment) {
      return res.status(404).json({
        success: false,
        error: 'Apartment not found'
      });
    }

    // Check if user owns the apartment or is admin
    if (apartment.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updatedApartment = await ApartmentService.update(req.params.id, req.body);

    res.json({
      success: true,
      data: updatedApartment
    });
  } catch (error) {
    console.error('Apartment update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update apartment'
    });
  }
});

/**
 * @route   DELETE /api/apartments/:id
 * @desc    Delete apartment
 * @access  Private (owner or admin only)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const apartment = await ApartmentService.findById(req.params.id);
    
    if (!apartment) {
      return res.status(404).json({
        success: false,
        error: 'Apartment not found'
      });
    }

    // Check if user owns the apartment or is admin
    if (apartment.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    await ApartmentService.delete(req.params.id);

    res.json({
      success: true,
      message: 'Apartment deleted successfully'
    });
  } catch (error) {
    console.error('Apartment deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete apartment'
    });
  }
});

module.exports = router;
