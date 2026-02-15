-- Additional tables to complete website integration
-- Add these to your existing 537-line migration for 95%+ integration

-- User favorites/bookmarks (Frontend has "Add to Favorites" buttons)
CREATE TABLE user_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, apartment_id)
);

-- Apartment analytics for landlord dashboard performance tracking
CREATE TABLE apartment_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    viewing_requests_count INTEGER DEFAULT 0,
    contact_attempts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(apartment_id, date)
);

-- Reviews and ratings (Frontend mentions "top-rated apartments")
CREATE TABLE apartment_reviews (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    review_text TEXT,
    pros TEXT,
    cons TEXT,
    stay_duration_months INTEGER,
    would_recommend BOOLEAN DEFAULT true,
    landlord_rating INTEGER CHECK (landlord_rating >= 1 AND landlord_rating <= 5),
    location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    verified_stay BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media files management (Frontend has photo upload, video tours mentioned)
CREATE TABLE media_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    related_entity_type VARCHAR(50) NOT NULL, -- 'apartment', 'user', 'viewing_request'
    related_entity_id UUID NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'floor_plan')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    alt_text VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    upload_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history for user experience improvement
CREATE TABLE search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query JSONB NOT NULL, -- Store filter criteria
    results_count INTEGER DEFAULT 0,
    city VARCHAR(100),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    property_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches for user convenience
CREATE TABLE saved_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_name VARCHAR(200) NOT NULL,
    search_criteria JSONB NOT NULL,
    email_alerts BOOLEAN DEFAULT true,
    last_notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_apartment ON user_favorites(apartment_id);
CREATE INDEX idx_apartment_analytics_date ON apartment_analytics(date);
CREATE INDEX idx_apartment_reviews_rating ON apartment_reviews(rating);
CREATE INDEX idx_apartment_reviews_apartment ON apartment_reviews(apartment_id);
CREATE INDEX idx_media_files_entity ON media_files(related_entity_type, related_entity_id);
CREATE INDEX idx_search_history_user ON search_history(user_id);

-- RLS policies
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view apartment analytics" ON apartment_analytics
    FOR SELECT USING (true);

CREATE POLICY "Users can read reviews" ON apartment_reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON apartment_reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Update triggers
CREATE TRIGGER update_apartment_reviews_updated_at BEFORE UPDATE ON apartment_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update apartment rating averages
CREATE OR REPLACE FUNCTION update_apartment_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE apartments 
    SET 
        average_rating = (SELECT AVG(rating) FROM apartment_reviews WHERE apartment_id = NEW.apartment_id),
        review_count = (SELECT COUNT(*) FROM apartment_reviews WHERE apartment_id = NEW.apartment_id)
    WHERE id = NEW.apartment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apartment_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON apartment_reviews
    FOR EACH ROW EXECUTE FUNCTION update_apartment_rating();
