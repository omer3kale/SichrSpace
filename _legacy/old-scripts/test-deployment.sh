#!/bin/bash

# 🚀 SichrPlace Deployment Verification Script
# Test all endpoints after deployment

echo "🔍 Testing SichrPlace Deployment..."
echo "=================================="

BASE_URL=${1:-"https://sichrplace.netlify.app"}

echo "🌐 Testing Base URL: $BASE_URL"
echo ""

# Test 1: Main site
echo "📱 Testing Main Site..."
if curl -f -s "$BASE_URL" > /dev/null; then
    echo "✅ Main site: OK"
else
    echo "❌ Main site: FAILED"
fi

# Test 2: Health endpoint
echo "🏥 Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Health check: OK"
    echo "   Response: $(echo $HEALTH_RESPONSE | jq -r '.status // "no status"' 2>/dev/null || echo "parsing failed")"
else
    echo "❌ Health check: FAILED"
    echo "   Response: $HEALTH_RESPONSE"
fi

# Test 3: PayPal config
echo "💳 Testing PayPal Config..."
PAYPAL_RESPONSE=$(curl -s "$BASE_URL/api/paypal-config")
if echo "$PAYPAL_RESPONSE" | grep -q "clientId"; then
    echo "✅ PayPal config: OK"
    echo "   Environment: $(echo $PAYPAL_RESPONSE | jq -r '.config.environment // "unknown"' 2>/dev/null || echo "parsing failed")"
else
    echo "❌ PayPal config: FAILED"
    echo "   Response: $PAYPAL_RESPONSE"
fi

# Test 4: Viewing request (POST test)
echo "🏠 Testing Viewing Request..."
VIEWING_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"apartmentId":"test","preferredDate":"2025-09-01","message":"Test request"}' \
  "$BASE_URL/api/viewing-request")
if echo "$VIEWING_RESPONSE" | grep -q "success"; then
    echo "✅ Viewing request: OK"
else
    echo "❌ Viewing request: FAILED"
    echo "   Response: $VIEWING_RESPONSE"
fi

# Test 5: Frontend resources
echo "🎨 Testing Frontend Resources..."
if curl -f -s "$BASE_URL/frontend/index.html" > /dev/null; then
    echo "✅ Frontend index: OK"
else
    echo "❌ Frontend index: FAILED"
fi

if curl -f -s "$BASE_URL/frontend/apartments-listing.html" > /dev/null; then
    echo "✅ Apartments page: OK"
else
    echo "❌ Apartments page: FAILED"
fi

# Test 6: PWA manifest
echo "📱 Testing PWA Resources..."
if curl -f -s "$BASE_URL/frontend/manifest.json" > /dev/null; then
    echo "✅ PWA manifest: OK"
else
    echo "❌ PWA manifest: FAILED"
fi

if curl -f -s "$BASE_URL/frontend/service-worker.js" > /dev/null; then
    echo "✅ Service worker: OK"
else
    echo "❌ Service worker: FAILED"
fi

echo ""
echo "🎯 Deployment Test Complete!"
echo "=================================="
echo ""
echo "📝 Next Steps:"
echo "1. ✅ All endpoints tested"
echo "2. 🌐 Set up custom domain: www.sichrplace.com"
echo "3. 📱 Test PWA installation"
echo "4. 💳 Test PayPal payments (sandbox)"
echo "5. 📧 Test email notifications"
echo ""
echo "🎉 Your SichrPlace platform is LIVE!"
