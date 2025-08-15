#!/bin/bash

# 🚀 SichrPlace Live Test Deployment Script

echo "🏠 SichrPlace Live Testing Deployment"
echo "=====================================+"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Navigate to project directory
cd /Users/omer3kale/SichrPlace77/SichrPlace77

echo "🔧 Setting up environment variables..."

# Set environment variables for testing
vercel env add SUPABASE_URL production <<< "https://mmtccvrrtraaknzmkgtu.supabase.co"
vercel env add SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdGNjdnJydHJhYWtuem1rZ3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA5NzUzOTAsImV4cCI6MjA0NjU1MTM5MH0.8_mCKSoql3O9n4-6o5LQnDhZKFQYAkdHpJWKWODOsJs"

# PayPal Sandbox for testing
vercel env add PAYPAL_CLIENT_ID production <<< "AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO"
vercel env add PAYPAL_CLIENT_SECRET production <<< "EGO3ecmQdi4dAyrgahy9TgLVqR2vY6WBABARb7YgcmSn_nB7H9Sp6sEE-BAabWFcgbekfz_ForB19uCs"
vercel env add PAYPAL_ENVIRONMENT production <<< "sandbox"

# Email configuration
vercel env add GMAIL_USER production <<< "omer3kale@gmail.com"
vercel env add GMAIL_APP_PASSWORD production <<< "zbfm wjip dmzq nvcb"

# Security keys
vercel env add JWT_SECRET production <<< "your-super-secret-jwt-key-2024-sichrplace"
vercel env add SESSION_SECRET production <<< "your-session-secret-2024-sichrplace"

# Application settings
vercel env add NODE_ENV production <<< "production"

echo "🚀 Deploying to Vercel..."

# Deploy to production
vercel --prod --confirm

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🎯 Your live test URLs:"
echo "📱 Main Site: Check the URL provided above"
echo "🔗 API Health: [YOUR_URL]/api/health"
echo "💳 PayPal Config: [YOUR_URL]/api/paypal-config"
echo ""
echo "🧪 Test these features:"
echo "   • User registration"
echo "   • Apartment search"
echo "   • Viewing requests"
echo "   • PayPal payments (sandbox)"
echo "   • Email notifications"
echo ""
echo "🎉 Happy testing!"
