/**
 * Real Data Test Configuration
 * Sets up environment for testing with actual database
 */

// Set environment variables for real testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'real-test-jwt-secret-2025';

// Check if Supabase credentials are available
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  Supabase credentials not found - some real data tests may fail');
  console.log('To run real data tests, set:');
  console.log('- SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('- SUPABASE_ANON_KEY');
}

// Don't mock anything - use real implementations
console.log('🔥 Running tests with REAL DATA and REAL DATABASE');
console.log('📊 Database:', process.env.SUPABASE_URL ? 'Supabase Connected' : 'Not Connected');
console.log('🔑 JWT Secret:', process.env.JWT_SECRET ? 'Configured' : 'Using Default');

// Global test timeout for real operations
jest.setTimeout(60000);

// Suppress console output during tests (optional)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: originalConsole.warn, // Keep warnings
  error: originalConsole.error // Keep errors
};
