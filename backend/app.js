const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Import routes
const messagesRoutes = require('./routes/messages');
const uploadApartmentRoute = require('./api/upload-apartment'); // Adjust path if needed
const adminRoutes = require('./routes/admin');
const feedbackApi = require('./api/feedback');
const secureVideosApi = require('./api/secure-videos');
const auth = require('./middleware/auth');

// Middleware for parsing JSON bodies
app.use(express.json());
app.use(cors());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Start server first, then connect to MongoDB (non-blocking)
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📹 Secure Video Management System Ready!');
});

// MongoDB connection (non-blocking, runs in background)
const connectMongoDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlace', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 10000, // 10 second timeout
    });
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Server will continue running without database functionality');
    console.log('💡 Please check your MongoDB connection string in .env file');
  }
};

// Connect to MongoDB in background
connectMongoDB();

// Mount the messages routes under /api
app.use('/api', messagesRoutes);

// Mount the apartment upload route
app.use('/upload-apartment', uploadApartmentRoute);

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