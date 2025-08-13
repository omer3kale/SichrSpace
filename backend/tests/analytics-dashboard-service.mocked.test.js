const proxyquire = require('proxyquire');

// Mock supabase client
const mockSupabase = {
  rpc: async (fn) => {
    if (fn === 'get_search_stats') return { data: { total_searches: 100, unique_users: 10, avg_response_time: 50 }, error: null };
    return { data: null, error: 'Unknown RPC' };
  },
  from: function (table) {
    return {
      select: function () {
        return {
          order: function () {
            return {
              limit: async function () {
                if (table === 'popular_searches') return { data: [{ query: 'Berlin', search_count: 50 }], error: null };
                if (table === 'search_locations') return { data: [{ name: 'Cologne', popularity: 30 }], error: null };
                return { data: [], error: null };
              }
            };
          },
          gte: async function () {
            if (table === 'search_analytics') return { data: [{ created_at: '2025-08-01T12:00:00Z' }, { created_at: '2025-08-02T12:00:00Z' }], error: null };
            return { data: [], error: null };
          }
        };
      }
    };
  }
};

const AnalyticsDashboardService = proxyquire('../services/AnalyticsDashboardService', {
  '../config/supabase': { supabase: mockSupabase }
});

async function runMockedAnalyticsDashboardTests() {
  let pass = 0, fail = 0;
  console.log('🧪 AnalyticsDashboardService Mocked Tests');

  // 1. Get search stats
  const stats = await AnalyticsDashboardService.getSearchStats();
  if (stats.success && typeof stats.data === 'object') { pass++; } else { fail++; console.log('❌ getSearchStats failed'); }

  // 2. Get popular searches (default limit)
  const pop = await AnalyticsDashboardService.getPopularSearches();
  if (pop.success && Array.isArray(pop.data)) { pass++; } else { fail++; console.log('❌ getPopularSearches failed'); }

  // 3. Get popular searches (custom limit)
  const pop2 = await AnalyticsDashboardService.getPopularSearches(2);
  if (pop2.success && Array.isArray(pop2.data)) { pass++; } else { fail++; console.log('❌ getPopularSearches (limit) failed'); }

  // 4. Get search activity (default 30 days)
  const act = await AnalyticsDashboardService.getSearchActivity();
  if (act.success && typeof act.data === 'object') { pass++; } else { fail++; console.log('❌ getSearchActivity failed'); }

  // 5. Get search activity (custom days)
  const act2 = await AnalyticsDashboardService.getSearchActivity(7);
  if (act2.success && typeof act2.data === 'object') { pass++; } else { fail++; console.log('❌ getSearchActivity (days) failed'); }

  // 6. Get top locations (default limit)
  const loc = await AnalyticsDashboardService.getTopLocations();
  if (loc.success && Array.isArray(loc.data)) { pass++; } else { fail++; console.log('❌ getTopLocations failed'); }

  // 7. Get top locations (custom limit)
  const loc2 = await AnalyticsDashboardService.getTopLocations(2);
  if (loc2.success && Array.isArray(loc2.data)) { pass++; } else { fail++; console.log('❌ getTopLocations (limit) failed'); }

  // 8. Edge: negative/zero/large limits
  const popNeg = await AnalyticsDashboardService.getPopularSearches(-1);
  if (popNeg.success && Array.isArray(popNeg.data)) { pass++; } else { fail++; console.log('❌ getPopularSearches (negative) failed'); }

  const locZero = await AnalyticsDashboardService.getTopLocations(0);
  if (locZero.success && Array.isArray(locZero.data)) { pass++; } else { fail++; console.log('❌ getTopLocations (zero) failed'); }

  const popLarge = await AnalyticsDashboardService.getPopularSearches(1000);
  if (popLarge.success && Array.isArray(popLarge.data)) { pass++; } else { fail++; console.log('❌ getPopularSearches (large) failed'); }

  console.log(`\nAnalyticsDashboardService (Mocked): ${pass} passed, ${fail} failed.`);
  process.exit(fail === 0 ? 0 : 1);
}

if (require.main === module) runMockedAnalyticsDashboardTests();
