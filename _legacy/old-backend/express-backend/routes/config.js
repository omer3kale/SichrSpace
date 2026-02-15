const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

/**
 * GET /api/config/client
 * Get client-safe configuration for frontend
 */
router.get('/client', auth, (req, res) => {
  try {
    // Only return client-safe configuration
    const clientConfig = {
      supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY
      },
      app: {
        name: 'SichrPlace',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      features: {
        realTimeChat: true,
        notifications: true,
        fileUploads: true
      }
    };

    res.json({
      success: true,
      config: clientConfig
    });
  } catch (error) {
    console.error('Error loading client config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load configuration'
    });
  }
});

module.exports = router;
