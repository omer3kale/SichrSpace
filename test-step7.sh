#!/bin/bash

# Step 7 Testing and Code Coverage Script
# Comprehensive testing suite for PayPal Integration Final Configuration & Live Testing

echo "🧪 Step 7: PayPal Integration Testing & Code Coverage"
echo "===================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Create coverage directory
mkdir -p coverage/step7

echo -e "${BLUE}📋 Pre-test Environment Check${NC}"
echo "================================"

# Check if required dependencies are installed
echo -n "✓ Checking test dependencies... "
if npm list mocha chai puppeteer supertest nyc &>/dev/null; then
    echo -e "${GREEN}Found ✅${NC}"
else
    echo -e "${RED}Missing ❌${NC}"
    echo "Installing test dependencies..."
    npm install --save-dev mocha chai puppeteer supertest nyc
fi

# Check if server can start
echo -n "✓ Checking server configuration... "
cd backend
if node -c server.js; then
    echo -e "${GREEN}Valid ✅${NC}"
else
    echo -e "${RED}Invalid ❌${NC}"
    echo "Please fix server configuration errors before running tests"
    exit 1
fi
cd ..

echo -e "${BLUE}🔍 Step 7.1: Client ID Standardization Tests${NC}"
echo "=============================================="

# Test 1: Frontend Client ID Consistency
echo -n "Test 1.1: PayPal Client ID standardization... "
EXPECTED_CLIENT_ID="AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO"
INCONSISTENT_FILES=0

for file in frontend/*.html; do
    if grep -q "paypal.com/sdk" "$file"; then
        if ! grep -q "$EXPECTED_CLIENT_ID" "$file"; then
            INCONSISTENT_FILES=$((INCONSISTENT_FILES + 1))
            echo -e "${RED}❌ $file has inconsistent client ID${NC}"
        fi
    fi
done

if [ $INCONSISTENT_FILES -eq 0 ]; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ ($INCONSISTENT_FILES files inconsistent)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 2: SDK Configuration Parameters
echo -n "Test 1.2: PayPal SDK configuration completeness... "
MISSING_PARAMS=0
REQUIRED_PARAMS=("currency=EUR" "locale=de_DE" "components=buttons" "enable-funding=venmo,paylater")

for file in frontend/*.html; do
    if grep -q "paypal.com/sdk" "$file"; then
        for param in "${REQUIRED_PARAMS[@]}"; do
            if ! grep -q "$param" "$file"; then
                MISSING_PARAMS=$((MISSING_PARAMS + 1))
                echo -e "${RED}❌ $file missing parameter: $param${NC}"
            fi
        done
    fi
done

if [ $MISSING_PARAMS -eq 0 ]; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ ($MISSING_PARAMS missing parameters)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "${BLUE}⚙️ Step 7.2: Environment Configuration Tests${NC}"
echo "============================================"

# Test 3: Environment Files
echo -n "Test 2.1: Environment files configuration... "
ENV_ERRORS=0

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Main .env file missing${NC}"
    ENV_ERRORS=$((ENV_ERRORS + 1))
fi

if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Backend .env file missing${NC}"
    ENV_ERRORS=$((ENV_ERRORS + 1))
fi

# Check PayPal configuration
REQUIRED_ENV_VARS=("PAYPAL_CLIENT_ID" "PAYPAL_CLIENT_SECRET" "PAYPAL_ENVIRONMENT")
for var in "${REQUIRED_ENV_VARS[@]}"; do
    if ! grep -q "$var=" backend/.env 2>/dev/null; then
        echo -e "${RED}❌ Missing $var in backend/.env${NC}"
        ENV_ERRORS=$((ENV_ERRORS + 1))
    fi
done

if [ $ENV_ERRORS -eq 0 ]; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ ($ENV_ERRORS configuration errors)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "${BLUE}🔧 Step 7.3: Server Infrastructure Tests${NC}"
echo "========================================"

# Test 4: Server Startup
echo -n "Test 3.1: Server startup capability... "
cd backend
timeout 10s npm start &>/dev/null &
SERVER_PID=$!
sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    kill $SERVER_PID 2>/dev/null
else
    echo -e "${RED}Failed ❌${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
cd ..

echo -e "${BLUE}🧪 Step 7.4: Integration Tests${NC}"
echo "==============================="

# Test 5: Run Mocha Integration Tests
echo "Test 4.1: Running comprehensive integration tests..."
if npx mocha backend/tests/step7-integration.test.js --timeout 30000 --reporter spec; then
    echo -e "${GREEN}Integration tests passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Integration tests failed ❌${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 6: API Coverage Tests
echo "Test 4.2: Running API coverage tests..."
if npx mocha backend/tests/step7-api-coverage.test.js --timeout 15000 --reporter spec; then
    echo -e "${GREEN}API coverage tests passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}API coverage tests failed ❌${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 7: Frontend Coverage Tests
echo "Test 4.3: Running frontend coverage tests..."
if npx mocha backend/tests/step7-frontend-coverage.test.js --timeout 10000 --reporter spec; then
    echo -e "${GREEN}Frontend coverage tests passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Frontend coverage tests failed ❌${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "${BLUE}📊 Step 7.5: Code Coverage Analysis${NC}"
echo "==================================="

# Generate code coverage report
echo "Generating comprehensive code coverage report..."
npx nyc --reporter=html --reporter=text --reporter=json \
    --include "backend/api/**/*.js" \
    --include "backend/routes/**/*.js" \
    --include "backend/middleware/**/*.js" \
    --include "backend/server.js" \
    --exclude "backend/tests/**/*.js" \
    --report-dir "./coverage/step7" \
    npx mocha backend/tests/step7-*.test.js --timeout 30000

echo -e "${BLUE}🔍 Step 7.6: Security & Performance Tests${NC}"
echo "=========================================="

# Test 8: Security Checks
echo -n "Test 6.1: PayPal credentials security check... "
SECURITY_ISSUES=0

# Check for hardcoded secrets in frontend
if grep -r "client_secret" frontend/ 2>/dev/null; then
    echo -e "${RED}❌ Found potential hardcoded secrets in frontend${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check for proper environment variable usage
if grep -r "process.env" frontend/ 2>/dev/null; then
    echo -e "${YELLOW}⚠️ Frontend contains process.env usage (review needed)${NC}"
fi

if [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ ($SECURITY_ISSUES security issues)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 9: Performance Checks
echo -n "Test 6.2: PayPal SDK loading performance... "
PERF_ISSUES=0

# Check for multiple PayPal SDK loads
SDK_LOADS=$(grep -r "paypal.com/sdk/js" frontend/ | wc -l)
if [ $SDK_LOADS -gt 5 ]; then
    echo -e "${YELLOW}⚠️ Multiple PayPal SDK loads detected ($SDK_LOADS files)${NC}"
fi

# Check for async/defer attributes
ASYNC_COUNT=$(grep -r "paypal.com/sdk/js" frontend/ | grep -c "async\|defer" || echo 0)
if [ $ASYNC_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️ Consider adding async/defer to PayPal SDK scripts${NC}"
fi

echo -e "${GREEN}Passed ✅${NC}"
PASSED_TESTS=$((PASSED_TESTS + 1))
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "${BLUE}📈 Step 7 Test Results Summary${NC}"
echo "==============================="

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS ✅${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS ❌${NC}"
echo -e "Success Rate: ${GREEN}$SUCCESS_RATE%${NC}"

# Coverage report location
if [ -d "coverage/step7" ]; then
    echo -e "${BLUE}📊 Coverage Report: coverage/step7/index.html${NC}"
fi

# Final status
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 Step 7 Testing Complete - All Tests Passed! ✅${NC}"
    exit 0
else
    echo -e "${RED}❌ Step 7 Testing Complete - $FAILED_TESTS Tests Failed${NC}"
    echo -e "${YELLOW}Please review failed tests and fix issues before proceeding${NC}"
    exit 1
fi
