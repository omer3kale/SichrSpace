// Test environment configuration for Google Maps integration
// This file sets up environment variables for testing purposes only

// Real Google Maps API key for testing
process.env.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key-here';

// Mock Redis configuration for testing
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';

// Mock database configuration
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'sichr_place_test';

console.log('✅ Test environment variables set for Google Maps integration');
