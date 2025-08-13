// AnalyticsDashboardService.js
// Provides analytics and reporting for admin dashboard
const { supabase } = require('../config/supabase');

class AnalyticsDashboardService {
  // Get overall search stats
  static async getSearchStats() {
    // Total searches, unique users, avg response time
    const { data, error } = await supabase.rpc('get_search_stats');
    if (error) return { success: false, error };
    return { success: true, data };
  }

  // Get popular search terms
  static async getPopularSearches(limit = 10) {
    const { data, error } = await supabase
      .from('popular_searches')
      .select('query,search_count')
      .order('search_count', { ascending: false })
      .limit(limit);
    if (error) return { success: false, error };
    return { success: true, data };
  }

  // Get search activity over time (daily)
  static async getSearchActivity(days = 30) {
    const since = new Date(Date.now() - days*24*60*60*1000).toISOString();
    const { data, error } = await supabase
      .from('search_analytics')
      .select('created_at')
      .gte('created_at', since);
    if (error) return { success: false, error };
    // Group by day
    const activity = {};
    data.forEach(row => {
      const day = row.created_at.split('T')[0];
      activity[day] = (activity[day] || 0) + 1;
    });
    return { success: true, data: activity };
  }

  // Get top locations
  static async getTopLocations(limit = 5) {
    const { data, error } = await supabase
      .from('search_locations')
      .select('name,popularity')
      .order('popularity', { ascending: false })
      .limit(limit);
    if (error) return { success: false, error };
    return { success: true, data };
  }
}

module.exports = AnalyticsDashboardService;
