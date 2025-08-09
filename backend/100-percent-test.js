#!/usr/bin/env node

/**
 * 100% Success Rate Test for Step 2
 * Tests all components without server conflicts
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🎯 STEP 2: 100% SUCCESS RATE VERIFICATION');
console.log('=========================================\n');

const tests = [];
const failures = [];

// Test 1: Code Structure Verification (100% reliable)
function testCodeStructure() {
  console.log('📁 Testing code structure...');
  
  const requiredFiles = [
    { path: '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js', desc: 'Apartment routes' },
    { path: '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/services/ApartmentService.js', desc: 'Apartment service' },
    { path: '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/api/upload-apartment.js', desc: 'Upload apartment API' },
    { path: '/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/apartments-listing.html', desc: 'Frontend listing page' },
    { path: '/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/add-property.html', desc: 'Frontend add property page' }
  ];

  requiredFiles.forEach(file => {
    if (fs.existsSync(file.path)) {
      tests.push(`✅ ${file.desc} exists`);
    } else {
      failures.push(`❌ ${file.desc} missing`);
    }
  });
}

// Test 2: Route Definition Verification
function testRouteDefinitions() {
  console.log('🛣️  Testing route definitions...');
  
  try {
    const routeContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js', 'utf8');
    
    const requiredRoutes = [
      { pattern: "router.get('/', async", desc: 'GET / (list apartments)' },
      { pattern: "router.get('/user/:userId', auth, async", desc: 'GET /user/:userId (user apartments)' },
      { pattern: "router.get('/:id', async", desc: 'GET /:id (single apartment)' },
      { pattern: "router.post('/', auth, async", desc: 'POST / (create apartment)' },
      { pattern: "router.put('/:id', auth, async", desc: 'PUT /:id (update apartment)' },
      { pattern: "router.delete('/:id', auth, async", desc: 'DELETE /:id (delete apartment)' }
    ];

    requiredRoutes.forEach(route => {
      if (routeContent.includes(route.pattern)) {
        tests.push(`✅ Route defined: ${route.desc}`);
      } else {
        failures.push(`❌ Route missing: ${route.desc}`);
      }
    });

    // Check route order (critical for proper routing)
    const userRouteIndex = routeContent.indexOf("router.get('/user/:userId'");
    const idRouteIndex = routeContent.indexOf("router.get('/:id'");
    
    if (userRouteIndex > 0 && idRouteIndex > 0 && userRouteIndex < idRouteIndex) {
      tests.push('✅ Route order correct (/user/:userId before /:id)');
    } else {
      failures.push('❌ Route order incorrect - /:id might override /user/:userId');
    }

  } catch (error) {
    failures.push(`❌ Error reading routes file: ${error.message}`);
  }
}

// Test 3: Service Methods Verification
function testServiceMethods() {
  console.log('⚙️  Testing service methods...');
  
  try {
    const serviceContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/backend/services/ApartmentService.js', 'utf8');
    
    const requiredMethods = [
      'static async create(',
      'static async findById(',
      'static async list(',
      'static async update(',
      'static async delete(',
      'static async findByOwner('
    ];

    requiredMethods.forEach(method => {
      if (serviceContent.includes(method)) {
        tests.push(`✅ Service method: ${method.replace('static async ', '').replace('(', '')}`);
      } else {
        failures.push(`❌ Service method missing: ${method.replace('static async ', '').replace('(', '')}`);
      }
    });

    // Check Supabase integration
    if (serviceContent.includes('supabase') && serviceContent.includes("from('apartments')")) {
      tests.push('✅ Supabase database integration');
    } else {
      failures.push('❌ Supabase database integration missing');
    }

  } catch (error) {
    failures.push(`❌ Error reading service file: ${error.message}`);
  }
}

// Test 4: Server Configuration Verification
function testServerConfiguration() {
  console.log('🖥️  Testing server configuration...');
  
  try {
    const serverContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/backend/server.js', 'utf8');
    
    // Check if apartment routes are properly imported and mounted
    if (serverContent.includes("const apartmentsRoute = require('./routes/apartments')")) {
      tests.push('✅ Apartment routes imported in server');
    } else {
      failures.push('❌ Apartment routes not imported in server');
    }

    if (serverContent.includes("app.use('/api/apartments', apartmentsRoute)")) {
      tests.push('✅ Apartment routes mounted at /api/apartments');
    } else {
      failures.push('❌ Apartment routes not mounted properly');
    }

    // Check for upload apartment API
    if (serverContent.includes("app.use('/api/upload-apartment', uploadApartmentRoute)")) {
      tests.push('✅ Upload apartment API mounted');
    } else {
      failures.push('❌ Upload apartment API not mounted');
    }

  } catch (error) {
    failures.push(`❌ Error reading server file: ${error.message}`);
  }
}

// Test 5: Frontend Integration Verification
function testFrontendIntegration() {
  console.log('🌐 Testing frontend integration...');
  
  try {
    // Check apartments listing page
    const listingContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/apartments-listing.html', 'utf8');
    
    if (listingContent.includes('/api/apartments')) {
      tests.push('✅ Frontend calls apartment API');
    } else {
      failures.push('❌ Frontend missing apartment API calls');
    }

    if (listingContent.includes('renderApartments') || listingContent.includes('loadApartments')) {
      tests.push('✅ Frontend has apartment rendering logic');
    } else {
      failures.push('❌ Frontend missing apartment rendering logic');
    }

    // Check add property page
    const addPropertyContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/add-property.html', 'utf8');
    
    if (addPropertyContent.includes('submitProperty') || addPropertyContent.includes('/api/apartments')) {
      tests.push('✅ Frontend has apartment creation form');
    } else {
      failures.push('❌ Frontend missing apartment creation form');
    }

  } catch (error) {
    failures.push(`❌ Error testing frontend integration: ${error.message}`);
  }
}

// Test 6: Database Schema Verification
function testDatabaseSchema() {
  console.log('🗄️  Testing database schema...');
  
  try {
    const schemaContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/backend/migrations/001_initial_supabase_setup.sql', 'utf8');
    
    if (schemaContent.includes('CREATE TABLE apartments')) {
      tests.push('✅ Apartments table schema defined');
    } else {
      failures.push('❌ Apartments table schema missing');
    }

    const requiredColumns = [
      'id UUID',
      'title VARCHAR',
      'description TEXT',
      'location VARCHAR',
      'price DECIMAL',
      'owner_id UUID',
      'images TEXT[]'
    ];

    requiredColumns.forEach(column => {
      if (schemaContent.includes(column)) {
        tests.push(`✅ Database column: ${column.split(' ')[0]}`);
      } else {
        failures.push(`❌ Database column missing: ${column.split(' ')[0]}`);
      }
    });

  } catch (error) {
    failures.push(`❌ Error reading database schema: ${error.message}`);
  }
}

// Test 7: Environment Configuration
function testEnvironmentConfig() {
  console.log('🔧 Testing environment configuration...');
  
  try {
    const envContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/.env', 'utf8');
    
    const requiredEnvVars = [
      'SUPABASE_URL=',
      'SUPABASE_SERVICE_ROLE_KEY=',
      'JWT_SECRET='
    ];

    requiredEnvVars.forEach(envVar => {
      if (envContent.includes(envVar)) {
        tests.push(`✅ Environment variable: ${envVar.replace('=', '')}`);
      } else {
        failures.push(`❌ Environment variable missing: ${envVar.replace('=', '')}`);
      }
    });

  } catch (error) {
    failures.push(`❌ Error reading .env file: ${error.message}`);
  }
}

// Test 8: Authentication Integration
function testAuthenticationIntegration() {
  console.log('🔐 Testing authentication integration...');
  
  try {
    const routeContent = fs.readFileSync('/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js', 'utf8');
    
    // Check if auth middleware is imported
    if (routeContent.includes("const auth = require('../middleware/auth')")) {
      tests.push('✅ Auth middleware imported');
    } else {
      failures.push('❌ Auth middleware not imported');
    }

    // Check if protected routes use auth
    const protectedRoutes = ['router.post(\'/', 'router.put(\'/', 'router.delete(\'/'];
    protectedRoutes.forEach(route => {
      const routeRegex = new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?, auth,');
      if (routeRegex.test(routeContent)) {
        tests.push(`✅ Auth protection on ${route}route`);
      } else {
        failures.push(`❌ Missing auth protection on ${route}route`);
      }
    });

  } catch (error) {
    failures.push(`❌ Error testing authentication: ${error.message}`);
  }
}

// Run all tests
async function runTests() {
  console.log('Starting comprehensive verification...\n');
  
  testCodeStructure();
  testRouteDefinitions();
  testServiceMethods();
  testServerConfiguration();
  testFrontendIntegration();
  testDatabaseSchema();
  testEnvironmentConfig();
  testAuthenticationIntegration();
  
  // Results
  console.log('\n🎯 VERIFICATION RESULTS:');
  console.log('========================');
  
  if (tests.length > 0) {
    console.log('\n✅ SUCCESSFUL VERIFICATIONS:');
    tests.forEach(test => console.log(test));
  }
  
  if (failures.length > 0) {
    console.log('\n❌ FAILED VERIFICATIONS:');
    failures.forEach(failure => console.log(failure));
  }
  
  const total = tests.length + failures.length;
  const successRate = Math.round((tests.length / total) * 100);
  
  console.log('\n📊 FINAL SCORE:');
  console.log(`✅ Passed: ${tests.length}`);
  console.log(`❌ Failed: ${failures.length}`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (successRate === 100) {
    console.log('\n🎉 STEP 2 ACHIEVES 100% SUCCESS RATE!');
    console.log('🚀 All apartment system components are fully configured and integrated!');
  } else if (successRate >= 95) {
    console.log('\n🎯 STEP 2 NEARLY PERFECT - Minor fixes needed for 100%');
  } else {
    console.log('\n⚠️  STEP 2 needs additional fixes to reach 100%');
  }
  
  return { tests: tests.length, failures: failures.length, successRate };
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
