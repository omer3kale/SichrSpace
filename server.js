const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const lusca = require('lusca'); // switched from csurf to lusca for CSRF protection
const cookieParser = require('cookie-parser');
const session = require('express-session'); // required for lusca CSRF
const morgan = require('morgan');
require('dotenv').config();


// Import your admin routes and models
const sendMessageRoute = require('./api/send-message');
const viewingRequestRoute = require('./api/viewing-request');
const viewingConfirmedRoute = require('./api/viewing-confirmed');
const viewingReadyRoute = require('./api/viewing-ready');
const viewingDidntWorkOutRoute = require('./api/viewing-didnt-work-out');
const uploadApartmentRoute = require('./api/upload-apartment');
const adminRoutes = require('./routes/admin');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const gdprRoutes = require('./routes/gdpr');
const gdprTrackingRoutes = require('./routes/gdpr-tracking');
const advancedGdprRoutes = require('./routes/advancedGdpr');
const errorHandler = require('./middleware/errorHandler');
const messagesRoutes = require('./routes/messages');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

const app = express();
const PORT = process.env.PORT || 3001; // Hardcoded port

// --- LOGGING MIDDLEWARE ---
app.use(morgan('combined'));

// --- SECURITY MIDDLEWARE ---
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// --- CORS CONFIGURATION ---
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://your-frontend-domain.com']
  : ['http://localhost:3001'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- COOKIE PARSER (required for session/lusca) ---
app.use(cookieParser());

// --- SESSION (required for lusca CSRF) ---
app.use(session({
  secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_here',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if using HTTPS
}));

// --- LUSCA CSRF PROTECTION (replaces csurf) ---
if (process.env.ENABLE_CSRF === 'true') {
  app.use(lusca.csrf());
  // Use the external csrf-token route module
  const csrfTokenRoute = require('./api/csrf-token');
  app.use('/api/csrf-token', csrfTokenRoute);
}

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/SichrPlace', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

// BookingRequest Schema and Model (legacy, keep if used)
const bookingRequestSchema = new mongoose.Schema({
  apartmentId: { type: String, required: true },
  move_in: String,
  move_out: String,
  tenant_names: String,
  reason: String,
  habits: String,
  payer: String,
  profile_link: String,
  createdAt: { type: Date, default: Date.now }
});
const BookingRequest = mongoose.model('BookingRequest', bookingRequestSchema);

// API to create a booking request
app.post('/api/booking-request', async (req, res) => {
  try {
    const booking = new BookingRequest(req.body);
    await booking.save();
    res.json({ success: true, booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// API to get all booking requests for an apartment
app.get('/api/booking-requests/:apartmentId', async (req, res) => {
  try {
    const requests = await BookingRequest.find({ apartmentId: req.params.apartmentId });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Existing routes
app.use('/api/send-message', sendMessageRoute);
app.use('/api/viewing-request', viewingRequestRoute);
app.use('/api/viewing-confirmed', viewingConfirmedRoute);
app.use('/api/viewing-ready', viewingReadyRoute);
app.use('/api/viewing-didnt-work-out', viewingDidntWorkOutRoute);
app.use('/upload-apartment', uploadApartmentRoute);
app.use('/api/auth', authRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/gdpr', gdprTrackingRoutes);

// --- ADMIN ROUTES ---
app.use('/api/admin', adminRoutes);

// --- ADVANCED GDPR ROUTES ---
app.use('/api/admin/advanced-gdpr', advancedGdprRoutes);

// --- MESSAGES ROUTES ---
app.use('/api', messagesRoutes);

// --- CHECK ADMIN ROUTE ---
app.get('/api/check-admin', auth, (req, res) => {
  res.json({ isAdmin: req.user.role === 'admin' });
});

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- SWAGGER DOCUMENTATION ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- ERROR HANDLER (should be last) ---
app.use(errorHandler);

// Start the server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;