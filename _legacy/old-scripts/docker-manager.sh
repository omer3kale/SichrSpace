#!/bin/bash

# 🚀 SichrPlace CI/CD Management Script
# This script helps manage Docker containers and CI/CD operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_warning "docker-compose not found, trying docker compose..."
        if ! docker compose version >/dev/null 2>&1; then
            print_error "Neither docker-compose nor 'docker compose' is available."
            exit 1
        fi
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    print_success "Dependencies check passed"
}

# Function to start development environment
start_dev() {
    print_status "Starting SichrPlace development environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cat > .env << EOF
# SichrPlace Environment Variables
NODE_ENV=development
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
EOF
        print_warning "Created .env file. Please update with your actual credentials."
    fi
    
    $DOCKER_COMPOSE_CMD up -d
    
    print_success "Development environment started!"
    print_status "Frontend: http://localhost:8080"
    print_status "Backend: http://localhost:3001"
    print_status "Database: localhost:5432"
    print_status "Redis: localhost:6379"
}

# Function to stop development environment
stop_dev() {
    print_status "Stopping SichrPlace development environment..."
    $DOCKER_COMPOSE_CMD down
    print_success "Development environment stopped!"
}

# Function to run tests
run_tests() {
    print_status "Running SichrPlace tests..."
    
    # Run tests with coverage
    $DOCKER_COMPOSE_CMD --profile testing up --build test-runner
    
    # Copy coverage reports
    docker cp sichrplace-tests:/app/backend/coverage ./coverage 2>/dev/null || print_warning "No coverage reports found"
    
    print_success "Tests completed!"
}

# Function to run Google Maps specific tests
run_google_maps_tests() {
    print_status "Running Google Maps integration tests..."
    
    docker run --rm \
        -v "$(pwd)/backend:/app/backend" \
        -e NODE_ENV=test \
        -e GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY:-your-google-maps-api-key-here} \
        --workdir /app/backend \
        node:18-alpine \
        sh -c "npm ci && npm run test:google-maps"
    
    print_success "Google Maps tests completed!"
}

# Function to build production image
build_production() {
    print_status "Building production Docker image..."
    
    docker build \
        --target runner \
        --tag sichrplace:latest \
        --tag sichrplace:$(date +%Y%m%d-%H%M%S) \
        .
    
    print_success "Production image built successfully!"
}

# Function to run security scan
security_scan() {
    print_status "Running security scan..."
    
    cd backend
    
    # Run npm audit
    print_status "Running npm audit..."
    npm audit --audit-level moderate || print_warning "Security vulnerabilities detected"
    
    # Check for outdated packages
    print_status "Checking for outdated packages..."
    npm outdated || true
    
    cd ..
    
    print_success "Security scan completed!"
}

# Function to cleanup Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    $DOCKER_COMPOSE_CMD down --remove-orphans
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove unused networks
    docker network prune -f
    
    print_success "Cleanup completed!"
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        $DOCKER_COMPOSE_CMD logs -f "$service"
    else
        print_status "Showing all logs..."
        $DOCKER_COMPOSE_CMD logs -f
    fi
}

# Function to show status
show_status() {
    print_status "SichrPlace services status:"
    $DOCKER_COMPOSE_CMD ps
    
    print_status "\nDocker images:"
    docker images | grep sichrplace || print_warning "No SichrPlace images found"
    
    print_status "\nDocker volumes:"
    docker volume ls | grep sichrplace || print_warning "No SichrPlace volumes found"
}

# Function to generate CI/CD status
ci_status() {
    print_status "SichrPlace CI/CD Status Report"
    echo "=================================="
    
    # Check if GitHub Actions workflow exists
    if [ -f .github/workflows/ci-cd.yml ]; then
        print_success "✅ GitHub Actions workflow configured"
    else
        print_error "❌ GitHub Actions workflow missing"
    fi
    
    # Check if Docker files exist
    if [ -f Dockerfile ]; then
        print_success "✅ Dockerfile configured"
    else
        print_error "❌ Dockerfile missing"
    fi
    
    if [ -f docker-compose.yml ]; then
        print_success "✅ Docker Compose configured"
    else
        print_error "❌ Docker Compose missing"
    fi
    
    # Check if package.json has CI scripts
    if grep -q "test:ci" backend/package.json; then
        print_success "✅ CI test scripts configured"
    else
        print_warning "⚠️ CI test scripts not found"
    fi
    
    # Check if Google Maps tests exist
    if [ -f backend/tests/step9-2-google-maps-100-coverage.test.js ]; then
        print_success "✅ Google Maps tests (100% coverage) configured"
    else
        print_error "❌ Google Maps tests missing"
    fi
    
    # Check environment files
    if [ -f .env ]; then
        print_success "✅ Environment file exists"
    else
        print_warning "⚠️ Environment file missing"
    fi
    
    echo ""
    print_status "Next steps for full CI/CD setup:"
    echo "1. Configure GitHub repository secrets"
    echo "2. Set up Railway deployment tokens"
    echo "3. Configure Supabase environment variables"
    echo "4. Test deployment pipeline"
}

# Function to deploy to staging
deploy_staging() {
    print_status "Deploying to staging environment..."
    
    # This would typically trigger the staging deployment
    # For now, we'll build and tag the image for staging
    docker build \
        --target runner \
        --tag sichrplace:staging \
        --build-arg NODE_ENV=staging \
        .
    
    print_success "Staging deployment image built!"
    print_status "Push to 'develop' branch to trigger automatic staging deployment"
}

# Function to deploy to production
deploy_production() {
    print_status "Preparing production deployment..."
    
    # Build production image
    docker build \
        --target runner \
        --tag sichrplace:production \
        --build-arg NODE_ENV=production \
        .
    
    print_success "Production deployment image built!"
    print_status "Push to 'main' branch to trigger automatic production deployment"
}

# Main script logic
case "${1:-}" in
    "start"|"dev")
        check_dependencies
        start_dev
        ;;
    "stop")
        check_dependencies
        stop_dev
        ;;
    "test")
        check_dependencies
        run_tests
        ;;
    "test:google-maps")
        check_dependencies
        run_google_maps_tests
        ;;
    "build")
        check_dependencies
        build_production
        ;;
    "security")
        security_scan
        ;;
    "cleanup")
        check_dependencies
        cleanup
        ;;
    "logs")
        check_dependencies
        show_logs "${2:-}"
        ;;
    "status")
        check_dependencies
        show_status
        ;;
    "ci-status")
        ci_status
        ;;
    "deploy:staging")
        check_dependencies
        deploy_staging
        ;;
    "deploy:production")
        check_dependencies
        deploy_production
        ;;
    "help"|"--help"|"-h"|"")
        echo "🚀 SichrPlace CI/CD Management Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start, dev           Start development environment"
        echo "  stop                 Stop development environment"
        echo "  test                 Run all tests with coverage"
        echo "  test:google-maps     Run Google Maps specific tests"
        echo "  build               Build production Docker image"
        echo "  security            Run security audit"
        echo "  cleanup             Clean up Docker resources"
        echo "  logs [service]      Show logs (optionally for specific service)"
        echo "  status              Show services status"
        echo "  ci-status           Show CI/CD configuration status"
        echo "  deploy:staging      Prepare staging deployment"
        echo "  deploy:production   Prepare production deployment"
        echo "  help                Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 start            # Start development environment"
        echo "  $0 test             # Run all tests"
        echo "  $0 logs backend     # Show backend service logs"
        echo "  $0 ci-status        # Check CI/CD setup status"
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Run '$0 help' for usage information"
        exit 1
        ;;
esac
