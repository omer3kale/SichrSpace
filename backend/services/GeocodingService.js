/**
 * Geocoding Service - Handle address to coordinates conversion and reverse geocoding
 * Uses Google Geocoding API for location data
 */

const axios = require('axios');
const { cacheService } = require('./RedisCacheService');

class GeocodingService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    this.cacheTTL = 86400; // 24 hours cache
  }

  /**
   * Geocode address to coordinates
   */
  async geocodeAddress(address) {
    try {
      const cacheKey = `geocode:${address.toLowerCase()}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          address: address,
          key: this.apiKey,
          language: 'en'
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const geocodeResult = {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          types: result.types,
          components: this.extractAddressComponents(result.address_components)
        };

        // Cache the result
        await cacheService.setWithExpiry(cacheKey, JSON.stringify(geocodeResult), this.cacheTTL);
        
        return geocodeResult;
      }

      if (response.data.status === 'ZERO_RESULTS') {
        return null;
      }

      throw new Error(`Geocoding failed: ${response.data.status}`);
    } catch (error) {
      console.error('Geocoding error:', error.message);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat, lng) {
    try {
      const cacheKey = `reverse_geocode:${lat},${lng}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await axios.get(this.baseUrl, {
        params: {
          latlng: `${lat},${lng}`,
          key: this.apiKey,
          language: 'en'
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        const result = response.data.results[0];
        const reverseResult = {
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          types: result.types,
          components: this.extractAddressComponents(result.address_components)
        };

        // Cache the result
        await cacheService.setWithExpiry(cacheKey, JSON.stringify(reverseResult), this.cacheTTL);
        
        return reverseResult;
      }

      throw new Error(`Reverse geocoding failed: ${response.data.status}`);
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      throw error;
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(addresses) {
    const results = [];
    const batchSize = 10; // Process in batches to avoid rate limits
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(address => 
        this.geocodeAddress(address).catch(error => ({ error: error.message, address }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return results;
  }

  /**
   * Geocode with caching optimization
   */
  async geocodeWithCache(address) {
    return await this.geocodeAddress(address);
  }

  /**
   * Geocode with detailed components
   */
  async geocodeWithComponents(address) {
    const result = await this.geocodeAddress(address);
    if (result) {
      result.components = this.extractAddressComponents(result.address_components);
    }
    return result;
  }

  /**
   * Cache geocoding result for later use
   */
  async cacheGeocodingResult(address, result) {
    const cacheKey = `geocode:${address.toLowerCase()}`;
    await cacheService.setWithExpiry(cacheKey, JSON.stringify(result), this.cacheTTL);
  }

  /**
   * Get cached geocoding result
   */
  async getCachedGeocodingResult(address) {
    const cacheKey = `geocode:${address.toLowerCase()}`;
    const cached = await cacheService.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Extract address components into structured format
   */
  extractAddressComponents(components) {
    if (!components) return {};

    const extracted = {};
    
    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        extracted.street_number = component.long_name;
      }
      if (types.includes('route')) {
        extracted.street_name = component.long_name;
      }
      if (types.includes('locality')) {
        extracted.city = component.long_name;
      }
      if (types.includes('administrative_area_level_1')) {
        extracted.state = component.long_name;
        extracted.state_code = component.short_name;
      }
      if (types.includes('country')) {
        extracted.country = component.long_name;
        extracted.country_code = component.short_name;
      }
      if (types.includes('postal_code')) {
        extracted.postal_code = component.long_name;
      }
      if (types.includes('sublocality')) {
        extracted.neighborhood = component.long_name;
      }
    });

    return extracted;
  }

  /**
   * Validate geocoding API key
   */
  async validateApiKey() {
    try {
      const testAddress = 'Berlin, Germany';
      await this.geocodeAddress(testAddress);
      return true;
    } catch (error) {
      console.error('API key validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get geocoding usage statistics
   */
  getUsageStats() {
    // This would typically connect to Google Cloud Console APIs
    // For now, return mock data structure
    return {
      dailyRequests: 0,
      monthlyRequests: 0,
      quotaLimit: 40000,
      cacheHitRate: 0.85
    };
  }
}

module.exports = GeocodingService;
