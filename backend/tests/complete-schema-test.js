#!/usr/bin/env node

/**
 * Complete Schema Test
 * Tests the full database schema with all tables including users, apartments, and Step 4 enhancements
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class CompleteSchemaTest {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    this.results = {
      total: 0,
      passed: 0,
      failed: 0
    };
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
    }
  }

  async executeSchema() {
    console.log('🔄 Executing complete database schema...');
    
    try {
      const schemaPath = path.join(__dirname, '..', 'sql', 'step4-clean-install.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // Split the schema into individual statements
      const statements = schema
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--') && stmt !== '');
      
      console.log(`📝 Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        // Skip comments and empty statements
        if (!statement || statement.startsWith('--')) continue;
        
        // Add semicolon back
        const fullStatement = statement + ';';
        
        try {
          const { error } = await this.supabase.rpc('exec_sql', { sql: fullStatement });
          if (error) {
            console.log(`⚠️  Warning on statement ${i + 1}: ${error.message}`);
            // Don't fail on warnings, continue execution
          }
        } catch (e) {
          console.log(`⚠️  Error on statement ${i + 1}: ${e.message}`);
          // Some errors are expected (like table already exists), so continue
        }
      }
      
      console.log('✅ Schema execution completed');
      return true;
    } catch (error) {
      console.error('❌ Schema execution failed:', error.message);
      return false;
    }
  }

  async checkTables() {
    const expectedTables = [
      'users',
      'apartments', 
      'viewing_requests',
      'conversations',
      'messages',
      'user_favorites',
      'saved_searches',
      'reviews',
      'notifications',
      'recently_viewed'
    ];

    console.log('\n🔍 Checking table existence...');
    
    for (const table of expectedTables) {
      await this.runTest(`Table exists: ${table}`, async () => {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(0);
        
        if (error) {
          throw new Error(`Table ${table} does not exist or is not accessible: ${error.message}`);
        }
      });
    }
  }

  async testBasicOperations() {
    console.log('\n🧪 Testing basic CRUD operations...');

    let testUserId, testApartmentId;

    // Test user creation
    await this.runTest('Create test user', async () => {
      const { data, error } = await this.supabase
        .from('users')
        .insert({
          username: `test_user_${Date.now()}`,
          email: `test_${Date.now()}@example.com`,
          password: 'test_password_hash',
          first_name: 'Test',
          last_name: 'User'
        })
        .select()
        .single();

      if (error) throw error;
      testUserId = data.id;
    });

    // Test apartment creation
    await this.runTest('Create test apartment', async () => {
      const { data, error } = await this.supabase
        .from('apartments')
        .insert({
          title: 'Test Apartment',
          description: 'A test apartment for schema validation',
          location: 'Test City, Germany',
          price: 750.00,
          size: 65,
          rooms: 2,
          bathrooms: 1,
          owner_id: testUserId
        })
        .select()
        .single();

      if (error) throw error;
      testApartmentId = data.id;
    });

    // Test saved search creation
    await this.runTest('Create saved search', async () => {
      const { error } = await this.supabase
        .from('saved_searches')
        .insert({
          user_id: testUserId,
          name: 'Test Search',
          search_criteria: { maxPrice: 800, location: 'Test City' }
        });

      if (error) throw error;
    });

    // Test review creation
    await this.runTest('Create review', async () => {
      const { error } = await this.supabase
        .from('reviews')
        .insert({
          apartment_id: testApartmentId,
          user_id: testUserId,
          rating: 5,
          title: 'Great apartment!',
          comment: 'Really enjoyed staying here for the test.'
        });

      if (error) throw error;
    });

    // Test notification creation
    await this.runTest('Create notification', async () => {
      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: testUserId,
          type: 'test',
          title: 'Test Notification',
          message: 'This is a test notification for schema validation.'
        });

      if (error) throw error;
    });

    // Test recently viewed creation
    await this.runTest('Track recently viewed', async () => {
      const { error } = await this.supabase
        .from('recently_viewed')
        .insert({
          user_id: testUserId,
          apartment_id: testApartmentId
        });

      if (error) throw error;
    });

    return { testUserId, testApartmentId };
  }

  async cleanup(testUserId) {
    if (testUserId) {
      console.log('\n🧹 Cleaning up test data...');
      try {
        // User deletion will cascade to all related records
        await this.supabase
          .from('users')
          .delete()
          .eq('id', testUserId);
        console.log('✅ Cleanup completed');
      } catch (error) {
        console.log('⚠️  Cleanup warning:', error.message);
      }
    }
  }

  async run() {
    console.log('🔥 COMPLETE DATABASE SCHEMA TEST');
    console.log('=================================\n');

    // Execute the schema
    const schemaSuccess = await this.executeSchema();
    if (!schemaSuccess) {
      console.log('❌ Schema execution failed, stopping tests');
      return;
    }

    // Check table existence
    await this.checkTables();

    // Test basic operations
    const { testUserId } = await this.testBasicOperations();

    // Cleanup
    await this.cleanup(testUserId);

    // Print results
    console.log('\n🎯 TEST RESULTS SUMMARY');
    console.log('======================');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📊 Success Rate: ${Math.round((this.results.passed / this.results.total) * 100)}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Complete database schema is working perfectly!');
    } else {
      console.log(`\n⚠️  ${this.results.failed} tests failed. Check the errors above.`);
    }

    console.log('\n✅ Testing completed!');
  }
}

// Run the test
if (require.main === module) {
  const tester = new CompleteSchemaTest();
  tester.run().catch(console.error);
}

module.exports = CompleteSchemaTest;
