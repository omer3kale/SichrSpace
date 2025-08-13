/**
 * Step 4 Real Data Integration Tests
 * Tests that work with actual Supabase database and real functionality
 */

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// Import real services (not mocks)
const { supabase } = require('../config/supabase');

// Import the actual API routes
const profileRoutes = require('../api/profile');
const savedSearchesRoutes = require('../api/saved-searches');
const reviewsRoutes = require('../api/reviews');
const notificationsRoutes = require('../api/notifications');
const recentlyViewedRoutes = require('../api/recently-viewed');

// Real authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'test-secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    req.supabase = supabase; // Attach real Supabase client
    next();
  });
};

// Create real test app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add authentication middleware
app.use('/api/profile', authenticateToken, profileRoutes);
app.use('/api/saved-searches', authenticateToken, savedSearchesRoutes);
app.use('/api/reviews', authenticateToken, reviewsRoutes);
app.use('/api/notifications', authenticateToken, notificationsRoutes);
app.use('/api/recently-viewed', authenticateToken, recentlyViewedRoutes);

// Test utilities
const createTestUser = async () => {
  const testUser = {
    id: 'test-user-' + Date.now(),
    email: 'test-' + Date.now() + '@example.com',
    username: 'testuser' + Date.now(),
    role: 'user'
  };

  // Insert test user directly into database
  const { data, error } = await supabase
    .from('users')
    .insert([testUser])
    .select()
    .single();

  if (error) {
    console.error('Error creating test user:', error);
    throw error;
  }

  return data;
};

const createTestApartment = async (landlordId) => {
  const testApartment = {
    id: 'test-apt-' + Date.now(),
    title: 'Test Apartment',
    description: 'A beautiful test apartment',
    price: 800,
    location: 'Test City',
    bedrooms: 2,
    bathrooms: 1,
    area: 80,
    landlord_id: landlordId
  };

  const { data, error } = await supabase
    .from('apartments')
    .insert([testApartment])
    .select()
    .single();

  if (error) {
    console.error('Error creating test apartment:', error);
    throw error;
  }

  return data;
};

const generateToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
};

const cleanupTestData = async (userId, apartmentId) => {
  // Clean up in reverse order of dependencies
  await supabase.from('recently_viewed').delete().eq('user_id', userId);
  await supabase.from('notifications').delete().eq('user_id', userId);
  await supabase.from('reviews').delete().eq('user_id', userId);
  await supabase.from('saved_searches').delete().eq('user_id', userId);
  if (apartmentId) {
    await supabase.from('apartments').delete().eq('id', apartmentId);
  }
  await supabase.from('users').delete().eq('id', userId);
};

describe('Step 4 Real Data Integration Tests', () => {
  let testUser;
  let testApartment;
  let authToken;

  beforeAll(async () => {
    // Create test user and apartment
    testUser = await createTestUser();
    testApartment = await createTestApartment(testUser.id);
    authToken = generateToken(testUser);
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
    if (testUser && testApartment) {
      await cleanupTestData(testUser.id, testApartment.id);
    }
  }, 30000);

  describe('Profile API with Real Data', () => {
    test('should get user profile statistics', async () => {
      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profile_views');
      expect(response.body).toHaveProperty('saved_searches');
      expect(response.body).toHaveProperty('reviews_written');
      expect(response.body).toHaveProperty('notifications_count');
    }, 10000);

    test('should update notification preferences', async () => {
      const preferences = {
        email: false,
        sms: true,
        push: true,
        marketing: false
      };

      const response = await request(app)
        .put('/api/profile/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ preferences });

      expect(response.status).toBe(200);
      expect(response.body.user.notification_preferences).toEqual(preferences);
    }, 10000);
  });

  describe('Saved Searches API with Real Data', () => {
    let savedSearchId;

    test('should create a new saved search', async () => {
      const searchData = {
        name: 'Test Search',
        search_criteria: {
          maxPrice: 1000,
          location: 'Test City',
          minRooms: 2
        },
        alerts_enabled: true,
        alert_frequency: 'daily'
      };

      const response = await request(app)
        .post('/api/saved-searches')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchData);

      expect(response.status).toBe(201);
      expect(response.body.saved_search).toHaveProperty('id');
      expect(response.body.saved_search.name).toBe('Test Search');
      
      savedSearchId = response.body.saved_search.id;
    }, 10000);

    test('should get user saved searches', async () => {
      const response = await request(app)
        .get('/api/saved-searches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.searches)).toBe(true);
      expect(response.body.searches.length).toBeGreaterThan(0);
    }, 10000);

    test('should execute saved search', async () => {
      const response = await request(app)
        .post(`/api/saved-searches/${savedSearchId}/execute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    }, 10000);

    test('should delete saved search', async () => {
      const response = await request(app)
        .delete(`/api/saved-searches/${savedSearchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    }, 10000);
  });

  describe('Reviews API with Real Data', () => {
    let reviewId;

    test('should create a new review', async () => {
      const reviewData = {
        apartment_id: testApartment.id,
        rating: 5,
        title: 'Great apartment!',
        comment: 'Really enjoyed staying here. Clean and well-located.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData);

      expect(response.status).toBe(201);
      expect(response.body.review).toHaveProperty('id');
      expect(response.body.review.rating).toBe(5);
      expect(response.body.review.status).toBe('pending');
      
      reviewId = response.body.review.id;
    }, 10000);

    test('should get apartment reviews', async () => {
      const response = await request(app)
        .get(`/api/reviews?apartment_id=${testApartment.id}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.reviews)).toBe(true);
    }, 10000);

    test('should get review statistics', async () => {
      const response = await request(app)
        .get(`/api/reviews/apartment/${testApartment.id}/stats`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_reviews');
      expect(response.body).toHaveProperty('average_rating');
    }, 10000);
  });

  describe('Notifications API with Real Data', () => {
    let notificationId;

    test('should create a notification', async () => {
      const notificationData = {
        user_id: testUser.id,
        type: 'review_approved',
        title: 'Review Approved',
        message: 'Your review has been approved and is now visible.',
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData);

      expect(response.status).toBe(201);
      expect(response.body.notification).toHaveProperty('id');
      expect(response.body.notification.is_read).toBe(false);
      
      notificationId = response.body.notification.id;
    }, 10000);

    test('should get user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.notifications)).toBe(true);
      expect(response.body.notifications.length).toBeGreaterThan(0);
    }, 10000);

    test('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.notification.is_read).toBe(true);
    }, 10000);

    test('should delete notification', async () => {
      const response = await request(app)
        .delete(`/api/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted');
    }, 10000);
  });

  describe('Recently Viewed API with Real Data', () => {
    test('should track apartment view', async () => {
      const response = await request(app)
        .post('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ apartment_id: testApartment.id });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('tracked');
    }, 10000);

    test('should get recently viewed apartments', async () => {
      const response = await request(app)
        .get('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.apartments)).toBe(true);
      expect(response.body.apartments.length).toBeGreaterThan(0);
    }, 10000);

    test('should get recently viewed with limit', async () => {
      const response = await request(app)
        .get('/api/recently-viewed?limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.apartments)).toBe(true);
      expect(response.body.apartments.length).toBeLessThanOrEqual(5);
    }, 10000);

    test('should clear all recently viewed', async () => {
      const response = await request(app)
        .delete('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('cleared');
    }, 10000);
  });

  describe('Real Integration Workflow', () => {
    test('Complete user workflow: create search -> track views -> get notifications -> create review', async () => {
      // 1. Create saved search
      const searchResponse = await request(app)
        .post('/api/saved-searches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Integration Test Search',
          search_criteria: { maxPrice: 1200, location: 'Test City' },
          alerts_enabled: true
        });

      expect(searchResponse.status).toBe(201);
      const savedSearchId = searchResponse.body.saved_search.id;

      // 2. Track apartment view
      const viewResponse = await request(app)
        .post('/api/recently-viewed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ apartment_id: testApartment.id });

      expect(viewResponse.status).toBe(201);

      // 3. Create notification
      const notifyResponse = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          user_id: testUser.id,
          type: 'new_match',
          title: 'New Match Found',
          message: 'A new apartment matches your saved search!'
        });

      expect(notifyResponse.status).toBe(201);

      // 4. Create review
      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          apartment_id: testApartment.id,
          rating: 4,
          title: 'Good place',
          comment: 'Overall satisfied with the experience.'
        });

      expect(reviewResponse.status).toBe(201);

      // 5. Get updated profile stats
      const statsResponse = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.saved_searches).toBeGreaterThan(0);
      expect(statsResponse.body.reviews_written).toBeGreaterThan(0);
      expect(statsResponse.body.notifications_count).toBeGreaterThan(0);

      // Cleanup
      await request(app)
        .delete(`/api/saved-searches/${savedSearchId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }, 30000);
  });
});

module.exports = app;
