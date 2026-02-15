const express = require('express');
const router = express.Router();
const GoogleMapsService = require('../services/GoogleMapsService');
const auth = require('../middleware/auth');

/**
 * Google Maps API Routes
 * Step 9.2: Google Maps integration endpoints
 */

// Geocode an address
router.post('/geocode', auth, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    const result = await GoogleMapsService.geocodeAddress(address);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Geocoding error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reverse geocode coordinates
router.post('/reverse-geocode', auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const result = await GoogleMapsService.reverseGeocode(lat, lng);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get nearby places
router.post('/nearby-places', auth, async (req, res) => {
  try {
    const { lat, lng, type = 'point_of_interest', radius = 1000 } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const places = await GoogleMapsService.getNearbyPlaces(lat, lng, type, radius);
    
    res.json({
      success: true,
      data: places,
      count: places.length
    });
  } catch (error) {
    console.error('❌ Nearby places error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Calculate distance between two points
router.post('/distance', auth, async (req, res) => {
  try {
    const { origin, destination, mode = 'driving' } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination are required'
      });
    }

    const result = await GoogleMapsService.calculateDistance(origin, destination, mode);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Distance calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get place details
router.get('/place/:placeId', auth, async (req, res) => {
  try {
    const { placeId } = req.params;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        error: 'Place ID is required'
      });
    }

    const details = await GoogleMapsService.getPlaceDetails(placeId);
    
    res.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('❌ Place details error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Validate property address
router.post('/validate-address', auth, async (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address is required'
      });
    }

    const result = await GoogleMapsService.validatePropertyAddress(address);
    
    res.json({
      success: true,
      data: result,
      message: 'Address validated successfully'
    });
  } catch (error) {
    console.error('❌ Address validation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Find nearby apartments
router.post('/nearby-apartments', auth, async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const apartments = await GoogleMapsService.findNearbyApartments(lat, lng, radius);
    
    res.json({
      success: true,
      data: apartments,
      count: apartments.length,
      radius_km: radius
    });
  } catch (error) {
    console.error('❌ Nearby apartments search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate static map URL
router.post('/static-map', auth, async (req, res) => {
  try {
    const { lat, lng, options = {} } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude and longitude are required'
      });
    }

    const mapUrl = GoogleMapsService.generateStaticMapUrl(lat, lng, options);
    
    if (!mapUrl) {
      return res.status(503).json({
        success: false,
        error: 'Google Maps API not configured'
      });
    }
    
    res.json({
      success: true,
      data: {
        map_url: mapUrl,
        coordinates: { lat, lng }
      }
    });
  } catch (error) {
    console.error('❌ Static map generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get common place types for nearby search
router.get('/place-types', (req, res) => {
  const placeTypes = [
    { value: 'restaurant', label: 'Restaurants' },
    { value: 'school', label: 'Schools' },
    { value: 'hospital', label: 'Hospitals' },
    { value: 'pharmacy', label: 'Pharmacies' },
    { value: 'bank', label: 'Banks' },
    { value: 'atm', label: 'ATMs' },
    { value: 'gas_station', label: 'Gas Stations' },
    { value: 'subway_station', label: 'Subway Stations' },
    { value: 'bus_station', label: 'Bus Stations' },
    { value: 'shopping_mall', label: 'Shopping Malls' },
    { value: 'supermarket', label: 'Supermarkets' },
    { value: 'gym', label: 'Gyms' },
    { value: 'park', label: 'Parks' },
    { value: 'library', label: 'Libraries' },
    { value: 'movie_theater', label: 'Movie Theaters' }
  ];

  res.json({
    success: true,
    data: placeTypes
  });
});

// Search apartments by location name
router.post('/search-by-location', auth, async (req, res) => {
  try {
    const { location, radius = 5 } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        error: 'Location is required'
      });
    }

    // First geocode the location
    const geocodeResult = await GoogleMapsService.geocodeAddress(location);
    
    // Then find nearby apartments
    const apartments = await GoogleMapsService.findNearbyApartments(
      geocodeResult.lat, 
      geocodeResult.lng, 
      radius
    );
    
    res.json({
      success: true,
      data: {
        location: geocodeResult,
        apartments: apartments,
        count: apartments.length,
        radius_km: radius
      }
    });
  } catch (error) {
    console.error('❌ Location search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
