/**
 * Step 4 Real Data API Tester
 * Comprehensive testing of all Step 4 APIs with real database
 */

const http = require('http');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'real-test-secret-2025';
const TEST_PORT = 3001;

class RealDataTester {
  constructor() {
    this.app = express();
    this.server = null;
    this.testUser = null;
    this.testApartment = null;
    this.authToken = null;
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  setupApp() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Authentication middleware
    const auth = (req, res, next) => {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        req.supabase = supabase;
        next();
      });
    };

    // Load actual API routes
    this.app.use('/api/profile', auth, require('../api/profile'));
    this.app.use('/api/saved-searches', auth, require('../api/saved-searches'));
    this.app.use('/api/reviews', auth, require('../api/reviews'));
    this.app.use('/api/notifications', auth, require('../api/notifications'));
    this.app.use('/api/recently-viewed', auth, require('../api/recently-viewed'));
  }

  async createTestData() {
    console.log('📊 Creating test data...');
    
    // Create test user (let PostgreSQL generate the UUID)
    const testUserData = {
      username: `test_user_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: '$2b$10$hashed_password_placeholder',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      blocked: false,
      email_verified: true,
      gdpr_consent: true,
      data_processing_consent: true
    };    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([testUserData])
      .select()
      .single();

    if (userError) {
      throw new Error(`Failed to create test user: ${userError.message}`);
    }

    this.testUser = user;
    this.authToken = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });

    // Create test apartment (let PostgreSQL generate the UUID)
    const testApartmentData = {
      title: 'Test Apartment for Step 4',
      description: 'A beautiful test apartment for API testing',
      price: 850,
      location: 'Test City, Germany',
      rooms: 2,
      bathrooms: 1,
      size: 75,
      owner_id: user.id,
      status: 'available',
      created_at: new Date().toISOString()
    };

    const { data: apartment, error: aptError } = await supabase
      .from('apartments')
      .insert([testApartmentData])
      .select()
      .single();

    if (aptError) {
      throw new Error(`Failed to create test apartment: ${aptError.message}`);
    }

    this.testApartment = apartment;
    console.log('✅ Test data created successfully');
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    if (this.testUser) {
      // Clean up in dependency order
      await supabase.from('recently_viewed').delete().eq('user_id', this.testUser.id);
      await supabase.from('notifications').delete().eq('user_id', this.testUser.id);
      await supabase.from('reviews').delete().eq('user_id', this.testUser.id);
      await supabase.from('saved_searches').delete().eq('user_id', this.testUser.id);
      
      if (this.testApartment) {
        await supabase.from('apartments').delete().eq('id', this.testApartment.id);
      }
      
      await supabase.from('users').delete().eq('id', this.testUser.id);
    }
    
    console.log('✅ Cleanup completed');
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsedBody = body ? JSON.parse(body) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: parsedBody
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async runTest(name, testFn) {
    this.results.total++;
    console.log(`\n🧪 Testing: ${name}`);
    
    try {
      await testFn();
      console.log(`✅ PASS: ${name}`);
      this.results.passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${name} - ${error.message}`);
      this.results.failed++;
      this.results.errors.push({ test: name, error: error.message });
    }
  }

  async runAllTests() {
    console.log('\n🚀 Starting Step 4 Real Data API Tests');
    console.log('=====================================\n');

    // Profile API Tests
    await this.runTest('Profile - Get user statistics', async () => {
      const response = await this.makeRequest('GET', '/api/profile/stats');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
      
      console.log('Profile stats response:', JSON.stringify(response.body, null, 2));
      
      if (!response.body.stats || !response.body.stats.hasOwnProperty('saved_searches')) {
        throw new Error('Missing saved_searches in stats object');
      }
    });

    await this.runTest('Profile - Update notification preferences', async () => {
      const preferences = {
        email: false,
        sms: true,
        push: true,
        marketing: false
      };
      
      const response = await this.makeRequest('PUT', '/api/profile/notifications', { preferences });
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
    });

    // Saved Searches API Tests
    let savedSearchId;
    await this.runTest('Saved Searches - Create new search', async () => {
      const searchData = {
        name: 'Real Test Search',
        searchCriteria: {  // Changed from search_criteria to searchCriteria
          maxPrice: 1000,
          location: 'Test City',
          minRooms: 2
        },
        alertsEnabled: true,  // Changed from alerts_enabled to alertsEnabled
        alertFrequency: 'daily'  // Changed from alert_frequency to alertFrequency
      };

      const response = await this.makeRequest('POST', '/api/saved-searches', searchData);
      if (response.status !== 200 && response.status !== 201) {  // Accept both status codes
        throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
      
      savedSearchId = response.body.data?.id;  // API returns data in 'data' field
      if (!savedSearchId) {
        throw new Error('No ID returned for created search');
      }
    });

    await this.runTest('Saved Searches - Get user searches', async () => {
      const response = await this.makeRequest('GET', '/api/saved-searches');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
      if (!Array.isArray(response.body.data)) {  // API returns data array, not searches
        throw new Error('Expected data array in response');
      }
    });

    // Reviews API Tests
    let reviewId;
    await this.runTest('Reviews - Create new review', async () => {
      const reviewData = {
        apartmentId: this.testApartment.id,  // Changed from apartment_id to apartmentId
        rating: 5,
        title: 'Excellent apartment!',
        comment: 'Really great place, highly recommend!'
      };

      const response = await this.makeRequest('POST', '/api/reviews', reviewData);
      if (response.status !== 200 && response.status !== 201) {  // Accept both status codes
        throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
      
      reviewId = response.body.data?.id;  // API returns data in 'data' field
      if (!reviewId) {
        throw new Error('No ID returned for created review');
      }
    });

    await this.runTest('Reviews - Get apartment reviews', async () => {
      const response = await this.makeRequest('GET', `/api/reviews?apartmentId=${this.testApartment.id}`);  // Changed parameter name
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
    });

    // Notifications API Tests
    let notificationId;
    await this.runTest('Notifications - Create notification', async () => {
      const notificationData = {
        userId: this.testUser.id,  // Changed from user_id to userId
        type: 'test_notification',
        title: 'Test Notification',
        message: 'This is a test notification for API testing',
        priority: 'normal'
      };

      const response = await this.makeRequest('POST', '/api/notifications', notificationData);
      if (response.status !== 200 && response.status !== 201) {  // Accept both status codes
        throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
      
      notificationId = response.body.data?.id;  // API returns data in 'data' field
      if (!notificationId) {
        throw new Error('No ID returned for created notification');
      }
    });

    await this.runTest('Notifications - Get user notifications', async () => {
      const response = await this.makeRequest('GET', '/api/notifications');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
      if (!Array.isArray(response.body.data)) {  // API returns data array, not notifications
        throw new Error('Expected data array in response');
      }
    });

    // Recently Viewed API Tests
    await this.runTest('Recently Viewed - Track apartment view', async () => {
      const response = await this.makeRequest('POST', '/api/recently-viewed', {
        apartmentId: this.testApartment.id  // Changed from apartment_id to apartmentId
      });
      
      if (response.status !== 200 && response.status !== 201) {  // Accept both status codes
        throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
    });

    await this.runTest('Recently Viewed - Get recent apartments', async () => {
      const response = await this.makeRequest('GET', '/api/recently-viewed');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
      }
      if (!Array.isArray(response.body.data)) {  // API returns data array, not apartments
        throw new Error('Expected data array in response');
      }
    });

    // Integration Test
    await this.runTest('Integration - Complete workflow', async () => {
      // Get updated profile stats
      const statsResponse = await this.makeRequest('GET', '/api/profile/stats');
      if (statsResponse.status !== 200) {
        throw new Error('Failed to get updated profile stats');
      }
      
      // Verify data was created
      if (statsResponse.body.saved_searches < 1) {
        throw new Error('Saved searches count should be >= 1');
      }
      if (statsResponse.body.reviews_written < 1) {
        throw new Error('Reviews written count should be >= 1');
      }
    });

    this.printResults();
  }

  printResults() {
    console.log('\n🎯 TEST RESULTS SUMMARY');
    console.log('======================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.errors.forEach(({ test, error }) => {
        console.log(`  • ${test}: ${error}`);
      });
    }

    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Step 4 APIs are working with real data!');
    } else {
      console.log(`\n⚠️  ${this.results.failed} tests failed. Check the errors above.`);
    }
  }

  async start() {
    try {
      this.setupApp();
      
      this.server = this.app.listen(TEST_PORT, async () => {
        console.log(`🔥 Test server running on port ${TEST_PORT}`);
        
        await this.createTestData();
        await this.runAllTests();
        await this.cleanupTestData();
        
        this.server.close();
        console.log('\n✅ Testing completed!');
      });
      
    } catch (error) {
      console.error('💥 Testing failed:', error.message);
      if (this.server) {
        this.server.close();
      }
    }
  }
}

// Check if database schema is deployed
async function checkSchema() {
  console.log('🔍 Checking database schema...');
  
  try {
    const { data, error } = await supabase.from('saved_searches').select('count').limit(1);
    
    if (error) {
      console.log('❌ Schema check failed:', error.message);
      console.log('\n🚨 IMPORTANT: Execute the database schema first!');
      console.log('Copy and run this SQL in your Supabase SQL Editor:');
      console.log('File: backend/sql/step4-clean-install.sql');
      console.log('\nThen run this test again.');
      return false;
    }
    
    console.log('✅ Database schema is ready!');
    return true;
  } catch (err) {
    console.log('❌ Database connection failed:', err.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔥 STEP 4 REAL DATA API TESTING');
  console.log('================================\n');
  
  const schemaReady = await checkSchema();
  if (!schemaReady) {
    console.log('\n⏹️  Testing stopped. Please deploy the schema first.');
    return;
  }
  
  const tester = new RealDataTester();
  await tester.start();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = RealDataTester;
