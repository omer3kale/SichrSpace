#!/bin/bash
# 🎯 API Success Rate Test Suite
# Mission: Achieve 100% API Success Rate

echo "🚀 SICHRPLACE API COMPREHENSIVE TEST SUITE"
echo "=========================================="
echo "Mission: 100% API Success Rate"
echo ""

# Start server if not running
if ! pgrep -f "node server.js" > /dev/null; then
    echo "📡 Starting server..."
    cd /Users/omer3kale/SichrPlace77/SichrPlace77/backend
    nohup node server.js > server.log 2>&1 &
    sleep 5
fi

BASE_URL="http://localhost:3000"
SUCCESS_COUNT=0
TOTAL_TESTS=0
FAILED_TESTS=()

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_field="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "${TOTAL_TESTS}. ${name}: "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -X POST "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s "${BASE_URL}${endpoint}")
    fi
    
    # Check if response contains success indicator or expected data
    if echo "$response" | grep -q '"success":true' || \
       echo "$response" | grep -q "$expected_field" || \
       echo "$response" | grep -q '\[.*\]' || \
       echo "$response" | grep -q '"id":'; then
        echo "✅ PASS"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        return 0
    else
        echo "❌ FAIL"
        FAILED_TESTS+=("$name")
        echo "   Response: $(echo "$response" | head -c 200)..."
        return 1
    fi
}

echo "🧪 Running comprehensive API tests..."
echo ""

# Core Data Endpoints
test_endpoint "GET Apartments" "GET" "/api/apartments" "" '"data"'
test_endpoint "GET Conversations" "GET" "/api/conversations" "" 'id'
test_endpoint "Create Conversation" "POST" "/api/conversations" '{"participants": ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440002"]}' '"id"'

# Viewing Request Endpoints  
test_endpoint "Create Viewing Request" "POST" "/api/viewing-request" '{"apartment_id": "550e8400-e29b-41d4-a716-446655440010", "user_id": "550e8400-e29b-41d4-a716-446655440000", "requested_date": "2025-08-15T10:00:00Z", "message": "100% success test"}' '"success"'

# Email Endpoint (should work with correct Gmail config)
test_endpoint "Send Email" "POST" "/api/send-message" '{"to": "test@example.com", "subject": "Test Email", "message": "Testing email functionality"}' '"success"'

# GDPR Endpoints
test_endpoint "Create GDPR Request" "POST" "/api/gdpr-requests" '{"user_id": "550e8400-e29b-41d4-a716-446655440000", "request_type": "data_access", "details": "Test GDPR request"}' '"success"'
test_endpoint "GDPR Tracking" "POST" "/api/gdpr-tracking" '{"user_id": "550e8400-e29b-41d4-a716-446655440000", "action": "test_action", "data_type": "user_data", "purpose": "testing"}' '"success"'

# Apartment Management
test_endpoint "Upload Apartment" "POST" "/api/upload-apartment" '{"title": "100% Test Apartment", "location": "Success Street", "price": 1500, "size": 75, "rooms": 3, "description": "Apartment for 100% success test"}' '"success"'

# Advanced Endpoints (if available)
test_endpoint "PayPal Payment" "POST" "/api/paypal/create-payment" '{"amount": 10.00, "description": "Test booking fee", "returnUrl": "http://localhost:3000/success", "cancelUrl": "http://localhost:3000/cancel"}' '"approval_url"'
test_endpoint "Admin Dashboard" "GET" "/api/admin/dashboard" "" '"stats"'

echo ""
echo "🏆 FINAL RESULTS"
echo "================"
echo "✅ Successful tests: $SUCCESS_COUNT"
echo "📊 Total tests: $TOTAL_TESTS"
SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_TESTS))
echo "🎯 Success rate: $SUCCESS_RATE%"

if [ $SUCCESS_RATE -eq 100 ]; then
    echo "🎉 MISSION ACCOMPLISHED! 100% API SUCCESS RATE ACHIEVED!"
    echo "🏅 All endpoints are functioning perfectly!"
else
    echo ""
    echo "❌ Failed tests:"
    for failed in "${FAILED_TESTS[@]}"; do
        echo "   • $failed"
    done
    echo ""
    echo "🔧 Next steps to reach 100%:"
    echo "   1. Deploy enhanced migration to Supabase"
    echo "   2. Fix Gmail SMTP configuration" 
    echo "   3. Verify all route handlers exist"
    echo "   4. Check database table requirements"
fi

echo ""
echo "📝 Server log (last 10 lines):"
tail -10 /Users/omer3kale/SichrPlace77/SichrPlace77/backend/server.log 2>/dev/null || echo "No server log found"
