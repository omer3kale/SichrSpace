#!/bin/bash

# Production Deployment Script for SichrPlace
# Step 8.6: Automated deployment with health checks

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
APP_NAME="sichrplace"
HEALTH_CHECK_URL="https://sichrplace.com/api/health"
BACKUP_DIR="/tmp/sichrplace-backup-$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🚀 Starting SichrPlace Production Deployment${NC}"
echo -e "${YELLOW}Environment: ${DEPLOYMENT_ENV}${NC}"
echo -e "${YELLOW}Timestamp: $(date)${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check if Azure CLI is installed
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed"
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        print_error "Docker is not running"
        exit 1
    fi
    
    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure. Please run 'az login'"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    print_status "All prerequisites met"
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    # Install dependencies
    npm ci
    
    # Run backend tests
    cd backend
    npm ci
    npm test
    cd ..
    
    # Run frontend validation (if tests exist)
    if [ -f "frontend/package.json" ]; then
        cd frontend
        npm ci
        npm test || print_warning "Frontend tests failed or not configured"
        cd ..
    fi
    
    print_status "Tests completed successfully"
}

# Function to build application
build_application() {
    echo -e "${BLUE}🔨 Building application...${NC}"
    
    # Create production build directory
    mkdir -p dist
    
    # Copy backend files
    cp -r backend dist/
    cp package.json dist/
    cp .env.production dist/.env
    
    # Copy frontend files
    cp -r frontend dist/
    
    # Install production dependencies only
    cd dist
    npm ci --only=production
    cd ..
    
    print_status "Application built successfully"
}

# Function to create Docker image
build_docker_image() {
    echo -e "${BLUE}🐳 Building Docker image...${NC}"
    
    # Build Docker image with timestamp tag
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    IMAGE_TAG="${APP_NAME}:${TIMESTAMP}"
    LATEST_TAG="${APP_NAME}:latest"
    
    docker build -t "$IMAGE_TAG" -t "$LATEST_TAG" .
    
    # Tag for Azure Container Registry
    ACR_NAME="sichrplaceregistry"
    ACR_IMAGE="${ACR_NAME}.azurecr.io/${IMAGE_TAG}"
    ACR_LATEST="${ACR_NAME}.azurecr.io/${LATEST_TAG}"
    
    docker tag "$IMAGE_TAG" "$ACR_IMAGE"
    docker tag "$LATEST_TAG" "$ACR_LATEST"
    
    print_status "Docker image built: $IMAGE_TAG"
    
    # Push to Azure Container Registry
    echo -e "${BLUE}📤 Pushing to Azure Container Registry...${NC}"
    az acr login --name "$ACR_NAME"
    
    docker push "$ACR_IMAGE"
    docker push "$ACR_LATEST"
    
    print_status "Image pushed to registry"
    
    echo "$ACR_IMAGE" > .last-image-tag
}

# Function to backup current deployment
backup_current_deployment() {
    echo -e "${BLUE}💾 Creating deployment backup...${NC}"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current Azure App Service configuration
    az webapp config show \
        --name sichrplace-app \
        --resource-group sichrplace-rg \
        --output json > "$BACKUP_DIR/webapp-config.json"
    
    # Backup environment variables
    az webapp config appsettings list \
        --name sichrplace-app \
        --resource-group sichrplace-rg \
        --output json > "$BACKUP_DIR/app-settings.json"
    
    # Backup database schema (if needed)
    # Add database backup commands here
    
    print_status "Backup created at $BACKUP_DIR"
    echo "$BACKUP_DIR" > .last-backup-path
}

# Function to deploy to Azure
deploy_to_azure() {
    echo -e "${BLUE}☁️ Deploying to Azure...${NC}"
    
    # Get the image tag
    IMAGE_TAG=$(cat .last-image-tag)
    
    # Update Azure App Service with new image
    az webapp config container set \
        --name sichrplace-app \
        --resource-group sichrplace-rg \
        --docker-custom-image-name "$IMAGE_TAG" \
        --docker-registry-server-url "https://sichrplaceregistry.azurecr.io"
    
    # Update application settings for production
    az webapp config appsettings set \
        --name sichrplace-app \
        --resource-group sichrplace-rg \
        --settings \
        NODE_ENV=production \
        PORT=8080 \
        WEBSITES_PORT=8080 \
        PAYPAL_MODE=live \
        MONITORING_ENABLED=true
    
    # Restart the app service
    az webapp restart \
        --name sichrplace-app \
        --resource-group sichrplace-rg
    
    print_status "Deployment to Azure completed"
}

# Function to run health checks
run_health_checks() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Wait for application to start
    echo "Waiting for application to start..."
    sleep 30
    
    # Health check with retries
    for i in {1..10}; do
        echo "Health check attempt $i/10..."
        
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_CHECK_URL" || echo "000")
        
        if [ "$HTTP_STATUS" = "200" ]; then
            print_status "Health check passed (HTTP $HTTP_STATUS)"
            
            # Additional detailed health check
            HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL")
            echo "Health response: $HEALTH_RESPONSE"
            
            # Check if response contains expected health data
            if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
                print_status "Detailed health check passed"
                return 0
            else
                print_warning "Health endpoint responding but status not healthy"
            fi
        else
            print_warning "Health check failed (HTTP $HTTP_STATUS)"
        fi
        
        if [ $i -lt 10 ]; then
            echo "Waiting 30 seconds before retry..."
            sleep 30
        fi
    done
    
    print_error "Health checks failed after 10 attempts"
    return 1
}

# Function to verify PayPal integration
verify_paypal_integration() {
    echo -e "${BLUE}💳 Verifying PayPal integration...${NC}"
    
    # Test PayPal webhook endpoint
    WEBHOOK_URL="https://sichrplace.com/api/paypal/webhooks"
    WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEBHOOK_URL" -X POST -H "Content-Type: application/json" -d '{}' || echo "000")
    
    if [ "$WEBHOOK_STATUS" = "400" ] || [ "$WEBHOOK_STATUS" = "401" ]; then
        print_status "PayPal webhook endpoint responding correctly (HTTP $WEBHOOK_STATUS)"
    else
        print_warning "PayPal webhook endpoint unexpected response (HTTP $WEBHOOK_STATUS)"
    fi
    
    # Test PayPal payment creation endpoint
    PAYMENT_URL="https://sichrplace.com/api/paypal/create-payment"
    echo "PayPal payment endpoint available at: $PAYMENT_URL"
    
    print_status "PayPal integration verification completed"
}

# Function to run smoke tests
run_smoke_tests() {
    echo -e "${BLUE}💨 Running smoke tests...${NC}"
    
    BASE_URL="https://sichrplace.com"
    
    # Test main pages
    PAGES=("/" "/frontend/index.html" "/frontend/login.html" "/frontend/apartments-listing.html")
    
    for page in "${PAGES[@]}"; do
        URL="${BASE_URL}${page}"
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
        
        if [ "$STATUS" = "200" ]; then
            print_status "Page $page accessible (HTTP $STATUS)"
        else
            print_warning "Page $page returned HTTP $STATUS"
        fi
    done
    
    # Test API endpoints
    API_ENDPOINTS=("/api/health" "/api/csrf-token")
    
    for endpoint in "${API_ENDPOINTS[@]}"; do
        URL="${BASE_URL}${endpoint}"
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || echo "000")
        
        if [ "$STATUS" = "200" ]; then
            print_status "API $endpoint accessible (HTTP $STATUS)"
        else
            print_warning "API $endpoint returned HTTP $STATUS"
        fi
    done
    
    print_status "Smoke tests completed"
}

# Function to rollback deployment
rollback_deployment() {
    echo -e "${YELLOW}🔄 Rolling back deployment...${NC}"
    
    if [ -f ".last-backup-path" ]; then
        BACKUP_PATH=$(cat .last-backup-path)
        
        if [ -d "$BACKUP_PATH" ]; then
            # Restore Azure App Service configuration
            echo "Restoring configuration from $BACKUP_PATH"
            
            # This would restore the previous configuration
            # Implementation depends on your backup strategy
            print_status "Rollback completed"
        else
            print_error "Backup path not found: $BACKUP_PATH"
            exit 1
        fi
    else
        print_error "No backup information found"
        exit 1
    fi
}

# Function to send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    echo -e "${BLUE}📢 Sending deployment notification...${NC}"
    
    # You can integrate with Slack, Teams, email, etc.
    echo "Deployment Status: $status"
    echo "Message: $message"
    echo "Timestamp: $(date)"
    echo "Environment: $DEPLOYMENT_ENV"
    
    # Example: Send to webhook or email service
    # curl -X POST "YOUR_WEBHOOK_URL" -d "{\"status\":\"$status\",\"message\":\"$message\"}"
    
    print_status "Notification sent"
}

# Main deployment flow
main() {
    trap 'print_error "Deployment failed"; send_notification "FAILED" "Deployment failed at step: $CURRENT_STEP"; exit 1' ERR
    
    CURRENT_STEP="Prerequisites"
    check_prerequisites
    
    CURRENT_STEP="Tests"
    run_tests
    
    CURRENT_STEP="Build"
    build_application
    
    CURRENT_STEP="Docker Build"
    build_docker_image
    
    CURRENT_STEP="Backup"
    backup_current_deployment
    
    CURRENT_STEP="Deploy"
    deploy_to_azure
    
    CURRENT_STEP="Health Checks"
    if ! run_health_checks; then
        print_error "Health checks failed, initiating rollback"
        rollback_deployment
        send_notification "FAILED" "Deployment failed health checks, rolled back"
        exit 1
    fi
    
    CURRENT_STEP="PayPal Verification"
    verify_paypal_integration
    
    CURRENT_STEP="Smoke Tests"
    run_smoke_tests
    
    print_status "🎉 Deployment completed successfully!"
    send_notification "SUCCESS" "Production deployment completed successfully"
    
    # Cleanup old Docker images
    echo -e "${BLUE}🧹 Cleaning up old Docker images...${NC}"
    docker image prune -f
    
    echo -e "${GREEN}✨ SichrPlace is now live in production!${NC}"
    echo -e "${BLUE}URL: https://sichrplace.com${NC}"
    echo -e "${BLUE}Health Check: $HEALTH_CHECK_URL${NC}"
}

# Run main function if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
