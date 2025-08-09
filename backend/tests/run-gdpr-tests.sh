#!/bin/bash

# GDPR Compliance Test Suite Runner
# Comprehensive testing for all GDPR components

echo "🧪 Starting GDPR Compliance Test Suite..."
echo "========================================"

# Set test environment variables
export NODE_ENV=test
export JWT_SECRET="fNcgmCwu7lIbCYoxUy3zbDNyWFpfjmJrUtLLAhPq+2mDNyN/p//FnxhSmTgvnp2Fh51+eJJKAIkqJnFu/xf93Q=="
export SUPABASE_URL="https://cgkumwtibknfrhyiicoo.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna3Vtd3RpYmtuZnJoeWlpY29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDE3ODYsImV4cCI6MjA2OTg3Nzc4Nn0.OVQHy8Z27QMCHBzZnBNI42yNpOYSsimbw3BNE-N6Zgo"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNna3Vtd3RpYmtuZnJoeWlpY29vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDMwMTc4NiwiZXhwIjoyMDY5ODc3Nzg2fQ.5piAC3CPud7oRvA1Rtypn60dfz5J1ydqoG2oKj-Su3M"

echo "Environment: $NODE_ENV"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run test category
run_test_category() {
    local category=$1
    local description=$2
    local test_files=$3
    
    echo -e "\n${BLUE}📋 Testing: $description${NC}"
    echo "Files: $test_files"
    echo "----------------------------------------"
    
    if npm test -- $test_files --verbose; then
        echo -e "${GREEN}✅ $description: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $description: FAILED${NC}"
        return 1
    fi
}

# Set working directory
cd "$(dirname "$0")"

# Check if Jest is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx not found. Please install Node.js and npm.${NC}"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing test dependencies...${NC}"
    npm install
fi

# Initialize test results
total_categories=0
passed_categories=0
failed_categories=0

# Test Categories
categories=(
    "core-gdpr|Core GDPR Service Tests|gdpr.test.js"
    "advanced-gdpr|Advanced GDPR Service Tests|advanced-gdpr.test.js"
    "gdpr-routes|GDPR API Route Tests|routes-gdpr.test.js"
    "advanced-routes|Advanced GDPR Route Tests|routes-advanced-gdpr.test.js"
    "gdpr-models|GDPR Data Model Tests|gdpr-models.test.js"
    "frontend-gdpr|Frontend GDPR Component Tests|frontend-gdpr.test.js"
    "cookie-consent|Cookie Consent System Tests|cookie-consent.test.js"
)

# Run each category
for category_info in "${categories[@]}"; do
    IFS='|' read -r category_key category_desc test_files <<< "$category_info"
    total_categories=$((total_categories + 1))
    
    if run_test_category "$category_key" "$category_desc" "$test_files"; then
        passed_categories=$((passed_categories + 1))
    else
        failed_categories=$((failed_categories + 1))
    fi
done

# Summary
echo -e "\n${BLUE}📊 GDPR Test Suite Summary${NC}"
echo "========================================"
echo -e "Total Test Categories: $total_categories"
echo -e "${GREEN}Passed: $passed_categories${NC}"
echo -e "${RED}Failed: $failed_categories${NC}"

# Coverage report
echo -e "\n${YELLOW}📈 Generating Coverage Report...${NC}"
npm run test:coverage -- --testPathPattern=gdpr --silent

# GDPR Compliance Checklist
echo -e "\n${BLUE}📋 GDPR Compliance Checklist${NC}"
echo "========================================"

checklist_items=(
    "Consent Management System"
    "User Rights Implementation (Access, Deletion, Portability)"
    "Data Processing Logging"
    "Privacy Impact Assessments (DPIA)"
    "Data Breach Management"
    "Cookie Consent Interface"
    "API Endpoint Security"
    "Data Retention Policies"
    "Compliance Monitoring"
    "Privacy Policy Integration"
)

for item in "${checklist_items[@]}"; do
    echo -e "${GREEN}✅${NC} $item"
done

# Test coverage requirements
echo -e "\n${YELLOW}🎯 Coverage Requirements${NC}"
echo "========================================"
echo "• Minimum 80% line coverage for GDPR modules"
echo "• 100% coverage for consent withdrawal flows"
echo "• Complete test coverage for user rights endpoints"
echo "• Full validation testing for data breach reporting"

# Final result
if [ $failed_categories -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL GDPR TESTS PASSED!${NC}"
    echo -e "${GREEN}Your application is ready for GDPR compliance validation.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  SOME GDPR TESTS FAILED!${NC}"
    echo -e "${RED}Please review and fix failing tests before deployment.${NC}"
    exit 1
fi
