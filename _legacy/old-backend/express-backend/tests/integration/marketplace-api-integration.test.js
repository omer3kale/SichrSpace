const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock marketplace API routes
const createMarketplaceAPI = () => {
  const app = express();
  app.use(express.json());

  // Mock authentication middleware
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Malformed token' });
    }

    try {
      const decoded = jwt.verify(token, 'test-secret');
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Mock data stores
  const offers = new Map();
  const favorites = new Map();
  const messages = new Map();
  const payments = new Map();

  // Initialize with some test data
  offers.set('bed1', {
    id: 'bed1',
    title: 'Double Bed Frame with Storage',
    description: 'IKEA Malm bed frame, 160x200cm, white oak finish',
    price: 85,
    category: 'Bedroom',
    condition: 'Pre-owned',
    sellerId: 'seller1',
    location: 'Cologne, 50667',
    images: ['bed1.jpg'],
    status: 'active',
    views: 24,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  offers.set('mixer1', {
    id: 'mixer1',
    title: 'KitchenAid Stand Mixer',
    description: 'Professional KitchenAid Artisan 5-quart mixer',
    price: 185,
    category: 'Kitchen',
    condition: 'Refurbished',
    sellerId: 'seller2',
    location: 'Aachen, 52062',
    images: ['mixer1.jpg'],
    status: 'active',
    views: 41,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // === OFFER ROUTES ===

  // GET /api/marketplace/offers - Get all offers with filtering
  app.get('/api/marketplace/offers', (req, res) => {
    try {
      const { 
        search, 
        category, 
        condition, 
        minPrice, 
        maxPrice, 
        city, 
        postal,
        sortBy = 'date_desc',
        page = 1,
        limit = 20
      } = req.query;

      let filteredOffers = Array.from(offers.values()).filter(offer => offer.status === 'active');

      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        filteredOffers = filteredOffers.filter(offer => 
          offer.title.toLowerCase().includes(searchLower) ||
          offer.description.toLowerCase().includes(searchLower)
        );
      }

      if (category) {
        filteredOffers = filteredOffers.filter(offer => offer.category === category);
      }

      if (condition) {
        filteredOffers = filteredOffers.filter(offer => offer.condition === condition);
      }

      if (minPrice) {
        filteredOffers = filteredOffers.filter(offer => offer.price >= parseInt(minPrice));
      }

      if (maxPrice) {
        filteredOffers = filteredOffers.filter(offer => offer.price <= parseInt(maxPrice));
      }

      if (city) {
        filteredOffers = filteredOffers.filter(offer => 
          offer.location.toLowerCase().includes(city.toLowerCase())
        );
      }

      if (postal) {
        filteredOffers = filteredOffers.filter(offer => 
          offer.location.includes(postal)
        );
      }

      // Apply sorting
      switch (sortBy) {
        case 'price_asc':
          filteredOffers.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filteredOffers.sort((a, b) => b.price - a.price);
          break;
        case 'date_asc':
          filteredOffers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          break;
        case 'date_desc':
          filteredOffers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        default:
          // Keep default order
      }

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedOffers = filteredOffers.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedOffers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredOffers.length,
          totalPages: Math.ceil(filteredOffers.length / limit)
        },
        filters: {
          search, category, condition, minPrice, maxPrice, city, postal, sortBy
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch offers' });
    }
  });

  // GET /api/marketplace/offers/:id - Get specific offer
  app.get('/api/marketplace/offers/:id', (req, res) => {
    try {
      const offer = offers.get(req.params.id);
      if (!offer) {
        return res.status(404).json({ success: false, error: 'Offer not found' });
      }

      // Increment view count
      offer.views = (offer.views || 0) + 1;
      offers.set(req.params.id, offer);

      res.json({
        success: true,
        data: offer
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch offer' });
    }
  });

  // POST /api/marketplace/offers - Create new offer
  app.post('/api/marketplace/offers', authenticateToken, (req, res) => {
    try {
      const {
        title,
        description,
        price,
        category,
        condition,
        location,
        images = []
      } = req.body;

      // Validation
      if (!title || !description || price === undefined || price === null || !category || !condition || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, description, price, category, condition, location'
        });
      }

      if (price <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Price must be greater than 0'
        });
      }

      const validCategories = ['Bedroom', 'Kitchen', 'Living Room', 'Hallway & Entrance', 'Cleaning Facilities', 'Decoration'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category'
        });
      }

      const validConditions = ['Pre-owned', 'Refurbished', 'Vintage', 'Like New'];
      if (!validConditions.includes(condition)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid condition'
        });
      }

      const offerId = `offer_${Date.now()}`;
      const newOffer = {
        id: offerId,
        title,
        description,
        price: parseFloat(price),
        category,
        condition,
        sellerId: req.user.id,
        location,
        images,
        status: 'active',
        views: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      offers.set(offerId, newOffer);

      res.status(201).json({
        success: true,
        data: newOffer
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create offer' });
    }
  });

  // PUT /api/marketplace/offers/:id - Update offer
  app.put('/api/marketplace/offers/:id', authenticateToken, (req, res) => {
    try {
      const offer = offers.get(req.params.id);
      if (!offer) {
        return res.status(404).json({ success: false, error: 'Offer not found' });
      }

      // Check ownership
      if (offer.sellerId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this offer' });
      }

      const updates = { ...req.body, updatedAt: new Date() };
      const updatedOffer = { ...offer, ...updates };

      offers.set(req.params.id, updatedOffer);

      res.json({
        success: true,
        data: updatedOffer
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update offer' });
    }
  });

  // DELETE /api/marketplace/offers/:id - Delete offer
  app.delete('/api/marketplace/offers/:id', authenticateToken, (req, res) => {
    try {
      const offer = offers.get(req.params.id);
      if (!offer) {
        return res.status(404).json({ success: false, error: 'Offer not found' });
      }

      // Check ownership
      if (offer.sellerId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized to delete this offer' });
      }

      offers.delete(req.params.id);

      res.json({
        success: true,
        message: 'Offer deleted successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete offer' });
    }
  });

  // === FAVORITES ROUTES ===

  // GET /api/marketplace/favorites - Get user favorites
  app.get('/api/marketplace/favorites', authenticateToken, (req, res) => {
    try {
      const userFavorites = Array.from(favorites.values()).filter(fav => fav.userId === req.user.id);
      const favoriteOffers = userFavorites.map(fav => ({
        favoriteId: fav.id,
        createdAt: fav.createdAt,
        offer: offers.get(fav.offerId)
      })).filter(item => item.offer); // Filter out deleted offers

      res.json({
        success: true,
        data: favoriteOffers
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch favorites' });
    }
  });

  // POST /api/marketplace/favorites - Toggle favorite
  app.post('/api/marketplace/favorites', authenticateToken, (req, res) => {
    try {
      const { offerId } = req.body;
      
      if (!offerId) {
        return res.status(400).json({ success: false, error: 'Offer ID is required' });
      }

      if (!offers.has(offerId)) {
        return res.status(404).json({ success: false, error: 'Offer not found' });
      }

      // Check if already favorited
      const existingFavorite = Array.from(favorites.values()).find(
        fav => fav.userId === req.user.id && fav.offerId === offerId
      );

      if (existingFavorite) {
        // Remove from favorites
        favorites.delete(existingFavorite.id);
        res.json({
          success: true,
          action: 'removed',
          message: 'Removed from favorites'
        });
      } else {
        // Add to favorites
        const favoriteId = `fav_${Date.now()}`;
        const newFavorite = {
          id: favoriteId,
          userId: req.user.id,
          offerId: offerId,
          createdAt: new Date()
        };
        favorites.set(favoriteId, newFavorite);

        res.json({
          success: true,
          action: 'added',
          data: newFavorite,
          message: 'Added to favorites'
        });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to toggle favorite' });
    }
  });

  // === MESSAGES ROUTES ===

  // GET /api/marketplace/messages/conversations - Get user conversations
  app.get('/api/marketplace/messages/conversations', authenticateToken, (req, res) => {
    try {
      const userMessages = Array.from(messages.values()).filter(
        msg => msg.fromUserId === req.user.id || msg.toUserId === req.user.id
      );

      // Group by offer
      const conversations = {};
      userMessages.forEach(msg => {
        if (!conversations[msg.offerId]) {
          conversations[msg.offerId] = {
            offerId: msg.offerId,
            offer: offers.get(msg.offerId),
            messages: [],
            lastMessage: null,
            unreadCount: 0
          };
        }
        conversations[msg.offerId].messages.push(msg);
        if (!msg.read && msg.toUserId === req.user.id) {
          conversations[msg.offerId].unreadCount++;
        }
      });

      // Get last message for each conversation
      Object.values(conversations).forEach(conv => {
        conv.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        conv.lastMessage = conv.messages[0];
      });

      res.json({
        success: true,
        data: Object.values(conversations)
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
    }
  });

  // GET /api/marketplace/messages/:offerId - Get messages for specific offer
  app.get('/api/marketplace/messages/:offerId', authenticateToken, (req, res) => {
    try {
      const offerMessages = Array.from(messages.values()).filter(
        msg => msg.offerId === req.params.offerId &&
               (msg.fromUserId === req.user.id || msg.toUserId === req.user.id)
      );

      offerMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      res.json({
        success: true,
        data: offerMessages
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  });

  // POST /api/marketplace/messages - Send message
  app.post('/api/marketplace/messages', authenticateToken, (req, res) => {
    try {
      const { offerId, toUserId, message } = req.body;

      if (!offerId || !toUserId || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: offerId, toUserId, message'
        });
      }

      if (!offers.has(offerId)) {
        return res.status(404).json({ success: false, error: 'Offer not found' });
      }

      const messageId = `msg_${Date.now()}`;
      const newMessage = {
        id: messageId,
        offerId,
        fromUserId: req.user.id,
        toUserId,
        message,
        read: false,
        createdAt: new Date()
      };

      messages.set(messageId, newMessage);

      res.status(201).json({
        success: true,
        data: newMessage
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  });

  // === PAYMENTS ROUTES ===

  // POST /api/marketplace/payments/initiate - Initiate payment
  app.post('/api/marketplace/payments/initiate', authenticateToken, (req, res) => {
    try {
      const { offerId, sellerId } = req.body;

      if (!offerId || !sellerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: offerId, sellerId'
        });
      }

      const offer = offers.get(offerId);
      if (!offer) {
        return res.status(404).json({ success: false, error: 'Offer not found' });
      }

      if (offer.sellerId !== sellerId) {
        return res.status(400).json({ success: false, error: 'Seller ID mismatch' });
      }

      if (offer.sellerId === req.user.id) {
        return res.status(400).json({ success: false, error: 'Cannot buy your own item' });
      }

      const platformFee = Math.round(offer.price * 0.02 * 100) / 100;
      const paymentId = `payment_${Date.now()}`;
      
      const payment = {
        id: paymentId,
        offerId,
        buyerId: req.user.id,
        sellerId,
        amount: offer.price,
        platformFee,
        total: offer.price,
        sellerReceives: offer.price - platformFee,
        currency: 'EUR',
        status: 'pending',
        paymentProvider: 'paypal',
        paymentUrl: `https://sandbox.paypal.com/payment/${paymentId}`,
        createdAt: new Date()
      };

      payments.set(paymentId, payment);

      res.status(201).json({
        success: true,
        data: payment
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to initiate payment' });
    }
  });

  // POST /api/marketplace/payments/:id/complete - Complete payment
  app.post('/api/marketplace/payments/:id/complete', authenticateToken, (req, res) => {
    try {
      const payment = payments.get(req.params.id);
      if (!payment) {
        return res.status(404).json({ success: false, error: 'Payment not found' });
      }

      if (payment.buyerId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      if (payment.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Payment already processed' });
      }

      const { transactionId, paymentData } = req.body;

      payment.status = 'completed';
      payment.transactionId = transactionId;
      payment.completedAt = new Date();
      payment.paymentData = paymentData;

      payments.set(req.params.id, payment);

      // Mark offer as sold
      const offer = offers.get(payment.offerId);
      if (offer) {
        offer.status = 'sold';
        offer.soldAt = new Date();
        offer.buyerId = req.user.id;
        offers.set(payment.offerId, offer);
      }

      res.json({
        success: true,
        data: payment,
        message: 'Payment completed successfully'
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to complete payment' });
    }
  });

  // === ANALYTICS ROUTES ===

  // GET /api/marketplace/analytics/offer/:id - Get offer analytics
  app.get('/api/marketplace/analytics/offer/:id', authenticateToken, (req, res) => {
    try {
      const offer = offers.get(req.params.id);
      if (!offer) {
        return res.status(404).json({ success: false, error: 'Offer not found' });
      }

      if (offer.sellerId !== req.user.id) {
        return res.status(403).json({ success: false, error: 'Not authorized' });
      }

      const offerFavorites = Array.from(favorites.values()).filter(fav => fav.offerId === req.params.id);
      const offerMessages = Array.from(messages.values()).filter(msg => msg.offerId === req.params.id);
      
      const analytics = {
        views: offer.views || 0,
        favorites: offerFavorites.length,
        messages: offerMessages.length,
        inquiries: new Set(offerMessages.map(msg => msg.fromUserId)).size,
        conversionRate: offerMessages.length > 0 ? (offer.status === 'sold' ? 1 : 0) : 0
      };

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
    }
  });

  return app;
};

describe('Marketplace API Integration Tests', () => {
  let app;
  let authToken;

  beforeAll(() => {
    app = createMarketplaceAPI();
    
    // Create test token
    authToken = jwt.sign(
      { id: 'user123', email: 'test@example.com' },
      'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Offers API', () => {
    test('should get all offers with pagination', async () => {
      const response = await request(app)
        .get('/api/marketplace/offers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(20);
    });

    test('should filter offers by search query', async () => {
      const response = await request(app)
        .get('/api/marketplace/offers?search=bed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.filters.search).toBe('bed');
    });

    test('should filter offers by category', async () => {
      const response = await request(app)
        .get('/api/marketplace/offers?category=Kitchen')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.category).toBe('Kitchen');
      if (response.body.data.length > 0) {
        expect(response.body.data[0].category).toBe('Kitchen');
      }
    });

    test('should filter offers by price range', async () => {
      const response = await request(app)
        .get('/api/marketplace/offers?minPrice=50&maxPrice=200')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.filters.minPrice).toBe('50');
      expect(response.body.filters.maxPrice).toBe('200');
      
      response.body.data.forEach(offer => {
        expect(offer.price).toBeGreaterThanOrEqual(50);
        expect(offer.price).toBeLessThanOrEqual(200);
      });
    });

    test('should sort offers by price ascending', async () => {
      const response = await request(app)
        .get('/api/marketplace/offers?sortBy=price_asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          expect(response.body.data[i].price).toBeGreaterThanOrEqual(response.body.data[i-1].price);
        }
      }
    });

    test('should get specific offer and increment views', async () => {
      const response = await request(app)
        .get('/api/marketplace/offers/bed1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('bed1');
      expect(response.body.data.title).toBe('Double Bed Frame with Storage');
      expect(response.body.data.views).toBeGreaterThan(0);
    });

    test('should return 404 for non-existent offer', async () => {
      const response = await request(app)
        .get('/api/marketplace/offers/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Offer not found');
    });

    test('should create new offer with authentication', async () => {
      const newOffer = {
        title: 'Test Gaming Chair',
        description: 'Comfortable gaming chair in excellent condition',
        price: 120,
        category: 'Bedroom',
        condition: 'Like New',
        location: 'Berlin, 10115',
        images: ['chair1.jpg']
      };

      const response = await request(app)
        .post('/api/marketplace/offers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOffer)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newOffer.title);
      expect(response.body.data.sellerId).toBe('user123');
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.id).toBeDefined();
    });

    test('should require authentication to create offer', async () => {
      const newOffer = {
        title: 'Test Item',
        description: 'Test description',
        price: 50,
        category: 'Kitchen',
        condition: 'Pre-owned',
        location: 'Test City'
      };

      const response = await request(app)
        .post('/api/marketplace/offers')
        .send(newOffer)
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    test('should validate required fields when creating offer', async () => {
      const invalidOffer = {
        title: 'Test Item'
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/marketplace/offers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOffer)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    test('should validate price is greater than 0', async () => {
      const invalidOffer = {
        title: 'Test Item',
        description: 'Test description',
        price: 0,
        category: 'Kitchen',
        condition: 'Pre-owned',
        location: 'Test City'
      };

      const response = await request(app)
        .post('/api/marketplace/offers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOffer)
        .expect(400);

      expect(response.body.error).toBe('Price must be greater than 0');
    });

    test('should validate category', async () => {
      const invalidOffer = {
        title: 'Test Item',
        description: 'Test description',
        price: 50,
        category: 'Invalid Category',
        condition: 'Pre-owned',
        location: 'Test City'
      };

      const response = await request(app)
        .post('/api/marketplace/offers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidOffer)
        .expect(400);

      expect(response.body.error).toBe('Invalid category');
    });
  });

  describe('Favorites API', () => {
    test('should get user favorites', async () => {
      const response = await request(app)
        .get('/api/marketplace/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should require authentication for favorites', async () => {
      const response = await request(app)
        .get('/api/marketplace/favorites')
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    test('should add offer to favorites', async () => {
      const response = await request(app)
        .post('/api/marketplace/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ offerId: 'bed1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('added');
      expect(response.body.data.offerId).toBe('bed1');
    });

    test('should remove offer from favorites when toggled again', async () => {
      // First add to favorites
      await request(app)
        .post('/api/marketplace/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ offerId: 'mixer1' })
        .expect(200);

      // Then remove from favorites
      const response = await request(app)
        .post('/api/marketplace/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ offerId: 'mixer1' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('removed');
    });

    test('should return error for non-existent offer', async () => {
      const response = await request(app)
        .post('/api/marketplace/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ offerId: 'nonexistent' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Offer not found');
    });
  });

  describe('Messages API', () => {
    test('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/marketplace/messages/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should send message to seller', async () => {
      const messageData = {
        offerId: 'bed1',
        toUserId: 'seller1',
        message: 'Is this item still available?'
      };

      const response = await request(app)
        .post('/api/marketplace/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe(messageData.message);
      expect(response.body.data.fromUserId).toBe('user123');
      expect(response.body.data.toUserId).toBe('seller1');
    });

    test('should get messages for specific offer', async () => {
      // First send a message
      await request(app)
        .post('/api/marketplace/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          offerId: 'bed1',
          toUserId: 'seller1',
          message: 'Test message'
        });

      const response = await request(app)
        .get('/api/marketplace/messages/bed1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should require authentication for messaging', async () => {
      const response = await request(app)
        .post('/api/marketplace/messages')
        .send({
          offerId: 'bed1',
          toUserId: 'seller1',
          message: 'Test message'
        })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });

    test('should validate message fields', async () => {
      const response = await request(app)
        .post('/api/marketplace/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          offerId: 'bed1'
          // Missing toUserId and message
        })
        .expect(400);

      expect(response.body.error).toContain('Missing required fields');
    });
  });

  describe('Payments API', () => {
    test('should initiate payment for offer', async () => {
      const paymentData = {
        offerId: 'bed1',
        sellerId: 'seller1'
      };

      const response = await request(app)
        .post('/api/marketplace/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.offerId).toBe('bed1');
      expect(response.body.data.buyerId).toBe('user123');
      expect(response.body.data.amount).toBe(85);
      expect(response.body.data.platformFee).toBe(1.7); // 2% of 85
      expect(response.body.data.sellerReceives).toBe(83.3);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.paymentUrl).toBeDefined();
    });

    test('should not allow buying own item', async () => {
      // Create an offer by the same user
      const newOffer = {
        title: 'My Own Item',
        description: 'Test description',
        price: 100,
        category: 'Kitchen',
        condition: 'Pre-owned',
        location: 'Test City'
      };

      const createResponse = await request(app)
        .post('/api/marketplace/offers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOffer);

      const offerId = createResponse.body.data.id;

      const response = await request(app)
        .post('/api/marketplace/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          offerId: offerId,
          sellerId: 'user123'
        })
        .expect(400);

      expect(response.body.error).toBe('Cannot buy your own item');
    });

    test('should validate seller ID matches offer', async () => {
      const response = await request(app)
        .post('/api/marketplace/payments/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          offerId: 'bed1',
          sellerId: 'wrong_seller'
        })
        .expect(400);

      expect(response.body.error).toBe('Seller ID mismatch');
    });

    test('should require authentication for payment', async () => {
      const response = await request(app)
        .post('/api/marketplace/payments/initiate')
        .send({
          offerId: 'bed1',
          sellerId: 'seller1'
        })
        .expect(401);

      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('Analytics API', () => {
    test('should get offer analytics for owner', async () => {
      // Create an offer first
      const newOffer = {
        title: 'Analytics Test Item',
        description: 'Test description',
        price: 100,
        category: 'Kitchen',
        condition: 'Pre-owned',
        location: 'Test City'
      };

      const createResponse = await request(app)
        .post('/api/marketplace/offers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOffer);

      const offerId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/marketplace/analytics/offer/${offerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.views).toBeDefined();
      expect(response.body.data.favorites).toBeDefined();
      expect(response.body.data.messages).toBeDefined();
      expect(response.body.data.inquiries).toBeDefined();
      expect(response.body.data.conversionRate).toBeDefined();
    });

    test('should not allow analytics access for non-owner', async () => {
      const response = await request(app)
        .get('/api/marketplace/analytics/offer/bed1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toBe('Not authorized');
    });

    test('should return 404 for non-existent offer analytics', async () => {
      const response = await request(app)
        .get('/api/marketplace/analytics/offer/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Offer not found');
    });
  });

  describe('Marketplace Integration Workflows', () => {
    test('should handle complete marketplace transaction flow', async () => {
      const buyerToken = jwt.sign(
        { id: 'buyer456', email: 'buyer@example.com' },
        'test-secret',
        { expiresIn: '1h' }
      );

      // 1. Create offer
      const newOffer = {
        title: 'Complete Flow Test Item',
        description: 'Test item for complete flow',
        price: 150,
        category: 'Kitchen',
        condition: 'Like New',
        location: 'Munich, 80331'
      };

      const createResponse = await request(app)
        .post('/api/marketplace/offers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newOffer)
        .expect(201);

      const offerId = createResponse.body.data.id;

      // 2. Buyer views offer (increments views)
      await request(app)
        .get(`/api/marketplace/offers/${offerId}`)
        .expect(200);

      // 3. Buyer adds to favorites
      await request(app)
        .post('/api/marketplace/favorites')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ offerId })
        .expect(200);

      // 4. Buyer sends message
      await request(app)
        .post('/api/marketplace/messages')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          offerId,
          toUserId: 'user123',
          message: 'Is this item still available?'
        })
        .expect(201);

      // 5. Buyer initiates payment
      const paymentResponse = await request(app)
        .post('/api/marketplace/payments/initiate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          offerId,
          sellerId: 'user123'
        })
        .expect(201);

      const paymentId = paymentResponse.body.data.id;

      // 6. Complete payment
      await request(app)
        .post(`/api/marketplace/payments/${paymentId}/complete`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          transactionId: 'txn_12345',
          paymentData: { success: true }
        })
        .expect(200);

      // 7. Verify offer is marked as sold
      const finalOfferResponse = await request(app)
        .get(`/api/marketplace/offers/${offerId}`)
        .expect(200);

      expect(finalOfferResponse.body.data.status).toBe('sold');
      expect(finalOfferResponse.body.data.buyerId).toBe('buyer456');

      // 8. Check seller analytics
      const analyticsResponse = await request(app)
        .get(`/api/marketplace/analytics/offer/${offerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(analyticsResponse.body.data.views).toBeGreaterThan(0);
      expect(analyticsResponse.body.data.favorites).toBe(1);
      expect(analyticsResponse.body.data.messages).toBe(1);
    });

    test('should handle marketplace search and filtering integration', async () => {
      // Create multiple test offers
      const offers = [
        {
          title: 'Red Kitchen Chair',
          description: 'Beautiful red chair for kitchen',
          price: 45,
          category: 'Kitchen',
          condition: 'Pre-owned',
          location: 'Berlin, 10115'
        },
        {
          title: 'Blue Kitchen Table',
          description: 'Sturdy blue table for kitchen',
          price: 120,
          category: 'Kitchen',
          condition: 'Like New',
          location: 'Hamburg, 20095'
        },
        {
          title: 'Green Bedroom Lamp',
          description: 'Vintage green lamp for bedroom',
          price: 30,
          category: 'Bedroom',
          condition: 'Vintage',
          location: 'Munich, 80331'
        }
      ];

      // Create all offers
      for (const offer of offers) {
        await request(app)
          .post('/api/marketplace/offers')
          .set('Authorization', `Bearer ${authToken}`)
          .send(offer)
          .expect(201);
      }

      // Test search
      const searchResponse = await request(app)
        .get('/api/marketplace/offers?search=kitchen')
        .expect(200);

      expect(searchResponse.body.data.length).toBeGreaterThanOrEqual(2);

      // Test category filter
      const categoryResponse = await request(app)
        .get('/api/marketplace/offers?category=Kitchen')
        .expect(200);

      categoryResponse.body.data.forEach(offer => {
        expect(offer.category).toBe('Kitchen');
      });

      // Test price range filter
      const priceResponse = await request(app)
        .get('/api/marketplace/offers?minPrice=40&maxPrice=100')
        .expect(200);

      priceResponse.body.data.forEach(offer => {
        expect(offer.price).toBeGreaterThanOrEqual(40);
        expect(offer.price).toBeLessThanOrEqual(100);
      });

      // Test combined filters
      const combinedResponse = await request(app)
        .get('/api/marketplace/offers?category=Kitchen&minPrice=50&sortBy=price_asc')
        .expect(200);

      expect(combinedResponse.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });
});
