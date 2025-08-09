#!/usr/bin/env node
/**
 * COMPREHENSIVE API TESTING SUITE WITH PAYPAL & BOOKING REQUESTS
 * Tests all migrated endpoints including booking requests and PayPal payments
 */

const axios = require('axios');
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let testUserId = '';
let testApartmentId = '';
let testViewingRequestId = '';

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        const params = new URLSearchParams();
        Object.keys(data).forEach(key => {
          params.append(key, data[key]);
        });
        config.data = params.toString();
      } else {
        config.data = data;
      }
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
}

async function testServerConnection() {
  log(colors.blue + colors.bold, '\n🔌 TESTING SERVER CONNECTION');
  log(colors.blue, '================================');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`, { timeout: 5000 });
    log(colors.green, '✅ Server is running and accessible');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(colors.red, '❌ Server is not running on localhost:3000');
      return false;
    } else {
      log(colors.green, '✅ Server is running (health endpoint returns error but server responds)');
      return true;
    }
  }
}

async function testUserRegistration() {
  log(colors.cyan + colors.bold, '\n👤 TESTING USER REGISTRATION');
  log(colors.cyan, '=============================');
  
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@sichrplace.com`,
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User'
  };
  
  const result = await makeRequest('POST', '/auth/register', testUser);
  
  if (result.success) {
    log(colors.green, '✅ User registration successful');
    log(colors.green, `   User ID: ${result.data.user?.id || 'N/A'}`);
    testUserId = result.data.user?.id || '';
    return { success: true, user: testUser };
  } else {
    log(colors.red, `❌ User registration failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testUserLogin(credentials) {
  log(colors.cyan + colors.bold, '\n🔐 TESTING USER LOGIN');
  log(colors.cyan, '====================');
  
  const loginData = {
    emailOrUsername: credentials.email,
    password: credentials.password
  };
  
  const result = await makeRequest('POST', '/auth/login', loginData);
  
  if (result.success && result.data.token) {
    log(colors.green, '✅ User login successful');
    log(colors.green, `   Token received: ${result.data.token.substring(0, 20)}...`);
    authToken = result.data.token;
    return { success: true, token: result.data.token };
  } else {
    log(colors.red, `❌ User login failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testApartmentCreation() {
  log(colors.magenta + colors.bold, '\n🏠 TESTING APARTMENT CREATION');
  log(colors.magenta, '==============================');
  
  const apartmentData = {
    'apartment-title': 'Test Apartment for Supabase',
    'apartment-description': 'A beautiful test apartment in the heart of the city',
    'apartment-address': 'Test Street 123, Test City',
    'apartment-postal-code': '12345',
    'apartment-price': '1200',
    'move-in-date': '2025-09-01',
    'move-out-date': '2026-09-01',
    'number-of-rooms': '3',
    'deposit-required': '2400'
  };
  
  const result = await makeRequest('POST', '/api/upload-apartment', apartmentData, {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  });
  
  if (result.success) {
    log(colors.green, '✅ Apartment creation successful');
    log(colors.green, `   Apartment ID: ${result.data.apartmentId || result.data.id || 'N/A'}`);
    testApartmentId = result.data.apartmentId || result.data.id || '';
    return { success: true };
  } else {
    log(colors.red, `❌ Apartment creation failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testBookingRequest() {
  log(colors.yellow + colors.bold, '\n📋 TESTING BOOKING REQUEST (VIEWING REQUEST)');
  log(colors.yellow, '==============================================');
  
  if (!testApartmentId) {
    log(colors.yellow, '⚠️  Skipping - No apartment ID available');
    return { success: false };
  }
  
  const bookingData = {
    apartmentId: testApartmentId,
    requestedDate: '2025-08-15T14:00:00Z',
    alternativeDate1: '2025-08-16T14:00:00Z',
    alternativeDate2: '2025-08-17T14:00:00Z',
    message: 'I would like to book a viewing for this apartment',
    phone: '+49123456789',
    email: 'test@sichrplace.com'
  };
  
  const result = await makeRequest('POST', '/api/viewing-request', bookingData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ Booking request successful');
    log(colors.green, `   Request ID: ${result.data.id || result.data.requestId || 'N/A'}`);
    testViewingRequestId = result.data.id || result.data.requestId || '';
    return { success: true };
  } else {
    log(colors.red, `❌ Booking request failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testPayPalConfiguration() {
  log(colors.magenta + colors.bold, '\n💳 TESTING PAYPAL CONFIGURATION');
  log(colors.magenta, '================================');
  
  const result = await makeRequest('GET', '/api/paypal/config');
  
  if (result.success) {
    log(colors.green, '✅ PayPal configuration successful');
    log(colors.green, `   Client ID: ${result.data.clientId?.substring(0, 20)}...`);
    log(colors.green, `   Environment: ${result.data.environment}`);
    return { success: true };
  } else {
    log(colors.red, `❌ PayPal configuration failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testPayPalPaymentCreation() {
  log(colors.magenta + colors.bold, '\n💰 TESTING PAYPAL PAYMENT CREATION');
  log(colors.magenta, '===================================');
  
  const paymentData = {
    amount: '10.00',
    currency: 'EUR',
    description: 'SichrPlace Booking Fee - Test Payment',
    apartmentId: testApartmentId,
    viewingRequestId: testViewingRequestId
  };
  
  const result = await makeRequest('POST', '/api/paypal/create', paymentData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ PayPal payment creation successful');
    log(colors.green, `   Payment ID: ${result.data.paymentId || 'N/A'}`);
    log(colors.green, `   Status: ${result.data.status || 'N/A'}`);
    log(colors.green, `   Approval URL: ${result.data.approvalUrl ? 'Generated ✓' : 'Not generated ✗'}`);
    return { success: true, paymentId: result.data.paymentId };
  } else {
    log(colors.red, `❌ PayPal payment creation failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testFeedbackSubmission() {
  log(colors.cyan + colors.bold, '\n💬 TESTING FEEDBACK SUBMISSION');
  log(colors.cyan, '===============================');
  
  const feedbackData = {
    feedback: 'Excellent platform! PayPal integration and booking system work perfectly.',
    rating: 5,
    category: 'platform',
    email: 'test@sichrplace.com'
  };
  
  const result = await makeRequest('POST', '/api/feedback', feedbackData);
  
  if (result.success) {
    log(colors.green, '✅ Feedback submission successful');
    log(colors.green, `   Feedback ID: ${result.data.feedback?.id || result.data.id || 'N/A'}`);
    return { success: true };
  } else {
    log(colors.red, `❌ Feedback submission failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testMessageSending() {
  log(colors.cyan + colors.bold, '\n💌 TESTING MESSAGE SENDING');
  log(colors.cyan, '==========================');
  
  if (!testApartmentId || !testUserId) {
    log(colors.yellow, '⚠️  Skipping - Missing apartment ID or user ID');
    return { success: false };
  }
  
  const messageData = {
    apartmentId: testApartmentId,
    recipientId: testUserId,
    content: 'Test message: Payment processing integration is working great!'
  };
  
  const result = await makeRequest('POST', '/api/send-message', messageData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ Message sending successful');
    log(colors.green, `   Message ID: ${result.data.messageId || result.data.data?.id || 'N/A'}`);
    return { success: true };
  } else {
    log(colors.red, `❌ Message sending failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function runComprehensiveTests() {
  console.log(colors.bold + colors.blue + '🧪 COMPREHENSIVE API TESTS - SUPABASE + PAYPAL + BOOKING');
  console.log('=========================================================\n');
  
  const results = {
    serverConnection: false,
    userRegistration: false,
    userLogin: false,
    apartmentCreation: false,
    bookingRequest: false,
    paypalConfiguration: false,
    paypalPaymentCreation: false,
    feedbackSubmission: false,
    messageSending: false
  };
  
  // Test server connection
  results.serverConnection = await testServerConnection();
  if (!results.serverConnection) {
    log(colors.red, '\n❌ Cannot proceed - server is not running');
    return;
  }
  
  // Test user registration and login
  const registrationResult = await testUserRegistration();
  results.userRegistration = registrationResult.success;
  
  if (registrationResult.success) {
    const loginResult = await testUserLogin(registrationResult.user);
    results.userLogin = loginResult.success;
  }
  
  // Test apartment creation (requires auth)
  if (results.userLogin) {
    const apartmentResult = await testApartmentCreation();
    results.apartmentCreation = apartmentResult.success;
  }
  
  // Test booking request (requires apartment and auth)
  if (results.apartmentCreation) {
    const bookingResult = await testBookingRequest();
    results.bookingRequest = bookingResult.success;
  }
  
  // Test PayPal configuration
  const paypalConfigResult = await testPayPalConfiguration();
  results.paypalConfiguration = paypalConfigResult.success;
  
  // Test PayPal payment creation (requires auth)
  if (results.userLogin) {
    const paypalPaymentResult = await testPayPalPaymentCreation();
    results.paypalPaymentCreation = paypalPaymentResult.success;
  }
  
  // Test feedback submission
  const feedbackResult = await testFeedbackSubmission();
  results.feedbackSubmission = feedbackResult.success;
  
  // Test message sending (requires auth and apartment)
  if (results.userLogin && results.apartmentCreation) {
    const messageResult = await testMessageSending();
    results.messageSending = messageResult.success;
  }
  
  // Summary
  log(colors.bold + colors.blue, '\n📊 COMPREHENSIVE TEST RESULTS');
  log(colors.blue, '===============================');
  
  const tests = [
    { name: 'Server Connection', result: results.serverConnection, category: '🔧 Infrastructure' },
    { name: 'User Registration', result: results.userRegistration, category: '🔐 Authentication' },
    { name: 'User Login', result: results.userLogin, category: '🔐 Authentication' },
    { name: 'Apartment Creation', result: results.apartmentCreation, category: '🏠 Core Features' },
    { name: 'Booking Request', result: results.bookingRequest, category: '📋 Booking System' },
    { name: 'PayPal Configuration', result: results.paypalConfiguration, category: '💳 Payment System' },
    { name: 'PayPal Payment Creation', result: results.paypalPaymentCreation, category: '💳 Payment System' },
    { name: 'Feedback Submission', result: results.feedbackSubmission, category: '💬 User Experience' },
    { name: 'Message Sending', result: results.messageSending, category: '📨 Communication' }
  ];
  
  let passedTests = 0;
  tests.forEach(test => {
    const status = test.result ? '✅ PASSED' : '❌ FAILED';
    const color = test.result ? colors.green : colors.red;
    log(color, `${test.category} ${test.name}: ${status}`);
    if (test.result) passedTests++;
  });
  
  const percentage = Math.round((passedTests / tests.length) * 100);
  
  log(colors.bold, `\n🎯 OVERALL RESULT: ${passedTests}/${tests.length} tests passed (${percentage}%)`);
  
  if (percentage >= 90) {
    log(colors.green + colors.bold, '\n🎉 EXCELLENT! Your platform is fully operational!');
    log(colors.green, '   ✅ Authentication system working');
    log(colors.green, '   ✅ Apartment management working');
    log(colors.green, '   ✅ Booking system operational');
    log(colors.green, '   ✅ PayPal payment integration active');
    log(colors.green, '   ✅ Communication features enabled');
  } else if (percentage >= 70) {
    log(colors.yellow + colors.bold, '\n✅ GOOD! Most systems are operational.');
    log(colors.yellow, '   Some minor issues may need attention.');
  } else {
    log(colors.red + colors.bold, '\n🔧 NEEDS ATTENTION! Several features need fixing.');
    log(colors.red, '   Check server logs and debug failing endpoints.');
  }
  
  // Export test data
  const testData = {
    timestamp: new Date().toISOString(),
    results,
    percentage,
    testApartmentId,
    testViewingRequestId,
    testUserId,
    authToken: authToken ? 'Present' : 'Missing'
  };
  
  log(colors.blue, '\n📋 Next Steps:');
  log(colors.blue, '• Test PayPal payment flow in browser');
  log(colors.blue, '• Verify booking confirmation workflow');
  log(colors.blue, '• Test frontend integration');
  log(colors.blue, '• Monitor production readiness');
  
  console.log('\n💾 Test Results Data:');
  console.log(JSON.stringify(testData, null, 2));
}

// Run the tests
runComprehensiveTests().catch(error => {
  log(colors.red, `\n💥 Test suite error: ${error.message}`);
  process.exit(1);
});
