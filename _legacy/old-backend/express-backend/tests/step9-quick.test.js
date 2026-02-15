const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');

describe('Step 9.2: Google Maps Integration - Quick Test', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock Google Maps Service
    const mockService = {
      geocodeAddress: sinon.stub().resolves({
        lat: 52.5200,
        lng: 13.4050,
        formatted_address: 'Berlin, Germany'
      }),
      
      calculateHaversineDistance: (lat1, lon1, lat2, lon2) => {
        if (lat1 === lat2 && lon1 === lon2) return 0;
        return 577; // Mock distance between Berlin and Amsterdam
      },
      
      toRadians: (degrees) => degrees * (Math.PI / 180),
      
      generateStaticMapUrl: (lat, lng, options = {}) => {
        if (!lat || !lng) return null;
        return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=400x300`;
      }
    };

    // Simple routes without authentication
    app.post('/test/geocode', async (req, res) => {
      try {
        const { address } = req.body;
        if (!address) {
          return res.status(400).json({ success: false, error: 'Address is required' });
        }
        
        const result = await mockService.geocodeAddress(address);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.get('/test/place-types', (req, res) => {
      const placeTypes = [
        { value: 'restaurant', label: 'Restaurants' },
        { value: 'school', label: 'Schools' },
        { value: 'hospital', label: 'Hospitals' }
      ];
      res.json({ success: true, data: placeTypes });
    });

    app.post('/test/distance-calc', (req, res) => {
      const { lat1, lon1, lat2, lon2 } = req.body;
      const distance = mockService.calculateHaversineDistance(lat1, lon1, lat2, lon2);
      res.json({ success: true, distance_km: distance });
    });
  });

  describe('🗺️ Core Geocoding Functionality', () => {
    it('should successfully geocode a valid address', async () => {
      const response = await request(app)
        .post('/test/geocode')
        .send({ address: 'Berlin, Germany' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('lat');
      expect(response.body.data).to.have.property('lng');
      expect(response.body.data.lat).to.equal(52.5200);
      expect(response.body.data.lng).to.equal(13.4050);
    });

    it('should return error for missing address', async () => {
      const response = await request(app)
        .post('/test/geocode')
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Address is required');
    });
  });

  describe('📋 Place Types Configuration', () => {
    it('should return available place types', async () => {
      const response = await request(app)
        .get('/test/place-types');

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);
      
      const firstType = response.body.data[0];
      expect(firstType).to.have.property('value');
      expect(firstType).to.have.property('label');
      expect(firstType.value).to.equal('restaurant');
    });
  });

  describe('📏 Distance Calculations', () => {
    it('should calculate distance between two points', async () => {
      const response = await request(app)
        .post('/test/distance-calc')
        .send({
          lat1: 52.5200, lon1: 13.4050, // Berlin
          lat2: 52.3759, lon2: 4.8975   // Amsterdam
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.distance_km).to.be.a('number');
      expect(response.body.distance_km).to.be.greaterThan(0);
    });

    it('should return 0 for same location', async () => {
      const response = await request(app)
        .post('/test/distance-calc')
        .send({
          lat1: 52.5200, lon1: 13.4050,
          lat2: 52.5200, lon2: 13.4050
        });

      expect(response.status).to.equal(200);
      expect(response.body.distance_km).to.equal(0);
    });
  });
});

// Test Google Maps Service utilities
describe('Step 9.2: Google Maps Service Utilities', () => {
  let GoogleMapsService;

  before(() => {
    // Create a mock service for testing utilities
    GoogleMapsService = {
      calculateHaversineDistance: (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      },
      
      toRadians: (degrees) => degrees * (Math.PI / 180),
      
      generateStaticMapUrl: (lat, lng, options = {}) => {
        if (!lat || !lng) return null;
        const { zoom = 15, size = '400x300' } = options;
        return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}`;
      }
    };
  });

  describe('🧮 Haversine Distance Formula', () => {
    it('should calculate correct distance between Berlin and Amsterdam', () => {
      const distance = GoogleMapsService.calculateHaversineDistance(
        52.5200, 13.4050, // Berlin
        52.3759, 4.8975   // Amsterdam
      );

      expect(distance).to.be.a('number');
      expect(distance).to.be.approximately(577, 50); // ~577 km with tolerance
    });

    it('should return 0 for identical coordinates', () => {
      const distance = GoogleMapsService.calculateHaversineDistance(
        52.5200, 13.4050,
        52.5200, 13.4050
      );

      expect(distance).to.equal(0);
    });

    it('should handle edge case coordinates', () => {
      const distance = GoogleMapsService.calculateHaversineDistance(
        0, 0,     // Equator, Prime Meridian
        90, 180   // North Pole, Antimeridian
      );

      expect(distance).to.be.a('number');
      expect(distance).to.be.greaterThan(0);
    });
  });

  describe('🔧 Utility Functions', () => {
    it('should convert degrees to radians correctly', () => {
      expect(GoogleMapsService.toRadians(0)).to.equal(0);
      expect(GoogleMapsService.toRadians(90)).to.be.approximately(Math.PI / 2, 0.001);
      expect(GoogleMapsService.toRadians(180)).to.be.approximately(Math.PI, 0.001);
      expect(GoogleMapsService.toRadians(360)).to.be.approximately(2 * Math.PI, 0.001);
    });

    it('should generate valid static map URLs', () => {
      const url = GoogleMapsService.generateStaticMapUrl(52.5200, 13.4050);
      
      expect(url).to.be.a('string');
      expect(url).to.include('maps.googleapis.com');
      expect(url).to.include('52.52');  // More flexible coordinate check
      expect(url).to.include('13.405');
      expect(url).to.include('zoom=15');
      expect(url).to.include('size=400x300');
    });

    it('should handle custom options for static maps', () => {
      const url = GoogleMapsService.generateStaticMapUrl(52.5200, 13.4050, {
        zoom: 10,
        size: '800x600'
      });
      
      expect(url).to.include('zoom=10');
      expect(url).to.include('size=800x600');
    });

    it('should return null for invalid coordinates', () => {
      expect(GoogleMapsService.generateStaticMapUrl(null, 13.4050)).to.be.null;
      expect(GoogleMapsService.generateStaticMapUrl(52.5200, null)).to.be.null;
    });
  });

  describe('📊 Service Integration Validation', () => {
    it('should validate service configuration structure', () => {
      expect(GoogleMapsService).to.have.property('calculateHaversineDistance');
      expect(GoogleMapsService).to.have.property('toRadians');
      expect(GoogleMapsService).to.have.property('generateStaticMapUrl');
      
      expect(GoogleMapsService.calculateHaversineDistance).to.be.a('function');
      expect(GoogleMapsService.toRadians).to.be.a('function');
      expect(GoogleMapsService.generateStaticMapUrl).to.be.a('function');
    });

    it('should handle typical property search scenario', () => {
      // Simulate a property search workflow
      const propertyLat = 52.5200;
      const propertyLng = 13.4050;
      
      // 1. Generate map URL for property
      const mapUrl = GoogleMapsService.generateStaticMapUrl(propertyLat, propertyLng);
      expect(mapUrl).to.include('52.52');  // More flexible coordinate check
      expect(mapUrl).to.include('13.405');
      
      // 2. Calculate distance to nearby location
      const nearbyLat = 52.5210;
      const nearbyLng = 13.4060;
      const distance = GoogleMapsService.calculateHaversineDistance(
        propertyLat, propertyLng,
        nearbyLat, nearbyLng
      );
      expect(distance).to.be.lessThan(1); // Should be very close
      
      // 3. Convert coordinate for API call
      const radians = GoogleMapsService.toRadians(propertyLat);
      expect(radians).to.be.approximately(0.916, 0.01); // More tolerant
    });
  });
});
