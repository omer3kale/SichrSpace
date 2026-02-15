-- Step 4 Complete Database Schema: Full Installation
-- This version creates ALL necessary tables including users, apartments, and Step 4 enhancements

-- ⚠️ WARNING: This will delete any existing data in these tables:
-- users, apartments, viewing_requests, conversations, messages, saved_searches, reviews, notifications, recently_viewed

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Drop existing tables (if they exist) to start completely fresh
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS recently_viewed CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS viewing_requests CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS apartments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(64) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    blocked BOOLEAN DEFAULT false,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    profile_picture TEXT,
    notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true, "marketing": false}'::jsonb,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    gdpr_consent BOOLEAN DEFAULT false,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    marketing_consent BOOLEAN DEFAULT false,
    data_processing_consent BOOLEAN DEFAULT false
);

-- 3. Create apartments table
CREATE TABLE apartments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    size INTEGER, -- in square meters
    rooms INTEGER,
    bathrooms INTEGER,
    available_from DATE,
    available_to DATE,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    images TEXT[], -- Array of image URLs
    amenities TEXT[],
    pet_friendly BOOLEAN DEFAULT false,
    furnished BOOLEAN DEFAULT false,
    balcony BOOLEAN DEFAULT false,
    garden BOOLEAN DEFAULT false,
    parking BOOLEAN DEFAULT false,
    elevator BOOLEAN DEFAULT false,
    washing_machine BOOLEAN DEFAULT false,
    dishwasher BOOLEAN DEFAULT false,
    internet BOOLEAN DEFAULT false,
    heating VARCHAR(50),
    energy_rating VARCHAR(5),
    deposit DECIMAL(10,2),
    utilities_included BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'rented', 'pending', 'withdrawn')),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    postal_code VARCHAR(10),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Germany'
);

-- 4. Create viewing_requests table
CREATE TABLE viewing_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
    requested_date TIMESTAMP WITH TIME ZONE NOT NULL,
    alternative_date_1 TIMESTAMP WITH TIME ZONE,
    alternative_date_2 TIMESTAMP WITH TIME ZONE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),
    confirmed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    phone VARCHAR(20),
    email VARCHAR(255),
    notes TEXT,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    payment_amount DECIMAL(10,2),
    payment_id VARCHAR(255),
    booking_fee DECIMAL(10,2) DEFAULT 10.00
);

-- 5. Create conversations table
CREATE TABLE conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    participant_1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE,
    participants UUID[] DEFAULT ARRAY[]::UUID[] -- For easier querying
);

-- 6. Create messages table
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER
);

-- 7. Create user_favorites table
CREATE TABLE user_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, apartment_id) -- One favorite per user per apartment
);

-- 8. Create saved_searches table (Step 4)
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

-- 9. Create reviews table (Step 4)
CREATE TABLE reviews (
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

-- 10. Create notifications table (Step 4)
CREATE TABLE notifications (
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

-- 11. Create recently_viewed table (Step 4)
CREATE TABLE recently_viewed (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, apartment_id) -- One record per user per apartment
);

-- 12. Create indexes for better performance

-- Core table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_apartments_owner_id ON apartments(owner_id);
CREATE INDEX idx_apartments_status ON apartments(status);
CREATE INDEX idx_apartments_location ON apartments(location);
CREATE INDEX idx_apartments_price ON apartments(price);
CREATE INDEX idx_apartments_created_at ON apartments(created_at DESC);

CREATE INDEX idx_viewing_requests_apartment_id ON viewing_requests(apartment_id);
CREATE INDEX idx_viewing_requests_requester_id ON viewing_requests(requester_id);
CREATE INDEX idx_viewing_requests_landlord_id ON viewing_requests(landlord_id);
CREATE INDEX idx_viewing_requests_status ON viewing_requests(status);

CREATE INDEX idx_conversations_apartment_id ON conversations(apartment_id);
CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_participants ON conversations USING gin(participants);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_apartment_id ON user_favorites(apartment_id);

-- Step 4 indexes
CREATE INDEX idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alerts_enabled ON saved_searches(alerts_enabled);

CREATE INDEX idx_reviews_apartment_id ON reviews(apartment_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_rating ON reviews(rating);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX idx_recently_viewed_user_id ON recently_viewed(user_id);
CREATE INDEX idx_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);

-- 13. Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS Policies

-- Users Policies (users can view their own data, admins can view all)
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Apartments Policies (public read, owners can manage)
CREATE POLICY "Anyone can view available apartments" ON apartments
    FOR SELECT USING (status = 'available');

CREATE POLICY "Owners can view their own apartments" ON apartments
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create apartments" ON apartments
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own apartments" ON apartments
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own apartments" ON apartments
    FOR DELETE USING (auth.uid() = owner_id);

-- Viewing Requests Policies
CREATE POLICY "Users can view their own viewing requests" ON viewing_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = landlord_id);

CREATE POLICY "Users can create viewing requests" ON viewing_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Landlords can update viewing requests" ON viewing_requests
    FOR UPDATE USING (auth.uid() = landlord_id OR auth.uid() = requester_id);

-- Conversations Policies
CREATE POLICY "Participants can view their conversations" ON conversations
    FOR SELECT USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

-- Messages Policies
CREATE POLICY "Conversation participants can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
        )
    );

CREATE POLICY "Conversation participants can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = conversation_id 
            AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
        )
    );

-- User Favorites Policies
CREATE POLICY "Users can view their own favorites" ON user_favorites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

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

-- 15. Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON apartments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viewing_requests_updated_at BEFORE UPDATE ON viewing_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. Insert sample data for testing
DO $$
DECLARE
    test_user_id UUID;
    test_apartment_id UUID;
BEGIN
    -- Insert test user
    INSERT INTO users (username, email, password, first_name, last_name, role) 
    VALUES ('sichrplace_test', 'sichrplace@gmail.com', '$2b$10$encrypted_password_here', 'Test', 'User', 'user')
    RETURNING id INTO test_user_id;
    
    -- Insert test apartment
    INSERT INTO apartments (title, description, location, price, size, rooms, bathrooms, owner_id)
    VALUES (
        'Beautiful Test Apartment in Cologne',
        'A lovely 2-bedroom apartment perfect for testing our platform.',
        'Cologne, Germany',
        850.00,
        75,
        2,
        1,
        test_user_id
    ) RETURNING id INTO test_apartment_id;
    
    -- Insert sample saved search
    INSERT INTO saved_searches (user_id, name, search_criteria, alerts_enabled) 
    VALUES (
        test_user_id,
        'Affordable Apartments in Cologne',
        '{"maxPrice": 800, "location": "Cologne", "minRooms": 2}'::jsonb,
        true
    );
    
    -- Insert sample notification
    INSERT INTO notifications (user_id, type, title, message, priority)
    VALUES (
        test_user_id,
        'welcome',
        'Welcome to SichrPlace!',
        'Thank you for joining our platform. Start searching for your perfect apartment today!',
        'normal'
    );
    
END $$;

-- Success message
SELECT 'Complete database schema created successfully!' as status,
       'All tables created: users, apartments, viewing_requests, conversations, messages, user_favorites, saved_searches, reviews, notifications, recently_viewed' as details;
