#!/bin/bash
# 🎯 MISSION: 100% API SUCCESS RATE TEST
echo "🚀 STARTING 100% API SUCCESS MISSION..."
echo "====================================="

# Start server
echo "📡 Starting server..."
cd /Users/omer3kale/SichrPlace77/SichrPlace77/backend
node server.js &
SERVER_PID=$!
echo "Server started with PID: $SERVER_PID"

# Wait for server to start
echo "⏳ Waiting for server to be ready..."
sleep 8

# Test endpoints
echo ""
echo "🧪 TESTING API ENDPOINTS:"
echo "========================"

# Test 1: Get apartments
echo "1. Testing GET /api/apartments..."
RESPONSE1=$(curl -s -w "%{http_code}" -o /tmp/resp1 http://localhost:3000/api/apartments)
if [[ "$RESPONSE1" == "200" ]]; then
    echo "   ✅ PASS - Status: $RESPONSE1"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "   ❌ FAIL - Status: $RESPONSE1"
    echo "   Response: $(cat /tmp/resp1 | head -c 100)"
fi

# Test 2: Get conversations  
echo "2. Testing GET /api/conversations..."
RESPONSE2=$(curl -s -w "%{http_code}" -o /tmp/resp2 http://localhost:3000/api/conversations)
if [[ "$RESPONSE2" == "200" ]]; then
    echo "   ✅ PASS - Status: $RESPONSE2"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "   ❌ FAIL - Status: $RESPONSE2"
    echo "   Response: $(cat /tmp/resp2 | head -c 100)"
fi

# Test 3: Health check
echo "3. Testing GET /api/health..."
RESPONSE3=$(curl -s -w "%{http_code}" -o /tmp/resp3 http://localhost:3000/api/health)
if [[ "$RESPONSE3" == "200" ]]; then
    echo "   ✅ PASS - Status: $RESPONSE3"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "   ❌ FAIL - Status: $RESPONSE3"
    echo "   Response: $(cat /tmp/resp3 | head -c 100)"
fi

# Test 4: CSRF Token
echo "4. Testing GET /api/csrf-token..."
RESPONSE4=$(curl -s -w "%{http_code}" -o /tmp/resp4 http://localhost:3000/api/csrf-token)
if [[ "$RESPONSE4" == "200" ]]; then
    echo "   ✅ PASS - Status: $RESPONSE4"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "   ❌ FAIL - Status: $RESPONSE4"
    echo "   Response: $(cat /tmp/resp4 | head -c 100)"
fi

# Test 5: Send Message Endpoint
echo "5. Testing POST /api/send-message..."
RESPONSE5=$(curl -s -w "%{http_code}" -o /tmp/resp5 -X POST http://localhost:3000/api/send-message \
    -H "Content-Type: application/json" \
    -d '{"to":"test@example.com","subject":"100% Test","message":"Testing API"}')
if [[ "$RESPONSE5" == "200" ]]; then
    echo "   ✅ PASS - Status: $RESPONSE5"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "   ❌ FAIL - Status: $RESPONSE5"
    echo "   Response: $(cat /tmp/resp5 | head -c 100)"
fi

TOTAL_TESTS=5
SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_TESTS))

echo ""
echo "🏆 FINAL RESULTS"
echo "================"
echo "✅ Successful tests: $SUCCESS_COUNT"
echo "📊 Total tests: $TOTAL_TESTS"
echo "🎯 Success rate: $SUCCESS_RATE%"

if [[ $SUCCESS_RATE -eq 100 ]]; then
    echo ""
    echo "🎉 MISSION ACCOMPLISHED! 100% API SUCCESS RATE ACHIEVED!"
else
    echo ""
    echo "🔧 Need to reach 100% - Current issues to fix:"
    echo "   • Deploy enhanced migration to Supabase"
    echo "   • Verify all route handlers are working"
    echo "   • Check database connectivity"
fi

# Stop server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID
echo "Server stopped."
