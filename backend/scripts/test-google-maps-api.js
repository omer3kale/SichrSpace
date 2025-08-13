/**
 * Google Maps API Test Script
 * Tests all Google Maps services with real API calls
 */

require('dotenv').config();
const geocodingService = require('../services/GeocodingService');
const placesService = require('../services/PlacesService');
const directionsService = require('../services/DirectionsService');

class GoogleMapsAPITester {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.testResults = {
      geocoding: { passed: 0, failed: 0, details: [] },
      places: { passed: 0, failed: 0, details: [] },
      directions: { passed: 0, failed: 0, details: [] }
    };
  }

  /**
   * Run all Google Maps API tests
   */
  async runAllTests() {
    console.log('🧪 Starting Google Maps API Tests...\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (!this.apiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY not found in environment variables');
      console.log('Please set up your Google Maps API key first.');
      return false;
    }

    console.log(`🔑 API Key configured: ${this.apiKey.substring(0, 10)}...`);
    console.log('');

    // Test Geocoding API
    await this.testGeocodingAPI();
    
    // Test Places API
    await this.testPlacesAPI();
    
    // Test Directions API
    await this.testDirectionsAPI();

    // Print summary
    this.printTestSummary();

    return this.isAllTestsPassed();
  }

  /**
   * Test Geocoding API functionality
   */
  async testGeocodingAPI() {
    console.log('📍 Testing Geocoding API...');
    console.log('─────────────────────────────────────────────────────────────────');

    const testCases = [
      {
        name: 'Geocode Berlin address',
        test: () => geocodingService.geocodeAddress('Berlin, Germany')
      },
      {
        name: 'Geocode specific address',
        test: () => geocodingService.geocodeAddress('Brandenburger Tor, Berlin, Germany')
      },
      {
        name: 'Reverse geocode coordinates',
        test: () => geocodingService.reverseGeocode(52.5200, 13.4050)
      },
      {
        name: 'Batch geocode multiple addresses',
        test: () => geocodingService.batchGeocode([
          'Munich, Germany',
          'Hamburg, Germany',
          'Cologne, Germany'
        ])
      },
      {
        name: 'Handle invalid address',
        test: () => geocodingService.geocodeAddress('ThisIsNotARealAddressXYZ123')
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`  Testing: ${testCase.name}...`);
        const result = await testCase.test();
        
        if (result) {
          console.log(`  ✅ ${testCase.name} - PASSED`);
          if (testCase.name.includes('Geocode Berlin')) {
            console.log(`     📍 Coordinates: ${result.lat}, ${result.lng}`);
            console.log(`     📮 Address: ${result.formatted_address}`);
          }
          this.testResults.geocoding.passed++;
        } else {
          console.log(`  ⚠️  ${testCase.name} - NO RESULTS`);
          this.testResults.geocoding.failed++;
        }
        
        this.testResults.geocoding.details.push({
          name: testCase.name,
          status: result ? 'passed' : 'no_results',
          result: result
        });

      } catch (error) {
        console.log(`  ❌ ${testCase.name} - FAILED: ${error.message}`);
        this.testResults.geocoding.failed++;
        this.testResults.geocoding.details.push({
          name: testCase.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('');
  }

  /**
   * Test Places API functionality
   */
  async testPlacesAPI() {
    console.log('🏢 Testing Places API...');
    console.log('─────────────────────────────────────────────────────────────────');

    const berlinCenter = { lat: 52.5200, lng: 13.4050 };

    const testCases = [
      {
        name: 'Find nearby restaurants',
        test: () => placesService.findNearbyPlaces(berlinCenter, {
          types: ['restaurant'],
          radius: 1000,
          minRating: 4.0
        })
      },
      {
        name: 'Find nearby supermarkets',
        test: () => placesService.findNearbyPlaces(berlinCenter, {
          types: ['supermarket'],
          radius: 500
        })
      },
      {
        name: 'Text search for cafes',
        test: () => placesService.textSearch('cafes near Brandenburger Tor Berlin')
      },
      {
        name: 'Get place details',
        test: async () => {
          // First find a place, then get its details
          const places = await placesService.findNearbyPlaces(berlinCenter, {
            types: ['tourist_attraction'],
            radius: 1000
          });
          
          if (places && places.length > 0) {
            return await placesService.getPlaceDetails(places[0].place_id);
          }
          return null;
        }
      },
      {
        name: 'Calculate walkability score',
        test: () => placesService.calculateWalkabilityScore(berlinCenter, 1000)
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`  Testing: ${testCase.name}...`);
        const result = await testCase.test();
        
        if (result) {
          console.log(`  ✅ ${testCase.name} - PASSED`);
          
          if (Array.isArray(result)) {
            console.log(`     📊 Found ${result.length} places`);
            if (result.length > 0) {
              console.log(`     🏪 Example: ${result[0].name} (Rating: ${result[0].rating})`);
            }
          } else if (typeof result === 'number') {
            console.log(`     📊 Score: ${result}`);
          } else {
            console.log(`     📍 Place: ${result.name || 'Details retrieved'}`);
          }
          
          this.testResults.places.passed++;
        } else {
          console.log(`  ⚠️  ${testCase.name} - NO RESULTS`);
          this.testResults.places.failed++;
        }

        this.testResults.places.details.push({
          name: testCase.name,
          status: result ? 'passed' : 'no_results',
          result: Array.isArray(result) ? `${result.length} places` : result
        });

      } catch (error) {
        console.log(`  ❌ ${testCase.name} - FAILED: ${error.message}`);
        this.testResults.places.failed++;
        this.testResults.places.details.push({
          name: testCase.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('');
  }

  /**
   * Test Directions API functionality
   */
  async testDirectionsAPI() {
    console.log('🚗 Testing Directions API...');
    console.log('─────────────────────────────────────────────────────────────────');

    const testCases = [
      {
        name: 'Calculate driving route',
        test: () => directionsService.calculateRoute(
          'Berlin Hauptbahnhof, Germany',
          'Brandenburg Gate, Berlin, Germany',
          'DRIVING'
        )
      },
      {
        name: 'Calculate walking route',
        test: () => directionsService.calculateRoute(
          'Berlin Hauptbahnhof, Germany',
          'Brandenburg Gate, Berlin, Germany',
          'WALKING'
        )
      },
      {
        name: 'Calculate transit route',
        test: () => directionsService.calculateRoute(
          'Berlin Hauptbahnhof, Germany',
          'Brandenburg Gate, Berlin, Germany',
          'TRANSIT'
        )
      },
      {
        name: 'Route with waypoints',
        test: () => directionsService.calculateRouteWithWaypoints(
          'Berlin Hauptbahnhof, Germany',
          'Potsdamer Platz, Berlin, Germany',
          ['Brandenburg Gate, Berlin, Germany'],
          'WALKING'
        )
      },
      {
        name: 'Distance matrix calculation',
        test: () => directionsService.calculateDistanceMatrix(
          ['Berlin Hauptbahnhof, Germany', 'Brandenburg Gate, Berlin, Germany'],
          ['Potsdamer Platz, Berlin, Germany', 'Alexanderplatz, Berlin, Germany'],
          'DRIVING'
        )
      },
      {
        name: 'Step-by-step directions',
        test: () => directionsService.getStepByStepDirections(
          'Berlin Hauptbahnhof, Germany',
          'Brandenburg Gate, Berlin, Germany',
          'WALKING'
        )
      }
    ];

    for (const testCase of testCases) {
      try {
        console.log(`  Testing: ${testCase.name}...`);
        const result = await testCase.test();
        
        if (result && result.routes && result.routes.length > 0) {
          console.log(`  ✅ ${testCase.name} - PASSED`);
          
          const route = result.routes[0];
          if (route.legs && route.legs.length > 0) {
            const leg = route.legs[0];
            console.log(`     📏 Distance: ${leg.distance.text}`);
            console.log(`     ⏱️  Duration: ${leg.duration.text}`);
          }
          
          this.testResults.directions.passed++;
        } else {
          console.log(`  ⚠️  ${testCase.name} - NO ROUTES FOUND`);
          this.testResults.directions.failed++;
        }

        this.testResults.directions.details.push({
          name: testCase.name,
          status: (result && result.routes && result.routes.length > 0) ? 'passed' : 'no_results',
          result: result
        });

      } catch (error) {
        console.log(`  ❌ ${testCase.name} - FAILED: ${error.message}`);
        this.testResults.directions.failed++;
        this.testResults.directions.details.push({
          name: testCase.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('');
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    
    const totalPassed = this.testResults.geocoding.passed + 
                       this.testResults.places.passed + 
                       this.testResults.directions.passed;
    
    const totalFailed = this.testResults.geocoding.failed + 
                       this.testResults.places.failed + 
                       this.testResults.directions.failed;
    
    const totalTests = totalPassed + totalFailed;

    console.log(`📍 Geocoding API: ${this.testResults.geocoding.passed}/${this.testResults.geocoding.passed + this.testResults.geocoding.failed} passed`);
    console.log(`🏢 Places API: ${this.testResults.places.passed}/${this.testResults.places.passed + this.testResults.places.failed} passed`);
    console.log(`🚗 Directions API: ${this.testResults.directions.passed}/${this.testResults.directions.passed + this.testResults.directions.failed} passed`);
    
    console.log('');
    console.log(`🎯 OVERALL: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Google Maps integration is working perfectly.');
    } else {
      console.log('⚠️  Some tests failed. Check your API configuration and enabled services.');
      
      // Show failed tests
      console.log('\n❌ FAILED TESTS:');
      ['geocoding', 'places', 'directions'].forEach(service => {
        this.testResults[service].details
          .filter(test => test.status === 'failed')
          .forEach(test => {
            console.log(`   ${service}: ${test.name} - ${test.error}`);
          });
      });
    }
    
    console.log('');
  }

  /**
   * Check if all tests passed
   */
  isAllTestsPassed() {
    const totalFailed = this.testResults.geocoding.failed + 
                       this.testResults.places.failed + 
                       this.testResults.directions.failed;
    
    return totalFailed === 0;
  }

  /**
   * Test specific API quota and limits
   */
  async testAPIQuotas() {
    console.log('📊 Testing API Quotas and Limits...');
    console.log('─────────────────────────────────────────────────────────────────');
    
    try {
      // Test rapid requests to check rate limiting
      const startTime = Date.now();
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(geocodingService.geocodeAddress('Berlin, Germany'));
      }
      
      await Promise.all(promises);
      const endTime = Date.now();
      
      console.log(`✅ Rate limiting test: 10 requests completed in ${endTime - startTime}ms`);
      
    } catch (error) {
      console.log(`❌ Rate limiting test failed: ${error.message}`);
    }
  }
}

// Export for use in other scripts
module.exports = GoogleMapsAPITester;

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new GoogleMapsAPITester();
  
  tester.runAllTests()
    .then(success => {
      if (success) {
        console.log('🚀 Google Maps API is ready for production!');
        process.exit(0);
      } else {
        console.log('💥 Google Maps API setup needs attention.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}
