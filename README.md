# 🏠 SichrPlace - Secure Property Rental Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-5.0+-green.svg)](https://mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GDPR Compliant](https://img.shields.io/badge/GDPR-Compliant-blue.svg)](https://gdpr.eu/)

> A comprehensive, secure apartment rental platform connecting landlords and applicants with advanced messaging, analytics, and GDPR compliance.

## ✨ Features

### 🏢 **Core Platform**
- **Property Listings**: Advanced apartment search and filtering
- **User Management**: Separate dashboards for landlords and applicants
- **Viewing Requests**: Streamlined appointment scheduling system
- **Admin Dashboard**: Comprehensive platform management tools

### 💬 **Real-time Messaging System**
- **Threaded Conversations**: Organized communication between parties
- **File Attachments**: Share documents, images, and contracts securely
- **Read Receipts**: Message delivery and read status tracking
- **Search Functionality**: Find conversations and messages instantly
- **Mobile-Responsive**: Seamless experience across all devices

### 🛡️ **Privacy & Compliance**
- **GDPR Compliance**: Complete data protection framework
- **Consent Management**: Professional consent collection and tracking
- **Privacy Controls**: User data management and deletion rights
- **Security First**: JWT authentication, rate limiting, and input validation

### 📊 **Analytics & Insights**
- **Microsoft Clarity Integration**: User behavior analytics (Project ID: `smib1d4kq5`)
- **Google Analytics 4**: Comprehensive platform metrics (ID: `G-2FG8XLMM35`)
- **Privacy-First Tracking**: Consent-based analytics activation
- **Custom Events**: Property views, message interactions, user journeys

### 🎨 **Modern UI/UX**
- **Responsive Design**: Mobile-first approach for all devices
- **Professional Branding**: Clean, modern interface design
- **Accessibility**: WCAG compliant with semantic HTML
- **Progressive Enhancement**: Works without JavaScript as fallback

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/omer3kale/SichrPlace77.git
   cd SichrPlace77
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install
   ```

3. **Environment Configuration**
   ```bash
   # Create environment file
   cp .env.example .env
   
   # Configure your environment variables
   MONGODB_URI=mongodb://localhost:27017/sichrplace
   JWT_SECRET=your-jwt-secret-key
   PORT=3001
   ```

4. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Access the platform**
   - Main Platform: `http://localhost:3001`
   - Messaging System: `http://localhost:3001/chat.html`
   - Admin Dashboard: `http://localhost:3001/admin.html`
   - API Documentation: `http://localhost:3001/api-docs`

## 🏗️ Architecture

### **Backend Stack**
- **Runtime**: Node.js with Express.js framework
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt password hashing
- **File Upload**: Multer with validation and security
- **Security**: Helmet, CORS, rate limiting, CSRF protection

### **Frontend Stack**
- **Core**: Modern HTML5, CSS3, JavaScript ES6+
- **Styling**: CSS Grid, Flexbox, CSS Custom Properties
- **Responsive**: Mobile-first design principles
- **Analytics**: Microsoft Clarity + Google Analytics 4

### **Project Structure**
```
SichrPlace77/
├── backend/                 # Server-side application
│   ├── api/                # API endpoints
│   ├── models/             # Database models
│   ├── routes/             # Express routes
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Utility functions
│   └── tests/              # Test suite
├── img/                    # Static images
├── js/                     # Frontend JavaScript
├── *.html                  # Frontend pages
└── README.md              # Documentation
```

## 🔧 Key Components

### **Messaging System**
- **Models**: `Conversation.js`, `Message.js` with threading support
- **API**: Full CRUD operations with file upload capabilities
- **Frontend**: Modern chat interface with real-time indicators
- **Features**: Search, file sharing, read receipts, typing indicators

### **GDPR Compliance**
- **Data Processing Logs**: Complete audit trail
- **Consent Management**: Granular permission tracking
- **User Rights**: Data export, deletion, and modification
- **Breach Notification**: Automated compliance reporting

### **Analytics Integration**
- **Microsoft Clarity**: Heatmaps, session recordings, user insights
- **Google Analytics 4**: Event tracking, conversion analysis
- **Privacy-First**: Consent-based activation and anonymization

## 📱 API Documentation

### **Authentication Endpoints**
```javascript
POST /api/auth/register     # User registration
POST /api/auth/login        # User authentication
GET  /api/auth/me          # Get current user
```

### **Messaging Endpoints**
```javascript
GET  /api/conversations           # List conversations
POST /api/conversations           # Create conversation
GET  /api/conversations/:id       # Get conversation details
POST /api/conversations/:id/messages  # Send message
PUT  /api/messages/:id/read       # Mark message as read
```

### **Property Endpoints**
```javascript
GET  /api/apartments        # List properties
POST /api/apartments        # Create property listing
GET  /api/apartments/:id    # Get property details
```

## 🧪 Testing

```bash
# Run test suite
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

## 🚢 Deployment

### **Docker Deployment**
```bash
# Build Docker image
docker build -t sichrplace .

# Run container
docker run -p 3001:3001 -e MONGODB_URI=your-mongo-uri sichrplace
```

### **Environment Variables**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/sichrplace

# Authentication
JWT_SECRET=your-super-secure-jwt-secret

# Server
PORT=3001
NODE_ENV=production

# Analytics
CLARITY_PROJECT_ID=smib1d4kq5
GA_MEASUREMENT_ID=G-2FG8XLMM35

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🔒 Security Features

- **Authentication**: JWT-based with secure password hashing
- **Input Validation**: Comprehensive sanitization and validation
- **Rate Limiting**: Protection against abuse and DDoS
- **CORS Protection**: Controlled cross-origin resource sharing
- **Helmet Security**: Security headers and XSS protection
- **File Upload Security**: Type validation and size limits

## 📊 Monitoring & Analytics

### **Microsoft Clarity**
- Project ID: `smib1d4kq5`
- Features: Heatmaps, session recordings, user behavior insights
- Privacy: GDPR-compliant with user consent

### **Google Analytics 4**
- Measurement ID: `G-2FG8XLMM35`
- Features: Event tracking, conversion analysis, audience insights
- Configuration: Privacy-first setup with anonymization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Support

- **Issues**: [GitHub Issues](https://github.com/omer3kale/SichrPlace77/issues)
- **Discussions**: [GitHub Discussions](https://github.com/omer3kale/SichrPlace77/discussions)
- **Email**: omer3kale@example.com

## 🏆 Acknowledgments

- **Design**: Modern UI/UX inspired by leading rental platforms
- **Security**: GDPR compliance framework
- **Analytics**: Microsoft Clarity and Google Analytics integration
- **Community**: Open source contributors and feedback

---

<div align="center">
  <strong>Built with ❤️ for secure, modern property rentals</strong>
  <br />
  <a href="https://github.com/omer3kale/SichrPlace77">⭐ Star this repository</a>
</div>
