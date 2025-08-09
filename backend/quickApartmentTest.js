const axios = require('axios');

// Quick test to debug apartment creation issue
async function testApartmentCreation() {
  const BASE_URL = 'http://localhost:3000';
  
  try {
    // First, register a test user
    console.log('📝 Registering test user...');
    const testUser = {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'TestPass123!',
      first_name: 'Test',
      last_name: 'User'
    };
    
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
      console.log('✅ User registered successfully');
    } catch (regError) {
      // User might already exist, continue
      console.log('⚠️ User registration skipped (might already exist)');
    }
    
    // Login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      emailOrUsername: testUser.email,
      password: testUser.password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test apartment creation with JSON data
    console.log('🏠 Creating apartment with JSON...');
    const apartmentData = {
      title: 'Test Apartment JSON',
      description: 'Beautiful test apartment',
      location: 'Test Location',
      price: 1200,
      rooms: 3,
      size: 80
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/upload-apartment`, apartmentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Apartment created successfully:', createResponse.data);
    
    // Test apartment creation with form data
    console.log('🏠 Creating apartment with form data...');
    const formData = new URLSearchParams();
    formData.append('apartment-title', 'Test Apartment Form');
    formData.append('apartment-description', 'Beautiful test apartment via form');
    formData.append('apartment-address', 'Form Test Location');
    formData.append('apartment-price', '1300');
    formData.append('number-of-rooms', '2');
    
    const createFormResponse = await axios.post(`${BASE_URL}/api/upload-apartment`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    console.log('✅ Form apartment created successfully:', createFormResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testApartmentCreation();
