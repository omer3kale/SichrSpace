@echo off
REM SichrPlace Development Setup Script for Windows
REM This script sets up the development environment for testing

echo 🚀 SichrPlace Development Setup
echo ================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

echo ✅ Node.js is installed
node --version

REM Install dependencies
echo 📦 Installing dependencies...
npm install

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    (
        echo # Database
        echo MONGODB_URI=mongodb://localhost:27017/sichrplace
        echo.
        echo # JWT Secret ^(change this in production!^)
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo.
        echo # Server Configuration
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # Email Configuration ^(optional - for notifications^)
        echo EMAIL_HOST=smtp.gmail.com
        echo EMAIL_PORT=587
        echo EMAIL_USER=sichrplace@gmail.com
        echo EMAIL_PASS=your-app-password
        echo.
        echo # File Upload Configuration
        echo MAX_FILE_SIZE=5242880
        echo MAX_FILES=10
        echo.
        echo # Security
        echo BCRYPT_ROUNDS=12
        echo.
        echo # Rate Limiting
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
    ) > .env
    echo ✅ .env file created with default values
    echo ⚠️  Please update the .env file with your actual configuration
) else (
    echo ✅ .env file already exists
)

REM Create uploads directory
if not exist uploads\apartments mkdir uploads\apartments
if not exist uploads\profiles mkdir uploads\profiles
echo ✅ Upload directories created

REM Seed demo data
echo 🌱 Seeding demo data...
npm run seed

echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo 📋 Next Steps:
echo 1. Update .env file with your MongoDB connection string
echo 2. Start the development server: npm run dev
echo 3. Open your browser to: http://localhost:3000
echo 4. Use the testing dashboard: http://localhost:3000/testing-dashboard.html
echo.
echo 🔑 Demo Login Credentials:
echo Landlord: sichrplace+emma@gmail.com / Demo123!
echo Tenant:   sichrplace+sarah@gmail.com / Demo123!
echo.
echo 🧪 Available Scripts:
echo npm run dev      - Start development server with auto-reload
echo npm start        - Start production server
echo npm test         - Run test suite
echo npm run seed     - Seed demo data
echo.
echo Happy coding! 🚀
pause
