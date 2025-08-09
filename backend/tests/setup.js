/**
 * Test Setup for GDPR Compliance Tests
 */

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up GDPR compliance test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-for-gdpr-tests';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
});

afterAll(async () => {
  console.log('🧹 Cleaning up GDPR test environment...');
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
