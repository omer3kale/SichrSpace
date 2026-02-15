const { supabase } = require('../config/supabase');

class FeedbackService {
  static async create(feedbackData) {
    const { data, error } = await supabase
      .from('feedback')
      .insert([feedbackData])
      .select(`
        *,
        user:users(
          id,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        user:users(
          id,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async list(options = {}) {
    let query = supabase
      .from('feedback')
      .select(`
        *,
        user:users(
          id,
          username,
          first_name,
          last_name,
          email
        )
      `);
    
    // Filters
    if (options.category) {
      query = query.eq('category', options.category);
    }
    
    if (options.rating) {
      query = query.eq('rating', options.rating);
    }
    
    if (options.resolved !== undefined) {
      query = query.eq('resolved', options.resolved);
    }
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
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
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        user:users(
          id,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async markResolved(id, resolved = true) {
    return this.update(id, { resolved });
  }

  static async delete(id) {
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }

  static async getStatistics() {
    const { data: allFeedback, error } = await supabase
      .from('feedback')
      .select('rating, resolved, category');
    
    if (error) throw error;
    
    const stats = {
      total: allFeedback.length,
      resolved: allFeedback.filter(f => f.resolved).length,
      unresolved: allFeedback.filter(f => !f.resolved).length,
      averageRating: allFeedback.length > 0 ? 
        (allFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / allFeedback.filter(f => f.rating).length).toFixed(2) : 0,
      byCategory: {},
      byRating: {
        1: allFeedback.filter(f => f.rating === 1).length,
        2: allFeedback.filter(f => f.rating === 2).length,
        3: allFeedback.filter(f => f.rating === 3).length,
        4: allFeedback.filter(f => f.rating === 4).length,
        5: allFeedback.filter(f => f.rating === 5).length
      }
    };
    
    // Group by category
    allFeedback.forEach(feedback => {
      const category = feedback.category || 'general';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });
    
    return stats;
  }
}

class GdprService {
  static async findExistingRequest(userId, requestType) {
    const { data, error } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('request_type', requestType)
      .in('status', ['pending', 'processing'])
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  }

  static async createRequest(requestData) {
    const { data, error } = await supabase
      .from('gdpr_requests')
      .insert([requestData])
      .select(`
        *,
        user:users(
          id,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getRequests(options = {}) {
    let query = supabase
      .from('gdpr_requests')
      .select(`
        *,
        user:users(
          id,
          username,
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    if (options.status) {
      query = query.eq('status', options.status);
    }
    
    if (options.requestType) {
      query = query.eq('request_type', options.requestType);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  static async updateRequestStatus(id, status, notes = null) {
    const updateData = { status };
    if (notes) updateData.notes = notes;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('gdpr_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async logDataProcessing(logData) {
    const { data, error } = await supabase
      .from('data_processing_logs')
      .insert([logData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getProcessingLogs(options = {}) {
    let query = supabase
      .from('data_processing_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    if (options.action) {
      query = query.eq('action', options.action);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  static async createConsent(consentData) {
    // First check if consent already exists for this user and purpose
    const { data: existing } = await supabase
      .from('consents')
      .select('*')
      .eq('user_id', consentData.user_id)
      .eq('purpose_id', consentData.purpose_id)
      .single();
    
    if (existing) {
      // Update existing consent
      return this.updateConsent(existing.id, {
        granted: consentData.granted,
        granted_at: consentData.granted ? new Date().toISOString() : existing.granted_at,
        withdrawn_at: !consentData.granted ? new Date().toISOString() : null
      });
    }
    
    // Create new consent
    const { data, error } = await supabase
      .from('consents')
      .insert([consentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async updateConsent(id, updateData) {
    const { data, error } = await supabase
      .from('consents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getUserConsents(userId) {
    const { data, error } = await supabase
      .from('consents')
      .select(`
        *,
        purpose:consent_purposes(
          id,
          name,
          description,
          required
        )
      `)
      .eq('user_id', userId);
    
    if (error) throw error;
    return data;
  }

  // Consent Management Methods
  static async getConsentPurposes(options = {}) {
    const { skip = 0, limit = 20 } = options;
    
    const { data, error } = await supabase
      .from('consent_purposes')
      .select(`
        *,
        user:users(
          id,
          username,
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .range(skip, skip + limit - 1);
    
    if (error) throw error;
    return data;
  }

  static async countConsentPurposes() {
    const { count, error } = await supabase
      .from('consent_purposes')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    return count;
  }

  static async getConsentStatistics() {
    // Simplified statistics - in production you might want more complex aggregations
    const { data, error } = await supabase
      .from('consent_purposes')
      .select('purpose, consented, withdrawal_timestamp, expiry_date');
    
    if (error) throw error;
    
    // Group by purpose and calculate stats
    const stats = {};
    data.forEach(consent => {
      if (!stats[consent.purpose]) {
        stats[consent.purpose] = { total: 0, consented: 0, withdrawn: 0, expired: 0 };
      }
      stats[consent.purpose].total++;
      if (consent.consented) stats[consent.purpose].consented++;
      if (consent.withdrawal_timestamp) stats[consent.purpose].withdrawn++;
      if (consent.expiry_date && new Date(consent.expiry_date) < new Date()) {
        stats[consent.purpose].expired++;
      }
    });
    
    return Object.entries(stats).map(([purpose, data]) => ({
      _id: purpose,
      ...data
    }));
  }

  static async updateConsentPurpose(id, updates) {
    const { data, error } = await supabase
      .from('consent_purposes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Data Breach Management
  static async getDataBreaches(filter = {}) {
    let query = supabase
      .from('data_breaches')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (filter.severity) {
      query = query.eq('severity', filter.severity);
    }
    
    if (filter.status) {
      query = query.eq('status', filter.status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async createDPIA(dpiaData) {
    const { data, error } = await supabase
      .from('dpias')
      .insert([dpiaData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getDataProcessingLogs(filter = {}) {
    let query = supabase
      .from('data_processing_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000); // Prevent memory issues
    
    if (filter.user_id) {
      query = query.eq('user_id', filter.user_id);
    }
    
    if (filter.action) {
      query = query.eq('action', filter.action);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Alias for backward compatibility
  static async createGdprRequest(requestData) {
    return this.createRequest(requestData);
  }
}

module.exports = {
  FeedbackService,
  GdprService
};
