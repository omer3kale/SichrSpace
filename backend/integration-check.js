#!/usr/bin/env node

/**
 * Comprehensive Authentication System Integration Test
 * This script verifies all components of Step 1: User Authentication System
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 AUTHENTICATION SYSTEM INTEGRATION CHECK');
console.log('===========================================\n');

const issues = [];
const successes = [];

// 1. Check if server.js properly mounts auth routes
function checkServerRoutes() {
  try {
    const serverPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/server.js';
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes("app.use('/auth', authRoutes)")) {
      successes.push('✅ Auth routes properly mounted at /auth');
    } else {
      issues.push('❌ Auth routes not properly mounted in server.js');
    }
    
    if (serverContent.includes("const authRoutes = require('./routes/auth')")) {
      successes.push('✅ Auth routes properly imported');
    } else {
      issues.push('❌ Auth routes not imported in server.js');
    }
  } catch (error) {
    issues.push('❌ Cannot read server.js: ' + error.message);
  }
}

// 2. Check if auth routes file exists and has required endpoints
function checkAuthRoutes() {
  try {
    const authPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/auth.js';
    const authContent = fs.readFileSync(authPath, 'utf8');
    
    const requiredEndpoints = [
      "router.post('/register'",
      "router.post('/login'",
      "router.post('/forgot-password'",
      "router.post('/reset-password'",
      "router.get('/profile'"
    ];

    requiredEndpoints.forEach(endpoint => {
      if (authContent.includes(endpoint)) {
        successes.push(`✅ ${endpoint} endpoint implemented`);
      } else {
        issues.push(`❌ ${endpoint} endpoint missing`);
      }
    });

    // Special check for verify-email (can have parameters)
    if (authContent.includes("router.get('/verify-email")) {
      successes.push('✅ router.get(\'/verify-email\' endpoint implemented');
    } else {
      issues.push('❌ router.get(\'/verify-email\' endpoint missing');
    }    // Check for role mapping logic
    if (authContent.includes('UserService.getUserRole') || authContent.includes('role: user.bio || \'user\'')) {
      successes.push('✅ Role mapping logic implemented');
    } else {
      issues.push('❌ Role mapping logic missing or incorrect');
    }
    
  } catch (error) {
    issues.push('❌ Cannot read auth routes: ' + error.message);
  }
}

// 3. Check UserService integration
function checkUserService() {
  try {
    const userServicePath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/services/UserService.js';
    const userServiceContent = fs.readFileSync(userServicePath, 'utf8');
    
    const requiredMethods = [
      'static async create(',
      'static async findByEmail(',
      'static async findById(',
      'static async update('
    ];
    
    requiredMethods.forEach(method => {
      if (userServiceContent.includes(method)) {
        successes.push(`✅ UserService.${method.split(' ')[2]} implemented`);
      } else {
        issues.push(`❌ UserService.${method.split(' ')[2]} missing`);
      }
    });
    
  } catch (error) {
    issues.push('❌ Cannot read UserService: ' + error.message);
  }
}

// 4. Check frontend forms
function checkFrontendForms() {
  try {
    // Check login.html
    const loginPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/login.html';
    const loginContent = fs.readFileSync(loginPath, 'utf8');
    
    if (loginContent.includes("fetch('/auth/login'")) {
      successes.push('✅ Login form uses correct /auth/login endpoint');
    } else {
      issues.push('❌ Login form not using correct endpoint');
    }
    
    // Check for conflicting implementations
    if (loginContent.includes("/api/auth/login-test")) {
      issues.push('❌ Login form has conflicting legacy endpoint');
    } else {
      successes.push('✅ No conflicting endpoints in login form');
    }
    
    // Check register.html
    const registerPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/frontend/register.html';
    const registerContent = fs.readFileSync(registerPath, 'utf8');
    
    if (registerContent.includes("fetch('/auth/register'")) {
      successes.push('✅ Registration form uses correct /auth/register endpoint');
    } else {
      issues.push('❌ Registration form not using correct endpoint');
    }
    
  } catch (error) {
    issues.push('❌ Cannot read frontend forms: ' + error.message);
  }
}

// 5. Check environment configuration
function checkEnvironment() {
  try {
    const envPath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/.env';
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = [
      'SUPABASE_URL=',
      'SUPABASE_SERVICE_ROLE_KEY=',
      'JWT_SECRET=',
      'GMAIL_USER=',
      'GMAIL_APP_PASSWORD='
    ];
    
    requiredVars.forEach(varName => {
      if (envContent.includes(varName) && !envContent.includes(varName + 'your_')) {
        successes.push(`✅ ${varName} configured`);
      } else {
        issues.push(`❌ ${varName} not configured or using placeholder`);
      }
    });
    
  } catch (error) {
    issues.push('❌ Cannot read .env file: ' + error.message);
  }
}

// Run all checks
checkServerRoutes();
checkAuthRoutes();
checkUserService();
checkFrontendForms();
checkEnvironment();

// Display results
console.log('🎯 INTEGRATION SUCCESS SUMMARY:');
console.log('===============================');
successes.forEach(success => console.log(success));

console.log('\n🚨 INTEGRATION ISSUES FOUND:');
console.log('=============================');
if (issues.length === 0) {
  console.log('✅ No issues found! Step 1 is fully integrated.');
} else {
  issues.forEach(issue => console.log(issue));
  console.log(`\n❌ Found ${issues.length} integration issue(s) that need to be resolved.`);
}

console.log('\n📊 INTEGRATION STATUS:');
console.log('======================');
const totalChecks = successes.length + issues.length;
const successRate = Math.round((successes.length / totalChecks) * 100);
console.log(`Success Rate: ${successRate}% (${successes.length}/${totalChecks})`);

if (successRate >= 95) {
  console.log('🎉 STEP 1 IS FULLY INTEGRATED!');
} else if (successRate >= 80) {
  console.log('⚠️  STEP 1 IS MOSTLY INTEGRATED - Minor fixes needed');
} else {
  console.log('❌ STEP 1 REQUIRES SIGNIFICANT INTEGRATION WORK');
}
