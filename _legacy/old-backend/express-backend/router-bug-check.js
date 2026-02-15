#!/usr/bin/env node

/**
 * Quick Router Bug Detection Script
 * Tests apartment routes for common issues
 */

const fs = require('fs');

console.log('🔧 APARTMENT ROUTER BUG CHECK');
console.log('============================\n');

const bugs = [];
const fixes = [];

// 1. Check for method name mismatches
function checkMethodNameMismatches() {
  try {
    const servicePath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/services/ApartmentService.js';
    const routePath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js';
    
    const serviceContent = fs.readFileSync(servicePath, 'utf8');
    const routeContent = fs.readFileSync(routePath, 'utf8');
    
    // Extract method names from service
    const serviceMethods = [];
    const methodMatches = serviceContent.match(/static async (\w+)\(/g);
    if (methodMatches) {
      methodMatches.forEach(match => {
        const methodName = match.replace('static async ', '').replace('(', '');
        serviceMethods.push(methodName);
      });
    }
    
    console.log('📋 Available ApartmentService methods:');
    serviceMethods.forEach(method => console.log(`   - ${method}`));
    console.log('');
    
    // Check for mismatched calls in routes
    const routeCalls = routeContent.match(/ApartmentService\.(\w+)\(/g);
    if (routeCalls) {
      routeCalls.forEach(call => {
        const calledMethod = call.replace('ApartmentService.', '').replace('(', '');
        if (!serviceMethods.includes(calledMethod)) {
          bugs.push(`❌ Route calls non-existent method: ApartmentService.${calledMethod}`);
        } else {
          fixes.push(`✅ Method call verified: ApartmentService.${calledMethod}`);
        }
      });
    }
    
  } catch (error) {
    bugs.push(`❌ Error checking method mismatches: ${error.message}`);
  }
}

// 2. Check for route parameter conflicts
function checkRouteConflicts() {
  try {
    const routePath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js';
    const routeContent = fs.readFileSync(routePath, 'utf8');
    
    // Extract route definitions
    const routes = [];
    const routeMatches = routeContent.match(/router\.\w+\(['"`]([^'"`]+)['"`]/g);
    if (routeMatches) {
      routeMatches.forEach(match => {
        const route = match.match(/['"`]([^'"`]+)['"`]/)[1];
        routes.push(route);
      });
    }
    
    console.log('🛣️  Defined routes:');
    routes.forEach(route => console.log(`   - ${route}`));
    console.log('');
    
    // Check for conflicts (routes that might interfere with each other)
    const conflicts = [];
    routes.forEach((route, i) => {
      routes.forEach((otherRoute, j) => {
        if (i !== j && route.includes(':') && otherRoute.includes(route.split(':')[0])) {
          conflicts.push(`${route} might conflict with ${otherRoute}`);
        }
      });
    });
    
    if (conflicts.length > 0) {
      conflicts.forEach(conflict => bugs.push(`❌ Potential route conflict: ${conflict}`));
    } else {
      fixes.push('✅ No route conflicts detected');
    }
    
  } catch (error) {
    bugs.push(`❌ Error checking route conflicts: ${error.message}`);
  }
}

// 3. Check for missing error handling
function checkErrorHandling() {
  try {
    const routePath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js';
    const routeContent = fs.readFileSync(routePath, 'utf8');
    
    const routeBlocks = routeContent.split('router.');
    let routesWithoutTryCatch = 0;
    let totalRoutes = 0;
    
    routeBlocks.forEach((block, i) => {
      if (i === 0) return; // Skip first split
      
      if (block.includes('async')) {
        totalRoutes++;
        if (!block.includes('try {') || !block.includes('catch')) {
          routesWithoutTryCatch++;
        }
      }
    });
    
    if (routesWithoutTryCatch > 0) {
      bugs.push(`❌ ${routesWithoutTryCatch} routes missing proper error handling`);
    } else {
      fixes.push(`✅ All ${totalRoutes} routes have proper error handling`);
    }
    
  } catch (error) {
    bugs.push(`❌ Error checking error handling: ${error.message}`);
  }
}

// 4. Check for authentication middleware consistency
function checkAuthMiddleware() {
  try {
    const routePath = '/Users/omer3kale/SichrPlace77/SichrPlace77/backend/routes/apartments.js';
    const routeContent = fs.readFileSync(routePath, 'utf8');
    
    // Routes that should require auth
    const authRequiredRoutes = ['POST', 'PUT', 'DELETE'];
    const routeLines = routeContent.split('\n');
    
    authRequiredRoutes.forEach(method => {
      const methodRoutes = routeLines.filter(line => 
        line.includes(`router.${method.toLowerCase()}(`) || 
        line.includes(`router.${method.toLowerCase().substring(0,3)}(`)
      );
      
      methodRoutes.forEach(route => {
        if (!route.includes('auth') && !route.includes('public')) {
          bugs.push(`❌ ${method} route might be missing auth middleware: ${route.trim()}`);
        } else {
          fixes.push(`✅ ${method} route has proper auth: ${route.trim().substring(0, 50)}...`);
        }
      });
    });
    
  } catch (error) {
    bugs.push(`❌ Error checking auth middleware: ${error.message}`);
  }
}

// Run all checks
checkMethodNameMismatches();
checkRouteConflicts();
checkErrorHandling();
checkAuthMiddleware();

// Display results
if (fixes.length > 0) {
  console.log('✅ FIXES VERIFIED:');
  console.log('==================');
  fixes.forEach(fix => console.log(fix));
  console.log('');
}

if (bugs.length > 0) {
  console.log('🐛 BUGS FOUND:');
  console.log('==============');
  bugs.forEach(bug => console.log(bug));
  console.log(`\n🔧 Found ${bugs.length} router bug(s) to fix.`);
} else {
  console.log('🎉 NO ROUTER BUGS DETECTED!');
  console.log('All apartment routes appear to be functioning correctly.');
}

console.log(`\n📊 SUMMARY: ${fixes.length} fixes verified, ${bugs.length} bugs found`);
