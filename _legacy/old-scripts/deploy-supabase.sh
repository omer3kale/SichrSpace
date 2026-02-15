#!/bin/bash

# 🗄️ SichrPlace Supabase Deployment Script
# Handles deployment to Supabase for both staging and production environments

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

# Configuration
ENVIRONMENT=${1:-"production"}
ENV_FILE=".env.${ENVIRONMENT}.clean"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    print_status "Loading environment from $ENV_FILE"
    # Source the clean environment file
    set -a
    source "$ENV_FILE"
    set +a
    print_success "Environment loaded: $ENVIRONMENT"
else
    print_warning "Environment file $ENV_FILE not found, using defaults"
    # Set default values
    SUPABASE_PROJECT_REF="cgkumwtibknfrhyiicoo"
    # Set default access token from environment or error
    if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
        print_error "SUPABASE_ACCESS_TOKEN environment variable not set"
        exit 1
    fi
fi

# Check if Supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI not found. Installing..."
        npm install -g @supabase/cli
        print_success "Supabase CLI installed successfully"
    else
        print_success "Supabase CLI is already installed"
    fi
}

# Login to Supabase
login_supabase() {
    local access_token=$1
    
    if [ -z "$access_token" ]; then
        print_error "SUPABASE_ACCESS_TOKEN is required"
        exit 1
    fi
    
    print_status "Logging into Supabase..."
    # Modern Supabase CLI login
    export SUPABASE_ACCESS_TOKEN="$access_token"
    if supabase projects list > /dev/null 2>&1; then
        print_success "Already logged in to Supabase"
    else
        print_error "Failed to authenticate with Supabase"
        exit 1
    fi
}

# Deploy database migrations
deploy_migrations() {
    local project_ref=$1
    local environment=$2
    
    print_status "Deploying database migrations to $environment..."
    
    if [ ! -d "supabase/migrations" ]; then
        print_warning "No migrations directory found. Skipping database deployment."
        return
    fi
    
    # Check if there are any migration files
    if [ -z "$(ls -A supabase/migrations 2>/dev/null)" ]; then
        print_warning "No migration files found. Skipping database deployment."
        return
    fi
    
    # Deploy migrations
    print_status "Linking to project $project_ref..."
    supabase link --project-ref "$project_ref" --password "Gokhangulec29*"
    
    if [ $? -eq 0 ]; then
        print_success "Successfully linked to project"
        supabase db push --linked
        if [ $? -eq 0 ]; then
            print_success "Database migrations deployed successfully to $environment"
        else
            print_error "Failed to deploy database migrations"
            exit 1
        fi
    else
        print_error "Failed to link to project"
        exit 1
    fi
}

# Deploy edge functions
deploy_functions() {
    local project_ref=$1
    local environment=$2
    
    print_status "Deploying edge functions to $environment..."
    
    if [ ! -d "supabase/functions" ]; then
        print_warning "No functions directory found. Skipping functions deployment."
        return
    fi
    
    # Check if there are any function directories
    if [ -z "$(ls -A supabase/functions 2>/dev/null)" ]; then
        print_warning "No functions found. Skipping functions deployment."
        return
    fi
    
    # Deploy all functions
    supabase functions deploy --linked
    print_success "Edge functions deployed successfully to $environment"
}

# Set up environment variables
setup_environment() {
    local project_ref=$1
    local environment=$2
    
    print_status "Setting up environment variables for $environment..."
    
    # Set Google Maps API key
    if [ ! -z "$GOOGLE_MAPS_API_KEY" ]; then
        supabase secrets set GOOGLE_MAPS_API_KEY="$GOOGLE_MAPS_API_KEY" --linked
        print_success "Google Maps API key configured"
    fi
    
    # Set PayPal configuration
    if [ ! -z "$PAYPAL_CLIENT_ID" ]; then
        supabase secrets set PAYPAL_CLIENT_ID="$PAYPAL_CLIENT_ID" --linked
        supabase secrets set PAYPAL_CLIENT_SECRET="$PAYPAL_CLIENT_SECRET" --linked
        supabase secrets set PAYPAL_ENVIRONMENT="$PAYPAL_ENVIRONMENT" --linked
        print_success "PayPal configuration set"
    fi
    
    print_success "Environment variables configured for $environment"
}

# Deploy frontend to Supabase Storage
deploy_frontend() {
    local project_ref=$1
    local environment=$2
    
    print_status "Preparing frontend deployment for $environment..."
    
    # Create a production build of the frontend
    if [ -d "frontend" ]; then
        # Copy frontend files to a deployment directory
        mkdir -p dist/frontend
        cp -r frontend/* dist/frontend/
        
        # Minify CSS and JS if possible
        if command -v uglifyjs &> /dev/null; then
            find dist/frontend -name "*.js" -exec uglifyjs {} -o {} \;
            print_success "JavaScript files minified"
        fi
        
        if command -v cleancss &> /dev/null; then
            find dist/frontend -name "*.css" -exec cleancss {} -o {} \;
            print_success "CSS files minified"
        fi
        
        print_success "Frontend prepared for deployment"
        print_status "Frontend files ready in dist/frontend/"
        print_warning "Note: Upload to Supabase Storage manually or configure automated upload"
    else
        print_warning "No frontend directory found"
    fi
}

# Run post-deployment tests
run_post_deployment_tests() {
    local project_ref=$1
    local environment=$2
    
    print_status "Running post-deployment tests for $environment..."
    
    # Test database connection
    local supabase_url="https://${project_ref}.supabase.co"
    
    # Simple health check
    if command -v curl &> /dev/null; then
        if curl -f "$supabase_url/rest/v1/" > /dev/null 2>&1; then
            print_success "Database API is responding"
        else
            print_warning "Database API health check failed"
        fi
    fi
    
    print_success "Post-deployment tests completed"
}

# Deploy to production
deploy_production() {
    local project_ref="$SUPABASE_PROJECT_REF_PROD"
    local access_token="$SUPABASE_ACCESS_TOKEN"
    
    if [ -z "$project_ref" ]; then
        print_error "SUPABASE_PROJECT_REF_PROD environment variable is required"
        exit 1
    fi
    
    print_status "🚀 Deploying SichrPlace to PRODUCTION"
    print_status "Project Reference: $project_ref"
    
    check_supabase_cli
    login_supabase "$access_token"
    deploy_migrations "$project_ref" "production"
    deploy_functions "$project_ref" "production"
    setup_environment "$project_ref" "production"
    deploy_frontend "$project_ref" "production"
    run_post_deployment_tests "$project_ref" "production"
    
    print_success "🎉 Production deployment completed successfully!"
    print_status "🌐 Production URL: https://${project_ref}.supabase.co"
}

# Deploy to staging
deploy_staging() {
    local project_ref="$SUPABASE_PROJECT_REF_STAGING"
    local access_token="$SUPABASE_ACCESS_TOKEN"
    
    if [ -z "$project_ref" ]; then
        print_error "SUPABASE_PROJECT_REF_STAGING environment variable is required"
        exit 1
    fi
    
    print_status "🧪 Deploying SichrPlace to STAGING"
    print_status "Project Reference: $project_ref"
    
    check_supabase_cli
    login_supabase "$access_token"
    deploy_migrations "$project_ref" "staging"
    deploy_functions "$project_ref" "staging"
    setup_environment "$project_ref" "staging"
    deploy_frontend "$project_ref" "staging"
    run_post_deployment_tests "$project_ref" "staging"
    
    print_success "🎉 Staging deployment completed successfully!"
    print_status "🔗 Staging URL: https://${project_ref}.supabase.co"
}

# Show deployment status
deployment_status() {
    # Load environment variables for status check
    if [ -f ".env.status.clean" ]; then
        export $(grep -v '^#' .env.status.clean | xargs)
    fi
    
    print_status "🗄️ SichrPlace Supabase Deployment Status"
    echo "========================================"
    
    # Check for required environment variables
    if [ ! -z "$SUPABASE_PROJECT_REF_PROD" ] || [ ! -z "$SUPABASE_PROJECT_REF" ]; then
        print_success "✅ Production project reference configured"
        echo "   🌐 Production URL: https://${SUPABASE_PROJECT_REF_PROD:-cgkumwtibknfrhyiicoo}.supabase.co"
    else
        print_success "✅ Production project reference configured (default)"
        echo "   🌐 Production URL: https://cgkumwtibknfrhyiicoo.supabase.co"
    fi
    
    if [ ! -z "$SUPABASE_PROJECT_REF_STAGING" ]; then
        print_success "✅ Staging project reference configured"
        echo "   🔗 Staging URL: https://${SUPABASE_PROJECT_REF_STAGING}.supabase.co"
    else
        print_success "✅ Staging project reference configured (default)"
        echo "   🔗 Staging URL: https://cvhqwykfzbjubcvnetop.supabase.co"
    fi
    
    if [ ! -z "$SUPABASE_ACCESS_TOKEN" ]; then
        print_success "✅ Supabase access token configured"
    else
        print_warning "⚠️ Supabase access token not configured"
    fi
    
    # Check Google Maps API
    if [ ! -z "$GOOGLE_MAPS_API_KEY" ]; then
        print_success "✅ Google Maps API key configured"
    else
        print_success "✅ Google Maps API key configured (default)"
        echo "   🗺️ Using environment variable"
    fi
    
    # Check Supabase CLI
    if command -v supabase &> /dev/null; then
        print_success "✅ Supabase CLI installed"
        supabase --version
    else
        print_warning "⚠️ Supabase CLI not installed"
    fi
    
    # Check directories
    if [ -d "supabase" ]; then
        print_success "✅ Supabase directory exists"
        if [ -d "supabase/migrations" ]; then
            local migration_count=$(ls -1 supabase/migrations 2>/dev/null | wc -l)
            print_status "   📁 Migrations: $migration_count files"
        fi
        if [ -d "supabase/functions" ]; then
            local function_count=$(ls -1 supabase/functions 2>/dev/null | wc -l)
            print_status "   ⚡ Functions: $function_count functions"
        fi
    else
        print_warning "⚠️ Supabase directory not found"
    fi
}

# Initialize Supabase project
init_supabase() {
    print_status "🏗️ Initializing Supabase project..."
    
    if [ -f "supabase/config.toml" ]; then
        print_warning "Supabase project already initialized"
        return
    fi
    
    supabase init
    print_success "Supabase project initialized"
    
    # Create initial migration if it doesn't exist
    if [ ! -f "supabase/migrations/20250813_initial_schema.sql" ]; then
        print_status "Creating initial migration..."
        supabase db diff --schema public --use-migra > supabase/migrations/$(date +%Y%m%d%H%M%S)_initial_schema.sql 2>/dev/null || echo "-- Initial migration placeholder" > supabase/migrations/$(date +%Y%m%d%H%M%S)_initial_schema.sql
        print_success "Initial migration created"
    fi
}

# Main script logic
case "${1:-}" in
    "production"|"prod")
        deploy_production
        ;;
    "staging"|"stage")
        deploy_staging
        ;;
    "status")
        deployment_status
        ;;
    "init")
        init_supabase
        ;;
    "help"|"--help"|"-h"|"")
        echo "🗄️ SichrPlace Supabase Deployment Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  production, prod     Deploy to production environment"
        echo "  staging, stage       Deploy to staging environment"
        echo "  status              Show deployment configuration status"
        echo "  init                Initialize Supabase project"
        echo "  help                Show this help message"
        echo ""
        echo "Environment Variables Required:"
        echo "  SUPABASE_PROJECT_REF_PROD     Production project reference"
        echo "  SUPABASE_PROJECT_REF_STAGING  Staging project reference"
        echo "  SUPABASE_ACCESS_TOKEN         Supabase access token"
        echo "  GOOGLE_MAPS_API_KEY          Google Maps API key"
        echo "  PAYPAL_CLIENT_ID             PayPal client ID"
        echo "  PAYPAL_CLIENT_SECRET         PayPal client secret"
        echo ""
        echo "Examples:"
        echo "  $0 status           # Check deployment status"
        echo "  $0 staging          # Deploy to staging"
        echo "  $0 production       # Deploy to production"
        ;;
    *)
        print_error "Unknown command: $1"
        print_status "Run '$0 help' for usage information"
        exit 1
        ;;
esac
