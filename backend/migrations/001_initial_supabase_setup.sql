-- SichrPlace Database Migration to Supabase (PostgreSQL)
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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
    profile_picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP WITH TIME ZONE,
    gdpr_consent BOOLEAN DEFAULT false,
    gdpr_consent_date TIMESTAMP WITH TIME ZONE,
    marketing_consent BOOLEAN DEFAULT false,
    data_processing_consent BOOLEAN DEFAULT false
);

-- Apartments table
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

-- Viewing requests table
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

-- Messages/Conversations table
CREATE TABLE conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    participant_1_id UUID REFERENCES users(id) ON DELETE CASCADE,
    participant_2_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(apartment_id, participant_1_id, participant_2_id)
);

-- Individual messages table
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'system'))
);

-- Offers table
CREATE TABLE offers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    landlord_id UUID REFERENCES users(id) ON DELETE CASCADE,
    offer_amount DECIMAL(10,2) NOT NULL,
    move_in_date DATE NOT NULL,
    lease_duration INTEGER, -- in months
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'expired')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Feedback table
CREATE TABLE feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email VARCHAR(255),
    resolved BOOLEAN DEFAULT false
);

-- GDPR related tables
CREATE TABLE gdpr_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(20) NOT NULL CHECK (request_type IN ('access', 'deletion', 'portability', 'rectification')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE TABLE consent_purposes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    required BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE consents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    purpose_id UUID REFERENCES consent_purposes(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, purpose_id)
);

CREATE TABLE data_processing_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    data_type VARCHAR(100),
    purpose VARCHAR(100),
    legal_basis VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE TABLE data_breaches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT NOT NULL,
    affected_users INTEGER,
    data_types TEXT[],
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'identified' CHECK (status IN ('identified', 'investigating', 'contained', 'resolved')),
    reported_to_authority BOOLEAN DEFAULT false,
    reported_to_users BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE dpias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    data_types TEXT[],
    processing_purposes TEXT[],
    legal_basis VARCHAR(100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
    mitigation_measures TEXT[],
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_apartments_owner ON apartments(owner_id);
CREATE INDEX idx_apartments_location ON apartments(location);
CREATE INDEX idx_apartments_price ON apartments(price);
CREATE INDEX idx_apartments_status ON apartments(status);
CREATE INDEX idx_viewing_requests_apartment ON viewing_requests(apartment_id);
CREATE INDEX idx_viewing_requests_requester ON viewing_requests(requester_id);
CREATE INDEX idx_viewing_requests_status ON viewing_requests(status);
CREATE INDEX idx_conversations_apartment ON conversations(apartment_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_offers_apartment ON offers(apartment_id);
CREATE INDEX idx_offers_tenant ON offers(tenant_id);

-- Updated at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON apartments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viewing_requests_updated_at BEFORE UPDATE ON viewing_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default consent purposes
INSERT INTO consent_purposes (name, description, required) VALUES
('Essential Services', 'Processing necessary for providing core platform services', true),
('Marketing Communications', 'Sending marketing emails and promotional content', false),
('Analytics', 'Collecting usage data to improve our services', false),
('Third Party Integrations', 'Sharing data with payment processors and other service providers', true);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own data
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Apartments are viewable by everyone, but only owners can modify
CREATE POLICY "Apartments are publicly viewable" ON apartments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own apartments" ON apartments
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own apartments" ON apartments
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own apartments" ON apartments
    FOR DELETE USING (auth.uid() = owner_id);

-- Similar policies for other tables...
-- (Add more RLS policies as needed for your security requirements)

-- Create a function to get user by email (for authentication)
CREATE OR REPLACE FUNCTION get_user_by_email(user_email TEXT)
RETURNS TABLE(
    id UUID,
    username VARCHAR,
    email VARCHAR,
    password VARCHAR,
    role VARCHAR,
    blocked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.username, u.email, u.password, u.role, u.blocked
    FROM users u
    WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
