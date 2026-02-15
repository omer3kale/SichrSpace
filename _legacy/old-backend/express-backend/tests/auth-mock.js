/**
 * Mock Authentication Middleware for Testing
 * Fixes JWT authentication issues in test environment
 */

const jwt = require('jsonwebtoken');

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null })
  })),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-123',
          email: 'test@example.com',
          role: 'user'
        }
      },
      error: null
    })
  }
};

// Mock authentication middleware
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      error: 'No authorization header provided' 
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'No token provided' 
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-jwt-secret');
    req.user = decoded;
    
    // Mock Supabase client on request
    req.supabase = mockSupabaseClient;
    
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token' 
    });
  }
};

// Mock admin middleware
const mockRequireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Admin access required' 
    });
  }

  next();
};

// Test utilities for authentication
const authTestUtils = {
  generateValidToken: (userData = {}) => {
    const defaultUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
      name: 'Test User'
    };
    
    const user = { ...defaultUser, ...userData };
    return jwt.sign(user, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1h' });
  },

  generateAdminToken: (userData = {}) => {
    const defaultAdmin = {
      id: 'test-admin-456',
      email: 'admin@example.com',
      role: 'admin',
      name: 'Test Admin'
    };
    
    const admin = { ...defaultAdmin, ...userData };
    return jwt.sign(admin, process.env.JWT_SECRET || 'test-jwt-secret', { expiresIn: '1h' });
  },

  mockSupabaseResponse: (data, error = null) => {
    if (error) {
      mockSupabaseClient.from().single.mockResolvedValueOnce({ data: null, error });
      mockSupabaseClient.from().then.mockResolvedValueOnce({ data: null, error });
    } else {
      mockSupabaseClient.from().single.mockResolvedValueOnce({ data, error: null });
      mockSupabaseClient.from().then.mockResolvedValueOnce({ data: Array.isArray(data) ? data : [data], error: null });
    }
    return { data, error };
  },

  resetMocks: () => {
    jest.clearAllMocks();
    // Clear all mock function calls but keep the mocks functional
    const tableBuilder = mockSupabaseClient.from();
    if (tableBuilder.select) tableBuilder.select.mockClear();
    if (tableBuilder.insert) tableBuilder.insert.mockClear();
    if (tableBuilder.update) tableBuilder.update.mockClear();
    if (tableBuilder.delete) tableBuilder.delete.mockClear();
    if (tableBuilder.eq) tableBuilder.eq.mockClear();
    if (tableBuilder.single) tableBuilder.single.mockClear();
    if (tableBuilder.limit) tableBuilder.limit.mockClear();
    if (tableBuilder.order) tableBuilder.order.mockClear();
  }
};

module.exports = {
  mockAuth,
  mockRequireAdmin,
  mockSupabaseClient,
  authTestUtils
};
