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
vercel env add SUPABASE_URL production <<< "YOUR_SUPABASE_URL"
vercel env add SUPABASE_ANON_KEY production <<< "YOUR_SUPABASE_ANON_KEY"

# PayPal Sandbox for testing
vercel env add PAYPAL_CLIENT_ID production <<< "YOUR_PAYPAL_CLIENT_ID"
vercel env add PAYPAL_CLIENT_SECRET production <<< "YOUR_PAYPAL_CLIENT_SECRET"
vercel env add PAYPAL_ENVIRONMENT production <<< "sandbox"

# Email configuration
vercel env add GMAIL_USER production <<< "YOUR_GMAIL_USER"
vercel env add GMAIL_APP_PASSWORD production <<< "YOUR_GMAIL_APP_PASSWORD"

# Security keys
vercel env add JWT_SECRET production <<< "YOUR_JWT_SECRET"
vercel env add SESSION_SECRET production <<< "YOUR_SESSION_SECRET"

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
