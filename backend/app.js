const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Import routes
const messagesRoutes = require('./routes/messages');
const uploadApartmentRoute = require('./api/upload-apartment'); // Adjust path if needed
const adminRoutes = require('./routes/admin');
const feedbackApi = require('./api/feedback');
const auth = require('./middleware/auth');

// Middleware for parsing JSON bodies
app.use(express.json());
app.use(cors());

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlace', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Mount the messages routes under /api
app.use('/api', messagesRoutes);

// Mount the apartment upload route
app.use('/upload-apartment', uploadApartmentRoute);

// --- ADMIN ROUTES ---
app.use('/api/admin', adminRoutes);

// --- FEEDBACK ROUTE ---
app.use('/api/feedback', feedbackApi);

// --- CHECK ADMIN ROUTE ---
app.get('/api/check-admin', auth, (req, res) => {
  res.json({ isAdmin: req.user.role === 'admin' });
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});