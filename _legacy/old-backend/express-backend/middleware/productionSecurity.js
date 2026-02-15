const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss');
const validator = require('validator');

/**
 * Security Hardening Middleware for Production
 * Step 8.4: Enhanced security implementation
 */

// Advanced Content Security Policy
const contentSecurityPolicy = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com"
    ],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Required for PayPal SDK
      "https://www.paypal.com",
      "https://js.paypalcdn.com",
      "https://cdn.consentmanager.net",
      "https://www.clarity.ms",
      "https://www.googletagmanager.com"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com",
      "data:"
    ],
    imgSrc: [
      "'self'",
      "data:",
      "https:",
      "https://www.paypalobjects.com"
    ],
    connectSrc: [
      "'self'",
      "https://api.paypal.com",
      "https://www.paypal.com",
      "https://checkout.paypal.com",
      "https://www.clarity.ms",
      "https://www.google-analytics.com"
    ],
    frameSrc: [
      "'self'",
      "https://www.paypal.com",
      "https://checkout.paypal.com",
      "https://docs.google.com"
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    manifestSrc: ["'self'"]
  }
};

// Enhanced Helmet configuration
const securityHeaders = helmet({
  contentSecurityPolicy: contentSecurityPolicy,
  
  // HSTS - Force HTTPS for 1 year
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Disable X-Powered-By header
  hidePoweredBy: true,
  
  // Prevent XSS attacks
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Feature Policy / Permissions Policy
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: ['self'],
    payment: ['self', 'https://www.paypal.com']
  }
});

// Enhanced Rate Limiting with different limits for different endpoints
const createRateLimit = (windowMs, max, message, keyGenerator = null) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => req.ip),
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    }
  });
};

// Different rate limits for different endpoint types
const rateLimits = {
  // General API rate limit
  general: createRateLimit(15 * 60 * 1000, 100, 'Too many requests from this IP'),
  
  // Strict rate limit for authentication endpoints
  auth: createRateLimit(15 * 60 * 1000, 10, 'Too many authentication attempts'),
  
  // PayPal payment endpoints - moderate limit
  payment: createRateLimit(5 * 60 * 1000, 20, 'Too many payment requests'),
  
  // Viewing request submissions - stricter limit
  viewingRequest: createRateLimit(10 * 60 * 1000, 5, 'Too many viewing request submissions'),
  
  // Webhook endpoints - high limit for PayPal
  webhook: createRateLimit(1 * 60 * 1000, 100, 'Webhook rate limit exceeded'),
  
  // Static files - higher limit
  static: createRateLimit(1 * 60 * 1000, 500, 'Static file rate limit exceeded')
};

// Input sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Recursive object sanitization
function sanitizeObject(obj) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // XSS protection
      sanitized[key] = xss(value, {
        whiteList: {}, // No HTML tags allowed
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script']
      });
      
      // Additional validation for specific fields
      if (key.toLowerCase().includes('email')) {
        sanitized[key] = validator.isEmail(sanitized[key]) ? sanitized[key] : '';
      }
      
      if (key.toLowerCase().includes('phone')) {
        sanitized[key] = validator.isMobilePhone(sanitized[key]) ? sanitized[key] : '';
      }
      
      if (key.toLowerCase().includes('url')) {
        sanitized[key] = validator.isURL(sanitized[key]) ? sanitized[key] : '';
      }
      
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// PayPal-specific security middleware
const paypalSecurityCheck = (req, res, next) => {
  // Validate PayPal-specific headers and data
  if (req.path.includes('/paypal/')) {
    // Check for required PayPal headers in webhook requests
    if (req.path.includes('/webhooks')) {
      const requiredHeaders = [
        'paypal-transmission-id',
        'paypal-cert-id',
        'paypal-transmission-time',
        'paypal-transmission-sig'
      ];
      
      const missingHeaders = requiredHeaders.filter(header => !req.headers[header]);
      
      if (missingHeaders.length > 0) {
        console.warn('⚠️ PayPal webhook missing headers:', missingHeaders);
      }
    }
    
    // Validate PayPal amount format
    if (req.body && req.body.amount) {
      const amount = parseFloat(req.body.amount);
      if (isNaN(amount) || amount <= 0 || amount > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment amount'
        });
      }
    }
  }
  
  next();
};

// API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Skip API key validation for public endpoints
  const publicEndpoints = [
    '/api/health',
    '/api/csrf-token',
    '/frontend/'
  ];
  
  if (publicEndpoints.some(endpoint => req.path.startsWith(endpoint))) {
    return next();
  }
  
  // For internal API calls, validate API key if configured
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key'
    });
  }
  
  next();
};

// Security audit logging
const securityAuditLog = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant events
  const securityEvent = {
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer
    }
  };
  
  // Log suspicious patterns
  if (req.path.includes('..') || req.path.includes('<script>')) {
    console.warn('🚨 Suspicious request detected:', securityEvent);
  }
  
  // Log PayPal-related requests
  if (req.path.includes('/paypal/')) {
    console.log('🔒 PayPal security event:', securityEvent);
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests (potential DoS)
    if (duration > 5000) {
      console.warn('🐌 Slow request detected:', {
        ...securityEvent,
        duration,
        statusCode: res.statusCode
      });
    }
    
    // Log failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('🚫 Authentication failure:', {
        ...securityEvent,
        statusCode: res.statusCode
      });
    }
  });
  
  next();
};

// CORS configuration for production
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://sichrplace.com',
      'https://www.sichrplace.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-CSRF-Token'
  ]
};

// Production security middleware stack
const productionSecurity = [
  securityHeaders,
  sanitizeInput,
  paypalSecurityCheck,
  validateApiKey,
  securityAuditLog
];

module.exports = {
  securityHeaders,
  rateLimits,
  sanitizeInput,
  paypalSecurityCheck,
  validateApiKey,
  securityAuditLog,
  corsOptions,
  productionSecurity
};
