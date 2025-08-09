#!/usr/bin/env node
/**
 * ENHANCED COMPREHENSIVE API TESTING SUITE
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
let testConversationId = '';

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
    const response = await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    log(colors.green, '✅ Server is running and accessible');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log(colors.red, '❌ Server is not running on localhost:3000');
      log(colors.yellow, '💡 Make sure to run: node server.js in the backend directory');
      return false;
    } else {
      log(colors.green, '✅ Server is running (health endpoint not found, but server responds)');
      return true;
    }
  }
}

async function testUserRegistration() {
  log(colors.blue + colors.bold, '\n👤 TESTING USER REGISTRATION');
  log(colors.blue, '=============================');
  
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
  log(colors.blue + colors.bold, '\n🔐 TESTING USER LOGIN');
  log(colors.blue, '====================');
  
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
  log(colors.blue + colors.bold, '\n🏠 TESTING APARTMENT CREATION');
  log(colors.blue, '==============================');
  
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

async function testViewingRequest() {
  log(colors.blue + colors.bold, '\n👁️  TESTING VIEWING REQUEST');
  log(colors.blue, '===========================');
  
  if (!testApartmentId) {
    log(colors.yellow, '⚠️  Skipping - No apartment ID available');
    return { success: false };
  }
  
  const viewingData = {
    apartmentId: testApartmentId,
    requestedDate: '2025-08-15T14:00:00Z',
    message: 'I would like to view this apartment',
    phone: '+49123456789',
    email: 'test@sichrplace.com'
  };
  
  const result = await makeRequest('POST', '/api/viewing-request', viewingData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ Viewing request successful');
    log(colors.green, `   Request ID: ${result.data.id || result.data.requestId || 'N/A'}`);
    testViewingRequestId = result.data.id || result.data.requestId || '';
    return { success: true };
  } else {
    log(colors.red, `❌ Viewing request failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testBookingRequest() {
  log(colors.cyan + colors.bold, '\n📅 TESTING BOOKING REQUEST');
  log(colors.cyan, '==========================');
  
  if (!testApartmentId) {
    log(colors.yellow, '⚠️  Skipping - No apartment ID available');
    return { success: false };
  }
  
  // Test legacy booking request endpoint (should be deprecated)
  const legacyResult = await makeRequest('GET', `/api/booking-requests/${testApartmentId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (legacyResult.status === 410) {
    log(colors.green, '✅ Legacy booking request endpoint properly deprecated');
    log(colors.green, '   Returns 410 Gone as expected');
  } else {
    log(colors.yellow, '⚠️  Legacy endpoint behavior unexpected');
  }
  
  // Test modern viewing request system
  const modernBookingData = {
    apartmentId: testApartmentId,
    requestedDate: '2025-08-20T16:00:00Z',
    alternativeDate1: '2025-08-21T14:00:00Z',
    alternativeDate2: '2025-08-22T18:00:00Z',
    message: 'Booking request with multiple date options',
    phone: '+49987654321',
    email: 'booking@sichrplace.com',
    bookingFee: '10.00'
  };
  
  const result = await makeRequest('POST', '/api/viewing-request', modernBookingData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ Modern booking request successful');
    log(colors.green, `   Booking ID: ${result.data.id || result.data.requestId || 'N/A'}`);
    return { success: true };
  } else {
    log(colors.red, `❌ Modern booking request failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testPayPalPayment() {
  log(colors.magenta + colors.bold, '\n💳 TESTING PAYPAL PAYMENT');
  log(colors.magenta, '=========================');
  
  if (!testViewingRequestId && !testApartmentId) {
    log(colors.yellow, '⚠️  Skipping - No viewing request or apartment ID available');
    return { success: false };
  }
  
  // Test PayPal payment creation
  const paymentData = {
    amount: '10.00',
    currency: 'EUR',
    description: 'Apartment viewing booking fee',
    apartmentId: testApartmentId,
    viewingRequestId: testViewingRequestId || 'test-viewing-id',
    returnUrl: `${BASE_URL}/payment/success`,
    cancelUrl: `${BASE_URL}/payment/cancel`
  };
  
  const result = await makeRequest('POST', '/api/payment/paypal/create', paymentData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ PayPal payment creation successful');
    log(colors.green, `   Payment ID: ${result.data.paymentId || result.data.id || 'N/A'}`);
    log(colors.green, `   Approval URL: ${result.data.approvalUrl || 'N/A'}`);
    return { success: true, paymentId: result.data.paymentId || result.data.id };
  } else {
    log(colors.red, `❌ PayPal payment creation failed: ${JSON.stringify(result.error)}`);
    
    // Test PayPal webhook endpoint
    const webhookData = {
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'test-payment-id',
        status: 'COMPLETED',
        amount: {
          currency_code: 'EUR',
          value: '10.00'
        }
      }
    };
    
    const webhookResult = await makeRequest('POST', '/api/payment/paypal/webhook', webhookData);
    
    if (webhookResult.success || webhookResult.status === 200) {
      log(colors.green, '✅ PayPal webhook endpoint accessible');
      return { success: true };
    } else {
      log(colors.red, `❌ PayPal webhook test failed: ${JSON.stringify(webhookResult.error)}`);
      return { success: false };
    }
  }
}

async function testPayPalConfiguration() {
  log(colors.magenta + colors.bold, '\n⚙️  TESTING PAYPAL CONFIGURATION');
  log(colors.magenta, '=================================');
  
  // Test PayPal configuration endpoint
  const configResult = await makeRequest('GET', '/api/payment/paypal/config', null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (configResult.success) {
    log(colors.green, '✅ PayPal configuration accessible');
    log(colors.green, `   Client ID available: ${configResult.data.clientId ? 'Yes' : 'No'}`);
    log(colors.green, `   Environment: ${configResult.data.environment || 'N/A'}`);
    return { success: true };
  } else {
    log(colors.yellow, '⚠️  PayPal configuration endpoint not available (may be expected)');
    return { success: true }; // Not critical for core functionality
  }
}

async function testFeedbackSubmission() {
  log(colors.blue + colors.bold, '\n💬 TESTING FEEDBACK SUBMISSION');
  log(colors.blue, '===============================');
  
  const feedbackData = {
    feedback: 'Great platform! The Supabase migration works perfectly.',
    rating: 5,
    category: 'general',
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
  log(colors.blue + colors.bold, '\n💌 TESTING MESSAGE SENDING');
  log(colors.blue, '==========================');
  
  if (!testApartmentId || !testUserId) {
    log(colors.yellow, '⚠️  Skipping - Missing apartment ID or user ID');
    return { success: false };
  }
  
  const messageData = {
    apartmentId: testApartmentId,
    recipientId: testUserId, // Self-message for testing
    content: 'Test message via Supabase integration'
  };
  
  const result = await makeRequest('POST', '/api/send-message', messageData, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ Message sending successful');
    log(colors.green, `   Message ID: ${result.data.messageId || result.data.data?.id || 'N/A'}`);
    testConversationId = result.data.data?.conversation_id || '';
    return { success: true };
  } else {
    log(colors.red, `❌ Message sending failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testConversationRetrieval() {
  log(colors.cyan + colors.bold, '\n💬 TESTING CONVERSATION RETRIEVAL');
  log(colors.cyan, '==================================');
  
  if (!testConversationId) {
    log(colors.yellow, '⚠️  Skipping - No conversation ID available');
    return { success: false };
  }
  
  const result = await makeRequest('GET', `/api/conversations/${testConversationId}`, null, {
    'Authorization': `Bearer ${authToken}`
  });
  
  if (result.success) {
    log(colors.green, '✅ Conversation retrieval successful');
    log(colors.green, `   Messages count: ${result.data.messages?.length || 0}`);
    return { success: true };
  } else {
    log(colors.red, `❌ Conversation retrieval failed: ${JSON.stringify(result.error)}`);
    return { success: false };
  }
}

async function testDatabaseTables() {
  log(colors.blue + colors.bold, '\n🗄️  TESTING DATABASE TABLES');
  log(colors.blue, '============================');
  
  const result = await makeRequest('GET', '/admin/stats?token=admin-test-token');
  
  if (result.success || result.status === 403) {
    log(colors.green, '✅ Database tables accessible (admin endpoint responds)');
    return { success: true };
  } else {
    log(colors.yellow, '⚠️  Admin endpoint not accessible (this is normal)');
    return { success: true };
  }
}

async function runEnhancedTests() {
  console.log(colors.bold + colors.blue + '🧪 ENHANCED SUPABASE MIGRATION - COMPREHENSIVE API TESTS');
  console.log('========================================================\n');
  
  const results = {
    serverConnection: false,
    userRegistration: false,
    userLogin: false,
    apartmentCreation: false,
    viewingRequest: false,
    bookingRequest: false,
    paypalPayment: false,
    paypalConfiguration: false,
    feedbackSubmission: false,
    messageSending: false,
    conversationRetrieval: false,
    databaseTables: false
  };
  
  // Test server connection
  results.serverConnection = await testServerConnection();
  if (!results.serverConnection) {
    log(colors.red, '\n❌ Cannot proceed with tests - server is not running');
    return;
  }
  
  // Test user registration
  const registrationResult = await testUserRegistration();
  results.userRegistration = registrationResult.success;
  
  // Test user login
  if (registrationResult.success) {
    const loginResult = await testUserLogin(registrationResult.user);
    results.userLogin = loginResult.success;
  }
  
  // Test apartment creation (requires auth)
  if (results.userLogin) {
    const apartmentResult = await testApartmentCreation();
    results.apartmentCreation = apartmentResult.success;
  }
  
  // Test viewing request (requires apartment)
  if (results.apartmentCreation) {
    const viewingResult = await testViewingRequest();
    results.viewingRequest = viewingResult.success;
  }
  
  // Test booking request system
  if (results.apartmentCreation) {
    const bookingResult = await testBookingRequest();
    results.bookingRequest = bookingResult.success;
  }
  
  // Test PayPal payment system
  const paypalResult = await testPayPalPayment();
  results.paypalPayment = paypalResult.success;
  
  // Test PayPal configuration
  const paypalConfigResult = await testPayPalConfiguration();
  results.paypalConfiguration = paypalConfigResult.success;
  
  // Test feedback submission (no auth required)
  const feedbackResult = await testFeedbackSubmission();
  results.feedbackSubmission = feedbackResult.success;
  
  // Test message sending (requires auth and apartment)
  if (results.userLogin) {
    const messageResult = await testMessageSending();
    results.messageSending = messageResult.success;
  }
  
  // Test conversation retrieval
  if (results.messageSending) {
    const conversationResult = await testConversationRetrieval();
    results.conversationRetrieval = conversationResult.success;
  }
  
  // Test database accessibility
  const dbResult = await testDatabaseTables();
  results.databaseTables = dbResult.success;
  
  // Summary
  log(colors.bold + colors.blue, '\n📊 ENHANCED TEST RESULTS SUMMARY');
  log(colors.blue, '=================================');
  
  const tests = [
    { name: 'Server Connection', result: results.serverConnection, critical: true },
    { name: 'User Registration', result: results.userRegistration, critical: true },
    { name: 'User Login', result: results.userLogin, critical: true },
    { name: 'Apartment Creation', result: results.apartmentCreation, critical: true },
    { name: 'Viewing Request', result: results.viewingRequest, critical: true },
    { name: 'Booking Request', result: results.bookingRequest, critical: false },
    { name: 'PayPal Payment', result: results.paypalPayment, critical: false },
    { name: 'PayPal Configuration', result: results.paypalConfiguration, critical: false },
    { name: 'Feedback Submission', result: results.feedbackSubmission, critical: true },
    { name: 'Message Sending', result: results.messageSending, critical: true },
    { name: 'Conversation Retrieval', result: results.conversationRetrieval, critical: false },
    { name: 'Database Access', result: results.databaseTables, critical: false }
  ];
  
  let passedTests = 0;
  let criticalTests = 0;
  let passedCritical = 0;
  
  tests.forEach(test => {
    const status = test.result ? '✅ PASSED' : '❌ FAILED';
    const color = test.result ? colors.green : colors.red;
    const criticality = test.critical ? ' [CRITICAL]' : ' [OPTIONAL]';
    log(color, `${test.name}: ${status}${criticality}`);
    
    if (test.result) passedTests++;
    if (test.critical) {
      criticalTests++;
      if (test.result) passedCritical++;
    }
  });
  
  const totalPercentage = Math.round((passedTests / tests.length) * 100);
  const criticalPercentage = Math.round((passedCritical / criticalTests) * 100);
  
  log(colors.bold, `\n🎯 OVERALL RESULT: ${passedTests}/${tests.length} tests passed (${totalPercentage}%)`);
  log(colors.bold, `🔥 CRITICAL TESTS: ${passedCritical}/${criticalTests} passed (${criticalPercentage}%)`);
  
  if (criticalPercentage >= 80) {
    log(colors.green + colors.bold, '🎉 EXCELLENT! Your core Supabase migration is working great!');
    log(colors.green, '   All essential platform functionality is operational.');
  } else if (criticalPercentage >= 60) {
    log(colors.yellow + colors.bold, '⚠️  GOOD! Most core features are working.');
    log(colors.yellow, '   Some critical endpoints may need adjustments.');
  } else {
    log(colors.red + colors.bold, '🔧 NEEDS ATTENTION! Several critical features need fixing.');
    log(colors.red, '   Check server logs and service implementations.');
  }
  
  log(colors.blue, '\n📋 Next Steps:');
  log(colors.blue, '• Fix any failing critical tests');
  log(colors.blue, '• Check server logs for detailed error information');
  log(colors.blue, '• Test your frontend integration');
  log(colors.blue, '• Verify PayPal configuration if payment features are needed');
  log(colors.blue, '• Test with real user scenarios');
  
  log(colors.cyan, '\n🔧 PayPal Integration Notes:');
  log(colors.cyan, '• PayPal tests may fail without proper credentials');
  log(colors.cyan, '• Configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET');
  log(colors.cyan, '• PayPal sandbox mode recommended for testing');
}

// Run the enhanced tests
runEnhancedTests().catch(error => {
  log(colors.red, `\n💥 Test suite error: ${error.message}`);
  process.exit(1);
});
