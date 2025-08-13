-- ========================================
-- STEP 5: ADVANCED SEARCH & FILTERING SYSTEM
-- Database Schema Extensions
-- ========================================

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    response_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Popular searches tracking
CREATE TABLE IF NOT EXISTS popular_searches (
    id BIGSERIAL PRIMARY KEY,
    query TEXT UNIQUE NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved search alerts
CREATE TABLE IF NOT EXISTS saved_search_alerts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    last_notification_sent TIMESTAMP WITH TIME ZONE,
    match_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location data for geospatial search
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255),
    country VARCHAR(255) DEFAULT 'Germany',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    zoom_level INTEGER DEFAULT 12,
    apartment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(city, state, country)
);

-- Search autocomplete suggestions
CREATE TABLE IF NOT EXISTS search_suggestions (
    id BIGSERIAL PRIMARY KEY,
    suggestion TEXT UNIQUE NOT NULL,
    category VARCHAR(50) DEFAULT 'general', -- 'location', 'amenity', 'property_type', 'general'
    search_count INTEGER DEFAULT 0,
    relevance_score DECIMAL(3,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Search analytics indexes
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics USING gin(to_tsvector('english', query));

-- Popular searches indexes
CREATE INDEX IF NOT EXISTS idx_popular_searches_count ON popular_searches(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_popular_searches_last_searched ON popular_searches(last_searched DESC);

-- Saved search alerts indexes
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_user_id ON saved_search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_active ON saved_search_alerts(is_active) WHERE is_active = true;

-- Location indexes for geospatial queries
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations(country);

-- Search suggestions indexes
CREATE INDEX IF NOT EXISTS idx_search_suggestions_category ON search_suggestions(category);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_active ON search_suggestions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_search_suggestions_relevance ON search_suggestions(relevance_score DESC);

-- ========================================
-- ENHANCED APARTMENT SEARCH INDEXES
-- ========================================

-- Full-text search on apartments
CREATE INDEX IF NOT EXISTS idx_apartments_fulltext ON apartments 
USING gin(to_tsvector('english', title || ' ' || description || ' ' || location || ' ' || COALESCE(amenities::text, '')));

-- Geospatial index for apartments (if coordinates exist)
CREATE INDEX IF NOT EXISTS idx_apartments_coordinates ON apartments(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Advanced filtering indexes
CREATE INDEX IF NOT EXISTS idx_apartments_price_range ON apartments(price);
CREATE INDEX IF NOT EXISTS idx_apartments_move_dates ON apartments(move_in_date, move_out_date);
CREATE INDEX IF NOT EXISTS idx_apartments_property_type ON apartments(property_type);
CREATE INDEX IF NOT EXISTS idx_apartments_available ON apartments(available) WHERE available = true;

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_apartments_search_combo ON apartments(available, price, property_type, move_in_date) 
WHERE available = true;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert popular German cities with coordinates
INSERT INTO locations (city, state, country, latitude, longitude, zoom_level) VALUES
('Berlin', 'Berlin', 'Germany', 52.5200, 13.4050, 10),
('Munich', 'Bavaria', 'Germany', 48.1351, 11.5820, 10),
('Hamburg', 'Hamburg', 'Germany', 53.5511, 9.9937, 10),
('Cologne', 'North Rhine-Westphalia', 'Germany', 50.9375, 6.9603, 10),
('Frankfurt', 'Hesse', 'Germany', 50.1109, 8.6821, 10),
('Stuttgart', 'Baden-Württemberg', 'Germany', 48.7758, 9.1829, 10),
('Düsseldorf', 'North Rhine-Westphalia', 'Germany', 51.2277, 6.7735, 10),
('Dortmund', 'North Rhine-Westphalia', 'Germany', 51.5136, 7.4653, 10),
('Leipzig', 'Saxony', 'Germany', 51.3397, 12.3731, 10),
('Dresden', 'Saxony', 'Germany', 51.0504, 13.7373, 10)
ON CONFLICT (city, state, country) DO NOTHING;

-- Insert search suggestions
INSERT INTO search_suggestions (suggestion, category, relevance_score) VALUES
-- Location suggestions
('Berlin Mitte', 'location', 0.95),
('Munich City Center', 'location', 0.90),
('Hamburg Altona', 'location', 0.85),
('Cologne Old Town', 'location', 0.80),
-- Amenity suggestions
('WiFi included', 'amenity', 0.95),
('Washing machine', 'amenity', 0.90),
('Dishwasher', 'amenity', 0.85),
('Balcony', 'amenity', 0.80),
('Parking', 'amenity', 0.75),
('Pet-friendly', 'amenity', 0.70),
-- Property type suggestions
('Studio apartment', 'property_type', 0.95),
('Shared room', 'property_type', 0.90),
('1 bedroom apartment', 'property_type', 0.85),
('2 bedroom apartment', 'property_type', 0.80)
ON CONFLICT (suggestion) DO UPDATE SET 
    relevance_score = EXCLUDED.relevance_score,
    updated_at = NOW();

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update popular searches
CREATE OR REPLACE FUNCTION update_popular_searches()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO popular_searches (query, search_count, last_searched)
    VALUES (NEW.query, 1, NEW.created_at)
    ON CONFLICT (query) 
    DO UPDATE SET 
        search_count = popular_searches.search_count + 1,
        last_searched = NEW.created_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update popular searches
DROP TRIGGER IF EXISTS trigger_update_popular_searches ON search_analytics;
CREATE TRIGGER trigger_update_popular_searches
    AFTER INSERT ON search_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_popular_searches();

-- Function to update search suggestions relevance
CREATE OR REPLACE FUNCTION update_suggestion_relevance()
RETURNS void AS $$
BEGIN
    UPDATE search_suggestions 
    SET relevance_score = GREATEST(0.1, LEAST(1.0, search_count / 100.0))
    WHERE search_count > 0;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VIEWS FOR ANALYTICS
-- ========================================

-- Popular search terms view
CREATE OR REPLACE VIEW popular_search_terms AS
SELECT 
    query,
    search_count,
    last_searched,
    EXTRACT(DAYS FROM NOW() - last_searched) as days_since_last_search
FROM popular_searches 
WHERE search_count >= 5
ORDER BY search_count DESC, last_searched DESC;

-- Search analytics summary view
CREATE OR REPLACE VIEW search_analytics_summary AS
SELECT 
    DATE(created_at) as search_date,
    COUNT(*) as total_searches,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(results_count) as avg_results_count,
    AVG(response_time_ms) as avg_response_time_ms
FROM search_analytics 
GROUP BY DATE(created_at)
ORDER BY search_date DESC;

-- Active saved searches view
CREATE OR REPLACE VIEW active_saved_searches AS
SELECT 
    ssa.*,
    u.username,
    u.email,
    u.phone
FROM saved_search_alerts ssa
JOIN users u ON ssa.user_id = u.id
WHERE ssa.is_active = true
ORDER BY ssa.created_at DESC;

-- ========================================
-- SECURITY (Row Level Security)
-- ========================================

-- Enable RLS on new tables
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_search_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own search analytics
CREATE POLICY search_analytics_user_policy ON search_analytics
    FOR ALL USING (user_id = auth.uid());

-- Users can only manage their own saved search alerts
CREATE POLICY saved_search_alerts_user_policy ON saved_search_alerts
    FOR ALL USING (user_id = auth.uid());

-- Public read access for locations and search suggestions
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_public_read ON locations FOR SELECT USING (true);
CREATE POLICY search_suggestions_public_read ON search_suggestions FOR SELECT USING (true);

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

-- Add completion log
INSERT INTO search_analytics (user_id, query, results_count, response_time_ms) 
VALUES (NULL, 'STEP5_ADVANCED_SEARCH_SCHEMA_INSTALLED', 0, 0);

COMMENT ON TABLE search_analytics IS 'Step 5: Advanced Search Analytics - tracks all search queries and performance';
COMMENT ON TABLE popular_searches IS 'Step 5: Popular Search Terms - tracks trending search queries';
COMMENT ON TABLE saved_search_alerts IS 'Step 5: Saved Search Alerts - user-defined search notifications';
COMMENT ON TABLE locations IS 'Step 5: Location Data - geographic data for geospatial search';
COMMENT ON TABLE search_suggestions IS 'Step 5: Search Autocomplete - suggestions for search input';
