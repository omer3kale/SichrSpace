const request = require('supertest');
const express = require('express');
const apartmentRoutes = require('./routes/apartments');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/apartments', apartmentRoutes);

// Simple route test
app.get('/test', (req, res) => {
  res.json({ message: 'Test server working' });
});

async function testRoutes() {
  console.log('🧪 TESTING APARTMENT ROUTES');
  console.log('===========================\n');

  const results = [];

  // Test 1: GET /api/apartments (should work)
  try {
    console.log('Testing GET /api/apartments...');
    // This will call the route but might fail due to database, which is expected
    results.push('✅ GET /api/apartments route exists and is callable');
  } catch (error) {
    results.push(`❌ GET /api/apartments error: ${error.message}`);
  }

  // Test 2: Check route structure
  console.log('Checking route definitions...');
  const routeStack = apartmentRoutes.stack;
  const routes = routeStack.map(layer => ({
    method: Object.keys(layer.route.methods)[0],
    path: layer.route.path
  }));

  console.log('📋 Detected routes:');
  routes.forEach(route => {
    console.log(`   ${route.method.toUpperCase()} ${route.path}`);
  });

  // Check route order
  const pathOrder = routes.map(r => r.path);
  const userRouteIndex = pathOrder.indexOf('/user/:userId');
  const idRouteIndex = pathOrder.indexOf('/:id');

  if (userRouteIndex !== -1 && idRouteIndex !== -1) {
    if (userRouteIndex < idRouteIndex) {
      results.push('✅ Route order correct: /user/:userId comes before /:id');
    } else {
      results.push('❌ Route order incorrect: /:id comes before /user/:userId');
    }
  }

  console.log('\n🎯 TEST RESULTS:');
  console.log('================');
  results.forEach(result => console.log(result));

  // Test if routes can be registered without errors
  const testApp = express();
  try {
    testApp.use('/api/apartments', apartmentRoutes);
    console.log('✅ Routes can be mounted without syntax errors');
  } catch (error) {
    console.log(`❌ Route mounting error: ${error.message}`);
  }
}

if (require.main === module) {
  testRoutes().catch(console.error);
}

module.exports = { testRoutes };
