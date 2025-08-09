// Test script for Netlify functions
const https = require('https');

const TEST_DOMAIN = 'your-site-name.netlify.app'; // Replace with your actual Netlify domain

async function testNetlifyFunction(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TEST_DOMAIN,
      port: 443,
      path: `/.netlify/functions/${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Netlify Functions...\n');

  try {
    // Test 1: PayPal Config
    console.log('1️⃣ Testing PayPal Config API...');
    const paypalConfig = await testNetlifyFunction('paypal-config');
    console.log(`Status: ${paypalConfig.statusCode}`);
    if (paypalConfig.statusCode === 200) {
      const config = JSON.parse(paypalConfig.body);
      console.log(`✅ PayPal Client ID: ${config.clientId.substring(0, 10)}...`);
      console.log(`✅ Environment: ${config.environment}`);
    } else {
      console.log('❌ PayPal Config failed');
    }
    console.log('');

    // Test 2: CSRF Token
    console.log('2️⃣ Testing CSRF Token API...');
    const csrfResponse = await testNetlifyFunction('csrf-token');
    console.log(`Status: ${csrfResponse.statusCode}`);
    if (csrfResponse.statusCode === 200) {
      const csrf = JSON.parse(csrfResponse.body);
      console.log(`✅ CSRF Token: ${csrf.csrfToken.substring(0, 10)}...`);
    } else {
      console.log('❌ CSRF Token failed');
    }
    console.log('');

    // Test 3: Viewing Request (POST with test data)
    console.log('3️⃣ Testing Viewing Request API...');
    const testData = {
      paymentId: 'test-payment-id',
      name: 'Test User',
      email: 'test@example.com',
      apartment: 'Test Apartment',
      date: '2024-01-15',
      time: '14:00',
      paypalOrderId: 'test-order-id'
    };
    
    const viewingResponse = await testNetlifyFunction('viewing-request', 'POST', testData);
    console.log(`Status: ${viewingResponse.statusCode}`);
    if (viewingResponse.statusCode === 200) {
      console.log('✅ Viewing Request API working');
    } else {
      console.log('❌ Viewing Request failed');
      console.log(viewingResponse.body);
    }
    console.log('');

    console.log('🎉 All Netlify function tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests only if domain is configured
if (TEST_DOMAIN === 'your-site-name.netlify.app') {
  console.log('⚠️  Please update TEST_DOMAIN with your actual Netlify domain');
  console.log('Example: const TEST_DOMAIN = "sichrplace.netlify.app";');
} else {
  runTests();
}
