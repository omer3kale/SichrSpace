#!/bin/bash

# SichrPlace PayPal Integration Verification Script
# This script verifies that PayPal integration is properly configured and working

echo "🚀 SichrPlace PayPal Integration Verification"
echo "============================================="

# Check if required files exist
echo -n "✓ Checking environment files... "
if [ -f ".env" ] && [ -f "backend/.env" ]; then
    echo "Found ✅"
else
    echo "Missing ❌"
    echo "Please ensure both .env and backend/.env files exist"
    exit 1
fi

# Check PayPal client ID consistency
echo -n "✓ Checking PayPal client ID consistency... "
MAIN_ENV_CLIENT_ID=$(grep "PAYPAL_CLIENT_ID=" .env | cut -d'=' -f2)
BACKEND_ENV_CLIENT_ID=$(grep "PAYPAL_CLIENT_ID=" backend/.env | cut -d'=' -f2)

if [ "$MAIN_ENV_CLIENT_ID" = "$BACKEND_ENV_CLIENT_ID" ]; then
    echo "Consistent ✅"
    echo "  Client ID: $MAIN_ENV_CLIENT_ID"
else
    echo "Inconsistent ❌"
    echo "  Main .env: $MAIN_ENV_CLIENT_ID"
    echo "  Backend .env: $BACKEND_ENV_CLIENT_ID"
fi

# Check frontend file consistency
echo -n "✓ Checking frontend PayPal SDK consistency... "
FRONTEND_INCONSISTENCIES=$(grep -r "client-id=" frontend/ | grep -v "AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO" | wc -l)

if [ "$FRONTEND_INCONSISTENCIES" -eq 0 ]; then
    echo "All consistent ✅"
else
    echo "Found $FRONTEND_INCONSISTENCIES inconsistencies ❌"
    echo "Files with different client IDs:"
    grep -r "client-id=" frontend/ | grep -v "AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO"
fi

# Check if Node.js dependencies are installed
echo -n "✓ Checking Node.js dependencies... "
if [ -d "node_modules" ] && [ -d "backend/node_modules" ]; then
    echo "Installed ✅"
else
    echo "Missing ❌"
    echo "Run: npm install && cd backend && npm install"
fi

# Test server startup (dry run)
echo -n "✓ Testing server configuration... "
cd backend
node -c server.js
if [ $? -eq 0 ]; then
    echo "Configuration valid ✅"
else
    echo "Configuration errors found ❌"
    echo "Check backend/server.js for syntax errors"
fi
cd ..

echo ""
echo "📋 PayPal Integration Status Summary:"
echo "======================================"
echo "Frontend files with PayPal integration:"
grep -l "paypal.com/sdk" frontend/*.html | while read file; do
    echo "  📄 $file"
done

echo ""
echo "Backend PayPal endpoints:"
echo "  🔗 POST /api/paypal/create-payment"
echo "  🔗 POST /api/paypal/capture-payment"
echo "  🔗 POST /api/paypal/webhooks"

echo ""
echo "🎯 Next Steps:"
echo "1. Start the backend server: cd backend && npm start"
echo "2. Open frontend: http://localhost:3000"
echo "3. Test PayPal payment flow on viewing requests"
echo "4. Verify webhook delivery in PayPal dashboard"

echo ""
echo "🔧 Troubleshooting:"
echo "- For 'Cannot read property' errors: Check .env file exists and has correct format"
echo "- For PayPal sandbox errors: Verify sandbox credentials in backend/.env"
echo "- For production testing: Update PAYPAL_ENVIRONMENT to 'production' in backend/.env"
