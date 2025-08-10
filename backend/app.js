const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://cgkumwtibknfrhyiicoo.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna3Vtd3RpYmtuZnJoeWlpY29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwMTc4NiwiZXhwIjoyMDY5ODc3Nzg2fQ.5piAC3CPud7oRvA1Rtypn60dfz5J1ydqoG2oKj-Su3M';
const supabase = createClient(supabaseUrl, supabaseKey);

// Make supabase available to all routes
app.locals.supabase = supabase;

// Import routes
const messagesRoutes = require('./routes/messages');
const uploadApartmentRoute = require('./api/upload-apartment');
const adminRoutes = require('./routes/admin');
const feedbackApi = require('./api/feedback');
const secureVideosApi = require('./api/secure-videos');
const authRoutes = require('./routes/auth');
const apartmentRoutes = require('./routes/apartments');
const favoritesApi = require('./api/favorites');
const viewingRequestsRoutes = require('./routes/viewing-requests');
const auth = require('./middleware/auth');

// Middleware for parsing JSON bodies
app.use(express.json());
app.use(cors());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Start server first, then test Supabase connection (non-blocking)
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📹 Secure Video Management System Ready!');
});

// Test Supabase connection (non-blocking, runs in background)
const testSupabaseConnection = async () => {
  try {
    console.log('🔄 Testing Supabase connection...');
    const { data, error } = await supabase.from('apartments').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    console.log('⚠️  Server will continue running without database functionality');
    console.log('💡 Please check your Supabase connection settings in .env file');
  }
};

// Test Supabase connection in background
testSupabaseConnection();

// Mount the messages routes under /api
app.use('/api', messagesRoutes);

// Mount the apartment upload route
app.use('/upload-apartment', uploadApartmentRoute);

// --- AUTH ROUTES ---
app.use('/api/auth', authRoutes);

// --- APARTMENT ROUTES ---
app.use('/api/apartments', apartmentRoutes);

// --- VIEWING REQUESTS ROUTES ---
app.use('/api/viewing-requests', viewingRequestsRoutes);

// --- FAVORITES API ---
app.use('/api/favorites', favoritesApi);

// --- ADMIN ROUTES ---
app.use('/api/admin', adminRoutes);

// --- FEEDBACK ROUTE ---
app.use('/api/feedback', feedbackApi);

// --- SECURE VIDEOS API ---
app.use('/api/videos', secureVideosApi);

// --- EMAIL API ---
const EmailService = require('./services/emailService');
const emailService = new EmailService();

// Test email configuration
app.post('/api/emails/test-email-config', async (req, res) => {
  try {
    const result = await emailService.testEmailConfiguration();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send viewing confirmation email
app.post('/api/emails/send-viewing-confirmation', async (req, res) => {
  try {
    const { userEmail, userData, viewerData, paymentData } = req.body;
    const result = await emailService.sendViewingConfirmation(userEmail, userData, viewerData, paymentData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send viewing results email with secure video
app.post('/api/emails/send-viewing-results', async (req, res) => {
  try {
    const { userEmail, userData, videoId, emailNotes } = req.body;
    
    // Get secure video link
    const videoLinkResponse = await fetch(`${req.protocol}://${req.get('host')}/api/videos/${videoId}/email-link`);
    const videoLinkData = await videoLinkResponse.json();
    
    if (!videoLinkData.success) {
      return res.status(400).json({ success: false, error: 'Failed to generate secure video link' });
    }

    const videoData = {
      title: videoLinkData.title,
      secureViewerUrl: videoLinkData.viewerUrl,
      apartmentAddress: videoLinkData.apartmentAddress
    };

    const result = await emailService.sendViewingResults(userEmail, userData, videoData, emailNotes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SECURE VIEWER ROUTE ---
app.get('/secure-viewer/:videoId', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/secure-viewer.html'));
});

// --- CHECK ADMIN ROUTE ---
app.get('/api/check-admin', auth, (req, res) => {
  res.json({ isAdmin: req.user.role === 'admin' });
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- TEMPORARY LOGIN ENDPOINT FOR TESTING ---
app.post('/api/auth/login-test', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Test user accounts
    const testUsers = {
      'sichrplace@gmail.com': {
        password: 'Gokhangulec29*',
        user: {
          id: 'e7532cfc-493c-4bf1-9458-a3f11fa6602a',
          email: 'sichrplace@gmail.com',
          username: 'sichrplace',
          role: 'admin',
          first_name: 'SichrPlace',
          last_name: 'Admin'
        }
      },
      'omer3kale@gmail.com': {
        password: 'Gokhangulec29*',
        user: {
          id: 'bbd03609-d3a6-49e4-8701-fa84445b3cab',
          email: 'omer3kale@gmail.com',
          username: 'omer3kale',
          role: 'user',
          first_name: 'Omer',
          last_name: 'Kale'
        }
      }
    };

    const testUser = testUsers[email];
    if (testUser && testUser.password === password) {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        testUser.user,
        process.env.JWT_SECRET || 'fNcgmCwu7lIbCYoxUy3zbDNyWFpfjmJrUtLLAhPq+2mDNyN/p//FnxhSmTgvnp2Fh51+eJJKAIkqJnFu/xf93Q==',
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: testUser.user
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
  } catch (error) {
    console.error('Login test error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- FRONTEND SERVING ---
app.use(express.static(path.join(__dirname, '../frontend')));