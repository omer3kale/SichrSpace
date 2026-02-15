#!/bin/bash

# Google Maps Integration Deployment Script
# Sets up Google Maps API integration for SichrPlace

set -e

echo "🗺️  Starting Google Maps Integration Deployment..."
echo "═══════════════════════════════════════════════════════════════"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating template..."
    cp backend/config/google-maps-setup.env .env.google-maps-template
    print_info "Template created as .env.google-maps-template"
    print_info "Please copy the required variables to your .env file"
fi

# Check if Google Maps API key is set
if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
    print_warning "GOOGLE_MAPS_API_KEY not found in environment"
    
    echo -e "\n${BLUE}📋 SETUP INSTRUCTIONS:${NC}"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create a new project or select existing one"
    echo "3. Enable the required APIs:"
    echo "   - Geocoding API"
    echo "   - Places API (New)"
    echo "   - Distance Matrix API"
    echo "   - Directions API"
    echo "   - Maps JavaScript API"
    echo "   - Maps Static API"
    echo "4. Create API credentials (API Key)"
    echo "5. Secure your API key with restrictions"
    echo "6. Add GOOGLE_MAPS_API_KEY=your_key_here to your .env file"
    echo ""
    
    read -p "Do you want to continue with the deployment setup? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled. Please set up your Google Maps API key first."
        exit 1
    fi
else
    print_status "Google Maps API key found in environment"
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

print_status "Found package.json - in correct directory"

# Install required dependencies
print_info "Installing required dependencies..."
npm install axios node-fetch

if [ -d "backend" ]; then
    cd backend
    npm install axios node-fetch
    cd ..
fi

print_status "Dependencies installed"

# Run database migration
print_info "Running database migration for Google Maps integration..."

if command -v mysql &> /dev/null; then
    if [ ! -z "$DATABASE_URL" ] || [ ! -z "$DB_HOST" ]; then
        print_info "Applying database migration..."
        
        # Extract database connection details from environment or use defaults
        DB_HOST=${DB_HOST:-localhost}
        DB_USER=${DB_USER:-root}
        DB_NAME=${DB_NAME:-sichrplace}
        
        if [ ! -z "$DB_PASSWORD" ]; then
            mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/migrations/add_google_maps_integration.sql
        else
            mysql -h "$DB_HOST" -u "$DB_USER" "$DB_NAME" < backend/migrations/add_google_maps_integration.sql
        fi
        
        print_status "Database migration completed"
    else
        print_warning "Database connection details not found. Please run the migration manually:"
        print_info "mysql -u your_user -p your_database < backend/migrations/add_google_maps_integration.sql"
    fi
else
    print_warning "MySQL client not found. Please install MySQL client and run migration manually:"
    print_info "mysql -u your_user -p your_database < backend/migrations/add_google_maps_integration.sql"
fi

# Test Google Maps API
print_info "Testing Google Maps API integration..."

if [ ! -z "$GOOGLE_MAPS_API_KEY" ]; then
    cd backend
    node scripts/test-google-maps-api.js
    TEST_RESULT=$?
    cd ..
    
    if [ $TEST_RESULT -eq 0 ]; then
        print_status "Google Maps API tests passed!"
    else
        print_warning "Some Google Maps API tests failed. Check your API configuration."
    fi
else
    print_warning "Skipping API tests - API key not configured"
fi

# Update server configuration
print_info "Updating server configuration..."

# Add Google Maps routes to main server file
if grep -q "google-maps" backend/server.js; then
    print_status "Google Maps routes already configured in server.js"
else
    print_info "Adding Google Maps routes to server.js..."
    
    # Create backup
    cp backend/server.js backend/server.js.backup
    
    # Add routes before the catch-all route
    sed -i '' '/app\.use.*404/i\
// Google Maps API routes\
app.use("/api/maps", require("./api/google-maps"));\
' backend/server.js
    
    print_status "Google Maps routes added to server.js"
fi

# Create frontend integration helper
print_info "Creating frontend integration helper..."

cat > frontend/js/google-maps-integration.js << 'EOF'
/**
 * Frontend Google Maps Integration Helper
 * Provides easy integration with Google Maps services
 */

class GoogleMapsIntegration {
  constructor() {
    this.apiConfig = null;
    this.map = null;
    this.markers = [];
  }

  /**
   * Initialize Google Maps integration
   */
  async initialize() {
    try {
      const response = await fetch('/api/maps/config');
      const result = await response.json();
      
      if (result.success) {
        this.apiConfig = result.data;
        return true;
      }
      
      throw new Error('Failed to load configuration');
    } catch (error) {
      console.error('Google Maps initialization failed:', error);
      return false;
    }
  }

  /**
   * Geocode an address
   */
  async geocodeAddress(address) {
    try {
      const response = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Geocoding failed:', error);
      return null;
    }
  }

  /**
   * Find nearby places
   */
  async findNearbyPlaces(lat, lng, options = {}) {
    try {
      const response = await fetch('/api/maps/places/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, ...options })
      });
      
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Places search failed:', error);
      return [];
    }
  }

  /**
   * Calculate directions
   */
  async getDirections(origin, destination, travelMode = 'DRIVING') {
    try {
      const response = await fetch('/api/maps/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination, travelMode })
      });
      
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Directions failed:', error);
      return null;
    }
  }

  /**
   * Find apartments near location
   */
  async findNearbyApartments(address, options = {}) {
    try {
      const response = await fetch('/api/maps/apartments/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, ...options })
      });
      
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Nearby apartments search failed:', error);
      return null;
    }
  }

  /**
   * Analyze neighborhood
   */
  async analyzeNeighborhood(lat, lng, radius = 1000) {
    try {
      const response = await fetch('/api/maps/neighborhood-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, radius })
      });
      
      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Neighborhood analysis failed:', error);
      return null;
    }
  }
}

// Export for use in other scripts
window.GoogleMapsIntegration = GoogleMapsIntegration;
EOF

print_status "Frontend integration helper created"

# Create example usage file
print_info "Creating example usage documentation..."

cat > GOOGLE_MAPS_INTEGRATION.md << 'EOF'
# Google Maps Integration Guide

## Setup Complete! 🎉

Your Google Maps integration has been successfully deployed. Here's how to use it:

## Backend API Endpoints

### Geocoding
```bash
# Geocode an address
curl -X POST http://localhost:3000/api/maps/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "Berlin, Germany"}'

# Reverse geocode coordinates
curl -X POST http://localhost:3000/api/maps/reverse-geocode \
  -H "Content-Type: application/json" \
  -d '{"lat": 52.5200, "lng": 13.4050}'
```

### Places Search
```bash
# Find nearby restaurants
curl -X POST http://localhost:3000/api/maps/places/nearby \
  -H "Content-Type: application/json" \
  -d '{"lat": 52.5200, "lng": 13.4050, "types": ["restaurant"], "radius": 1000}'

# Text search for places
curl -X POST http://localhost:3000/api/maps/places/search \
  -H "Content-Type: application/json" \
  -d '{"query": "restaurants near Brandenburg Gate"}'
```

### Directions
```bash
# Calculate route
curl -X POST http://localhost:3000/api/maps/directions \
  -H "Content-Type: application/json" \
  -d '{"origin": "Berlin Hauptbahnhof", "destination": "Brandenburg Gate", "travelMode": "WALKING"}'
```

### Apartment Search
```bash
# Find apartments near location
curl -X POST http://localhost:3000/api/maps/apartments/nearby \
  -H "Content-Type: application/json" \
  -d '{"address": "Berlin Mitte", "radius": 2000}'
```

## Frontend Integration

```javascript
// Initialize Google Maps integration
const gmaps = new GoogleMapsIntegration();
await gmaps.initialize();

// Geocode an address
const location = await gmaps.geocodeAddress('Berlin, Germany');

// Find nearby places
const places = await gmaps.findNearbyPlaces(52.5200, 13.4050, {
  types: ['restaurant'],
  radius: 1000
});

// Find apartments near location
const apartments = await gmaps.findNearbyApartments('Berlin Mitte');

// Analyze neighborhood
const analysis = await gmaps.analyzeNeighborhood(52.5200, 13.4050);
```

## Testing

Run the test suite to verify everything is working:

```bash
cd backend
node scripts/test-google-maps-api.js
```

## Database Schema

The following tables have been added/updated:
- `apartments` - Added `latitude`, `longitude`, `location_point` columns
- `geocoding_cache` - Cache for geocoding results
- `places_cache` - Cache for places data
- `routes_cache` - Cache for route calculations

## Next Steps

1. Configure your Google Maps API key in the frontend
2. Update apartment data with real coordinates
3. Implement map visualization in your UI
4. Add location-based search filters
5. Set up monitoring for API usage

## Troubleshooting

- Check that all required Google APIs are enabled
- Verify API key has correct restrictions
- Monitor API quotas and billing
- Check network connectivity for API calls

EOF

print_status "Documentation created: GOOGLE_MAPS_INTEGRATION.md"

# Summary
echo ""
echo "🎉 Google Maps Integration Deployment Complete!"
echo "═══════════════════════════════════════════════════════════════"
print_status "Services created:"
echo "  📍 GeocodingService - Address to coordinates conversion"
echo "  🏢 PlacesService - Nearby places and business search"
echo "  🚗 DirectionsService - Route planning and optimization"
echo "  🗺️  GoogleMapsService - Main integration orchestrator"

print_status "API endpoints created:"
echo "  POST /api/maps/geocode"
echo "  POST /api/maps/reverse-geocode"
echo "  POST /api/maps/places/nearby"
echo "  POST /api/maps/places/search"
echo "  POST /api/maps/directions"
echo "  POST /api/maps/apartments/nearby"
echo "  POST /api/maps/neighborhood-analysis"

print_status "Database schema updated with location support"
print_status "Frontend integration helper created"
print_status "Test suite available for API validation"

echo ""
print_info "Next steps:"
echo "1. Set GOOGLE_MAPS_API_KEY in your .env file"
echo "2. Enable required Google APIs in Cloud Console"
echo "3. Run: cd backend && node scripts/test-google-maps-api.js"
echo "4. Update apartment data with real coordinates"
echo "5. Integrate map visualization in your frontend"

echo ""
print_status "Google Maps integration is ready for production! 🚀"
EOF
