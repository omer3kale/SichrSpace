#!/bin/bash

# Step 7 Simplified Testing Script
# Quick validation of PayPal Integration Final Configuration

echo "🧪 Step 7: PayPal Integration Testing (Simplified)"
echo "================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}🔍 Test 1: Client ID Standardization${NC}"
echo "====================================="

# Check client ID consistency
EXPECTED_CLIENT_ID="AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO"
INCONSISTENT_FILES=0

echo -n "Checking PayPal client ID standardization... "
for file in frontend/*.html; do
    if [ -f "$file" ] && grep -q "paypal.com/sdk" "$file"; then
        if ! grep -q "$EXPECTED_CLIENT_ID" "$file"; then
            INCONSISTENT_FILES=$((INCONSISTENT_FILES + 1))
            echo -e "\n${RED}❌ $file has inconsistent client ID${NC}"
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

echo -e "${BLUE}⚙️ Test 2: Environment Configuration${NC}"
echo "==================================="

echo -n "Checking environment files... "
ENV_ERRORS=0

if [ ! -f ".env" ]; then
    echo -e "\n${RED}❌ Main .env file missing${NC}"
    ENV_ERRORS=$((ENV_ERRORS + 1))
fi

if [ ! -f "backend/.env" ]; then
    echo -e "\n${RED}❌ Backend .env file missing${NC}"
    ENV_ERRORS=$((ENV_ERRORS + 1))
fi

# Check required PayPal variables
if [ -f "backend/.env" ]; then
    if ! grep -q "PAYPAL_CLIENT_ID=" "backend/.env"; then
        echo -e "\n${RED}❌ Missing PAYPAL_CLIENT_ID in backend/.env${NC}"
        ENV_ERRORS=$((ENV_ERRORS + 1))
    fi
    
    if ! grep -q "PAYPAL_CLIENT_SECRET=" "backend/.env"; then
        echo -e "\n${RED}❌ Missing PAYPAL_CLIENT_SECRET in backend/.env${NC}"
        ENV_ERRORS=$((ENV_ERRORS + 1))
    fi
fi

if [ $ENV_ERRORS -eq 0 ]; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ ($ENV_ERRORS configuration errors)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "${BLUE}🔧 Test 3: SDK Configuration${NC}"
echo "============================="

echo -n "Checking PayPal SDK parameters... "
MISSING_PARAMS=0

# Required SDK parameters
REQUIRED_PARAMS=("currency=EUR" "locale=de_DE" "components=buttons")

for file in frontend/*.html; do
    if [ -f "$file" ] && grep -q "paypal.com/sdk" "$file"; then
        for param in "${REQUIRED_PARAMS[@]}"; do
            if ! grep -q "$param" "$file"; then
                MISSING_PARAMS=$((MISSING_PARAMS + 1))
                echo -e "\n${RED}❌ $file missing parameter: $param${NC}"
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

echo -e "${BLUE}📄 Test 4: Frontend Integration${NC}"
echo "==============================="

echo -n "Checking PayPal integration in frontend files... "
INTEGRATION_ISSUES=0

# Check index.html for key PayPal functions
if [ -f "frontend/index.html" ]; then
    REQUIRED_FUNCTIONS=("createOrder" "onApprove" "onError" "onCancel")
    
    for func in "${REQUIRED_FUNCTIONS[@]}"; do
        if ! grep -q "$func" "frontend/index.html"; then
            INTEGRATION_ISSUES=$((INTEGRATION_ISSUES + 1))
            echo -e "\n${RED}❌ Missing function: $func${NC}"
        fi
    done
else
    echo -e "\n${RED}❌ index.html not found${NC}"
    INTEGRATION_ISSUES=$((INTEGRATION_ISSUES + 1))
fi

if [ $INTEGRATION_ISSUES -eq 0 ]; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ ($INTEGRATION_ISSUES integration issues)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo -e "${BLUE}🚀 Test 5: Server Capability${NC}"
echo "============================="

echo -n "Checking server configuration... "
cd backend
if node -c server.js 2>/dev/null; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ (Server configuration invalid)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
cd ..

echo -e "${BLUE}🔐 Test 6: Security Check${NC}"
echo "========================="

echo -n "Checking for security issues... "
SECURITY_ISSUES=0

# Check for hardcoded secrets in frontend
if grep -r "client_secret" frontend/ 2>/dev/null | grep -v ".git"; then
    echo -e "\n${RED}❌ Found potential hardcoded secrets in frontend${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

# Check that sensitive data is in .env files
if [ -f "backend/.env" ] && grep -q "PAYPAL_CLIENT_SECRET=" "backend/.env"; then
    # Good - secrets are in env file
    :
else
    echo -e "\n${RED}❌ PayPal client secret not properly configured${NC}"
    SECURITY_ISSUES=$((SECURITY_ISSUES + 1))
fi

if [ $SECURITY_ISSUES -eq 0 ]; then
    echo -e "${GREEN}Passed ✅${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}Failed ❌ ($SECURITY_ISSUES security issues)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Summary
echo ""
echo -e "${BLUE}📊 Step 7 Test Results${NC}"
echo "======================"

SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS ✅${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS ❌${NC}"
echo -e "Success Rate: ${GREEN}$SUCCESS_RATE%${NC}"

echo ""
echo -e "${BLUE}📋 Test Coverage Summary${NC}"
echo "========================"
echo "✅ Client ID Standardization"
echo "✅ Environment Configuration"  
echo "✅ SDK Parameter Validation"
echo "✅ Frontend Integration Check"
echo "✅ Server Configuration Validation"
echo "✅ Security Assessment"

echo ""
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 Step 7 Testing Complete - All Tests Passed! ✅${NC}"
    echo -e "${GREEN}PayPal Integration is ready for production testing${NC}"
    exit 0
else
    echo -e "${RED}❌ Step 7 Testing Complete - $FAILED_TESTS Tests Failed${NC}"
    echo -e "${YELLOW}Please review failed tests and fix issues before proceeding${NC}"
    echo ""
    echo -e "${BLUE}💡 Quick Fix Guide:${NC}"
    echo "- Client ID issues: Run ./verify-paypal-integration.sh"
    echo "- Environment issues: Check .env files exist and have required variables"
    echo "- SDK issues: Verify PayPal script tags have all required parameters"
    echo "- Integration issues: Check PayPal functions exist in frontend files"
    echo "- Server issues: Check backend/server.js for syntax errors"
    echo "- Security issues: Move sensitive data to .env files"
    exit 1
fi
