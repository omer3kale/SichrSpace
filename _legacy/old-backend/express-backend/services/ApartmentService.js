const { supabase } = require('../config/supabase');

class ApartmentService {
  static async create(apartmentData) {
    const { data, error } = await supabase
      .from('apartments')
      .insert([apartmentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('apartments')
      .select(`
        *,
        owner:users!apartments_owner_id_fkey(
          id,
          username,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async list(options = {}) {
    let query = supabase
      .from('apartments')
      .select(`
        *,
        owner:users!apartments_owner_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `);
    
    // Filters
    if (options.city) {
      query = query.ilike('city', `%${options.city}%`);
    }
    
    if (options.location) {
      query = query.ilike('location', `%${options.location}%`);
    }
    
    if (options.minPrice) {
      query = query.gte('price', options.minPrice);
    }
    
    if (options.maxPrice) {
      query = query.lte('price', options.maxPrice);
    }
    
    if (options.minRooms) {
      query = query.gte('rooms', options.minRooms);
    }
    
    if (options.maxRooms) {
      query = query.lte('rooms', options.maxRooms);
    }
    
    if (options.minSize) {
      query = query.gte('size', options.minSize);
    }
    
    if (options.maxSize) {
      query = query.lte('size', options.maxSize);
    }
    
    if (options.furnished !== undefined) {
      query = query.eq('furnished', options.furnished);
    }
    
    if (options.petFriendly !== undefined) {
      query = query.eq('pet_friendly', options.petFriendly);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.eq('status', 'available'); // Default to available
    }
    
    if (options.ownerId) {
      query = query.eq('owner_id', options.ownerId);
    }
    
    // Sorting
    if (options.sortBy) {
      const ascending = options.sortOrder !== 'desc';
      query = query.order(options.sortBy, { ascending });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    
    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  // Alias for list method for backward compatibility
  static async findAll(options = {}) {
    return this.list(options);
  }

  static async update(id, updateData) {
    const { data, error } = await supabase
      .from('apartments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('apartments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async findByOwner(ownerId, options = {}) {
    return this.list({ ...options, ownerId });
  }

  static async updateStatus(id, status) {
    return this.update(id, { status });
  }

  static async searchByLocation(location, radius = 10) {
    // Simple text search for now, can be enhanced with PostGIS for geo-search
    const { data, error } = await supabase
      .from('apartments')
      .select(`
        *,
        owner:users!apartments_owner_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .or(`location.ilike.%${location}%,city.ilike.%${location}%,postal_code.ilike.%${location}%`)
      .eq('status', 'available')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async getStatistics() {
    const { data: totalApartments, error: totalError } = await supabase
      .from('apartments')
      .select('id', { count: 'exact' });
    
    const { data: availableApartments, error: availableError } = await supabase
      .from('apartments')
      .select('id', { count: 'exact' })
      .eq('status', 'available');
    
    const { data: rentedApartments, error: rentedError } = await supabase
      .from('apartments')
      .select('id', { count: 'exact' })
      .eq('status', 'rented');
    
    if (totalError || availableError || rentedError) {
      throw totalError || availableError || rentedError;
    }
    
    return {
      total: totalApartments.length,
      available: availableApartments.length,
      rented: rentedApartments.length,
      occupancyRate: totalApartments.length > 0 ? 
        ((rentedApartments.length / totalApartments.length) * 100).toFixed(1) : 0
    };
  }
}

module.exports = ApartmentService;
