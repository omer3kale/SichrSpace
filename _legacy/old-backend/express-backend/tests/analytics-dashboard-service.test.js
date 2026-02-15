const AnalyticsDashboardService = require('../services/AnalyticsDashboardService');

async function runAnalyticsDashboardTests() {
  let pass = 0, fail = 0;
  console.log('🧪 AnalyticsDashboardService Tests');

  // 1. Get search stats
  const stats = await AnalyticsDashboardService.getSearchStats();
  if (stats.success && typeof stats.data === 'object') { pass++; } else { fail++; console.log('❌ getSearchStats failed'); }

  // 2. Get popular searches (default limit)
  const pop = await AnalyticsDashboardService.getPopularSearches();
  if (pop.success && Array.isArray(pop.data)) { pass++; } else { fail++; console.log('❌ getPopularSearches failed'); }

  // 3. Get popular searches (custom limit)
  const pop2 = await AnalyticsDashboardService.getPopularSearches(2);
  if (pop2.success && Array.isArray(pop2.data) && pop2.data.length <= 2) { pass++; } else { fail++; console.log('❌ getPopularSearches (limit) failed'); }

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
  if (loc2.success && Array.isArray(loc2.data) && loc2.data.length <= 2) { pass++; } else { fail++; console.log('❌ getTopLocations (limit) failed'); }

  // 8. Edge: negative/zero/large limits
  const popNeg = await AnalyticsDashboardService.getPopularSearches(-1);
  if (popNeg.success && Array.isArray(popNeg.data)) { pass++; } else { fail++; console.log('❌ getPopularSearches (negative) failed'); }

  const locZero = await AnalyticsDashboardService.getTopLocations(0);
  if (locZero.success && Array.isArray(locZero.data)) { pass++; } else { fail++; console.log('❌ getTopLocations (zero) failed'); }

  const popLarge = await AnalyticsDashboardService.getPopularSearches(1000);
  if (popLarge.success && Array.isArray(popLarge.data)) { pass++; } else { fail++; console.log('❌ getPopularSearches (large) failed'); }

  console.log(`\nAnalyticsDashboardService: ${pass} passed, ${fail} failed.`);
  process.exit(fail === 0 ? 0 : 1);
}

if (require.main === module) runAnalyticsDashboardTests();
