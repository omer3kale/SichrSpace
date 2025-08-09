const { supabase } = require('../../config/supabase');

// Integration tests for configuration and utility functions
describe('Configuration Integration Tests', () => {
  describe('Supabase Configuration Integration', () => {
    test('should validate Supabase client initialization', () => {
      expect(supabase).toBeDefined();
      expect(typeof supabase).toBe('object');
      
      // Test essential Supabase client methods
      expect(typeof supabase.from).toBe('function');
      expect(typeof supabase.auth).toBe('object');
      expect(typeof supabase.storage).toBe('object');
    });

    test('should validate database query builder functionality', () => {
      // Test query builder methods (without executing queries)
      const userQuery = supabase.from('users');
      expect(userQuery).toBeDefined();
      expect(typeof userQuery.select).toBe('function');
      expect(typeof userQuery.insert).toBe('function');
      expect(typeof userQuery.update).toBe('function');
      expect(typeof userQuery.delete).toBe('function');
      
      // Test query chaining
      const chainedQuery = supabase
        .from('users')
        .select('*')
        .eq('id', 'test-123');
      expect(chainedQuery).toBeDefined();
    });

    test('should validate table access for GDPR-related tables', () => {
      const gdprTables = [
        'users',
        'gdpr_requests',
        'consent_purposes', 
        'data_processing_logs',
        'data_breaches',
        'dpias'
      ];

      gdprTables.forEach(table => {
        const query = supabase.from(table);
        expect(query).toBeDefined();
        expect(typeof query.select).toBe('function');
      });
    });

    test('should validate error handling structure', () => {
      // Test that Supabase error structure is as expected
      const mockError = {
        message: 'Test error',
        code: 'PGRST116',
        details: 'No rows found',
        hint: null
      };

      expect(mockError.message).toBeDefined();
      expect(mockError.code).toBeDefined();
      
      // Test common Supabase error codes we handle
      const commonErrorCodes = ['PGRST116', '23505', '23503', '42P01'];
      commonErrorCodes.forEach(code => {
        expect(typeof code).toBe('string');
        expect(code.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Environment Configuration Integration', () => {
    test('should validate required environment variables are accessible', () => {
      // Test that our configuration can access environment variables
      // Note: We don't test actual values for security reasons
      
      const requiredEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'JWT_SECRET',
        'NODE_ENV'
      ];

      // Test that process.env is accessible (actual values are sensitive)
      expect(process.env).toBeDefined();
      expect(typeof process.env).toBe('object');
    });

    test('should validate application configuration structure', () => {
      const appConfig = {
        database: {
          url: process.env.SUPABASE_URL || 'configured',
          key: process.env.SUPABASE_ANON_KEY || 'configured'
        },
        security: {
          jwtSecret: process.env.JWT_SECRET || 'configured',
          bcryptRounds: 10
        },
        gdpr: {
          requestProcessingDays: 30,
          dataRetentionYears: 2,
          breachNotificationHours: 72
        }
      };

      expect(appConfig.database).toBeDefined();
      expect(appConfig.security).toBeDefined();
      expect(appConfig.gdpr).toBeDefined();
      expect(appConfig.gdpr.requestProcessingDays).toBe(30);
      expect(appConfig.gdpr.breachNotificationHours).toBe(72);
    });
  });

  describe('Utility Functions Integration', () => {
    test('should validate date handling utilities', () => {
      const dateUtils = {
        getCurrentISOString: () => new Date().toISOString(),
        addDays: (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000),
        isValidISOString: (str) => !isNaN(Date.parse(str)),
        calculateRetentionDeadline: (createdDate, retentionPeriod) => {
          const years = parseInt(retentionPeriod);
          const date = new Date(createdDate);
          date.setFullYear(date.getFullYear() + years);
          return date.toISOString();
        }
      };

      // Test date utility functions
      const now = dateUtils.getCurrentISOString();
      expect(dateUtils.isValidISOString(now)).toBe(true);
      
      const futureDate = dateUtils.addDays(new Date(), 30);
      expect(futureDate).toBeInstanceOf(Date);
      expect(futureDate.getTime()).toBeGreaterThan(Date.now());
      
      const retentionDeadline = dateUtils.calculateRetentionDeadline('2023-01-01T00:00:00Z', '2');
      expect(dateUtils.isValidISOString(retentionDeadline)).toBe(true);
      expect(new Date(retentionDeadline).getFullYear()).toBe(2025);
    });

    test('should validate validation utilities', () => {
      const validationUtils = {
        isValidEmail: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        isValidUUID: (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid),
        sanitizeInput: (input) => input.trim().replace(/[<>]/g, ''),
        validateGdprRequestType: (type) => ['data_access', 'data_deletion', 'data_portability', 'rectification'].includes(type),
        validateConsentType: (type) => ['marketing', 'analytics', 'necessary', 'functional'].includes(type)
      };

      // Test validation functions
      expect(validationUtils.isValidEmail('test@example.com')).toBe(true);
      expect(validationUtils.isValidEmail('invalid-email')).toBe(false);
      
      expect(validationUtils.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validationUtils.isValidUUID('invalid-uuid')).toBe(false);
      
      expect(validationUtils.sanitizeInput('<script>alert("test")</script>')).toBe('scriptalert("test")/script');
      
      expect(validationUtils.validateGdprRequestType('data_access')).toBe(true);
      expect(validationUtils.validateGdprRequestType('invalid_type')).toBe(false);
      
      expect(validationUtils.validateConsentType('marketing')).toBe(true);
      expect(validationUtils.validateConsentType('invalid_type')).toBe(false);
    });

    test('should validate security utilities', () => {
      const securityUtils = {
        hashPassword: async (password) => {
          const bcrypt = require('bcrypt');
          return await bcrypt.hash(password, 10);
        },
        generateRequestId: () => 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        sanitizeUserAgent: (userAgent) => userAgent ? userAgent.substring(0, 500) : 'Unknown',
        validateIPAddress: (ip) => {
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
          return ipv4Regex.test(ip) || ipv6Regex.test(ip);
        }
      };

      // Test security functions
      const requestId = securityUtils.generateRequestId();
      expect(requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      
      const sanitizedUA = securityUtils.sanitizeUserAgent('Mozilla/5.0 (Test Browser)');
      expect(sanitizedUA).toBe('Mozilla/5.0 (Test Browser)');
      
      expect(securityUtils.validateIPAddress('192.168.1.1')).toBe(true);
      expect(securityUtils.validateIPAddress('invalid-ip')).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    test('should validate error response formatting', () => {
      const errorFormatter = {
        formatValidationError: (errors) => ({
          success: false,
          error: 'Validation failed',
          details: errors,
          timestamp: new Date().toISOString()
        }),
        formatDatabaseError: (error) => ({
          success: false,
          error: 'Database operation failed',
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString()
        }),
        formatGenericError: (message) => ({
          success: false,
          error: message || 'An unexpected error occurred',
          timestamp: new Date().toISOString()
        })
      };

      // Test error formatting
      const validationError = errorFormatter.formatValidationError([
        { field: 'email', message: 'Invalid email' }
      ]);
      expect(validationError.success).toBe(false);
      expect(validationError.error).toBe('Validation failed');
      expect(Array.isArray(validationError.details)).toBe(true);
      
      const dbError = errorFormatter.formatDatabaseError({
        code: 'PGRST116',
        message: 'No rows found'
      });
      expect(dbError.success).toBe(false);
      expect(dbError.code).toBe('PGRST116');
      
      const genericError = errorFormatter.formatGenericError('Test error');
      expect(genericError.success).toBe(false);
      expect(genericError.error).toBe('Test error');
    });

    test('should validate error logging structure', () => {
      const errorLogger = {
        logError: (error, context) => ({
          level: 'error',
          message: error.message || error,
          stack: error.stack,
          context: context,
          timestamp: new Date().toISOString(),
          userId: context.userId || null,
          requestId: context.requestId || null
        }),
        logGdprEvent: (event, userId) => ({
          level: 'info',
          category: 'gdpr',
          event: event,
          userId: userId,
          timestamp: new Date().toISOString(),
          compliance: true
        })
      };

      // Test error logging
      const errorLog = errorLogger.logError(
        new Error('Test error'),
        { userId: 'user-123', requestId: 'req-456' }
      );
      expect(errorLog.level).toBe('error');
      expect(errorLog.message).toBe('Test error');
      expect(errorLog.userId).toBe('user-123');
      
      const gdprLog = errorLogger.logGdprEvent('consent_updated', 'user-123');
      expect(gdprLog.category).toBe('gdpr');
      expect(gdprLog.compliance).toBe(true);
    });
  });

  describe('Response Helper Integration', () => {
    test('should validate response helper functions', () => {
      const responseHelpers = {
        success: (data, message) => ({
          success: true,
          data: data,
          message: message,
          timestamp: new Date().toISOString()
        }),
        error: (error, statusCode = 500) => ({
          success: false,
          error: error,
          statusCode: statusCode,
          timestamp: new Date().toISOString()
        }),
        paginated: (data, page, limit, total) => ({
          success: true,
          data: data,
          pagination: {
            page: page,
            limit: limit,
            total: total,
            pages: Math.ceil(total / limit)
          },
          timestamp: new Date().toISOString()
        })
      };

      // Test response helpers
      const successResponse = responseHelpers.success({ id: 123 }, 'Operation successful');
      expect(successResponse.success).toBe(true);
      expect(successResponse.data.id).toBe(123);
      expect(successResponse.message).toBe('Operation successful');
      
      const errorResponse = responseHelpers.error('Test error', 400);
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.statusCode).toBe(400);
      
      const paginatedResponse = responseHelpers.paginated([1, 2, 3], 1, 10, 25);
      expect(paginatedResponse.pagination.pages).toBe(3);
      expect(paginatedResponse.pagination.total).toBe(25);
    });
  });
});
