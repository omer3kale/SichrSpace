const { supabase } = require('../config/supabase');

class ViewingRequestService {
  static async create(requestData) {
    const { data, error } = await supabase
      .from('viewing_requests')
      .insert([requestData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('viewing_requests')
      .select(`
        *,
        apartment:apartments(
          id,
          title,
          location,
          price,
          images,
          owner_id
        ),
        requester:users!viewing_requests_requester_id_fkey(
          id,
          username,
          first_name,
          last_name,
          email,
          phone
        ),
        landlord:users!viewing_requests_landlord_id_fkey(
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
      .from('viewing_requests')
      .select(`
        *,
        apartment:apartments(
          id,
          title,
          location,
          price
        ),
        requester:users!viewing_requests_requester_id_fkey(
          id,
          username,
          first_name,
          last_name,
          email
        ),
        landlord:users!viewing_requests_landlord_id_fkey(
          id,
          username,
          first_name,
          last_name,
          email
        )
      `);
    
    // Filters
    if (options.requesterId) {
      query = query.eq('requester_id', options.requesterId);
    }
    
    if (options.landlordId) {
      query = query.eq('landlord_id', options.landlordId);
    }
    
    if (options.apartmentId) {
      query = query.eq('apartment_id', options.apartmentId);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.paymentStatus) {
      query = query.eq('payment_status', options.paymentStatus);
    }
    
    // Date range filters
    if (options.dateFrom) {
      query = query.gte('requested_date', options.dateFrom);
    }
    
    if (options.dateTo) {
      query = query.lte('requested_date', options.dateTo);
    }
    
    // Sorting
    query = query.order('created_at', { ascending: false });
    
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

  static async update(id, updateData) {
    const { data, error } = await supabase
      .from('viewing_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        apartment:apartments(
          id,
          title,
          location,
          price
        ),
        requester:users!viewing_requests_requester_id_fkey(
          id,
          username,
          first_name,
          last_name,
          email,
          phone
        ),
        landlord:users!viewing_requests_landlord_id_fkey(
          id,
          username,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async approve(id, confirmedDate) {
    return this.update(id, {
      status: 'approved',
      confirmed_date: confirmedDate
    });
  }

  static async reject(id, reason = null) {
    const updateData = { status: 'rejected' };
    if (reason) {
      updateData.notes = reason;
    }
    return this.update(id, updateData);
  }

  static async complete(id) {
    return this.update(id, { status: 'completed' });
  }

  static async cancel(id) {
    return this.update(id, { status: 'cancelled' });
  }

  static async updatePaymentStatus(id, status, paymentId = null) {
    const updateData = { payment_status: status };
    if (paymentId) {
      updateData.payment_id = paymentId;
    }
    return this.update(id, updateData);
  }

  static async findByRequester(requesterId, options = {}) {
    return this.list({ ...options, requesterId });
  }

  static async findByLandlord(landlordId, options = {}) {
    return this.list({ ...options, landlordId });
  }

  static async findByApartment(apartmentId, options = {}) {
    return this.list({ ...options, apartmentId });
  }

  static async getStatistics(userId = null) {
    let query = supabase
      .from('viewing_requests')
      .select('status, payment_status');
    
    if (userId) {
      query = query.or(`requester_id.eq.${userId},landlord_id.eq.${userId}`);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      approved: data.filter(r => r.status === 'approved').length,
      completed: data.filter(r => r.status === 'completed').length,
      rejected: data.filter(r => r.status === 'rejected').length,
      cancelled: data.filter(r => r.status === 'cancelled').length,
      paid: data.filter(r => r.payment_status === 'paid').length,
      unpaid: data.filter(r => r.payment_status === 'pending').length
    };
    
    return stats;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('viewing_requests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = ViewingRequestService;
