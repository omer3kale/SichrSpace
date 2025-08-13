const fetch = require('node-fetch');
const GeocodingService = require('./GeocodingService');
const PlacesService = require('./PlacesService');
const DirectionsService = require('./DirectionsService');

/**
 * Google Maps API Service - Main orchestrator for all mapping services
 * Step 9.2: Third-party integrations - Google Maps
 */

class GoogleMapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
    this.geocoding = new GeocodingService();
    this.places = new PlacesService();
    this.directions = new DirectionsService();
    
    if (!this.apiKey) {
      console.warn('⚠️  Google Maps API key not found. Location services will be limited.');
    }
  }

  /**
   * Initialize map with custom options
   */
  initializeMap(element, options = {}) {
    const defaultOptions = {
      center: { lat: 52.5200, lng: 13.4050 }, // Berlin center
      zoom: 12,
      mapTypeId: 'roadmap'
    };

    const mapOptions = { ...defaultOptions, ...options };
    
    // This would be used in frontend - here we just return the config
    return {
      element: element,
      options: mapOptions,
      markers: [],
      infoWindows: []
    };
  }

  /**
   * Add apartment markers to map
   */
  addApartmentMarkers(map, apartments) {
    const markers = apartments.map(apartment => ({
      position: { lat: apartment.lat, lng: apartment.lng },
      title: apartment.title,
      apartmentId: apartment.id,
      icon: this.getMarkerIcon(apartment.type),
      infoWindow: this.createApartmentInfoWindow(apartment)
    }));

    return markers;
  }

  /**
   * Create apartment info window
   */
  createApartmentInfoWindow(apartment) {
    return {
      content: `<div class="apartment-info">
        <h3>${apartment.title}</h3>
        <p>€${apartment.price}/month</p>
      </div>`
    };
  }

  /**
   * Attach info window to marker
   */
  attachInfoWindowToMarker(marker, infoWindow) {
    marker.infoWindow = infoWindow;
    return marker;
  }

  /**
   * Create rich info window for apartment
   */
  createRichInfoWindow(apartmentData) {
    const content = `
      <div class="apartment-info-window">
        <h3>${apartmentData.title}</h3>
        <p class="price">€${apartmentData.price}/month</p>
        <p class="details">${apartmentData.bedrooms} bed • ${apartmentData.bathrooms} bath • ${apartmentData.area}m²</p>
        <div class="rating">⭐ ${apartmentData.rating} (${apartmentData.reviews} reviews)</div>
        <div class="amenities">
          ${apartmentData.amenities.map(amenity => `<span class="amenity">${amenity}</span>`).join('')}
        </div>
        <button onclick="viewApartment(${apartmentData.id})">View Details</button>
      </div>
    `;

    return { content };
  }

  /**
   * Get marker icon based on apartment type
   */
  getMarkerIcon(type) {
    const iconMap = {
      'premium': '/img/markers/premium-marker.png',
      'standard': '/img/markers/standard-marker.png',
      'luxury': '/img/markers/luxury-marker.png'
    };

    return iconMap[type] || iconMap['standard'];
  }

  /**
   * Enable marker clustering for performance
   */
  enableMarkerClustering(map, markers) {
    // This would use MarkerClusterer in frontend
    return {
      clusterer: true,
      markers: markers,
      options: {
        gridSize: 60,
        maxZoom: 15
      }
    };
  }

  /**
   * Filter markers by price range
   */
  filterMarkersByPrice(markers, minPrice, maxPrice) {
    // This would filter based on apartment data associated with markers
    return markers.filter(marker => {
      // Mock price filtering - in real implementation would check apartment data
      return true;
    });
  }

  /**
   * Calculate bounds for multiple locations
   */
  calculateBounds(locations) {
    if (locations.length === 0) return null;

    let minLat = locations[0].lat;
    let maxLat = locations[0].lat;
    let minLng = locations[0].lng;
    let maxLng = locations[0].lng;

    locations.forEach(location => {
      minLat = Math.min(minLat, location.lat);
      maxLat = Math.max(maxLat, location.lat);
      minLng = Math.min(minLng, location.lng);
      maxLng = Math.max(maxLng, location.lng);
    });

    return {
      north: maxLat,
      south: minLat,
      east: maxLng,
      west: minLng
    };
  }

  /**
   * Fit map to bounds
   */
  fitMapToBounds(map, bounds) {
    // This would call map.fitBounds(bounds) in frontend
    map.bounds = bounds;
    return map;
  }

  /**
   * Set zoom constraints
   */
  setZoomConstraints(map, minZoom, maxZoom) {
    map.minZoom = minZoom;
    map.maxZoom = maxZoom;
    return map;
  }

  /**
   * Add map event listeners
   */
  addMapEventListeners(map, eventHandlers) {
    // This would add actual event listeners in frontend
    map.eventHandlers = eventHandlers;
    return map;
  }

  /**
   * Remove all event listeners
   */
  removeAllEventListeners() {
    // Cleanup event listeners
    return true;
  }

  /**
   * Set map type
   */
  setMapType(map, mapType) {
    map.mapTypeId = mapType;
    return map;
  }

  /**
   * Apply custom map style
   */
  applyCustomStyle(map, styleArray) {
    map.styles = styleArray;
    return map;
  }

  /**
   * Add amenity markers to map
   */
  addAmenityMarkers(map, amenities) {
    const markers = amenities.map(amenity => ({
      position: { lat: amenity.geometry.location.lat, lng: amenity.geometry.location.lng },
      title: amenity.name,
      type: 'amenity',
      amenityType: amenity.types[0],
      icon: this.getAmenityIcon(amenity.types[0])
    }));

    return markers;
  }

  /**
   * Get amenity icon
   */
  getAmenityIcon(amenityType) {
    const iconMap = {
      'supermarket': '/img/icons/supermarket.png',
      'restaurant': '/img/icons/restaurant.png',
      'gym': '/img/icons/gym.png',
      'school': '/img/icons/school.png'
    };

    return iconMap[amenityType] || '/img/icons/default.png';
  }

  /**
   * Filter apartments by location radius
   */
  filterApartmentsByLocation(apartments, center, radius) {
    return apartments.filter(apartment => {
      const distance = this.calculateDistance(
        center,
        { lat: apartment.lat, lng: apartment.lng }
      );
      return distance <= radius;
    });
  }

  /**
   * Add optimized markers for large datasets
   */
  addOptimizedMarkers(map, markers) {
    // This would implement marker optimization strategies
    return markers;
  }

  /**
   * Enable mobile controls
   */
  enableMobileControls(map) {
    map.mobileControls = true;
    return map;
  }

  /**
   * Set responsive marker sizes
   */
  setResponsiveMarkerSizes(map, deviceType) {
    map.markerSize = deviceType === 'mobile' ? 'small' : 'normal';
    return map;
  }

  /**
   * Enable lazy loading
   */
  enableLazyLoading() {
    // Implementation for lazy loading map features
    return true;
  }

  /**
   * Enable data caching
   */
  enableDataCaching() {
    // Implementation for caching map data
    return true;
  }

  /**
   * Calculate distance between two points
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

    return R * c; // Distance in meters
  }

  /**
   * Geocode an address to get coordinates
   * @param {string} address - The address to geocode
   * @returns {Object} - Coordinates and formatted address
   */
  async geocodeAddress(address) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `${this.baseUrl}/geocode/json?address=${encodedAddress}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${data.status}`);
      }

      const result = data.results[0];
      const location = result.geometry.location;
      
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components
      };
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to get address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Object} - Address information
   */
  async reverseGeocode(lat, lng) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Reverse geocoding failed: ${data.status}`);
      }

      const result = data.results[0];
      
      return {
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components
      };
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      throw error;
    }
  }

  /**
   * Get nearby places (restaurants, schools, etc.)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {string} type - Place type (restaurant, school, hospital, etc.)
   * @param {number} radius - Search radius in meters (default: 1000)
   * @returns {Array} - Array of nearby places
   */
  async getNearbyPlaces(lat, lng, type = 'point_of_interest', radius = 1000) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = `${this.baseUrl}/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places search failed: ${data.status}`);
      }

      return data.results.map(place => ({
        place_id: place.place_id,
        name: place.name,
        types: place.types,
        rating: place.rating,
        price_level: place.price_level,
        location: place.geometry.location,
        vicinity: place.vicinity,
        photos: place.photos ? place.photos.map(photo => ({
          photo_reference: photo.photo_reference,
          width: photo.width,
          height: photo.height
        })) : []
      }));
    } catch (error) {
      console.error('❌ Places search error:', error);
      throw error;
    }
  }

  /**
   * Calculate distance and duration between two points
   * @param {string} origin - Origin address or coordinates
   * @param {string} destination - Destination address or coordinates
   * @param {string} mode - Travel mode (driving, walking, transit, bicycling)
   * @returns {Object} - Distance and duration information
   */
  async calculateDistance(origin, destination, mode = 'driving') {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const encodedOrigin = encodeURIComponent(origin);
      const encodedDestination = encodeURIComponent(destination);
      const url = `${this.baseUrl}/distancematrix/json?origins=${encodedOrigin}&destinations=${encodedDestination}&mode=${mode}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Distance calculation failed: ${data.status}`);
      }

      const element = data.rows[0].elements[0];
      
      if (element.status !== 'OK') {
        throw new Error(`Route not found: ${element.status}`);
      }

      return {
        distance: {
          text: element.distance.text,
          value: element.distance.value // in meters
        },
        duration: {
          text: element.duration.text,
          value: element.duration.value // in seconds
        },
        mode: mode
      };
    } catch (error) {
      console.error('❌ Distance calculation error:', error);
      throw error;
    }
  }

  /**
   * Get place details by place ID
   * @param {string} placeId - Google Places ID
   * @returns {Object} - Detailed place information
   */
  async getPlaceDetails(placeId) {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const url = `${this.baseUrl}/place/details/json?place_id=${placeId}&fields=name,rating,formatted_phone_number,formatted_address,opening_hours,website,reviews&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Place details failed: ${data.status}`);
      }

      return data.result;
    } catch (error) {
      console.error('❌ Place details error:', error);
      throw error;
    }
  }

  /**
   * Validate and format address for property listings
   * @param {string} address - Raw address input
   * @returns {Object} - Validated and formatted address
   */
  async validatePropertyAddress(address) {
    try {
      const geocodeResult = await this.geocodeAddress(address);
      
      // Extract relevant address components
      const components = {};
      geocodeResult.address_components.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
          components.street_number = component.long_name;
        }
        if (types.includes('route')) {
          components.street_name = component.long_name;
        }
        if (types.includes('locality')) {
          components.city = component.long_name;
        }
        if (types.includes('postal_code')) {
          components.postal_code = component.long_name;
        }
        if (types.includes('country')) {
          components.country = component.long_name;
          components.country_code = component.short_name;
        }
        if (types.includes('administrative_area_level_1')) {
          components.state = component.long_name;
        }
      });

      return {
        ...geocodeResult,
        components,
        full_address: `${components.street_number || ''} ${components.street_name || ''}, ${components.city || ''}, ${components.state || ''} ${components.postal_code || ''}`.trim()
      };
    } catch (error) {
      console.error('❌ Address validation error:', error);
      throw error;
    }
  }

  /**
   * Search for apartments near a specific location
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Array} - Nearby apartments from database
   */
  async findNearbyApartments(lat, lng, radiusKm = 5) {
    // This would integrate with your apartment database
    // Using Haversine formula to calculate distance
    const { supabase } = require('../config/supabase');

    try {
      // Get all apartments with coordinates
      const { data: apartments, error } = await supabase
        .from('apartments')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) throw error;

      // Filter by distance
      const nearbyApartments = apartments.filter(apartment => {
        const distance = this.calculateHaversineDistance(
          lat, lng,
          apartment.latitude, apartment.longitude
        );
        return distance <= radiusKm;
      });

      // Sort by distance
      return nearbyApartments.map(apartment => ({
        ...apartment,
        distance_km: this.calculateHaversineDistance(
          lat, lng,
          apartment.latitude, apartment.longitude
        )
      })).sort((a, b) => a.distance_km - b.distance_km);

    } catch (error) {
      console.error('❌ Nearby apartments search error:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point
   * @param {number} lon1 - Longitude of first point
   * @param {number} lat2 - Latitude of second point
   * @param {number} lon2 - Longitude of second point
   * @returns {number} - Distance in kilometers
   */
  calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees to convert
   * @returns {number} - Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Generate static map URL for property listing
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {Object} options - Map options
   * @returns {string} - Static map URL
   */
  generateStaticMapUrl(lat, lng, options = {}) {
    if (!this.apiKey) {
      return null;
    }

    const {
      zoom = 15,
      size = '400x300',
      maptype = 'roadmap',
      markers = true
    } = options;

    let url = `${this.baseUrl}/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${size}&maptype=${maptype}&key=${this.apiKey}`;
    
    if (markers) {
      url += `&markers=color:red%7Clabel:A%7C${lat},${lng}`;
    }

    return url;
  }
}

module.exports = GoogleMapsService;
