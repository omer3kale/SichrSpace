/**
 * Step 4 API Tests - Enhanced User Experience
 * Fixed Authentication Tests for: Profile, Saved Searches, Reviews, Notifications, Recently Viewed
 */

const request = require('supertest');
const { createTestApp } = require('./test-app');
const { authTestUtils } = require('./auth-mock');

// Setup test app
const app = createTestApp();

// Test data
const testUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  role: 'user',
  name: 'Test User'
};

const testAdmin = {
  id: 'test-admin-456',
  email: 'admin@example.com',
  role: 'admin',
  name: 'Test Admin'
};

const testApartment = {
  id: 'test-apartment-789',
  title: 'Test Apartment'
};

// Generate tokens using auth utils
const userToken = authTestUtils.generateValidToken(testUser);
const adminToken = authTestUtils.generateAdminToken(testAdmin);

describe('Step 4 APIs - Enhanced User Experience', () => {
  beforeEach(() => {
    // Reset mocks before each test
    authTestUtils.resetMocks();
  });

  describe('Profile API', () => {
    test('GET /api/profile/stats - should return user statistics', async () => {
      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats).toHaveProperty('favorites');
      expect(response.body.stats).toHaveProperty('viewingRequests');
      expect(response.body.stats).toHaveProperty('reviews');
      expect(response.body.stats).toHaveProperty('savedSearches');
    });

    test('PUT /api/profile/notifications - should update notification preferences', async () => {
      const preferences = {
        email: true,
        sms: false,
        push: true,
        marketing: false
      };

      const response = await request(app)
        .put('/api/profile/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toEqual({
        email: true,
        sms: false,
        push: true,
        marketing: false
      });
    });

    test('POST /api/profile/upload-avatar - should reject request without file', async () => {
      const response = await request(app)
        .post('/api/profile/upload-avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });

    test('Should require authentication for profile endpoints', async () => {
      const response = await request(app)
        .get('/api/profile/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Saved Searches API', () => {
    test('POST /api/saved-searches - should create new saved search', async () => {
      const searchData = {
        name: 'Test Search',
        searchCriteria: {
          location: 'Berlin',
          maxPrice: 1500,
          minRooms: 2
        },
        alertsEnabled: true
      };

      const response = await request(app)
        .post('/api/saved-searches')
        .set('Authorization', `Bearer ${userToken}`)
        .send(searchData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Saved search created successfully');
      expect(response.body.data).toBeDefined();
    });

    test('GET /api/saved-searches - should return user saved searches', async () => {
      const response = await request(app)
        .get('/api/saved-searches')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('PUT /api/saved-searches/:id - should update saved search', async () => {
      const updateData = {
        name: 'Updated Search',
        alertsEnabled: false
      };

      const response = await request(app)
        .put('/api/saved-searches/search-123')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Saved search updated successfully');
    });

    test('POST /api/saved-searches/:id/execute - should execute saved search', async () => {
      const response = await request(app)
        .post('/api/saved-searches/search-123/execute')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Search executed successfully');
      expect(Array.isArray(response.body.results)).toBe(true);
    });

    test('DELETE /api/saved-searches/:id - should delete saved search', async () => {
      const response = await request(app)
        .delete('/api/saved-searches/search-123')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Saved search deleted successfully');
    });

    test('Should validate required fields', async () => {
      const response = await request(app)
        .post('/api/saved-searches')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Name and search criteria are required');
    });

    test('Should require authentication for saved searches endpoints', async () => {
      const response = await request(app)
        .get('/api/saved-searches');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Reviews API', () => {
    test('POST /api/reviews - should create new review', async () => {
      const reviewData = {
        apartmentId: testApartment.id,
        rating: 5,
        title: 'Great apartment!',
        comment: 'Really enjoyed staying here.'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(reviewData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review submitted successfully and is pending moderation');
      expect(response.body.data).toBeDefined();
    });

    test('GET /api/reviews - should return approved reviews', async () => {
      const response = await request(app)
        .get('/api/reviews');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/reviews/apartment/:apartmentId/stats - should return review statistics', async () => {
      const response = await request(app)
        .get(`/api/reviews/apartment/${testApartment.id}/stats`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats).toHaveProperty('totalReviews');
      expect(response.body.stats).toHaveProperty('averageRating');
      expect(response.body.stats).toHaveProperty('ratingDistribution');
    });

    test('PUT /api/reviews/:id/moderate - should moderate review (admin only)', async () => {
      const moderationData = {
        status: 'approved',
        moderationNote: 'Approved by admin'
      };

      const response = await request(app)
        .put('/api/reviews/review-123/moderate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(moderationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review moderated successfully');
    });

    test('Should validate rating range', async () => {
      const invalidReview = {
        apartmentId: testApartment.id,
        rating: 6, // Invalid rating
        title: 'Test',
        comment: 'Test comment'
      };

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidReview);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('Should reject moderation from non-admin users', async () => {
      const moderationData = {
        status: 'approved'
      };

      const response = await request(app)
        .put('/api/reviews/review-123/moderate')
        .set('Authorization', `Bearer ${userToken}`)
        .send(moderationData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('Notifications API', () => {
    test('POST /api/notifications - should create new notification', async () => {
      const notificationData = {
        userId: testUser.id,
        type: 'viewing_request',
        title: 'New viewing request',
        message: 'You have a new viewing request',
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/notifications')
        .send(notificationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification created successfully');
      expect(response.body.data).toBeDefined();
    });

    test('GET /api/notifications - should return user notifications', async () => {
      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('unreadCount');
    });

    test('PUT /api/notifications/:id/read - should mark notification as read', async () => {
      const response = await request(app)
        .put('/api/notifications/notification-123/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification marked as read');
    });

    test('PUT /api/notifications/read-all - should mark all notifications as read', async () => {
      const response = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All notifications marked as read');
    });

    test('DELETE /api/notifications/:id - should delete notification', async () => {
      const response = await request(app)
        .delete('/api/notifications/notification-123')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification deleted successfully');
    });

    test('Should require authentication for notification endpoints', async () => {
      const response = await request(app)
        .get('/api/notifications');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Recently Viewed API', () => {
    test('POST /api/recently-viewed - should track apartment view', async () => {
      const viewData = {
        apartmentId: testApartment.id
      };

      const response = await request(app)
        .post('/api/recently-viewed')
        .set('Authorization', `Bearer ${userToken}`)
        .send(viewData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Apartment view tracked successfully');
    });

    test('GET /api/recently-viewed - should return recently viewed apartments', async () => {
      const response = await request(app)
        .get('/api/recently-viewed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/recently-viewed with limit parameter', async () => {
      const response = await request(app)
        .get('/api/recently-viewed?limit=5')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('DELETE /api/recently-viewed/:apartmentId - should remove specific apartment', async () => {
      const response = await request(app)
        .delete(`/api/recently-viewed/${testApartment.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Apartment removed from recently viewed');
    });

    test('DELETE /api/recently-viewed - should clear all recently viewed', async () => {
      const response = await request(app)
        .delete('/api/recently-viewed')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All recently viewed apartments cleared');
    });

    test('Should validate required apartmentId', async () => {
      const response = await request(app)
        .post('/api/recently-viewed')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Apartment ID is required');
    });

    test('Should require authentication for recently viewed endpoints', async () => {
      const response = await request(app)
        .get('/api/recently-viewed');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/profile/stats')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    test('Should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/profile/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No authorization header provided');
    });

    test('Should validate request body data types', async () => {
      const invalidData = {
        name: 123, // Should be string
        searchCriteria: 'invalid' // Should be object
      };

      const response = await request(app)
        .post('/api/saved-searches')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('Complete user workflow: create saved search -> track views -> get notifications', async () => {
      // 1. Create saved search
      const searchResponse = await request(app)
        .post('/api/saved-searches')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Integration Test Search',
          searchCriteria: { location: 'Berlin', maxPrice: 1200 }
        });

      expect(searchResponse.status).toBe(200);

      // 2. Track apartment view
      const viewResponse = await request(app)
        .post('/api/recently-viewed')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ apartmentId: testApartment.id });

      expect(viewResponse.status).toBe(200);

      // 3. Get notifications
      const notificationResponse = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(notificationResponse.status).toBe(200);
      expect(notificationResponse.body.success).toBe(true);
    });

    test('Admin workflow: moderate review -> create notification', async () => {
      // 1. Create review first
      const reviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          apartmentId: testApartment.id,
          rating: 4,
          title: 'Good place',
          comment: 'Nice apartment with good amenities'
        });

      expect(reviewResponse.status).toBe(200);

      // 2. Admin moderates review
      const moderationResponse = await request(app)
        .put('/api/reviews/review-123/moderate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'approved' });

      expect(moderationResponse.status).toBe(200);

      // 3. Create notification about moderation
      const notificationResponse = await request(app)
        .post('/api/notifications')
        .send({
          userId: testUser.id,
          type: 'review_moderated',
          title: 'Review Approved',
          message: 'Your review has been approved and is now visible'
        });

      expect(notificationResponse.status).toBe(200);
    });
  });
});

// Export for other test files
module.exports = { app, testUser, testAdmin, testApartment, userToken, adminToken };
