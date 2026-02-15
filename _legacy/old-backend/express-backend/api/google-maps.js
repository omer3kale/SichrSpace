/**
 * Google Maps API Routes
 * Handles all Google Maps related endpoints
 */

const express = require('express');
const router = express.Router();
const geocodingService = require('../services/GeocodingService');
const placesService = require('../services/PlacesService');
const directionsService = require('../services/DirectionsService');

/**
 * @route   POST /api/maps/geocode
 * @desc    Geocode an address to coordinates
 * @access  Public
 */
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required'
      });
    }

    const result = await geocodingService.geocodeAddress(address);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Geocoding failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/reverse-geocode
 * @desc    Reverse geocode coordinates to address
 * @access  Public
 */
router.post('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const result = await geocodingService.reverseGeocode(lat, lng);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      message: 'Reverse geocoding failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/places/nearby
 * @desc    Find nearby places
 * @access  Public
 */
router.post('/places/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 1000, types = [], minRating = 0, openNow = false } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat, lng };
    const searchParams = { radius, types, minRating, openNow };

    const places = await placesService.findNearbyPlaces(location, searchParams);

    res.json({
      success: true,
      data: places,
      count: places.length
    });

  } catch (error) {
    console.error('Places search error:', error);
    res.status(500).json({
      success: false,
      message: 'Places search failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/places/search
 * @desc    Text search for places
 * @access  Public
 */
router.post('/places/search', async (req, res) => {
  try {
    const { query, lat, lng } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const location = (lat && lng) ? { lat, lng } : null;
    const places = await placesService.textSearch(query, location);

    res.json({
      success: true,
      data: places,
      count: places.length
    });

  } catch (error) {
    console.error('Places text search error:', error);
    res.status(500).json({
      success: false,
      message: 'Places text search failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/maps/places/:placeId
 * @desc    Get detailed place information
 * @access  Public
 */
router.get('/places/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    const { fields } = req.query;

    const fieldArray = fields ? fields.split(',') : [];
    const placeDetails = await placesService.getPlaceDetails(placeId, fieldArray);

    res.json({
      success: true,
      data: placeDetails
    });

  } catch (error) {
    console.error('Place details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get place details',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/directions
 * @desc    Calculate route between two points
 * @access  Public
 */
router.post('/directions', async (req, res) => {
  try {
    const { origin, destination, travelMode = 'DRIVING', waypoints = [] } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origin and destination are required'
      });
    }

    let result;
    if (waypoints.length > 0) {
      result = await directionsService.calculateRouteWithWaypoints(
        origin, destination, waypoints, travelMode
      );
    } else {
      result = await directionsService.calculateRoute(origin, destination, travelMode);
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Directions error:', error);
    res.status(500).json({
      success: false,
      message: 'Directions calculation failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/distance-matrix
 * @desc    Calculate distance matrix
 * @access  Public
 */
router.post('/distance-matrix', async (req, res) => {
  try {
    const { origins, destinations, travelMode = 'DRIVING' } = req.body;

    if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
      return res.status(400).json({
        success: false,
        message: 'Origins and destinations arrays are required'
      });
    }

    const matrix = await directionsService.calculateDistanceMatrix(
      origins, destinations, travelMode
    );

    res.json({
      success: true,
      data: matrix
    });

  } catch (error) {
    console.error('Distance matrix error:', error);
    res.status(500).json({
      success: false,
      message: 'Distance matrix calculation failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/apartments/nearby
 * @desc    Find apartments near a location with Google Maps integration
 * @access  Public
 */
router.post('/apartments/nearby', async (req, res) => {
  try {
    const { address, lat, lng, radius = 2000, filters = {} } = req.body;
    let location;

    // If address is provided, geocode it first
    if (address && !lat && !lng) {
      const geocoded = await geocodingService.geocodeAddress(address);
      if (!geocoded) {
        return res.status(404).json({
          success: false,
          message: 'Address not found'
        });
      }
      location = { lat: geocoded.lat, lng: geocoded.lng };
    } else if (lat && lng) {
      location = { lat, lng };
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either address or coordinates (lat, lng) are required'
      });
    }

    // Get nearby apartments from database (this would need to be implemented in ApartmentService)
    // For now, return mock data
    const mockApartments = [
      {
        id: 1,
        title: 'Modern Apartment in Berlin Mitte',
        price: 1200,
        lat: location.lat + 0.001,
        lng: location.lng + 0.001,
        distance: 150
      },
      {
        id: 2,
        title: 'Cozy Studio near Alexanderplatz',
        price: 900,
        lat: location.lat - 0.001,
        lng: location.lng - 0.001,
        distance: 200
      }
    ];

    // Get nearby amenities
    const amenities = await placesService.findNearbyPlaces(location, {
      radius: 1000,
      types: ['supermarket', 'restaurant', 'school', 'hospital']
    });

    // Calculate walkability score
    const walkabilityScore = await placesService.calculateWalkabilityScore(location, radius);

    res.json({
      success: true,
      data: {
        searchLocation: location,
        apartments: mockApartments,
        amenities: amenities.slice(0, 10), // Limit results
        walkabilityScore,
        searchRadius: radius
      }
    });

  } catch (error) {
    console.error('Nearby apartments search error:', error);
    res.status(500).json({
      success: false,
      message: 'Nearby apartments search failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/commute-analysis
 * @desc    Analyze commute times from apartments to work locations
 * @access  Public
 */
router.post('/commute-analysis', async (req, res) => {
  try {
    const { apartments, workLocations, travelModes = ['DRIVING', 'TRANSIT'] } = req.body;

    if (!apartments || !workLocations || !Array.isArray(apartments) || !Array.isArray(workLocations)) {
      return res.status(400).json({
        success: false,
        message: 'Apartments and work locations arrays are required'
      });
    }

    const commuteScores = await directionsService.calculateCommuteScores(
      apartments, workLocations, travelModes
    );

    res.json({
      success: true,
      data: commuteScores
    });

  } catch (error) {
    console.error('Commute analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Commute analysis failed',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/maps/neighborhood-analysis
 * @desc    Analyze neighborhood amenities and walkability
 * @access  Public
 */
router.post('/neighborhood-analysis', async (req, res) => {
  try {
    const { lat, lng, radius = 1000 } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const location = { lat, lng };

    // Get market analysis
    const marketAnalysis = await placesService.getMarketAnalysis({ center: location, radius });

    // Get walkability score
    const walkabilityScore = await placesService.calculateWalkabilityScore(location, radius);

    // Get neighborhood amenities
    const amenities = await placesService.getNeighborhoodAmenities(location, radius);

    res.json({
      success: true,
      data: {
        location,
        radius,
        marketAnalysis,
        walkabilityScore,
        amenities
      }
    });

  } catch (error) {
    console.error('Neighborhood analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Neighborhood analysis failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/maps/config
 * @desc    Get Google Maps configuration for frontend
 * @access  Public
 */
router.get('/config', (req, res) => {
  try {
    const config = {
      apiKey: process.env.GOOGLE_MAPS_CLIENT_API_KEY || process.env.GOOGLE_MAPS_API_KEY,
      defaultCenter: {
        lat: parseFloat(process.env.GOOGLE_MAPS_DEFAULT_LAT) || 52.5200,
        lng: parseFloat(process.env.GOOGLE_MAPS_DEFAULT_LNG) || 13.4050
      },
      defaultZoom: parseInt(process.env.GOOGLE_MAPS_DEFAULT_ZOOM) || 12,
      placesRadius: parseInt(process.env.GOOGLE_MAPS_PLACES_RADIUS) || 1000
    };

    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration',
      error: error.message
    });
  }
});

module.exports = router;
