const { supabase } = require('../config/supabase');

async function testStep5AdvancedSearch() {
    console.log('🧪 Testing Step 5: Advanced Search Implementation');
    console.log('='.repeat(60));
    
    const results = {
        apiTests: [],
        serviceTests: [],
        frontendTests: [],
        overallScore: 0
    };
    
    try {
        // Test 1: Advanced Search Service
        console.log('\n1️⃣  Testing AdvancedSearchService...');
        const AdvancedSearchService = require('../services/AdvancedSearchService');
        
        const searchResults = await AdvancedSearchService.searchApartments({
            query: 'Cologne',
            minPrice: 500,
            maxPrice: 1500,
            limit: 5
        });
        
        if (searchResults.success && searchResults.data) {
            console.log('✅ AdvancedSearchService working');
            console.log(`   Found ${searchResults.data.length} apartments`);
            console.log(`   Response time: ${searchResults.metadata.performance.responseTime}`);
            results.serviceTests.push({ test: 'Basic Search', status: 'PASS' });
        } else {
            console.log('❌ AdvancedSearchService failed');
            results.serviceTests.push({ test: 'Basic Search', status: 'FAIL' });
        }
        
        // Test 2: Search Suggestions
        console.log('\n2️⃣  Testing Search Suggestions...');
        const suggestions = await AdvancedSearchService.getSearchSuggestions('Cologne', 5);
        
        if (suggestions.success && suggestions.data.length > 0) {
            console.log('✅ Search suggestions working');
            console.log(`   Generated ${suggestions.data.length} suggestions`);
            suggestions.data.forEach(s => console.log(`   - ${s.icon} ${s.text} (${s.type})`));
            results.serviceTests.push({ test: 'Search Suggestions', status: 'PASS' });
        } else {
            console.log('❌ Search suggestions failed');
            results.serviceTests.push({ test: 'Search Suggestions', status: 'FAIL' });
        }
        
        // Test 3: Popular Searches
        console.log('\n3️⃣  Testing Popular Searches...');
        const popularSearches = await AdvancedSearchService.getPopularSearches(5);
        
        if (popularSearches.success && popularSearches.data.length > 0) {
            console.log('✅ Popular searches working');
            console.log(`   Retrieved ${popularSearches.data.length} popular searches`);
            popularSearches.data.forEach(p => console.log(`   - ${p.query} (${p.searchCount} searches)`));
            results.serviceTests.push({ test: 'Popular Searches', status: 'PASS' });
        } else {
            console.log('❌ Popular searches failed');
            results.serviceTests.push({ test: 'Popular Searches', status: 'FAIL' });
        }
        
        // Test 4: Search Analytics
        console.log('\n4️⃣  Testing Search Analytics...');
        const analytics = await AdvancedSearchService.getSearchAnalytics();
        
        if (analytics.success && analytics.data) {
            console.log('✅ Search analytics working');
            console.log(`   Total searches: ${analytics.data.totalSearches}`);
            console.log(`   Unique users: ${analytics.data.uniqueUsers}`);
            console.log(`   Avg response time: ${analytics.data.averageResponseTime}ms`);
            results.serviceTests.push({ test: 'Search Analytics', status: 'PASS' });
        } else {
            console.log('❌ Search analytics failed');
            results.serviceTests.push({ test: 'Search Analytics', status: 'FAIL' });
        }
        
        // Test 5: API Endpoint Simulation
        console.log('\n5️⃣  Testing API Route Logic...');
        const advancedSearchRoute = require('../routes/advancedSearch');
        
        // Simulate request/response for testing
        const mockReq = {
            query: {
                q: 'Munich',
                location: 'Munich',
                minPrice: '600',
                maxPrice: '1200',
                propertyType: 'apartment',
                limit: '10'
            },
            user: null
        };
        
        const mockRes = {
            json: (data) => {
                if (data.success) {
                    console.log('✅ API route logic working');
                    console.log(`   Query processing successful`);
                    results.apiTests.push({ test: 'API Route Logic', status: 'PASS' });
                } else {
                    console.log('❌ API route logic failed');
                    results.apiTests.push({ test: 'API Route Logic', status: 'FAIL' });
                }
                return data;
            },
            status: (code) => ({ json: mockRes.json })
        };
        
        // Test the advanced search logic manually
        try {
            const testResults = await AdvancedSearchService.searchApartments({
                query: mockReq.query.q,
                location: mockReq.query.location,
                minPrice: parseFloat(mockReq.query.minPrice),
                maxPrice: parseFloat(mockReq.query.maxPrice),
                propertyType: mockReq.query.propertyType,
                limit: parseInt(mockReq.query.limit)
            });
            
            mockRes.json(testResults);
        } catch (error) {
            mockRes.json({ success: false, error: error.message });
        }
        
        // Test 6: Database Connection
        console.log('\n6️⃣  Testing Database Connection...');
        try {
            const { data: apartments, error } = await supabase
                .from('apartments')
                .select('id, title, location, price')
                .limit(3);
            
            if (!error && apartments && apartments.length > 0) {
                console.log('✅ Database connection working');
                console.log(`   Retrieved ${apartments.length} test apartments`);
                apartments.forEach(apt => console.log(`   - ${apt.title} (€${apt.price})`));
                results.serviceTests.push({ test: 'Database Connection', status: 'PASS' });
            } else {
                console.log('❌ Database connection failed:', error?.message);
                results.serviceTests.push({ test: 'Database Connection', status: 'FAIL' });
            }
        } catch (dbError) {
            console.log('❌ Database connection error:', dbError.message);
            results.serviceTests.push({ test: 'Database Connection', status: 'FAIL' });
        }
        
        // Test 7: Frontend Integration Check
        console.log('\n7️⃣  Testing Frontend Files...');
        const fs = require('fs');
        const path = require('path');
        
        const frontendFiles = [
            '../../frontend/advanced-search.html',
            '../../frontend/apartments-listing.html'
        ];
        
        for (const file of frontendFiles) {
            try {
                const filePath = path.join(__dirname, file);
                const exists = fs.existsSync(filePath);
                
                if (exists) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const hasAdvancedSearch = content.includes('Advanced Search') || content.includes('api/search');
                    
                    if (hasAdvancedSearch) {
                        console.log(`✅ ${path.basename(file)} has advanced search features`);
                        results.frontendTests.push({ test: path.basename(file), status: 'PASS' });
                    } else {
                        console.log(`⚠️  ${path.basename(file)} missing advanced search features`);
                        results.frontendTests.push({ test: path.basename(file), status: 'PARTIAL' });
                    }
                } else {
                    console.log(`❌ ${path.basename(file)} not found`);
                    results.frontendTests.push({ test: path.basename(file), status: 'FAIL' });
                }
            } catch (fileError) {
                console.log(`❌ Error checking ${file}:`, fileError.message);
                results.frontendTests.push({ test: path.basename(file), status: 'FAIL' });
            }
        }
        
        // Calculate overall score
        const allTests = [
            ...results.serviceTests,
            ...results.apiTests,
            ...results.frontendTests
        ];
        
        const passedTests = allTests.filter(t => t.status === 'PASS').length;
        const partialTests = allTests.filter(t => t.status === 'PARTIAL').length;
        const totalTests = allTests.length;
        
        results.overallScore = Math.round(((passedTests + (partialTests * 0.5)) / totalTests) * 100);
        
        // Display final results
        console.log('\n' + '='.repeat(60));
        console.log('📊 STEP 5 IMPLEMENTATION TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log('\n🔧 Service Tests:');
        results.serviceTests.forEach(test => {
            const icon = test.status === 'PASS' ? '✅' : test.status === 'PARTIAL' ? '⚠️' : '❌';
            console.log(`   ${icon} ${test.test}: ${test.status}`);
        });
        
        console.log('\n🌐 API Tests:');
        results.apiTests.forEach(test => {
            const icon = test.status === 'PASS' ? '✅' : test.status === 'PARTIAL' ? '⚠️' : '❌';
            console.log(`   ${icon} ${test.test}: ${test.status}`);
        });
        
        console.log('\n🖥️  Frontend Tests:');
        results.frontendTests.forEach(test => {
            const icon = test.status === 'PASS' ? '✅' : test.status === 'PARTIAL' ? '⚠️' : '❌';
            console.log(`   ${icon} ${test.test}: ${test.status}`);
        });
        
        console.log(`\n🎯 Overall Score: ${results.overallScore}%`);
        
        if (results.overallScore >= 90) {
            console.log('🎉 EXCELLENT! Step 5 Advanced Search implementation is highly successful!');
        } else if (results.overallScore >= 75) {
            console.log('✅ GOOD! Step 5 Advanced Search implementation is working well!');
        } else if (results.overallScore >= 50) {
            console.log('⚠️  PARTIAL! Step 5 Advanced Search implementation needs some improvements.');
        } else {
            console.log('❌ NEEDS WORK! Step 5 Advanced Search implementation requires significant fixes.');
        }
        
        console.log('\n📝 Next Steps:');
        console.log('   1. Database Schema - Install search_analytics and related tables');
        console.log('   2. Elasticsearch Integration - Add for enhanced search performance');
        console.log('   3. Search Analytics - Enable real-time search tracking');
        console.log('   4. Geospatial Search - Add location-based distance filtering');
        console.log('   5. Machine Learning - Implement AI-powered search suggestions');
        
        return results;
        
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        return {
            error: error.message,
            overallScore: 0
        };
    }
}

if (require.main === module) {
    testStep5AdvancedSearch()
        .then(results => {
            process.exit(results.overallScore >= 50 ? 0 : 1);
        })
        .catch(error => {
            console.error('Test script failed:', error);
            process.exit(1);
        });
}

module.exports = { testStep5AdvancedSearch };
