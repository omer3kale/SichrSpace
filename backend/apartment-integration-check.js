#!/usr/bin/env node

/**
 * Comprehensive Apartment Listing System Integration Test
 * This script verifies all components of Step 2: Property/Apartment Listing Management
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 APARTMENT LISTING SYSTEM INTEGRATION CHECK');
console.log('==============================================\n');

const issues = [];
const successes = [];

// 1. Check if server.js properly mounts apartment routes
function checkServerRoutes() {
  try {
    const serverPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/server.js';
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes("app.use('/api/apartments', apartmentsRoute)")) {
      successes.push('✅ Apartment routes properly mounted at /api/apartments');
    } else {
      issues.push('❌ Apartment routes not properly mounted in server.js');
    }
    
    if (serverContent.includes("const apartmentsRoute = require('./routes/apartments')")) {
      successes.push('✅ Apartment routes properly imported');
    } else {
      issues.push('❌ Apartment routes not imported in server.js');
    }
  } catch (error) {
    issues.push('❌ Cannot read server.js: ' + error.message);
  }
}

// 2. Check if apartment routes file exists and has required endpoints
function checkApartmentRoutes() {
  try {
    const apartmentRoutesPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js';
    const apartmentContent = fs.readFileSync(apartmentRoutesPath, 'utf8');
    
    const requiredEndpoints = [
      "router.get('/', async", // List apartments
      "router.post('/', auth, async", // Create apartment
      "router.get('/:id', async", // Get apartment by ID
      "router.put('/:id', auth, async", // Update apartment
      "router.delete('/:id', auth, async" // Delete apartment
    ];

    requiredEndpoints.forEach(endpoint => {
      if (apartmentContent.includes(endpoint)) {
        successes.push(`✅ ${endpoint.split(',')[0]} endpoint implemented`);
      } else {
        issues.push(`❌ ${endpoint.split(',')[0]} endpoint missing`);
      }
    });
    
    // Check for authentication middleware
    if (apartmentContent.includes('auth') && apartmentContent.includes('middleware')) {
      successes.push('✅ Authentication middleware properly integrated');
    } else {
      issues.push('❌ Authentication middleware missing or not properly integrated');
    }
    
  } catch (error) {
    issues.push('❌ Cannot read apartment routes: ' + error.message);
  }
}

// 3. Check if ApartmentService exists and has required methods
function checkApartmentService() {
  try {
    const servicePath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/services/ApartmentService.js';
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    
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
        successes.push(`✅ ApartmentService.${method.replace('static async ', '').replace('(', '')} implemented`);
      } else {
        issues.push(`❌ ApartmentService.${method.replace('static async ', '').replace('(', '')} method missing`);
      }
    });
    
    // Check for Supabase integration
    if (serviceContent.includes('supabase') && serviceContent.includes('from(\'apartments\')')) {
      successes.push('✅ Supabase database integration implemented');
    } else {
      issues.push('❌ Supabase database integration missing');
    }
    
  } catch (error) {
    issues.push('❌ Cannot read ApartmentService: ' + error.message);
  }
}

// 4. Check upload apartment API endpoint
function checkUploadApartmentEndpoint() {
  try {
    const uploadPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/api/upload-apartment.js';
    const uploadContent = fs.readFileSync(uploadPath, 'utf8');
    
    if (uploadContent.includes('router.post(')) {
      successes.push('✅ Upload apartment endpoint implemented');
    } else {
      issues.push('❌ Upload apartment endpoint missing');
    }
    
    if (uploadContent.includes('multer') && uploadContent.includes('upload')) {
      successes.push('✅ File upload (multer) integration implemented');
    } else {
      issues.push('❌ File upload functionality missing');
    }
    
    if (uploadContent.includes('ApartmentService.create')) {
      successes.push('✅ Upload endpoint uses ApartmentService');
    } else {
      issues.push('❌ Upload endpoint not integrated with ApartmentService');
    }
    
  } catch (error) {
    issues.push('❌ Cannot read upload-apartment.js: ' + error.message);
  }
}

// 5. Check frontend apartment listing page
function checkFrontendListingPage() {
  try {
    const frontendPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/apartments-listing.html';
    const frontendContent = fs.readFileSync(frontendPath, 'utf8');
    
    if (frontendContent.includes('fetch(`${API_BASE_URL}/api/apartments`)')) {
      successes.push('✅ Frontend apartment listing API integration');
    } else {
      issues.push('❌ Frontend not properly calling apartment API');
    }
    
    if (frontendContent.includes('renderApartments') && frontendContent.includes('function')) {
      successes.push('✅ Apartment rendering functionality implemented');
    } else {
      issues.push('❌ Apartment rendering functionality missing');
    }
    
    if (frontendContent.includes('applyFilters') || frontendContent.includes('handleSearch')) {
      successes.push('✅ Search and filter functionality implemented');
    } else {
      issues.push('❌ Search and filter functionality missing');
    }
    
  } catch (error) {
    issues.push('❌ Cannot read apartments-listing.html: ' + error.message);
  }
}

// 6. Check frontend add property page
function checkFrontendAddPropertyPage() {
  try {
    const addPropertyPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/add-property.html';
    const addPropertyContent = fs.readFileSync(addPropertyPath, 'utf8');
    
    if (addPropertyContent.includes('fetch(\'/api/apartments\'') || addPropertyContent.includes('submitProperty')) {
      successes.push('✅ Add property form submission implemented');
    } else {
      issues.push('❌ Add property form submission missing');
    }
    
    if (addPropertyContent.includes('FormData') && addPropertyContent.includes('append')) {
      successes.push('✅ File upload form handling implemented');
    } else {
      issues.push('❌ File upload form handling missing');
    }
    
    if (addPropertyContent.includes('Authorization') && addPropertyContent.includes('Bearer')) {
      successes.push('✅ Authentication integration in add property form');
    } else {
      issues.push('❌ Authentication integration missing in add property form');
    }
    
  } catch (error) {
    issues.push('❌ Cannot read add-property.html: ' + error.message);
  }
}

// 7. Check database schema
function checkDatabaseSchema() {
  try {
    const schemaPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/migrations/001_initial_supabase_setup.sql';
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    if (schemaContent.includes('CREATE TABLE apartments')) {
      successes.push('✅ Apartments database table schema exists');
    } else {
      issues.push('❌ Apartments database table schema missing');
    }
    
    const requiredFields = [
      'title VARCHAR',
      'description TEXT',
      'location VARCHAR',
      'price DECIMAL',
      'owner_id UUID',
      'images TEXT[]'
    ];
    
    requiredFields.forEach(field => {
      if (schemaContent.includes(field)) {
        successes.push(`✅ Database field: ${field.split(' ')[0]} exists`);
      } else {
        issues.push(`❌ Database field: ${field.split(' ')[0]} missing`);
      }
    });
    
  } catch (error) {
    issues.push('❌ Cannot read database schema: ' + error.message);
  }
}

// 8. Check environment configuration
function checkEnvironmentConfig() {
  try {
    const envPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/.env';
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const requiredEnvVars = [
      'SUPABASE_URL=',
      'SUPABASE_SERVICE_ROLE_KEY='
    ];
    
    requiredEnvVars.forEach(envVar => {
      if (envContent.includes(envVar)) {
        successes.push(`✅ ${envVar.replace('=', '')} configured`);
      } else {
        issues.push(`❌ ${envVar.replace('=', '')} not configured`);
      }
    });
    
  } catch (error) {
    issues.push('❌ Cannot read .env file: ' + error.message);
  }
}

// Run all checks
checkServerRoutes();
checkApartmentRoutes();
checkApartmentService();
checkUploadApartmentEndpoint();
checkFrontendListingPage();
checkFrontendAddPropertyPage();
checkDatabaseSchema();
checkEnvironmentConfig();

// Display results
console.log('🎯 INTEGRATION SUCCESS SUMMARY:');
console.log('===============================');
successes.forEach(success => console.log(success));

if (issues.length > 0) {
  console.log('\n🚨 INTEGRATION ISSUES FOUND:');
  console.log('=============================');
  issues.forEach(issue => console.log(issue));
  
  console.log(`\n❌ Found ${issues.length} integration issue(s) that need to be resolved.`);
} else {
  console.log('\n🚨 INTEGRATION ISSUES FOUND:');
  console.log('=============================');
  console.log('✅ No issues found! Step 2 is fully integrated.');
}

console.log('\n📊 INTEGRATION STATUS:');
console.log('======================');
const totalChecks = successes.length + issues.length;
const successRate = Math.round((successes.length / totalChecks) * 100);

console.log(`Success Rate: ${successRate}% (${successes.length}/${totalChecks})`);

if (successRate >= 95) {
  console.log('🎉 STEP 2 IS FULLY INTEGRATED!');
} else if (successRate >= 80) {
  console.log('⚠️  STEP 2 IS MOSTLY INTEGRATED - Minor fixes needed');
} else {
  console.log('❌ STEP 2 REQUIRES SIGNIFICANT INTEGRATION WORK');
}
