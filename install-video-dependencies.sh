#!/bin/bash

echo "🎬 Installing SichrPlace Secure Video Management Dependencies..."

# Navigate to backend directory
cd backend || exit

# Install required packages for video handling
echo "📦 Installing multer for file uploads..."
npm install multer

echo "📦 Installing cors for cross-origin requests..."
npm install cors

echo "✅ Installation complete!"

echo ""
echo "🔧 Configuration required:"
echo "1. Set VIDEO_SECRET environment variable for video encryption"
echo "2. Ensure Gmail credentials are configured in .env file"
echo "3. Create secure-videos directory with proper permissions"

echo ""
echo "📁 Directory structure:"
echo "backend/"
echo "├── api/"
echo "│   └── secure-videos.js"
echo "├── secure-videos/ (will be created automatically)"
echo "└── services/"
echo "    └── emailService.js (updated)"
echo ""
echo "frontend/"
echo "├── admin.html (updated with video management)"
echo "└── secure-viewer.html (new secure video player)"
echo ""

echo "🚀 Your secure video management system is ready!"
echo "Admin can now upload videos that are protected against downloading."
echo "Videos are served with secure tokens and expire after 7 days."
