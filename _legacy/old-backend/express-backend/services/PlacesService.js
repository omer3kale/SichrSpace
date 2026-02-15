/**
 * Places Service - Handle Google Places API operations
 * Find nearby places, search, and get detailed place information
 */

const axios = require('axios');
const { cacheService } = require('./RedisCacheService');

class PlacesService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    this.cacheTTL = 3600; // 1 hour cache for places data
  }

  /**
   * Find nearby places with filters
   */
  async findNearbyPlaces(location, searchParams = {}) {
    try {
      const { radius = 1000, types = [], minRating = 0, openNow = false } = searchParams;
      const cacheKey = `nearby_places:${location.lat},${location.lng}:${radius}:${types.join(',')}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const params = {
        location: `${location.lat},${location.lng}`,
        radius: radius,
        key: this.apiKey
      };

      if (types.length > 0) {
        params.type = types[0]; // Google API accepts one type at a time
      }

      if (openNow) {
        params.opennow = true;
      }

      const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, { params });

      if (response.data.status === 'OK') {
        let places = response.data.results;

        // Apply additional filters
        if (minRating > 0) {
          places = places.filter(place => place.rating && place.rating >= minRating);
        }

        const processedPlaces = places.map(place => this.processPlaceData(place));

        // Cache the results
        await cacheService.setWithExpiry(cacheKey, JSON.stringify(processedPlaces), this.cacheTTL);
        
        return processedPlaces;
      }

      throw new Error(`Places search failed: ${response.data.status}`);
    } catch (error) {
      console.error('Nearby places search error:', error.message);
      throw error;
    }
  }

  /**
   * Text-based place search
   */
  async textSearch(query, location = null) {
    try {
      const cacheKey = `text_search:${query}:${location ? `${location.lat},${location.lng}` : 'global'}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const params = {
        query: query,
        key: this.apiKey
      };

      if (location) {
        params.location = `${location.lat},${location.lng}`;
        params.radius = 50000; // 50km radius
      }

      const response = await axios.get(`${this.baseUrl}/textsearch/json`, { params });

      if (response.data.status === 'OK') {
        const places = response.data.results.map(place => this.processPlaceData(place));

        // Cache the results
        await cacheService.setWithExpiry(cacheKey, JSON.stringify(places), this.cacheTTL);
        
        return places;
      }

      throw new Error(`Text search failed: ${response.data.status}`);
    } catch (error) {
      console.error('Text search error:', error.message);
      throw error;
    }
  }

  /**
   * Get detailed place information
   */
  async getPlaceDetails(placeId, fields = []) {
    try {
      const cacheKey = `place_details:${placeId}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const defaultFields = [
        'place_id', 'name', 'formatted_address', 'geometry', 'rating',
        'user_ratings_total', 'price_level', 'types', 'opening_hours',
        'formatted_phone_number', 'website', 'photos', 'reviews'
      ];

      const requestFields = fields.length > 0 ? fields : defaultFields;

      const params = {
        place_id: placeId,
        fields: requestFields.join(','),
        key: this.apiKey
      };

      const response = await axios.get(`${this.baseUrl}/details/json`, { params });

      if (response.data.status === 'OK') {
        const placeDetails = this.processPlaceDetails(response.data.result);

        // Cache the results (longer TTL for details)
        await cacheService.setWithExpiry(cacheKey, JSON.stringify(placeDetails), this.cacheTTL * 24);
        
        return placeDetails;
      }

      throw new Error(`Place details failed: ${response.data.status}`);
    } catch (error) {
      console.error('Place details error:', error.message);
      throw error;
    }
  }

  /**
   * Get places by category
   */
  async getPlacesByCategory(location, category) {
    const categoryMapping = {
      restaurants: ['restaurant', 'food'],
      shopping: ['shopping_mall', 'store'],
      entertainment: ['movie_theater', 'amusement_park', 'night_club'],
      health: ['hospital', 'pharmacy', 'doctor'],
      education: ['school', 'university'],
      transportation: ['subway_station', 'bus_station', 'train_station']
    };

    const types = categoryMapping[category] || [category];
    
    const allPlaces = [];
    for (const type of types) {
      try {
        const places = await this.findNearbyPlaces(location, { types: [type] });
        allPlaces.push(...places);
      } catch (error) {
        console.error(`Error fetching ${type} places:`, error.message);
      }
    }

    // Remove duplicates based on place_id
    const uniquePlaces = allPlaces.filter((place, index, self) => 
      index === self.findIndex(p => p.place_id === place.place_id)
    );

    return uniquePlaces;
  }

  /**
   * Calculate rating statistics
   */
  calculateRatingStats(reviews) {
    if (!reviews || reviews.length === 0) {
      return { average: 0, total: 0, distribution: {} };
    }

    const ratings = reviews.map(review => review.rating);
    const total = ratings.length;
    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    const average = sum / total;

    const distribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = ratings.filter(rating => rating === i).length;
    }

    return {
      average: Math.round(average * 10) / 10,
      total,
      distribution
    };
  }

  /**
   * Get photo URLs from place photos
   */
  getPhotoUrls(photos, options = {}) {
    if (!photos || photos.length === 0) return [];

    const { maxWidth = 400, maxHeight = 300 } = options;

    return photos.map(photo => {
      return `${this.baseUrl}/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photoreference=${photo.photo_reference}&key=${this.apiKey}`;
    });
  }

  /**
   * Search with caching optimization
   */
  async searchWithCache(searchParams) {
    if (searchParams.location && searchParams.radius) {
      return await this.findNearbyPlaces(searchParams.location, searchParams);
    } else if (searchParams.query) {
      return await this.textSearch(searchParams.query, searchParams.location);
    }
    
    throw new Error('Invalid search parameters');
  }

  /**
   * Cache nearby places data
   */
  async cacheNearbyPlaces(coordinates, placesData, searchParams) {
    const cacheKey = `nearby_places:${coordinates}:${JSON.stringify(searchParams)}`;
    await cacheService.setWithExpiry(cacheKey, JSON.stringify(placesData), this.cacheTTL);
  }

  /**
   * Get cached nearby places
   */
  async getCachedNearbyPlaces(coordinates) {
    const cacheKey = `nearby_places:${coordinates}`;
    const cached = await cacheService.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Get market analysis for an area
   */
  async getMarketAnalysis(analysisArea) {
    const { center, radius } = analysisArea;
    
    const categories = ['restaurant', 'supermarket', 'school', 'hospital', 'gym', 'park'];
    const marketData = {};

    for (const category of categories) {
      try {
        const places = await this.findNearbyPlaces(center, { 
          types: [category], 
          radius: radius 
        });
        
        marketData[category] = {
          count: places.length,
          averageRating: places.reduce((sum, place) => sum + (place.rating || 0), 0) / places.length || 0,
          topRated: places.filter(place => place.rating >= 4.0).length
        };
      } catch (error) {
        marketData[category] = { count: 0, averageRating: 0, topRated: 0 };
      }
    }

    return marketData;
  }

  /**
   * Calculate walkability score based on nearby amenities
   */
  async calculateWalkabilityScore(center, radius) {
    const essentialTypes = [
      'supermarket', 'restaurant', 'pharmacy', 'bank', 
      'bus_station', 'subway_station', 'park', 'gym'
    ];

    let score = 0;
    const maxScore = essentialTypes.length * 10;

    for (const type of essentialTypes) {
      try {
        const places = await this.findNearbyPlaces(center, { 
          types: [type], 
          radius: radius 
        });
        
        // Score based on availability and proximity
        if (places.length > 0) {
          score += Math.min(10, places.length * 2);
        }
      } catch (error) {
        // Skip this type if error occurs
      }
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Get neighborhood amenities summary
   */
  async getNeighborhoodAmenities(lat, lng, radius) {
    const amenityTypes = [
      'restaurant', 'cafe', 'supermarket', 'shopping_mall',
      'school', 'hospital', 'pharmacy', 'bank',
      'gym', 'park', 'movie_theater', 'bus_station'
    ];

    const amenities = {
      restaurants: [],
      supermarkets: [],
      publicTransport: [],
      healthcare: [],
      education: [],
      entertainment: []
    };

    for (const type of amenityTypes) {
      try {
        const places = await this.findNearbyPlaces(lat, lng, radius, type);
        
        const processedPlaces = places.slice(0, 5).map(place => ({
          name: place.name,
          rating: place.rating,
          distance: this.calculateDistance({ lat, lng }, place.geometry.location),
          address: place.vicinity
        }));

        // Categorize into groups
        if (['restaurant', 'cafe'].includes(type)) {
          amenities.restaurants.push(...processedPlaces);
        } else if (['supermarket', 'shopping_mall'].includes(type)) {
          amenities.supermarkets.push(...processedPlaces);
        } else if (['bus_station', 'subway_station'].includes(type)) {
          amenities.publicTransport.push(...processedPlaces);
        } else if (['hospital', 'pharmacy'].includes(type)) {
          amenities.healthcare.push(...processedPlaces);
        } else if (['school'].includes(type)) {
          amenities.education.push(...processedPlaces);
        } else if (['movie_theater', 'park', 'gym'].includes(type)) {
          amenities.entertainment.push(...processedPlaces);
        }
      } catch (error) {
        // Skip this type if error occurs
      }
    }

    return amenities;
  }

  /**
   * Categorize places by type
   */
  categorizePlacesByType(places) {
    const categorized = {};
    
    places.forEach(place => {
      place.types.forEach(type => {
        if (!categorized[type]) {
          categorized[type] = [];
        }
        categorized[type].push(place);
      });
    });
    
    return categorized;
  }

  /**
   * Process raw place data from API
   */
  processPlaceData(place) {
    return {
      place_id: place.place_id,
      name: place.name,
      rating: place.rating || 0,
      user_ratings_total: place.user_ratings_total || 0,
      price_level: place.price_level,
      types: place.types,
      vicinity: place.vicinity,
      geometry: place.geometry,
      opening_hours: place.opening_hours,
      photos: place.photos ? place.photos.slice(0, 3) : [],
      permanently_closed: place.permanently_closed || false
    };
  }

  /**
   * Process detailed place data
   */
  processPlaceDetails(place) {
    return {
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      geometry: place.geometry,
      rating: place.rating || 0,
      user_ratings_total: place.user_ratings_total || 0,
      price_level: place.price_level,
      types: place.types,
      opening_hours: place.opening_hours,
      formatted_phone_number: place.formatted_phone_number,
      website: place.website,
      photos: place.photos || [],
      reviews: place.reviews || [],
      url: place.url
    };
  }

  /**
   * Calculate distance between two points (in meters)
   */
  calculateDistance(point1, point2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = point1.lat * Math.PI/180;
    const φ2 = point2.lat * Math.PI/180;
    const Δφ = (point2.lat - point1.lat) * Math.PI/180;
    const Δλ = (point2.lng - point1.lng) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return Math.round(R * c);
  }
}

module.exports = PlacesService;
