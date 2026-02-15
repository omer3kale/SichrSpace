/**
 * Test App Setup with Proper Authentication
 * Creates Express app instance for testing with mocked auth
 */

const express = require('express');
const cors = require('cors');
const { mockAuth, mockRequireAdmin, mockSupabaseClient } = require('./auth-mock');

// Create test app
const createTestApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mock Supabase client on all requests
  app.use((req, res, next) => {
    req.supabase = mockSupabaseClient;
    next();
  });

  // Step 4 API Routes with proper auth
  
  // Profile Routes
  app.get('/api/profile/stats', mockAuth, (req, res) => {
    res.json({
      success: true,
      stats: {
        favorites: 5,
        viewingRequests: 3,
        reviews: 2,
        savedSearches: 4
      }
    });
  });

  app.put('/api/profile/notifications', mockAuth, (req, res) => {
    res.json({
      success: true,
      preferences: req.body
    });
  });

  app.post('/api/profile/upload-avatar', mockAuth, (req, res) => {
    if (!req.files || !req.files.avatar) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    res.json({
      success: true,
      message: 'Avatar uploaded successfully'
    });
  });

  // Saved Searches Routes
  app.post('/api/saved-searches', mockAuth, (req, res) => {
    const { name, searchCriteria } = req.body;
    if (!name || !searchCriteria) {
      return res.status(400).json({
        success: false,
        error: 'Name and search criteria are required'
      });
    }
    res.json({
      success: true,
      message: 'Saved search created successfully',
      data: { id: 'search-123', name, searchCriteria }
    });
  });

  app.get('/api/saved-searches', mockAuth, (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  app.put('/api/saved-searches/:id', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'Saved search updated successfully'
    });
  });

  app.post('/api/saved-searches/:id/execute', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'Search executed successfully',
      results: []
    });
  });

  app.delete('/api/saved-searches/:id', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'Saved search deleted successfully'
    });
  });

  // Reviews Routes
  app.post('/api/reviews', mockAuth, (req, res) => {
    const { apartmentId, rating, title, comment } = req.body;
    if (!apartmentId || !rating || !title || !comment) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5'
      });
    }
    res.json({
      success: true,
      message: 'Review submitted successfully and is pending moderation',
      data: { id: 'review-123', apartmentId, rating, title, comment }
    });
  });

  app.get('/api/reviews', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  app.get('/api/reviews/apartment/:apartmentId/stats', (req, res) => {
    res.json({
      success: true,
      stats: {
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      }
    });
  });

  app.put('/api/reviews/:id/moderate', mockAuth, mockRequireAdmin, (req, res) => {
    res.json({
      success: true,
      message: 'Review moderated successfully'
    });
  });

  // Notifications Routes
  app.post('/api/notifications', (req, res) => {
    res.json({
      success: true,
      message: 'Notification created successfully',
      data: { id: 'notification-123' }
    });
  });

  app.get('/api/notifications', mockAuth, (req, res) => {
    res.json({
      success: true,
      data: [],
      unreadCount: 0
    });
  });

  app.put('/api/notifications/:id/read', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  });

  app.put('/api/notifications/read-all', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  });

  app.delete('/api/notifications/:id', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  });

  // Recently Viewed Routes
  app.post('/api/recently-viewed', mockAuth, (req, res) => {
    const { apartmentId } = req.body;
    if (!apartmentId) {
      return res.status(400).json({
        success: false,
        error: 'Apartment ID is required'
      });
    }
    res.json({
      success: true,
      message: 'Apartment view tracked successfully'
    });
  });

  app.get('/api/recently-viewed', mockAuth, (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  app.delete('/api/recently-viewed/:apartmentId', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'Apartment removed from recently viewed'
    });
  });

  app.delete('/api/recently-viewed', mockAuth, (req, res) => {
    res.json({
      success: true,
      message: 'All recently viewed apartments cleared'
    });
  });

  // GDPR Routes (simplified for testing)
  app.post('/api/gdpr/consent', mockAuth, (req, res) => {
    res.json({ message: 'Consent recorded successfully' });
  });

  app.get('/api/gdpr/consent-status', mockAuth, (req, res) => {
    res.json({ consents: [] });
  });

  app.post('/api/gdpr/withdraw-consent', mockAuth, (req, res) => {
    res.json({ message: 'Consent withdrawn successfully' });
  });

  app.post('/api/gdpr/request', mockAuth, (req, res) => {
    res.status(201).json({ message: 'GDPR request submitted successfully' });
  });

  app.get('/api/gdpr/requests', mockAuth, (req, res) => {
    res.json({ requests: [] });
  });

  app.get('/api/gdpr/export-data', mockAuth, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="user-data.json"');
    res.json({ userData: 'exported' });
  });

  app.post('/api/gdpr/delete-account', mockAuth, (req, res) => {
    res.json({ message: 'Account deletion request submitted successfully' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  return app;
};

module.exports = { createTestApp };
