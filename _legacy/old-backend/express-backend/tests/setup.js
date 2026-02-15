/**
 * Test Setup for GDPR Compliance Tests & Step 4 Enhanced User Experience
 */

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up GDPR compliance test environment...');
  console.log('🧪 Setting up Step 4 Enhanced User Experience test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-gdpr-tests';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

afterAll(async () => {
  console.log('🧹 Cleaning up GDPR test environment...');
  console.log('🧹 Cleaning up Step 4 test environment...');
});

// Step 4 Test Utilities
global.testUtils = {
  // Generate mock user data
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id-123',
    email: 'test@example.com',
    role: 'user',
    name: 'Test User',
    ...overrides
  }),

  // Generate mock admin data
  createMockAdmin: (overrides = {}) => ({
    id: 'test-admin-id-456',
    email: 'admin@example.com',
    role: 'admin',
    name: 'Test Admin',
    ...overrides
  }),

  // Generate mock apartment data
  createMockApartment: (overrides = {}) => ({
    id: 'test-apartment-id-789',
    title: 'Test Apartment',
    description: 'Beautiful test apartment',
    address: 'Test Address 123',
    price: 1000,
    bedrooms: 2,
    bathrooms: 1,
    size: 75,
    ...overrides
  }),

  // Generate JWT token for testing
  generateTestToken: (user = null) => {
    const jwt = require('jsonwebtoken');
    const userData = user || global.testUtils.createMockUser();
    return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '1h' });
  },

  // Mock fetch responses
  mockFetchSuccess: (data) => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data })
  }),

  mockFetchError: (error, status = 500) => ({
    ok: false,
    status,
    json: async () => ({ success: false, error })
  }),

  // Database response mocks
  mockSupabaseSuccess: (data) => ({
    data,
    error: null,
    count: Array.isArray(data) ? data.length : 1
  }),

  mockSupabaseError: (message) => ({
    data: null,
    error: { message },
    count: 0
  }),

  // Clean up test data
  cleanup: () => {
    if (global.favoriteOffers) {
      global.favoriteOffers.clear();
    }
  }
};

// Custom matchers for Step 4
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  }
});

// Mock console methods to reduce test output noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

// Global test utilities
global.testUtils = {
  createTestUser: (overrides = {}) => ({
    id: 'test-user-123',
    email: 'test@example.com',
    username: 'testuser',
    first_name: 'Test',
    last_name: 'User',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  createTestConsent: (overrides = {}) => ({
    id: 'consent-123',
    user_id: 'test-user-123',
    purpose_id: 'analytics',
    granted: true,
    granted_at: new Date().toISOString(),
    ...overrides
  }),

  createTestGdprRequest: (overrides = {}) => ({
    id: 'request-123',
    user_id: 'test-user-123',
    request_type: 'access',
    status: 'pending',
    description: 'Test GDPR request',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  mockSupabaseResponse: (data, error = null) => ({
    data,
    error
  }),

  mockSupabaseQuery: () => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    then: jest.fn()
  })
};
