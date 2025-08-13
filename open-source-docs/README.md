# 🏠 SichrPlace - Trusted Apartment Viewing Service

[![CI/CD Pipeline](https://github.com/omer3kale/SichrPlace77/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/omer3kale/SichrPlace77/actions/workflows/ci-cd.yml)
[![Security Audit](https://github.com/omer3kale/SichrPlace77/actions/workflows/security.yml/badge.svg)](https://github.com/omer3kale/SichrPlace77/actions/workflows/security.yml)
[![CodeQL](https://github.com/omer3kale/SichrPlace77/actions/workflows/codeql.yml/badge.svg)](https://github.com/omer3kale/SichrPlace77/actions/workflows/codeql.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-Railway-blue)](https://sichrplace-production.up.railway.app)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

> **Making apartment hunting easier, one viewing at a time** 🏠❤️

SichrPlace is a comprehensive apartment viewing platform that connects apartment seekers with local viewers who can visit properties on their behalf. Perfect for remote apartment hunting, international relocations, or busy professionals.

## ✨ Features

### 🏡 For Apartment Seekers
- **Remote Viewing Service** - Professional apartment viewings via video
- **Detailed Reports** - Comprehensive photo and video documentation
- **Secure Payment** - PayPal integration for safe transactions
- **Email Updates** - Real-time notifications throughout the process
- **GDPR Compliant** - Full privacy protection and data control

### 🏢 For Property Owners
- **Landlord Dashboard** - Manage property listings efficiently
- **Viewer Network** - Access to verified local viewers
- **Secure Platform** - Protected property information
- **Analytics** - Track viewing requests and interest

### 👥 For Local Viewers
- **Flexible Work** - Choose your viewing assignments
- **Secure Platform** - Protected client information
- **Payment Processing** - Automated compensation system
- **Mobile Friendly** - Access assignments on the go

## 🚀 Live Demo

🌐 **[Visit SichrPlace](https://sichrplace-production.up.railway.app)**

### Demo Accounts
- **Tenant**: Use the apartment search to request viewings
- **Landlord**: Add properties and manage listings
- **Admin**: Access comprehensive dashboard

## 🛠️ Technology Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **Supabase** - Backend-as-a-Service with PostgreSQL database
- **JWT** - Authentication and authorization
- **Nodemailer** - Email service integration
- **Multer** - File upload handling

### Frontend
- **HTML5/CSS3** - Modern web standards
- **Vanilla JavaScript** - Client-side functionality
- **Responsive Design** - Mobile-first approach
- **Progressive Enhancement** - Accessibility focused

### Infrastructure
- **Railway** - Cloud deployment platform
- **Supabase** - Database and backend services
- **Gmail SMTP** - Email delivery service
- **PayPal Standard** - Payment processing
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline

### Security & Compliance
- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - DDoS protection
- **Data Encryption** - GDPR compliance
- **Input Validation** - XSS prevention

## 📦 Quick Start

### Prerequisites
- Node.js 18.x or higher
- Supabase account
- Railway account (for deployment)
- Gmail account (for email service)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/omer3kale/SichrPlace77.git
   cd SichrPlace77
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

### Environment Variables

Create a `.env.local` file in the backend directory:

```env
# Database - Configured in backend/.env
# SUPABASE_URL=your-supabase-project-url
# SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRE=7d

# Email Service (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# PayPal Configuration
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=sandbox # or live

# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
```

## 🧪 Testing

### Run Tests
```bash
# Backend unit tests
cd backend
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- Unit Tests: Services, utilities, and models
- Integration Tests: API endpoints
- Security Tests: Authentication and authorization
- Performance Tests: Database queries and API response times

## 🚀 Deployment

### Railway Deployment (Recommended)

1. **Connect to Railway**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy application**
   ```bash
   railway up
   ```

3. **Configure environment variables**
   Set up your production environment variables in Railway dashboard.

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

### Docker Deployment

1. **Build Docker image**
   ```bash
   docker build -t sichrplace .
   ```

2. **Run container**
   ```bash
   docker run -p 5000:5000 --env-file .env sichrplace
   ```

## 📚 API Documentation

### Authentication
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me
```

### Apartment Management
```http
GET    /api/apartments
POST   /api/apartments
GET    /api/apartments/:id
PUT    /api/apartments/:id
DELETE /api/apartments/:id
```

### Viewing Requests
```http
POST /api/viewing-request
GET  /api/viewing-requests
PUT  /api/viewing-requests/:id/status
```

### Email Service
```http
POST /api/emails/request-confirmation
POST /api/emails/viewing-confirmation
POST /api/emails/viewing-results
```

## 🛡️ Security

### Security Features
- **Authentication** - JWT-based user authentication
- **Authorization** - Role-based access control
- **Data Protection** - GDPR compliance and encryption
- **Input Validation** - XSS and injection prevention
- **Rate Limiting** - DDoS protection
- **Secure Headers** - CSRF and clickjacking protection

### Security Reporting
If you discover a security vulnerability, please send an email to sichrplace@gmail.com. All security vulnerabilities will be promptly addressed.

## 🤝 Contributing

We welcome contributions! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting pull requests.

### Development Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for your changes
5. Run the test suite
6. Submit a pull request

### Code of Conduct
Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Railway** - For excellent deployment platform
- **Supabase** - For reliable backend services and database
- **PayPal** - For secure payment processing
- **Gmail** - For email delivery service
- **Open Source Community** - For amazing tools and libraries

## 📞 Support

### Getting Help
- 📧 **Email**: sichrplace@gmail.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/omer3kale/SichrPlace77/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/omer3kale/SichrPlace77/discussions)

### Project Status
- ✅ **Backend API**: Fully functional
- ✅ **Frontend UI**: Responsive design
- ✅ **Email Service**: Gmail integration
- ✅ **Payment System**: PayPal integration
- ✅ **Database**: Supabase PostgreSQL
- ✅ **Deployment**: Railway platform
- 🔄 **Mobile App**: In development
- 🔄 **Analytics**: Planned

---

<div align="center">

**Made with ❤️ by the SichrPlace Team**

[🌐 Live Demo](https://sichrplace-production.up.railway.app) • [📚 Documentation](https://github.com/omer3kale/SichrPlace77/wiki) • [🐛 Report Bug](https://github.com/omer3kale/SichrPlace77/issues/new?template=bug_report.md) • [✨ Request Feature](https://github.com/omer3kale/SichrPlace77/issues/new?template=feature_request.md)

</div>