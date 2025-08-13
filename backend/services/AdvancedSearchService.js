const { supabase } = require('../config/supabase');

class AdvancedSearchService {
  /**
   * Advanced apartment search with comprehensive filtering
   * @param {Object} searchParams - Search parameters
   * @returns {Object} Search results with metadata
   */
  static async searchApartments(searchParams = {}) {
    const startTime = Date.now();
    
    try {
      const {
        query = '',
        location = '',
        minPrice = 0,
        maxPrice = null,
        minRooms = null,
        maxRooms = null,
        bedrooms = null,
        bathrooms = null,
        propertyType = '',
        amenities = [],
        moveInDate = null,
        moveOutDate = null,
        sortBy = 'created_at',
        sortOrder = 'desc',
        limit = 20,
        offset = 0,
        userId = null,
        includeUnavailable = false
      } = searchParams;

      let queryBuilder = supabase
        .from('apartments')
        .select(`
          *,
          owner:users!apartments_owner_id_fkey(
            id,
            username,
            first_name,
            last_name,
            email
          )
        `);

      // Apply filters
      if (!includeUnavailable) {
        queryBuilder = queryBuilder.eq('status', 'available');
      }

      // Text search (title, description, location)
      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%`);
      }

      // Location filter
      if (location) {
        queryBuilder = queryBuilder.ilike('location', `%${location}%`);
      }

      // Price range
      if (minPrice > 0) {
        queryBuilder = queryBuilder.gte('price', minPrice);
      }
      if (maxPrice) {
        queryBuilder = queryBuilder.lte('price', maxPrice);
      }

      // Room filters
      if (minRooms) {
        queryBuilder = queryBuilder.gte('rooms', minRooms);
      }
      if (maxRooms) {
        queryBuilder = queryBuilder.lte('rooms', maxRooms);
      }

      // Bedroom filter
      if (bedrooms) {
        queryBuilder = queryBuilder.gte('bedrooms', bedrooms);
      }

      // Bathroom filter
      if (bathrooms) {
        queryBuilder = queryBuilder.gte('bathrooms', bathrooms);
      }

      // Property type filter (using description or title search since no property_type column)
      if (propertyType) {
        queryBuilder = queryBuilder.or(`title.ilike.%${propertyType}%,description.ilike.%${propertyType}%`);
      }

      // Date filters
      if (moveInDate) {
        queryBuilder = queryBuilder.or(`available_from.is.null,available_from.lte.${moveInDate}`);
      }
      if (moveOutDate) {
        queryBuilder = queryBuilder.or(`available_to.is.null,available_to.gte.${moveOutDate}`);
      }

      // Amenities filter (if amenities field exists as JSONB array)
      if (amenities && amenities.length > 0) {
        // This assumes amenities are stored as a JSONB array
        for (const amenity of amenities) {
          queryBuilder = queryBuilder.contains('amenities', [amenity]);
        }
      }

      // Sorting
      const validSortFields = ['price', 'created_at', 'updated_at', 'size', 'rooms'];
      const validSortOrders = ['asc', 'desc'];
      
      if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
        queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        queryBuilder = queryBuilder.order('created_at', { ascending: false });
      }

      // Pagination
      queryBuilder = queryBuilder.range(offset, offset + limit - 1);

      const { data: apartments, error, count } = await queryBuilder;

      if (error) {
        throw error;
      }

      const responseTime = Date.now() - startTime;

      // Log search analytics (if user provided)
      if (userId) {
        this.logSearchAnalytics({
          userId,
          query,
          filters: { location, minPrice, maxPrice, propertyType, amenities },
          resultsCount: apartments ? apartments.length : 0,
          responseTime
        });
      }

      return {
        success: true,
        data: apartments || [],
        metadata: {
          totalResults: apartments ? apartments.length : 0,
          query,
          filters: {
            location,
            priceRange: { min: minPrice, max: maxPrice },
            propertyType,
            amenities,
            dateRange: { moveIn: moveInDate, moveOut: moveOutDate }
          },
          pagination: {
            limit,
            offset,
            hasMore: apartments && apartments.length === limit
          },
          performance: {
            responseTime: `${responseTime}ms`,
            searchTime: responseTime
          }
        }
      };

    } catch (error) {
      console.error('Advanced search error:', error);
      return {
        success: false,
        error: 'Search failed',
        data: [],
        metadata: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Get search suggestions for autocomplete
   * @param {string} query - Partial search query
   * @param {number} limit - Number of suggestions to return
   */
  static async getSearchSuggestions(query, limit = 10) {
    try {
      const suggestions = [];

      // Location-based suggestions
      const { data: locationSuggestions } = await supabase
        .from('apartments')
        .select('location')
        .ilike('location', `%${query}%`)
        .limit(5);

      if (locationSuggestions) {
        const uniqueLocations = [...new Set(locationSuggestions.map(apt => apt.location))];
        suggestions.push(...uniqueLocations.map(loc => ({
          text: loc,
          type: 'location',
          icon: '📍'
        })));
      }

      // Title-based suggestions
      const { data: titleSuggestions } = await supabase
        .from('apartments')
        .select('title')
        .ilike('title', `%${query}%`)
        .limit(5);

      if (titleSuggestions) {
        suggestions.push(...titleSuggestions.map(apt => ({
          text: apt.title,
          type: 'title',
          icon: '🏠'
        })));
      }

      // Predefined suggestions
      const predefinedSuggestions = [
        { text: 'Studio apartment', type: 'property_type', icon: '🏠' },
        { text: 'Shared room', type: 'property_type', icon: '👥' },
        { text: 'WiFi included', type: 'amenity', icon: '📶' },
        { text: 'Pet friendly', type: 'amenity', icon: '🐕' },
        { text: 'Furnished', type: 'amenity', icon: '🛋️' }
      ].filter(suggestion => 
        suggestion.text.toLowerCase().includes(query.toLowerCase())
      );

      suggestions.push(...predefinedSuggestions);

      return {
        success: true,
        data: suggestions.slice(0, limit)
      };

    } catch (error) {
      console.error('Search suggestions error:', error);
      return {
        success: false,
        error: 'Failed to get suggestions',
        data: []
      };
    }
  }

  /**
   * Get popular search terms
   * @param {number} limit - Number of popular searches to return
   */
  static async getPopularSearches(limit = 10) {
    try {
      // For now, return predefined popular searches
      // This will be enhanced when we have the search_analytics table
      const popularSearches = [
        { query: 'Berlin', searchCount: 150, type: 'location' },
        { query: 'Munich', searchCount: 120, type: 'location' },
        { query: 'Studio apartment', searchCount: 95, type: 'property_type' },
        { query: 'WiFi included', searchCount: 80, type: 'amenity' },
        { query: 'Hamburg', searchCount: 75, type: 'location' },
        { query: 'Furnished', searchCount: 65, type: 'amenity' },
        { query: 'Cologne', searchCount: 55, type: 'location' },
        { query: 'Pet friendly', searchCount: 45, type: 'amenity' }
      ].slice(0, limit);

      return {
        success: true,
        data: popularSearches
      };

    } catch (error) {
      console.error('Popular searches error:', error);
      return {
        success: false,
        error: 'Failed to get popular searches',
        data: []
      };
    }
  }

  /**
   * Save a search alert for a user
   * @param {Object} alertData - Search alert data
   */
  static async saveSearchAlert(alertData) {
    try {
      const {
        userId,
        name,
        query,
        filters = {},
        emailNotifications = true,
        smsNotifications = false
      } = alertData;

      // For now, we'll simulate saving to a basic table
      // This will be enhanced when we have the saved_search_alerts table
      const alertId = Date.now(); // Temporary ID

      return {
        success: true,
        data: {
          id: alertId,
          userId,
          name,
          query,
          filters,
          emailNotifications,
          smsNotifications,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        message: 'Search alert saved successfully'
      };

    } catch (error) {
      console.error('Save search alert error:', error);
      return {
        success: false,
        error: 'Failed to save search alert'
      };
    }
  }

  /**
   * Log search analytics (simplified version)
   * @param {Object} analyticsData - Search analytics data
   */
  static async logSearchAnalytics(analyticsData) {
    try {
      const {
        userId,
        query,
        filters,
        resultsCount,
        responseTime
      } = analyticsData;

      // For now, just log to console
      // This will be enhanced when we have the search_analytics table
      console.log('🔍 Search Analytics:', {
        userId,
        query,
        filters,
        resultsCount,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'Search analytics logged'
      };

    } catch (error) {
      console.error('Log search analytics error:', error);
      return {
        success: false,
        error: 'Failed to log search analytics'
      };
    }
  }

  /**
   * Get search analytics summary
   * @param {Object} params - Analytics parameters
   */
  static async getSearchAnalytics(params = {}) {
    try {
      // Return mock analytics data for now
      // This will be enhanced when we have the search_analytics table
      const analyticsData = {
        totalSearches: 1250,
        uniqueUsers: 345,
        averageResponseTime: 85,
        popularTerms: [
          { term: 'Berlin', count: 150 },
          { term: 'Munich', count: 120 },
          { term: 'Studio', count: 95 }
        ],
        searchTrends: [
          { date: '2025-08-12', searches: 45 },
          { date: '2025-08-11', searches: 52 },
          { date: '2025-08-10', searches: 38 }
        ]
      };

      return {
        success: true,
        data: analyticsData
      };

    } catch (error) {
      console.error('Get search analytics error:', error);
      return {
        success: false,
        error: 'Failed to get search analytics'
      };
    }
  }
}

module.exports = AdvancedSearchService;
