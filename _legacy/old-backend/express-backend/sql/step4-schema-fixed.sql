-- Step 4 Database Schema: Enhanced User Experience Tables (FIXED VERSION)
-- Execute these SQL commands in Supabase SQL Editor

-- First, let's safely check and update existing tables
DO $$
BEGIN
    -- Check if saved_searches table exists and has correct columns
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'saved_searches') THEN
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'saved_searches' AND column_name = 'alerts_enabled') THEN
            ALTER TABLE saved_searches ADD COLUMN alerts_enabled BOOLEAN DEFAULT true;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'saved_searches' AND column_name = 'alert_frequency') THEN
            ALTER TABLE saved_searches ADD COLUMN alert_frequency VARCHAR(20) DEFAULT 'daily';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'saved_searches' AND column_name = 'last_executed') THEN
            ALTER TABLE saved_searches ADD COLUMN last_executed TIMESTAMP WITH TIME ZONE;
        END IF;
    END IF;

    -- Check and fix notifications table columns
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        -- If 'read' column exists, rename it to 'is_read'
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
            ALTER TABLE notifications RENAME COLUMN "read" TO is_read;
        END IF;
        
        -- If neither 'read' nor 'is_read' exists, add 'is_read'
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') 
           AND NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
            ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
        END IF;
    END IF;
END $$;

-- 1. Add new columns to users table for enhanced profiles
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true, "marketing": false}'::jsonb,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create saved_searches table (drop and recreate to ensure consistency)
DROP TABLE IF EXISTS saved_searches CASCADE;
CREATE TABLE saved_searches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    search_criteria JSONB NOT NULL,
    alerts_enabled BOOLEAN DEFAULT true,
    alert_frequency VARCHAR(20) DEFAULT 'daily',
    last_executed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewing_request_id UUID REFERENCES viewing_requests(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(100) NOT NULL,
    comment TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderation_note TEXT,
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(apartment_id, user_id) -- One review per user per apartment
);

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    action_url TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create recently_viewed table
CREATE TABLE IF NOT EXISTS recently_viewed (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, apartment_id) -- One record per user per apartment
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alerts_enabled ON saved_searches(alerts_enabled);

CREATE INDEX IF NOT EXISTS idx_reviews_apartment_id ON reviews(apartment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_id ON recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can create their own saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can update their own saved searches" ON saved_searches;
DROP POLICY IF EXISTS "Users can delete their own saved searches" ON saved_searches;

DROP POLICY IF EXISTS "Anyone can view approved reviews" ON reviews;
DROP POLICY IF EXISTS "Users can view their own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can view all reviews" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON reviews;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

DROP POLICY IF EXISTS "Users can view their own recently viewed" ON recently_viewed;
DROP POLICY IF EXISTS "Users can track their own views" ON recently_viewed;
DROP POLICY IF EXISTS "Users can update their own views" ON recently_viewed;
DROP POLICY IF EXISTS "Users can delete their own views" ON recently_viewed;

-- 9. Create RLS Policies

-- Saved Searches Policies
CREATE POLICY "Users can view their own saved searches" ON saved_searches
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches" ON saved_searches
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches" ON saved_searches
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches" ON saved_searches
    FOR DELETE USING (auth.uid() = user_id);

-- Reviews Policies
CREATE POLICY "Anyone can view approved reviews" ON reviews
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view their own reviews" ON reviews
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reviews" ON reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON reviews
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can moderate reviews" ON reviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true); -- Allow system to create notifications

-- Recently Viewed Policies
CREATE POLICY "Users can view their own recently viewed" ON recently_viewed
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can track their own views" ON recently_viewed
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own views" ON recently_viewed
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own views" ON recently_viewed
    FOR DELETE USING (auth.uid() = user_id);

-- 10. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert some sample data for testing (only if tables are empty)
DO $$
BEGIN
    -- Only insert if no data exists
    IF NOT EXISTS (SELECT 1 FROM saved_searches LIMIT 1) THEN
        INSERT INTO saved_searches (user_id, name, search_criteria, alerts_enabled) 
        SELECT 
            id,
            'Affordable Apartments in Cologne',
            '{"maxPrice": 800, "location": "Cologne", "minRooms": 2}'::jsonb,
            true
        FROM users 
        WHERE email = 'sichrplace@gmail.com' 
        LIMIT 1;
    END IF;
END $$;

-- Success message
SELECT 'Step 4 database schema created successfully! All tables, indexes, and policies are now in place.' as status;
