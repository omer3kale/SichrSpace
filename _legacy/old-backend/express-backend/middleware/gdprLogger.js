const GdprService = require('../utils/gdprService');

/**
 * Middleware to automatically log data processing activities for GDPR compliance
 */
function gdprLogger(options = {}) {
  return async (req, res, next) => {
    // Store original methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to log successful operations
    res.send = function(data) {
      logDataProcessing(req, res, data, options);
      return originalSend.call(this, data);
    };

    res.json = function(data) {
      logDataProcessing(req, res, data, options);
      return originalJson.call(this, data);
    };

    next();
  };
}

async function logDataProcessing(req, res, responseData, options) {
  try {
    // Only log successful operations (200-299 status codes)
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return;
    }

    // Skip logging for certain routes
    const skipRoutes = ['/api/health', '/api/csrf-token', '/api-docs'];
    if (skipRoutes.some(route => req.path.startsWith(route))) {
      return;
    }

    // Determine the action based on HTTP method and route
    let action = 'data_accessed';
    let dataType = 'system_logs';
    let legalBasis = 'legitimate_interests';
    let purpose = 'System operation and maintenance';
    let dataCategories = ['technical_data'];
    let retentionPeriod = '1 year';

    // Map different operations
    if (req.method === 'POST') {
      if (req.path.includes('/auth/register')) {
        action = 'data_collected';
        dataType = 'user_profile';
        legalBasis = 'contract';
        purpose = 'User account creation';
        dataCategories = ['identity_data', 'contact_data'];
        retentionPeriod = 'Until account deletion';
      } else if (req.path.includes('/upload-apartment')) {
        action = 'data_collected';
        dataType = 'apartment_data';
        legalBasis = 'contract';
        purpose = 'Property listing creation';
        dataCategories = ['location_data', 'transaction_data'];
        retentionPeriod = '2 years after listing removal';
      } else if (req.path.includes('/viewing-request')) {
        action = 'data_collected';
        dataType = 'viewing_request';
        legalBasis = 'contract';
        purpose = 'Property viewing coordination';
        dataCategories = ['identity_data', 'contact_data', 'communication_data'];
        retentionPeriod = '1 year after viewing';
      } else if (req.path.includes('/send-message')) {
        action = 'data_collected';
        dataType = 'message';
        legalBasis = 'contract';
        purpose = 'User communication facilitation';
        dataCategories = ['identity_data', 'communication_data'];
        retentionPeriod = '3 years';
      } else if (req.path.includes('/gdpr/consent')) {
        action = 'consent_given';
        dataType = 'consent_record';
        legalBasis = 'consent';
        purpose = 'GDPR consent management';
        dataCategories = ['consent_data'];
        retentionPeriod = 'Until withdrawn or account deletion';
      }
    } else if (req.method === 'PUT' || req.method === 'PATCH') {
      action = 'data_updated';
      if (req.path.includes('/user') || req.path.includes('/profile')) {
        dataType = 'user_profile';
        legalBasis = 'contract';
        purpose = 'User profile update';
        dataCategories = ['identity_data', 'contact_data'];
      }
    } else if (req.method === 'DELETE') {
      action = 'data_deleted';
      if (req.path.includes('/gdpr/account')) {
        dataType = 'user_profile';
        legalBasis = 'legal_obligation';
        purpose = 'GDPR account deletion request';
        dataCategories = ['identity_data', 'contact_data', 'transaction_data'];
        retentionPeriod = 'Immediate deletion';
      }
    } else if (req.method === 'GET') {
      if (req.path.includes('/gdpr/export')) {
        action = 'data_exported';
        dataType = 'user_profile';
        legalBasis = 'legal_obligation';
        purpose = 'GDPR data portability request';
        dataCategories = ['identity_data', 'contact_data', 'transaction_data', 'communication_data'];
        retentionPeriod = 'Immediate deletion after delivery';
      }
    }

    // Override with custom options
    if (options.action) action = options.action;
    if (options.dataType) dataType = options.dataType;
    if (options.legalBasis) legalBasis = options.legalBasis;
    if (options.purpose) purpose = options.purpose;
    if (options.dataCategories) dataCategories = options.dataCategories;
    if (options.retentionPeriod) retentionPeriod = options.retentionPeriod;

    // Extract user information
    let userId = null;
    let email = null;

    if (req.user) {
      userId = req.user.id;
      email = req.user.email;
    } else if (req.body && req.body.email) {
      email = req.body.email;
    }

    // Log the processing activity
    await GdprService.logDataProcessing({
      userId,
      email,
      action,
      dataType,
      legalBasis,
      purpose,
      dataCategories,
      retentionPeriod,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      processingDetails: {
        method: req.method,
        path: req.path,
        query: req.query,
        responseStatus: res.statusCode,
        timestamp: new Date().toISOString(),
        ...options.processingDetails
      }
    });

  } catch (error) {
    // Don't fail the request if logging fails
    console.error('GDPR logging error:', error);
  }
}

// Specific middleware functions for common operations
const gdprMiddleware = {
  // General logging middleware
  log: gdprLogger,

  // User registration logging
  userRegistration: () => gdprLogger({
    action: 'data_collected',
    dataType: 'user_profile',
    legalBasis: 'contract',
    purpose: 'User account creation and platform access',
    dataCategories: ['identity_data', 'contact_data'],
    retentionPeriod: 'Until account deletion'
  }),

  // Property listing logging
  propertyListing: () => gdprLogger({
    action: 'data_collected',
    dataType: 'apartment_data',
    legalBasis: 'contract',
    purpose: 'Property listing and tenant matching',
    dataCategories: ['location_data', 'transaction_data'],
    retentionPeriod: '2 years after listing removal'
  }),

  // Communication logging
  messageLogging: () => gdprLogger({
    action: 'data_collected',
    dataType: 'message',
    legalBasis: 'contract',
    purpose: 'User communication and support',
    dataCategories: ['identity_data', 'communication_data'],
    retentionPeriod: '3 years'
  }),

  // Viewing request logging
  viewingRequest: () => gdprLogger({
    action: 'data_collected',
    dataType: 'viewing_request',
    legalBasis: 'contract',
    purpose: 'Property viewing coordination',
    dataCategories: ['identity_data', 'contact_data', 'communication_data'],
    retentionPeriod: '1 year after viewing completion'
  })
};

module.exports = gdprMiddleware;
