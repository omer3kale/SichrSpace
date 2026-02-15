const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const express = require('express');

// Mock Google Maps Service for testing
const mockGoogleMapsService = {
  geocodeAddress: sinon.stub(),
  reverseGeocode: sinon.stub(),
  getNearbyPlaces: sinon.stub(),
  calculateDistance: sinon.stub(),
  getPlaceDetails: sinon.stub(),
  validatePropertyAddress: sinon.stub(),
  findNearbyApartments: sinon.stub(),
  generateStaticMapUrl: sinon.stub()
};

// Mock auth middleware for testing
const mockAuth = (req, res, next) => {
  req.user = { id: 'test-user-id' };
  next();
};

describe('Step 9.2: Google Maps Integration Tests', () => {
  let app;
  let mapsRoutes;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock the Google Maps service module
    delete require.cache[require.resolve('../routes/maps')];
    require.cache[require.resolve('../services/GoogleMapsService')] = {
      exports: mockGoogleMapsService
    };
    
    mapsRoutes = require('../routes/maps');
    app.use('/api/maps', mapsRoutes);
    
    // Reset all stubs
    Object.values(mockGoogleMapsService).forEach(stub => {
      if (stub.reset) stub.reset();
    });
  });

  describe('🗺️ Geocoding Services', () => {
    it('should geocode an address successfully', async () => {
      const mockResult = {
        lat: 52.5200,
        lng: 13.4050,
        formatted_address: 'Berlin, Germany',
        place_id: 'ChIJAVkDPzdOqEcRcDteW0YgIQQ'
      };

      mockGoogleMapsService.geocodeAddress.resolves(mockResult);

      const response = await request(app)
        .post('/api/maps/geocode')
        .send({ address: 'Berlin, Germany' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
      expect(mockGoogleMapsService.geocodeAddress.calledOnce).to.be.true;
    });

    it('should return error for missing address', async () => {
      const response = await request(app)
        .post('/api/maps/geocode')
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Address is required');
    });

    it('should handle geocoding errors', async () => {
      mockGoogleMapsService.geocodeAddress.rejects(new Error('API error'));

      const response = await request(app)
        .post('/api/maps/geocode')
        .send({ address: 'Invalid Address' });

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
    });
  });

  describe('🔄 Reverse Geocoding', () => {
    it('should reverse geocode coordinates successfully', async () => {
      const mockResult = {
        formatted_address: 'Berlin, Germany',
        place_id: 'ChIJAVkDPzdOqEcRcDteW0YgIQQ'
      };

      mockGoogleMapsService.reverseGeocode.resolves(mockResult);

      const response = await request(app)
        .post('/api/maps/reverse-geocode')
        .send({ lat: 52.5200, lng: 13.4050 });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockResult);
    });

    it('should return error for missing coordinates', async () => {
      const response = await request(app)
        .post('/api/maps/reverse-geocode')
        .send({ lat: 52.5200 });

      expect(response.status).to.equal(400);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Latitude and longitude are required');
    });
  });

  describe('📍 Nearby Places Search', () => {
    it('should find nearby places successfully', async () => {
      const mockPlaces = [
        {
          place_id: 'place1',
          name: 'Test Restaurant',
          types: ['restaurant'],
          rating: 4.5,
          location: { lat: 52.5210, lng: 13.4060 }
        },
        {
          place_id: 'place2', 
          name: 'Test School',
          types: ['school'],
          rating: 4.2,
          location: { lat: 52.5190, lng: 13.4040 }
        }
      ];

      mockGoogleMapsService.getNearbyPlaces.resolves(mockPlaces);

      const response = await request(app)
        .post('/api/maps/nearby-places')
        .send({ 
          lat: 52.5200, 
          lng: 13.4050,
          type: 'restaurant',
          radius: 1000
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockPlaces);
      expect(response.body.count).to.equal(2);
    });

    it('should use default values for optional parameters', async () => {
      mockGoogleMapsService.getNearbyPlaces.resolves([]);

      await request(app)
        .post('/api/maps/nearby-places')
        .send({ lat: 52.5200, lng: 13.4050 });

      expect(mockGoogleMapsService.getNearbyPlaces.calledWith(
        52.5200, 13.4050, 'point_of_interest', 1000
      )).to.be.true;
    });
  });

  describe('📏 Distance Calculation', () => {
    it('should calculate distance successfully', async () => {
      const mockDistance = {
        distance: { text: '5.2 km', value: 5200 },
        duration: { text: '12 mins', value: 720 },
        mode: 'driving'
      };

      mockGoogleMapsService.calculateDistance.resolves(mockDistance);

      const response = await request(app)
        .post('/api/maps/distance')
        .send({
          origin: 'Berlin, Germany',
          destination: 'Munich, Germany',
          mode: 'driving'
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockDistance);
    });

    it('should return error for missing origin or destination', async () => {
      const response = await request(app)
        .post('/api/maps/distance')
        .send({ origin: 'Berlin, Germany' });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Origin and destination are required');
    });
  });

  describe('🏠 Property Address Validation', () => {
    it('should validate property address successfully', async () => {
      const mockValidation = {
        lat: 52.5200,
        lng: 13.4050,
        formatted_address: 'Brandenburger Tor, Berlin, Germany',
        components: {
          street_number: '1',
          street_name: 'Pariser Platz',
          city: 'Berlin',
          postal_code: '10117',
          country: 'Germany'
        },
        full_address: '1 Pariser Platz, Berlin, 10117'
      };

      mockGoogleMapsService.validatePropertyAddress.resolves(mockValidation);

      const response = await request(app)
        .post('/api/maps/validate-address')
        .send({ address: 'Brandenburger Tor, Berlin' });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockValidation);
      expect(response.body.message).to.equal('Address validated successfully');
    });
  });

  describe('🏠 Nearby Apartments Search', () => {
    it('should find nearby apartments successfully', async () => {
      const mockApartments = [
        {
          id: 'apt1',
          title: 'Cozy Apartment',
          rent: 1200,
          latitude: 52.5190,
          longitude: 13.4040,
          distance_km: 1.2
        },
        {
          id: 'apt2',
          title: 'Modern Flat',
          rent: 1500,
          latitude: 52.5210,
          longitude: 13.4060,
          distance_km: 1.5
        }
      ];

      mockGoogleMapsService.findNearbyApartments.resolves(mockApartments);

      const response = await request(app)
        .post('/api/maps/nearby-apartments')
        .send({ 
          lat: 52.5200, 
          lng: 13.4050,
          radius: 5
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.deep.equal(mockApartments);
      expect(response.body.count).to.equal(2);
      expect(response.body.radius_km).to.equal(5);
    });
  });

  describe('🗺️ Static Map Generation', () => {
    it('should generate static map URL successfully', async () => {
      const mockMapUrl = 'https://maps.googleapis.com/maps/api/staticmap?center=52.5200,13.4050&zoom=15&size=400x300';

      mockGoogleMapsService.generateStaticMapUrl.returns(mockMapUrl);

      const response = await request(app)
        .post('/api/maps/static-map')
        .send({ 
          lat: 52.5200, 
          lng: 13.4050,
          options: { zoom: 15 }
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.map_url).to.equal(mockMapUrl);
      expect(response.body.data.coordinates).to.deep.equal({ lat: 52.5200, lng: 13.4050 });
    });

    it('should handle missing API configuration', async () => {
      mockGoogleMapsService.generateStaticMapUrl.returns(null);

      const response = await request(app)
        .post('/api/maps/static-map')
        .send({ lat: 52.5200, lng: 13.4050 });

      expect(response.status).to.equal(503);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.equal('Google Maps API not configured');
    });
  });

  describe('📋 Place Types Endpoint', () => {
    it('should return available place types', async () => {
      const response = await request(app)
        .get('/api/maps/place-types');

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.be.an('array');
      expect(response.body.data.length).to.be.greaterThan(0);
      
      const firstType = response.body.data[0];
      expect(firstType).to.have.property('value');
      expect(firstType).to.have.property('label');
    });
  });

  describe('🔍 Location-based Apartment Search', () => {
    it('should search apartments by location name', async () => {
      const mockGeocode = {
        lat: 52.5200,
        lng: 13.4050,
        formatted_address: 'Berlin, Germany'
      };

      const mockApartments = [
        { id: 'apt1', title: 'Berlin Apartment', distance_km: 2.1 }
      ];

      mockGoogleMapsService.geocodeAddress.resolves(mockGeocode);
      mockGoogleMapsService.findNearbyApartments.resolves(mockApartments);

      const response = await request(app)
        .post('/api/maps/search-by-location')
        .send({ 
          location: 'Berlin, Germany',
          radius: 5
        });

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.location).to.deep.equal(mockGeocode);
      expect(response.body.data.apartments).to.deep.equal(mockApartments);
      expect(response.body.data.count).to.equal(1);
    });

    it('should return error for missing location', async () => {
      const response = await request(app)
        .post('/api/maps/search-by-location')
        .send({ radius: 5 });

      expect(response.status).to.equal(400);
      expect(response.body.error).to.equal('Location is required');
    });
  });

  describe('🔧 Service Error Handling', () => {
    it('should handle service unavailable errors gracefully', async () => {
      mockGoogleMapsService.geocodeAddress.rejects(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/maps/geocode')
        .send({ address: 'Test Address' });

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Service unavailable');
    });

    it('should handle network timeout errors', async () => {
      mockGoogleMapsService.getNearbyPlaces.rejects(new Error('Request timeout'));

      const response = await request(app)
        .post('/api/maps/nearby-places')
        .send({ lat: 52.5200, lng: 13.4050 });

      expect(response.status).to.equal(500);
      expect(response.body.success).to.be.false;
    });
  });

  describe('📊 Integration Scenarios', () => {
    it('should handle complete property search workflow', async () => {
      // Mock the full workflow
      const mockGeocode = { lat: 52.5200, lng: 13.4050, formatted_address: 'Berlin' };
      const mockApartments = [{ id: 'apt1', title: 'Test Apartment' }];
      const mockPlaces = [{ name: 'Test Restaurant', types: ['restaurant'] }];

      mockGoogleMapsService.geocodeAddress.resolves(mockGeocode);
      mockGoogleMapsService.findNearbyApartments.resolves(mockApartments);
      mockGoogleMapsService.getNearbyPlaces.resolves(mockPlaces);

      // 1. Search by location
      const searchResponse = await request(app)
        .post('/api/maps/search-by-location')
        .send({ location: 'Berlin', radius: 5 });

      expect(searchResponse.status).to.equal(200);

      // 2. Get nearby places
      const placesResponse = await request(app)
        .post('/api/maps/nearby-places')
        .send({ lat: 52.5200, lng: 13.4050, type: 'restaurant' });

      expect(placesResponse.status).to.equal(200);

      // Verify all services were called
      expect(mockGoogleMapsService.geocodeAddress.calledOnce).to.be.true;
      expect(mockGoogleMapsService.findNearbyApartments.calledOnce).to.be.true;
      expect(mockGoogleMapsService.getNearbyPlaces.calledOnce).to.be.true;
    });
  });
});

// Additional unit tests for Google Maps Service
describe('Step 9.2: Google Maps Service Unit Tests', () => {
  let GoogleMapsService;

  beforeEach(() => {
    // Reset module cache
    delete require.cache[require.resolve('../services/GoogleMapsService')];
    GoogleMapsService = require('../services/GoogleMapsService');
  });

  describe('🧮 Distance Calculations', () => {
    it('should calculate Haversine distance correctly', () => {
      const distance = GoogleMapsService.calculateHaversineDistance(
        52.5200, 13.4050, // Berlin
        52.3759, 4.8975   // Amsterdam
      );

      expect(distance).to.be.a('number');
      expect(distance).to.be.greaterThan(0);
      expect(distance).to.be.approximately(577, 50); // ~577 km between Berlin and Amsterdam
    });

    it('should return 0 for same location', () => {
      const distance = GoogleMapsService.calculateHaversineDistance(
        52.5200, 13.4050,
        52.5200, 13.4050
      );

      expect(distance).to.equal(0);
    });
  });

  describe('🔧 Utility Functions', () => {
    it('should convert degrees to radians correctly', () => {
      const radians = GoogleMapsService.toRadians(180);
      expect(radians).to.be.approximately(Math.PI, 0.001);
    });

    it('should generate static map URL with default options', () => {
      // Mock API key
      GoogleMapsService.apiKey = 'test-api-key';
      
      const url = GoogleMapsService.generateStaticMapUrl(52.5200, 13.4050);
      
      expect(url).to.include('maps.googleapis.com');
      expect(url).to.include('52.5200,13.4050');
      expect(url).to.include('zoom=15');
      expect(url).to.include('size=400x300');
    });

    it('should return null for static map URL without API key', () => {
      GoogleMapsService.apiKey = null;
      
      const url = GoogleMapsService.generateStaticMapUrl(52.5200, 13.4050);
      
      expect(url).to.be.null;
    });
  });
});
