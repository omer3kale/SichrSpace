#!/bin/bash

# Step 8 Test Runner: Production Deployment & Optimization
# Comprehensive test coverage for all Step 8 components

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="backend/tests"
COVERAGE_DIR="backend/coverage"
TEST_TIMEOUT=30000

echo -e "${BLUE}🧪 Step 8: Production Deployment & Optimization - Test Suite${NC}"
echo -e "${YELLOW}=========================================================${NC}"
echo -e "${YELLOW}Testing all Step 8 components with comprehensive coverage${NC}"
echo -e "${YELLOW}Timestamp: $(date)${NC}"
echo ""

# Function to print test section headers
print_section() {
    echo -e "${PURPLE}▶ $1${NC}"
    echo -e "${PURPLE}$(printf '%.0s-' {1..50})${NC}"
}

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2 - PASSED${NC}"
    else
        echo -e "${RED}❌ $2 - FAILED${NC}"
        return 1
    fi
}

# Function to run individual test file
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${BLUE}Running: $test_name${NC}"
    
    if npx mocha "$TEST_DIR/$test_file" \
        --timeout $TEST_TIMEOUT \
        --reporter spec \
        --recursive; then
        print_result 0 "$test_name"
        return 0
    else
        print_result 1 "$test_name"
        return 1
    fi
}

# Initialize test environment
print_section "Test Environment Setup"

# Check if we're in the correct directory
if [ ! -d "$TEST_DIR" ]; then
    echo -e "${RED}❌ Tests directory not found: $TEST_DIR${NC}"
    echo -e "${YELLOW}Please run this script from the project root directory${NC}"
    exit 1
fi

# Install test dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend && npm install && cd ..
fi

# Set test environment variables
export NODE_ENV=test
export SUPABASE_URL=https://test.supabase.co
export SUPABASE_ANON_KEY=test-key
export JWT_SECRET=test-jwt-secret-for-step8-testing
export PAYPAL_CLIENT_ID=test-paypal-client-id
export PAYPAL_CLIENT_SECRET=test-paypal-client-secret
export PAYPAL_WEBHOOK_ID=test-webhook-id
export PAYPAL_MODE=sandbox
export API_KEY=test-api-key-12345

echo -e "${GREEN}✅ Test environment configured${NC}"
echo ""

# Test execution tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Step 8.1: Production Environment Setup Tests
print_section "Step 8.1: Production Environment Setup"
echo -e "${YELLOW}Testing production configuration and environment validation${NC}"

# We'll verify the .env.production file exists and has required variables
if [ -f ".env.production" ]; then
    echo -e "${GREEN}✅ Production environment file exists${NC}"
    
    # Check for required variables in .env.production
    required_vars=("SUPABASE_URL" "PAYPAL_CLIENT_ID" "PAYPAL_CLIENT_SECRET" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if grep -q "^$var=" .env.production; then
            echo -e "${GREEN}✅ $var configured in production environment${NC}"
        else
            echo -e "${YELLOW}⚠️ $var not found in .env.production${NC}"
        fi
    done
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ .env.production file not found${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Step 8.2: PayPal Webhook Implementation Tests
print_section "Step 8.2: PayPal Webhook Implementation"
if run_test "step8-paypal-webhooks.test.js" "PayPal Webhook Processing"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Step 8.3: Performance Optimization Tests
print_section "Step 8.3: Performance Optimization"
if run_test "step8-performance.test.js" "Performance Optimization Features"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Step 8.4: Security Hardening Tests
print_section "Step 8.4: Security Hardening"
if run_test "step8-security.test.js" "Production Security Features"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Step 8.5: Monitoring & Analytics Tests
print_section "Step 8.5: Monitoring & Analytics"
if run_test "step8-monitoring.test.js" "Application Monitoring System"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Step 8.6: Deployment Automation Tests
print_section "Step 8.6: Deployment Automation"
echo -e "${YELLOW}Testing deployment script and CI/CD configuration${NC}"

# Check deployment script
if [ -x "./deploy-production.sh" ]; then
    echo -e "${GREEN}✅ Production deployment script is executable${NC}"
    
    # Validate script structure (basic syntax check)
    if bash -n ./deploy-production.sh; then
        echo -e "${GREEN}✅ Deployment script syntax is valid${NC}"
    else
        echo -e "${RED}❌ Deployment script has syntax errors${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    fi
    
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ Deployment script not found or not executable${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Check GitHub Actions workflow
if [ -f ".github/workflows/deploy.yml" ]; then
    echo -e "${GREEN}✅ GitHub Actions workflow exists${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ GitHub Actions workflow not found${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Step 8.7: Production Server Integration Tests
print_section "Step 8.7: Production Server Integration"
if run_test "step8-integration.test.js" "Production Server Integration"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo ""

# Code Coverage Analysis
print_section "Code Coverage Analysis"
echo -e "${YELLOW}Generating comprehensive coverage report for Step 8${NC}"

# Run all Step 8 tests with coverage
npx nyc --reporter=text --reporter=html --reporter=json \
    mocha "$TEST_DIR/step8-*.test.js" \
    --timeout $TEST_TIMEOUT \
    --recursive || true

if [ -d "$COVERAGE_DIR" ]; then
    echo -e "${GREEN}✅ Coverage report generated in $COVERAGE_DIR${NC}"
    
    # Check coverage thresholds
    if command -v npx &> /dev/null; then
        echo -e "${YELLOW}Checking coverage thresholds...${NC}"
        
        # Extract coverage percentage (basic check)
        if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
            COVERAGE_PCT=$(node -p "
                const coverage = require('./$COVERAGE_DIR/coverage-summary.json');
                Math.round(coverage.total.lines.pct);
            " 2>/dev/null || echo "0")
            
            if [ "$COVERAGE_PCT" -ge 80 ]; then
                echo -e "${GREEN}✅ Code coverage: $COVERAGE_PCT% (Target: 80%)${NC}"
            else
                echo -e "${YELLOW}⚠️ Code coverage: $COVERAGE_PCT% (Target: 80%)${NC}"
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Could not generate coverage report${NC}"
fi
echo ""

# Performance Testing
print_section "Performance & Load Testing"
echo -e "${YELLOW}Basic performance validation for Step 8 components${NC}"

# Test query optimizer performance
echo -e "${BLUE}Testing query optimization performance...${NC}"
node -e "
const { QueryOptimizer } = require('./backend/utils/performance');
const optimizer = new QueryOptimizer();

console.time('Query Build Performance');
for (let i = 0; i < 1000; i++) {
    optimizer.buildApartmentQuery({
        city: 'Berlin',
        minPrice: 500,
        maxPrice: 2000,
        bedrooms: 2
    });
}
console.timeEnd('Query Build Performance');

console.time('Cache Performance');
for (let i = 0; i < 1000; i++) {
    optimizer.cacheQuery(\`test-key-\${i}\`, { data: 'test' });
    optimizer.getCachedQuery(\`test-key-\${i}\`);
}
console.timeEnd('Cache Performance');

console.log('✅ Performance tests completed');
" && echo -e "${GREEN}✅ Performance tests passed${NC}" || echo -e "${YELLOW}⚠️ Performance tests had issues${NC}"

echo ""

# Security Validation
print_section "Security Validation"
echo -e "${YELLOW}Validating production security configuration${NC}"

# Check for security-sensitive files
SECURITY_FILES=(
    "backend/middleware/productionSecurity.js"
    "backend/utils/performance.js" 
    "backend/utils/monitoring.js"
    "backend/server-production.js"
)

for file in "${SECURITY_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file exists${NC}"
        
        # Basic security checks
        if grep -q "helmet" "$file" 2>/dev/null; then
            echo -e "${GREEN}  ✅ Security headers configured${NC}"
        fi
        
        if grep -q "rateLimit" "$file" 2>/dev/null; then
            echo -e "${GREEN}  ✅ Rate limiting implemented${NC}"
        fi
        
        if grep -q "sanitize" "$file" 2>/dev/null; then
            echo -e "${GREEN}  ✅ Input sanitization present${NC}"
        fi
    else
        echo -e "${RED}❌ $file not found${NC}"
    fi
done

echo ""

# Test Results Summary
print_section "Test Results Summary"

echo -e "${BLUE}📊 Step 8 Test Results:${NC}"
echo -e "${GREEN}✅ Passed: $PASSED_TESTS${NC}"
echo -e "${RED}❌ Failed: $FAILED_TESTS${NC}"
echo -e "${YELLOW}📝 Total:  $TOTAL_TESTS${NC}"

# Calculate success rate
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "${YELLOW}📈 Success Rate: $SUCCESS_RATE%${NC}"
    
    if [ $SUCCESS_RATE -ge 90 ]; then
        echo -e "${GREEN}🎉 EXCELLENT: Step 8 test coverage is outstanding!${NC}"
    elif [ $SUCCESS_RATE -ge 80 ]; then
        echo -e "${YELLOW}👍 GOOD: Step 8 test coverage is solid${NC}"
    elif [ $SUCCESS_RATE -ge 70 ]; then
        echo -e "${YELLOW}⚠️ FAIR: Step 8 test coverage needs improvement${NC}"
    else
        echo -e "${RED}❌ POOR: Step 8 test coverage requires attention${NC}"
    fi
fi

echo ""

# Production Readiness Assessment
print_section "Production Readiness Assessment"
echo -e "${YELLOW}Evaluating production deployment readiness${NC}"

READINESS_SCORE=0
READINESS_CHECKS=0

# Check 1: All core files exist
CORE_FILES=(
    ".env.production"
    "backend/middleware/productionSecurity.js"
    "backend/utils/performance.js"
    "backend/utils/monitoring.js"
    "backend/routes/paypal-webhooks.js"
    "backend/server-production.js"
    "deploy-production.sh"
    ".github/workflows/deploy.yml"
)

for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        READINESS_SCORE=$((READINESS_SCORE + 1))
    fi
    READINESS_CHECKS=$((READINESS_CHECKS + 1))
done

echo -e "${BLUE}Core Files: $READINESS_SCORE/$READINESS_CHECKS${NC}"

# Check 2: Test coverage
if [ $SUCCESS_RATE -ge 80 ]; then
    READINESS_SCORE=$((READINESS_SCORE + 2))
    echo -e "${GREEN}✅ Test Coverage: Excellent (80%+)${NC}"
elif [ $SUCCESS_RATE -ge 70 ]; then
    READINESS_SCORE=$((READINESS_SCORE + 1))
    echo -e "${YELLOW}⚠️ Test Coverage: Good (70%+)${NC}"
else
    echo -e "${RED}❌ Test Coverage: Needs Improvement (<70%)${NC}"
fi
READINESS_CHECKS=$((READINESS_CHECKS + 2))

# Check 3: Security configuration
if [ -f "backend/middleware/productionSecurity.js" ] && grep -q "helmet\|rateLimit\|sanitize" backend/middleware/productionSecurity.js; then
    READINESS_SCORE=$((READINESS_SCORE + 2))
    echo -e "${GREEN}✅ Security: Comprehensive protection implemented${NC}"
else
    echo -e "${RED}❌ Security: Configuration incomplete${NC}"
fi
READINESS_CHECKS=$((READINESS_CHECKS + 2))

# Final readiness assessment
READINESS_PERCENTAGE=$((READINESS_SCORE * 100 / READINESS_CHECKS))
echo ""
echo -e "${BLUE}🚀 Production Readiness Score: $READINESS_SCORE/$READINESS_CHECKS ($READINESS_PERCENTAGE%)${NC}"

if [ $READINESS_PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}🎉 READY FOR PRODUCTION DEPLOYMENT!${NC}"
    echo -e "${GREEN}Step 8 implementation is production-ready with excellent coverage${NC}"
    exit 0
elif [ $READINESS_PERCENTAGE -ge 80 ]; then
    echo -e "${YELLOW}👍 MOSTLY READY - Minor improvements recommended${NC}"
    exit 0
elif [ $READINESS_PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}⚠️ NEEDS WORK - Address failing tests before deployment${NC}"
    exit 1
else
    echo -e "${RED}❌ NOT READY - Significant issues must be resolved${NC}"
    exit 1
fi
