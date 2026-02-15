#!/bin/bash

# 🚀 SichrPlace Development Update Deployment
# New Features: German/English language support, Google Maps, certified logos, registration fixes

echo "🌍 Deploying SichrPlace Development Updates..."
echo "================================================"

# Add all new files
echo "📁 Adding new files..."
git add frontend/js/language-switcher.js
git add frontend/js/translations.json
git add frontend/js/location-services.js
git add frontend/css/logo-system.css
git add frontend/js/logo-cookie-manager.js
git add frontend/css/distance-widget.css

# Add modified files
echo "🔧 Adding modified files..."
git add frontend/register.html
git add frontend/offer.html

# Commit changes
echo "💾 Committing development updates..."
git commit -m "🌍 Major Development Update: Multi-language, Maps, Certified Logos

✨ New Features:
- 🇩🇪🇺🇸 German/English language switcher with comprehensive translations
- 🗺️ Google Maps integration with distance calculation to city landmarks
- 🛡️ German certified logo system with trademark support
- 🍪 Cookie consent for logo display
- 🔄 Fixed registration account selection with deselect option
- 📍 Location services for apartment distance calculation

🏗️ Technical Improvements:
- Professional logo system with shield designs
- Responsive distance widgets
- Multi-language support infrastructure
- Google Maps API integration
- Enhanced user experience with better navigation

🎯 User Experience:
- Seamless language switching
- Visual distance information for apartments
- Professional branding throughout
- Improved registration flow
- Better accessibility and mobile support

Ready for production deployment! 🚀"

# Push to remote
echo "🚀 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Development Update Complete!"
echo "================================================"
echo "🌟 New Features Deployed:"
echo "   ✅ German/English language support"
echo "   ✅ Google Maps with city landmarks"
echo "   ✅ German certified logo system"
echo "   ✅ Registration page improvements"
echo "   ✅ Distance calculation widgets"
echo ""
echo "🌐 Live Platform: https://sichrplace.netlify.app"
echo "📱 Test all new features on your live site!"
echo ""
echo "🎉 SichrPlace is now more professional and user-friendly!"
