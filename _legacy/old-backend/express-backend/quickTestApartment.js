#!/usr/bin/env node
/**
 * Quick test for apartment creation endpoint
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:3000';

async function testApartmentEndpoint() {
  try {
    // First login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      emailOrUsername: 'test_1722769468468@sichrplace.com', // Use an existing user from previous test
      password: 'Test123!@#'
    });
    
    if (!loginResponse.data.token) {
      console.log('❌ Login failed, registering new user...');
      
      // Register new user
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@sichrplace.com`,
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User'
      });
      
      console.log('✅ User registered:', registerResponse.data.user.id);
      
      // Login with new user
      const newLoginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        emailOrUsername: registerResponse.data.user.email,
        password: 'Test123!@#'
      });
      
      var token = newLoginResponse.data.token;
    } else {
      var token = loginResponse.data.token;
    }
    
    console.log('✅ Login successful, token received');
    
    // Test apartment creation
    console.log('🏠 Testing apartment creation...');
    
    const apartmentData = new URLSearchParams({
      'apartment-title': 'Test Apartment for Supabase',
      'apartment-description': 'A beautiful test apartment in the heart of the city',
      'apartment-address': 'Test Street 123, Test City',
      'apartment-postal-code': '12345',
      'apartment-price': '1200',
      'move-in-date': '2025-09-01',
      'move-out-date': '2026-09-01',
      'number-of-rooms': '3',
      'deposit-required': '2400'
    });
    
    const apartmentResponse = await axios.post(`${BASE_URL}/api/upload-apartment`, apartmentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ Apartment created successfully!');
    console.log('   Apartment ID:', apartmentResponse.data.apartmentId);
    console.log('   Response:', apartmentResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testApartmentEndpoint();
