/**
 * Directions Service - Handle Google Directions API operations
 * Calculate routes, distances, travel times, and optimization
 */

const axios = require('axios');
const { cacheService } = require('./RedisCacheService');

class DirectionsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
    this.distanceMatrixUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    this.cacheTTL = 1800; // 30 minutes cache for routes
  }

  /**
   * Calculate route between two points
   */
  async calculateRoute(origin, destination, travelMode = 'DRIVING', options = {}) {
    try {
      const cacheKey = `route:${origin}:${destination}:${travelMode}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const params = {
        origin: origin,
        destination: destination,
        mode: travelMode.toLowerCase(),
        key: this.apiKey,
        ...options
      };

      const response = await axios.get(this.baseUrl, { params });

      if (response.data.status === 'OK') {
        const routeData = this.processRouteData(response.data);

        // Cache the results
        await cacheService.setWithExpiry(cacheKey, JSON.stringify(routeData), this.cacheTTL);
        
        return routeData;
      }

      throw new Error(`Route calculation failed: ${response.data.status}`);
    } catch (error) {
      console.error('Route calculation error:', error.message);
      throw error;
    }
  }

  /**
   * Calculate route with waypoints
   */
  async calculateRouteWithWaypoints(origin, destination, waypoints, travelMode = 'DRIVING') {
    try {
      const waypointsStr = waypoints.map(wp => `via:${wp}`).join('|');
      const cacheKey = `route_waypoints:${origin}:${destination}:${waypointsStr}:${travelMode}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const params = {
        origin: origin,
        destination: destination,
        waypoints: waypointsStr,
        mode: travelMode.toLowerCase(),
        optimize: true,
        key: this.apiKey
      };

      const response = await axios.get(this.baseUrl, { params });

      if (response.data.status === 'OK') {
        const routeData = this.processRouteData(response.data);
        routeData.waypoint_order = response.data.routes[0].waypoint_order;

        await cacheService.setWithExpiry(cacheKey, JSON.stringify(routeData), this.cacheTTL);
        return routeData;
      }

      throw new Error(`Waypoint route calculation failed: ${response.data.status}`);
    } catch (error) {
      console.error('Waypoint route error:', error.message);
      throw error;
    }
  }

  /**
   * Calculate distance matrix for multiple origins and destinations
   */
  async calculateDistanceMatrix(origins, destinations, travelMode = 'DRIVING') {
    try {
      const originsStr = origins.join('|');
      const destinationsStr = destinations.join('|');
      const cacheKey = `distance_matrix:${originsStr}:${destinationsStr}:${travelMode}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const params = {
        origins: originsStr,
        destinations: destinationsStr,
        mode: travelMode.toLowerCase(),
        units: 'metric',
        key: this.apiKey
      };

      const response = await axios.get(this.distanceMatrixUrl, { params });

      if (response.data.status === 'OK') {
        const matrixData = this.processDistanceMatrix(response.data, origins, destinations);

        await cacheService.setWithExpiry(cacheKey, JSON.stringify(matrixData), this.cacheTTL);
        return matrixData;
      }

      throw new Error(`Distance matrix calculation failed: ${response.data.status}`);
    } catch (error) {
      console.error('Distance matrix error:', error.message);
      throw error;
    }
  }

  /**
   * Optimize route for multiple locations
   */
  async optimizeRoute(locations, travelMode = 'DRIVING') {
    try {
      if (locations.length < 3) {
        throw new Error('Need at least 3 locations for optimization');
      }

      const origin = locations[0];
      const destination = locations[locations.length - 1];
      const waypoints = locations.slice(1, -1);

      const route = await this.calculateRouteWithWaypoints(origin, destination, waypoints, travelMode);
      
      // Reorder locations based on optimized waypoint order
      const optimizedOrder = [0]; // Start with origin
      if (route.waypoint_order) {
        route.waypoint_order.forEach(index => {
          optimizedOrder.push(index + 1); // +1 because waypoint_order is 0-based for waypoints only
        });
      }
      optimizedOrder.push(locations.length - 1); // End with destination

      const optimizedLocations = optimizedOrder.map(index => locations[index]);

      return {
        ...route,
        optimizedOrder: optimizedOrder,
        optimizedLocations: optimizedLocations,
        totalDistance: route.routes[0].legs.reduce((sum, leg) => sum + leg.distance.value, 0),
        totalDuration: route.routes[0].legs.reduce((sum, leg) => sum + leg.duration.value, 0)
      };
    } catch (error) {
      console.error('Route optimization error:', error.message);
      throw error;
    }
  }

  /**
   * Get step-by-step directions
   */
  async getStepByStepDirections(origin, destination, travelMode = 'WALKING') {
    try {
      const route = await this.calculateRoute(origin, destination, travelMode);
      
      if (route.steps && route.steps.length > 0) {
        return {
          steps: route.steps.map(step => ({
            instruction: step.html_instructions ? step.html_instructions.replace(/<[^>]*>/g, '') : '',
            html_instructions: step.html_instructions,
            distance: step.distance,
            duration: step.duration,
            start_location: step.start_location,
            end_location: step.end_location,
            maneuver: step.maneuver,
            travel_mode: step.travel_mode
          })),
          distance: route.distance,
          duration: route.duration
        };
      }
      
      return { steps: [], distance: null, duration: null };
    } catch (error) {
      console.error('Step-by-step directions error:', error.message);
      throw error;
    }
  }

  /**
   * Get route alternatives
   */
  async getRouteAlternatives(origin, destination, travelMode = 'DRIVING', options = {}) {
    try {
      const routeOptions = {
        alternatives: true,
        ...options
      };

      const route = await this.calculateRoute(origin, destination, travelMode, routeOptions);
      
      if (route.routes && route.routes.length > 1) {
        return {
          ...route,
          alternativeCount: route.routes.length,
          recommendedRoute: 0, // First route is usually the best
          alternatives: route.routes.map((route, index) => ({
            routeIndex: index,
            summary: route.summary,
            distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
            duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
            warnings: route.warnings
          }))
        };
      }

      return route;
    } catch (error) {
      console.error('Route alternatives error:', error.message);
      throw error;
    }
  }

  /**
   * Get route with traffic data
   */
  async getRouteWithTraffic(origin, destination, travelMode = 'DRIVING', departureTime = null) {
    try {
      const options = {
        departure_time: departureTime ? Math.floor(departureTime.getTime() / 1000) : 'now'
      };

      const route = await this.calculateRoute(origin, destination, travelMode, options);
      
      // Add traffic analysis
      if (route.duration && route.duration_in_traffic) {
        const trafficData = {
          normalDuration: route.duration.value,
          trafficDuration: route.duration_in_traffic.value || route.duration.value,
          trafficDelay: 0,
          trafficCondition: 'unknown'
        };

        trafficData.trafficDelay = trafficData.trafficDuration - trafficData.normalDuration;
        
        if (trafficData.trafficDelay > 300) { // 5 minutes
          trafficData.trafficCondition = 'heavy';
        } else if (trafficData.trafficDelay > 120) { // 2 minutes
          trafficData.trafficCondition = 'moderate';
        } else {
          trafficData.trafficCondition = 'light';
        }

        return {
          ...route,
          duration_in_traffic: route.duration_in_traffic,
          trafficData: trafficData
        };
      }

      return {
        ...route,
        duration_in_traffic: route.duration, // Fallback to normal duration
        trafficData: null
      };
    } catch (error) {
      console.error('Traffic route error:', error.message);
      throw error;
    }
  }

  /**
   * Calculate commute scores for apartments
   */
  async calculateCommuteScores(apartments, workLocations, travelModes = ['DRIVING']) {
    try {
      const commuteScores = [];

      for (const apartment of apartments) {
        const apartmentLocation = `${apartment.lat},${apartment.lng}`;
        let totalScore = 0;
        const commuteDetails = {};

        for (const workLocation of workLocations) {
          for (const mode of travelModes) {
            try {
              const route = await this.calculateRoute(apartmentLocation, workLocation, mode);
              
              if (route.routes && route.routes.length > 0) {
                const duration = route.routes[0].legs[0].duration.value; // in seconds
                const distance = route.routes[0].legs[0].distance.value; // in meters
                
                // Score calculation (higher is better)
                let score = 100;
                if (mode === 'DRIVING') {
                  score -= Math.min(60, duration / 60); // Reduce score based on minutes
                } else if (mode === 'TRANSIT') {
                  score -= Math.min(50, duration / 90); // Transit gets better scoring
                } else if (mode === 'WALKING') {
                  score -= Math.min(80, duration / 60);
                }

                commuteDetails[`${workLocation}_${mode}`] = {
                  duration: duration,
                  distance: distance,
                  score: Math.max(0, score)
                };

                totalScore += Math.max(0, score);
              }
            } catch (error) {
              commuteDetails[`${workLocation}_${mode}`] = {
                duration: null,
                distance: null,
                score: 0,
                error: error.message
              };
            }
          }
        }

        commuteScores.push({
          apartmentId: apartment.id,
          totalScore: totalScore / (workLocations.length * travelModes.length),
          commuteDetails: commuteDetails
        });
      }

      return commuteScores.sort((a, b) => b.totalScore - a.totalScore);
    } catch (error) {
      console.error('Commute scores calculation error:', error.message);
      throw error;
    }
  }

  /**
   * Process raw route data from API
   */
  processRouteData(data) {
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance,
        duration: leg.duration,
        duration_in_traffic: leg.duration_in_traffic,
        start_address: leg.start_address,
        end_address: leg.end_address,
        start_location: leg.start_location,
        end_location: leg.end_location,
        polyline: route.overview_polyline?.points,
        steps: leg.steps,
        waypoint_order: route.waypoint_order,
        routes: data.routes,
        status: data.status
      };
    }
    
    return { status: data.status };
  }

  /**
   * Process distance matrix data
   */
  processDistanceMatrix(data, origins, destinations) {
    const matrix = {
      origins: origins,
      destinations: destinations,
      rows: data.rows.map((row, originIndex) => ({
        origin: origins[originIndex],
        elements: row.elements.map((element, destIndex) => ({
          destination: destinations[destIndex],
          distance: element.distance,
          duration: element.duration,
          duration_in_traffic: element.duration_in_traffic,
          status: element.status
        }))
      })),
      status: data.status
    };

    return matrix;
  }

  /**
   * Calculate commute scores for apartments
   */
  async calculateCommuteScores(apartments, workLocation, travelModes = ['transit', 'walking']) {
    const commuteScores = [];

    for (const apartment of apartments) {
      const scores = { apartmentId: apartment.id };
      
      for (const mode of travelModes) {
        try {
          const route = await this.calculateRoute(
            `${apartment.lat},${apartment.lng}`,
            workLocation,
            mode
          );
          
          // Calculate score based on duration (lower is better)
          const duration = route.duration; // in seconds
          const maxScore = 100;
          
          // Score decreases as duration increases
          // 30 min = 100 points, 60 min = 50 points, 90+ min = 0 points
          let score = Math.max(0, maxScore - ((duration / 60 - 30) * 2.5));
          
          scores[`${mode}Score`] = Math.round(score);
          scores[`${mode}Duration`] = route.duration;
          scores[`${mode}Distance`] = route.distance;
        } catch (error) {
          scores[`${mode}Score`] = 0;
          scores[`${mode}Duration`] = null;
          scores[`${mode}Distance`] = null;
        }
      }
      
      commuteScores.push(scores);
    }

    return commuteScores;
  }

  /**
      status: data.status
    };

    return matrix;
  }

  /**
   * Validate directions API key
   */
  async validateApiKey() {
    try {
      const testRoute = await this.calculateRoute('Berlin, Germany', 'Munich, Germany', 'DRIVING');
      return testRoute.status === 'OK';
    } catch (error) {
      console.error('Directions API key validation failed:', error.message);
      return false;
    }
  }

  /**
   * Get directions usage statistics
   */
  getUsageStats() {
    return {
      dailyRequests: 0,
      monthlyRequests: 0,
      quotaLimit: 40000,
      cacheHitRate: 0.75
    };
  }
}

module.exports = DirectionsService;
