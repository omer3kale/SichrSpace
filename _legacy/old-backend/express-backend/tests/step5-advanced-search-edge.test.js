const { supabase } = require('../config/supabase');
const AdvancedSearchService = require('../services/AdvancedSearchService');

async function runEdgeCaseTests() {
  console.log('🧪 Step 5 Advanced Search Edge Case Tests');
  let pass = 0, fail = 0;

  // 1. Empty query returns all or no apartments
  const res1 = await AdvancedSearchService.searchApartments({ query: '', limit: 3 });
  if (res1.success) { pass++; } else { fail++; console.log('❌ Empty query failed'); }

  // 2. Invalid price range (min > max)
  const res2 = await AdvancedSearchService.searchApartments({ minPrice: 2000, maxPrice: 1000 });
  if (res2.success && res2.data.length === 0) { pass++; } else { fail++; console.log('❌ Invalid price range failed'); }

  // 3. Non-existent location
  const res3 = await AdvancedSearchService.searchApartments({ location: 'Atlantis' });
  if (res3.success && res3.data.length === 0) { pass++; } else { fail++; console.log('❌ Non-existent location failed'); }

  // 4. Amenities filter (should work or return empty)
  const res4 = await AdvancedSearchService.searchApartments({ amenities: ['WiFi', 'Pool'] });
  if (res4.success) { pass++; } else { fail++; console.log('❌ Amenities filter failed'); }

  // 5. Date range filter (future date)
  const future = new Date(Date.now() + 1000*60*60*24*365).toISOString().split('T')[0];
  const res5 = await AdvancedSearchService.searchApartments({ availableFrom: future });
  if (res5.success) { pass++; } else { fail++; console.log('❌ Future date filter failed'); }

  // 6. Invalid filter type
  try {
    await AdvancedSearchService.searchApartments({ minRooms: 'notanumber' });
    pass++;
  } catch (e) {
    fail++;
    console.log('❌ Invalid filter type failed');
  }

  // 7. Suggestions for gibberish
  const sugg = await AdvancedSearchService.getSearchSuggestions('zzzzzzzzzz', 3);
  if (sugg.success && sugg.data.length === 0) { pass++; } else { fail++; console.log('❌ Gibberish suggestion failed'); }

  // 8. Popular searches always returns array
  const pop = await AdvancedSearchService.getPopularSearches(2);
  if (pop.success && Array.isArray(pop.data)) { pass++; } else { fail++; console.log('❌ Popular searches array failed'); }

  // 9. Analytics always returns object
  const ana = await AdvancedSearchService.getSearchAnalytics();
  if (ana.success && typeof ana.data === 'object') { pass++; } else { fail++; console.log('❌ Analytics object failed'); }

  // 10. Save alert with missing user
  try {
    await AdvancedSearchService.saveSearchAlert(null, { query: 'Cologne' });
    pass++;
  } catch (e) {
    fail++;
    console.log('❌ Save alert with missing user failed');
  }

  console.log(`\nEdge Case Tests: ${pass} passed, ${fail} failed.`);
  process.exit(fail === 0 ? 0 : 1);
}

if (require.main === module) runEdgeCaseTests();
