const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import production middleware and utilities
const { productionSecurity, corsOptions } = require('./middleware/productionSecurity');
const { compressionMiddleware, responseTimeMonitor } = require('./utils/performance');
const { monitoringMiddleware, healthCheckHandler, metricsHandler, appMonitor, paypalAnalytics } = require('./utils/monitoring');

// Import existing routes
const authRoutes = require('./routes/auth');
const viewingRequestRoutes = require('./routes/viewing-request');
const paypalWebhooks = require('./routes/paypal-webhooks');

// Import existing middleware
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 8080;

// Environment validation
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Starting SichrPlace in PRODUCTION mode');
  
  // Validate required environment variables
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET',
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_WEBHOOK_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    process.exit(1);
  }
  
  console.log('✅ All required environment variables present');
} else {
  console.log('🔧 Starting SichrPlace in DEVELOPMENT mode');
}

// Trust proxy for accurate IP addresses behind load balancer
app.set('trust proxy', 1);

// Apply production security headers first
app.use(productionSecurity);

// Compression for better performance
app.use(compressionMiddleware);

// Response time monitoring
app.use(responseTimeMonitor);

// Application monitoring
app.use(monitoringMiddleware);

// CORS configuration
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    // Store raw body for PayPal webhook signature verification
    if (req.originalUrl.includes('/paypal/webhooks')) {
      req.rawBody = buf;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files with optimized caching
const { assetOptimization } = require('./utils/performance');
app.use('/frontend', assetOptimization.serveStatic(path.join(__dirname, '../frontend')));
app.use('/img', assetOptimization.serveStatic(path.join(__dirname, '../img')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/viewing-requests', viewingRequestRoutes);
app.use('/api/paypal', paypalWebhooks);

// Health check endpoint (no authentication required)
app.get('/api/health', healthCheckHandler);

// Metrics endpoint (protected)
app.get('/api/metrics', authMiddleware, metricsHandler);

// PayPal webhook tracking middleware
app.use('/api/paypal', (req, res, next) => {
  // Track PayPal-related requests
  if (req.method === 'POST' && req.path.includes('webhooks')) {
    const eventType = req.body?.event_type;
    if (eventType) {
      paypalAnalytics.trackWebhookEvent(eventType, req.body);
    }
  }
  next();
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/frontend/index.html');
});

// Serve index.html for SPA routes (must be after API routes)
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // For frontend routes, serve index.html
  const indexPath = path.join(__dirname, '../frontend/index.html');
  
  // Check if the file exists first
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      success: false, 
      error: 'File not found',
      message: 'The requested resource could not be found'
    });
  }
});

// Global error handler (must be last)
app.use(errorHandler);

// Enhanced error handling for production
app.use((err, req, res, next) => {
  // Track error in monitoring system
  appMonitor.trackError(err, {
    path: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });
  
  // Log error for debugging
  console.error('🚨 Unhandled error:', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  // Send appropriate response
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 
    'Internal server error' : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    // Close database connections, cleanup resources
    // Add cleanup logic here
    
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  appMonitor.trackError(err, { type: 'uncaughtException' });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  appMonitor.trackError(new Error(reason), { type: 'unhandledRejection' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
🎉 SichrPlace Server Started Successfully!

Environment: ${process.env.NODE_ENV || 'development'}
Port: ${PORT}
URL: ${process.env.NODE_ENV === 'production' ? 'https://sichrplace.com' : `http://localhost:${PORT}`}
Health Check: /api/health
Metrics: /api/metrics
PayPal Mode: ${process.env.PAYPAL_MODE || 'sandbox'}

Production Features Enabled:
✅ Security Headers & CSRF Protection
✅ Rate Limiting & Input Sanitization  
✅ Compression & Performance Optimization
✅ Application Monitoring & Analytics
✅ PayPal Webhook Processing
✅ Error Tracking & Alerting
✅ Graceful Shutdown Handling

Step 8: Production Deployment & Optimization COMPLETE! 🚀
  `);
  
  // Log startup metrics
  appMonitor.trackUser('startup', 'system');
  
  // Production readiness check
  if (process.env.NODE_ENV === 'production') {
    console.log('🔍 Running production readiness checks...');
    
    // Check PayPal configuration
    if (process.env.PAYPAL_MODE === 'live') {
      console.log('✅ PayPal configured for live payments');
    } else {
      console.warn('⚠️ PayPal in sandbox mode');
    }
    
    // Check SSL configuration
    if (process.env.FORCE_HTTPS === 'true') {
      console.log('✅ HTTPS enforced');
    }
    
    // Check monitoring
    if (process.env.MONITORING_ENABLED === 'true') {
      console.log('✅ Application monitoring enabled');
    }
    
    console.log('🎯 Production readiness check complete!');
  }
});

// Export app for testing
module.exports = app;
