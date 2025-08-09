#!/bin/bash

# SichrPlace Development Setup Script
# This script sets up the development environment for testing

echo "🚀 SichrPlace Development Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then 
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Check if Supabase configuration is available
echo "📊 Database: Using Supabase PostgreSQL (no MongoDB required)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Database - Supabase PostgreSQL (configure in backend/.env)
# No MongoDB needed - using Supabase

# JWT Secret (change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (optional - for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=sichrplace@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=5242880
MAX_FILES=10

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
EOL
    echo "✅ .env file created with default values"
    echo "⚠️  Please update the .env file with your actual configuration"
else
    echo "✅ .env file already exists"
fi

# Create uploads directory
mkdir -p uploads/apartments
mkdir -p uploads/profiles
echo "✅ Upload directories created"

# Seed demo data
echo "🌱 Seeding demo data..."
npm run seed

if [ $? -eq 0 ]; then
    echo "✅ Demo data seeded successfully"
else
    echo "⚠️  Failed to seed demo data (this is normal if Supabase is not configured)"
fi

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "📋 Next Steps:"
echo "1. Configure backend/.env with your Supabase credentials"
echo "2. Start the development server: npm run dev"
echo "3. Open your browser to: http://localhost:3000"
echo "4. Use the testing dashboard: http://localhost:3000/testing-dashboard.html"
echo ""
echo "🔑 Demo Login Credentials:"
echo "Landlord: sichrplace+emma@gmail.com / Demo123!"
echo "Tenant:   sichrplace+sarah@gmail.com / Demo123!"
echo ""
echo "🧪 Available Scripts:"
echo "npm run dev      - Start development server with auto-reload"
echo "npm start        - Start production server"
echo "npm test         - Run test suite"
echo "npm run seed     - Seed demo data"
echo ""
echo "Happy coding! 🚀"
