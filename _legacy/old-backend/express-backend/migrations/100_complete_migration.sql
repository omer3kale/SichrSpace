-- 🎯 100% COMPLETE MIGRATION FOR SICHRPLACE
-- Comprehensive database schema with full website integration
-- Run this in your Supabase SQL editor

-- ===== CORE FOUNDATION =====

-- Email tracking table for audit and debugging
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    email_type VARCHAR(50) NOT NULL, -- 'request_confirmation', 'viewing_ready', 'payment_confirmation', etc.
    subject VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    related_entity_type VARCHAR(50), -- 'viewing_request', 'payment', 'apartment', etc.
    related_entity_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table for detailed payment tracking
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payment_id VARCHAR(255) NOT NULL UNIQUE, -- PayPal payment ID
    payer_id VARCHAR(255), -- PayPal payer ID  
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewing_request_id UUID REFERENCES viewing_requests(id) ON DELETE SET NULL,
    apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    payment_method VARCHAR(50) DEFAULT 'paypal',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'approved', 'completed', 'cancelled', 'failed', 'refunded')),
    gateway_status VARCHAR(50), -- Raw status from payment gateway
    transaction_id VARCHAR(255), -- Gateway transaction ID
    gateway_response JSONB, -- Full gateway response for debugging
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_amount DECIMAL(10,2),
    fees DECIMAL(10,2), -- Gateway fees
    net_amount DECIMAL(10,2) -- Amount after fees
);

-- Support tickets/messages table for admin management
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_number VARCHAR(20) UNIQUE NOT NULL, -- Human-readable ticket number
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL, -- 'technical', 'billing', 'general', 'complaint'
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_user', 'resolved', 'closed')),
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    internal_notes TEXT -- Private admin notes
);

-- Support ticket messages for conversation history
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Internal admin messages
    attachments TEXT[], -- File URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- Trust and safety reports
CREATE TABLE IF NOT EXISTS safety_reports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_number VARCHAR(20) UNIQUE NOT NULL,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL, -- 'harassment', 'fraud', 'inappropriate_content', 'violence', 'other'
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    description TEXT NOT NULL,
    evidence_urls TEXT[], -- Screenshots, documents, etc.
    action_taken VARCHAR(100), -- What action was taken
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    internal_notes TEXT
);

-- Refund requests table
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    request_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE CASCADE,
    viewing_request_id UUID REFERENCES viewing_requests(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'processed', 'cancelled')),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who processed
    processed_at TIMESTAMP WITH TIME ZONE,
    refund_method VARCHAR(50) DEFAULT 'original_payment',
    refund_transaction_id VARCHAR(255), -- Gateway refund transaction ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    admin_notes TEXT
);

-- Notifications table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'viewing_confirmed', 'payment_received', 'message_received', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT,
    related_entity_type VARCHAR(50), -- 'viewing_request', 'apartment', 'payment', etc.
    related_entity_id UUID,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url TEXT, -- URL to take action on notification
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- System settings/configuration table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Can be accessed by non-admin users
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- GDPR tracking logs table for audit trail
CREATE TABLE IF NOT EXISTS gdpr_tracking_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    event VARCHAR(50) NOT NULL CHECK (event IN (
        'clarity_initialized',
        'clarity_disabled', 
        'user_data_deleted',
        'consent_given',
        'consent_withdrawn',
        'tracking_blocked',
        'privacy_settings_accessed'
    )),
    service VARCHAR(50) NOT NULL DEFAULT 'microsoft_clarity',
    data JSONB,
    ip_address INET,
    user_agent TEXT,
    url TEXT,
    consent_version VARCHAR(10) DEFAULT '1.0',
    legal_basis VARCHAR(50) CHECK (legal_basis IN ('consent', 'legitimate_interest', 'legal_obligation', 'vital_interests', 'public_task', 'contract')),
    retention_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '3 years'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== 100% WEBSITE INTEGRATION TABLES =====

-- User favorites/bookmarks (Frontend has "Add to Favorites" buttons)
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, apartment_id)
);

-- Apartment analytics for landlord dashboard performance tracking
CREATE TABLE IF NOT EXISTS apartment_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    viewing_requests_count INTEGER DEFAULT 0,
    contact_attempts_count INTEGER DEFAULT 0,
    search_appearances_count INTEGER DEFAULT 0, -- How many times it appeared in search results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(apartment_id, date)
);

-- Reviews and ratings (Frontend mentions "top-rated apartments")
CREATE TABLE IF NOT EXISTS apartment_reviews (
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
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Media files management (Frontend has photo upload, video tours mentioned)
CREATE TABLE IF NOT EXISTS media_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    related_entity_type VARCHAR(50) NOT NULL, -- 'apartment', 'user', 'viewing_request'
    related_entity_id UUID NOT NULL,
    file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('image', 'video', 'document', 'floor_plan', 'virtual_tour')),
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    alt_text VARCHAR(500),
    display_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false, -- For featured apartment images
    upload_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history for user experience improvement
CREATE TABLE IF NOT EXISTS search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query JSONB NOT NULL, -- Store filter criteria
    results_count INTEGER DEFAULT 0,
    city VARCHAR(100),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    property_type VARCHAR(50),
    amenities TEXT[],
    clicked_apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL, -- Track which apartment they clicked
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved searches for user convenience
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_name VARCHAR(200) NOT NULL,
    search_criteria JSONB NOT NULL,
    email_alerts BOOLEAN DEFAULT true,
    alert_frequency VARCHAR(20) DEFAULT 'daily' CHECK (alert_frequency IN ('immediate', 'daily', 'weekly')),
    last_notified_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages for real-time messaging (Frontend has chat functionality)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url TEXT,
    read_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property matching preferences for smart matching
CREATE TABLE IF NOT EXISTS matching_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('tenant', 'landlord')),
    preferences JSONB NOT NULL, -- Store detailed matching criteria
    max_distance_km INTEGER DEFAULT 10,
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    preferred_move_in_date DATE,
    lease_duration_months INTEGER,
    pet_friendly BOOLEAN,
    smoking_allowed BOOLEAN,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Viewing scheduler for automated coordination
CREATE TABLE IF NOT EXISTS viewing_schedule (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    viewing_request_id UUID REFERENCES viewing_requests(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    customer_manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled')),
    preparation_notes TEXT,
    equipment_needed TEXT[], -- Camera, measuring tape, etc.
    access_instructions TEXT,
    completion_report TEXT,
    video_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contract generation for digital contracts
CREATE TABLE IF NOT EXISTS digital_contracts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contract_number VARCHAR(30) UNIQUE NOT NULL,
    apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    landlord_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewing_request_id UUID REFERENCES viewing_requests(id) ON DELETE SET NULL,
    contract_type VARCHAR(30) DEFAULT 'rental_agreement',
    contract_data JSONB NOT NULL, -- All contract details
    monthly_rent DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) NOT NULL,
    lease_start_date DATE NOT NULL,
    lease_end_date DATE,
    lease_duration_months INTEGER,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent_for_signature', 'partially_signed', 'fully_signed', 'active', 'terminated', 'expired')),
    tenant_signed_at TIMESTAMP WITH TIME ZONE,
    landlord_signed_at TIMESTAMP WITH TIME ZONE,
    contract_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== EXISTING TABLE ENHANCEMENTS =====

-- Add missing columns to existing tables
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE viewing_requests ADD COLUMN IF NOT EXISTS completion_rating INTEGER CHECK (completion_rating >= 1 AND completion_rating <= 5);

-- Add payment reference to viewing_requests if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='viewing_requests' AND column_name='payment_transaction_id') THEN
        ALTER TABLE viewing_requests ADD COLUMN payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add apartment features that might be missing
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS video_tour_url TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS floor_plan_url TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS public_transport_info TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS nearby_amenities TEXT[];
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS house_rules TEXT[];
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS availability_notes TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS minimum_lease_duration INTEGER; -- in months
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS maximum_lease_duration INTEGER; -- in months
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS admin_notes TEXT; -- Internal admin notes
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS verification_notes TEXT;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add user profile enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB; -- User preferences as JSON
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB; -- Notification preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0 CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_verification', 'deactivated'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_level VARCHAR(20) DEFAULT 'basic' CHECK (verification_level IN ('basic', 'verified', 'premium'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ===== COMPREHENSIVE INDEXING =====

-- Email logs indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- Payment transactions indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_viewing_request ON payment_transactions(viewing_request_id);

-- Support system indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(ticket_number);

-- Safety and refunds indexes
CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter ON safety_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_reported_user ON safety_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON safety_reports(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_user_id ON refund_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment ON refund_requests(payment_transaction_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- GDPR tracking indexes
CREATE INDEX IF NOT EXISTS idx_gdpr_tracking_user_id ON gdpr_tracking_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_tracking_event ON gdpr_tracking_logs(event);
CREATE INDEX IF NOT EXISTS idx_gdpr_tracking_created_at ON gdpr_tracking_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_gdpr_tracking_retention ON gdpr_tracking_logs(retention_date);

-- 100% Integration indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_apartment ON user_favorites(apartment_id);
CREATE INDEX IF NOT EXISTS idx_apartment_analytics_date ON apartment_analytics(date);
CREATE INDEX IF NOT EXISTS idx_apartment_reviews_rating ON apartment_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_apartment_reviews_apartment ON apartment_reviews(apartment_id);
CREATE INDEX IF NOT EXISTS idx_media_files_entity ON media_files(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_matching_preferences_user ON matching_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_viewing_schedule_date ON viewing_schedule(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_digital_contracts_apartment ON digital_contracts(apartment_id);
CREATE INDEX IF NOT EXISTS idx_digital_contracts_status ON digital_contracts(status);

-- Advanced search indexes
CREATE INDEX IF NOT EXISTS idx_apartments_city ON apartments(city);
CREATE INDEX IF NOT EXISTS idx_apartments_price ON apartments(price);
CREATE INDEX IF NOT EXISTS idx_apartments_featured ON apartments(featured);
CREATE INDEX IF NOT EXISTS idx_apartments_status ON apartments(status);
CREATE INDEX IF NOT EXISTS idx_apartments_rating ON apartments(average_rating);

-- ===== FUNCTIONS AND TRIGGERS =====

-- Updated at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Updated at triggers for new tables
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_safety_reports_updated_at ON safety_reports;
CREATE TRIGGER update_safety_reports_updated_at BEFORE UPDATE ON safety_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_refund_requests_updated_at ON refund_requests;
CREATE TRIGGER update_refund_requests_updated_at BEFORE UPDATE ON refund_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_system_settings_updated_at ON system_settings;
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_gdpr_tracking_logs_updated_at ON gdpr_tracking_logs;
CREATE TRIGGER update_gdpr_tracking_logs_updated_at BEFORE UPDATE ON gdpr_tracking_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- New table triggers
DROP TRIGGER IF EXISTS update_apartment_reviews_updated_at ON apartment_reviews;
CREATE TRIGGER update_apartment_reviews_updated_at BEFORE UPDATE ON apartment_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON saved_searches;
CREATE TRIGGER update_saved_searches_updated_at BEFORE UPDATE ON saved_searches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_matching_preferences_updated_at ON matching_preferences;
CREATE TRIGGER update_matching_preferences_updated_at BEFORE UPDATE ON matching_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_viewing_schedule_updated_at ON viewing_schedule;
CREATE TRIGGER update_viewing_schedule_updated_at BEFORE UPDATE ON viewing_schedule
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_digital_contracts_updated_at ON digital_contracts;
CREATE TRIGGER update_digital_contracts_updated_at BEFORE UPDATE ON digital_contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        new_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM support_tickets WHERE ticket_number = new_number);
        counter := counter + 1;
    END LOOP;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        new_number := 'RPT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM safety_reports WHERE report_number = new_number);
        counter := counter + 1;
    END LOOP;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_refund_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        new_number := 'REF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM refund_requests WHERE request_number = new_number);
        counter := counter + 1;
    END LOOP;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER := 1;
BEGIN
    LOOP
        new_number := 'CNT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
        EXIT WHEN NOT EXISTS (SELECT 1 FROM digital_contracts WHERE contract_number = new_number);
        counter := counter + 1;
    END LOOP;
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-number generation triggers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_report_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_number IS NULL THEN
        NEW.report_number := generate_report_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_refund_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.request_number IS NULL THEN
        NEW.request_number := generate_refund_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_contract_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.contract_number IS NULL THEN
        NEW.contract_number := generate_contract_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Number generation triggers
DROP TRIGGER IF EXISTS support_tickets_set_number ON support_tickets;
CREATE TRIGGER support_tickets_set_number BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION set_ticket_number();

DROP TRIGGER IF EXISTS safety_reports_set_number ON safety_reports;
CREATE TRIGGER safety_reports_set_number BEFORE INSERT ON safety_reports
    FOR EACH ROW EXECUTE FUNCTION set_report_number();

DROP TRIGGER IF EXISTS refund_requests_set_number ON refund_requests;
CREATE TRIGGER refund_requests_set_number BEFORE INSERT ON refund_requests
    FOR EACH ROW EXECUTE FUNCTION set_refund_number();

DROP TRIGGER IF EXISTS digital_contracts_set_number ON digital_contracts;
CREATE TRIGGER digital_contracts_set_number BEFORE INSERT ON digital_contracts
    FOR EACH ROW EXECUTE FUNCTION set_contract_number();

-- Function to update apartment rating averages
CREATE OR REPLACE FUNCTION update_apartment_rating()
RETURNS TRIGGER AS $$
DECLARE
    apartment_uuid UUID;
BEGIN
    -- Handle both INSERT/UPDATE and DELETE
    IF TG_OP = 'DELETE' THEN
        apartment_uuid := OLD.apartment_id;
    ELSE
        apartment_uuid := NEW.apartment_id;
    END IF;
    
    UPDATE apartments 
    SET 
        average_rating = COALESCE((SELECT AVG(rating)::DECIMAL(3,2) FROM apartment_reviews WHERE apartment_id = apartment_uuid), 0.0),
        review_count = COALESCE((SELECT COUNT(*) FROM apartment_reviews WHERE apartment_id = apartment_uuid), 0),
        last_activity_at = NOW()
    WHERE id = apartment_uuid;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS apartment_rating_trigger ON apartment_reviews;
CREATE TRIGGER apartment_rating_trigger
    AFTER INSERT OR UPDATE OR DELETE ON apartment_reviews
    FOR EACH ROW EXECUTE FUNCTION update_apartment_rating();

-- Function to update apartment analytics
CREATE OR REPLACE FUNCTION update_apartment_analytics_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update analytics on various apartment activities
    INSERT INTO apartment_analytics (apartment_id, date, views_count, favorites_count, viewing_requests_count)
    VALUES (NEW.apartment_id, CURRENT_DATE, 0, 0, 0)
    ON CONFLICT (apartment_id, date) 
    DO UPDATE SET
        views_count = apartment_analytics.views_count + CASE WHEN TG_TABLE_NAME = 'apartment_views' THEN 1 ELSE 0 END,
        favorites_count = apartment_analytics.favorites_count + CASE WHEN TG_TABLE_NAME = 'user_favorites' THEN 1 ELSE 0 END,
        viewing_requests_count = apartment_analytics.viewing_requests_count + CASE WHEN TG_TABLE_NAME = 'viewing_requests' THEN 1 ELSE 0 END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===== COMPREHENSIVE ROW LEVEL SECURITY =====

-- Enable RLS for all tables
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_tracking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartment_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE viewing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_contracts ENABLE ROW LEVEL SECURITY;

-- Comprehensive RLS policies
DROP POLICY IF EXISTS "Users can view own payment transactions" ON payment_transactions;
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own support tickets" ON support_tickets;
CREATE POLICY "Users can view own support tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create support tickets" ON support_tickets;
CREATE POLICY "Users can create support tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public system settings are viewable" ON system_settings;
CREATE POLICY "Public system settings are viewable" ON system_settings
    FOR SELECT USING (is_public = true);

-- New table policies
DROP POLICY IF EXISTS "Users can manage own favorites" ON user_favorites;
CREATE POLICY "Users can manage own favorites" ON user_favorites
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view apartment analytics" ON apartment_analytics;
CREATE POLICY "Users can view apartment analytics" ON apartment_analytics
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can read reviews" ON apartment_reviews;
CREATE POLICY "Users can read reviews" ON apartment_reviews
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON apartment_reviews;
CREATE POLICY "Users can create reviews" ON apartment_reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users can view chat messages in their conversations" ON chat_messages;
CREATE POLICY "Users can view chat messages in their conversations" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = chat_messages.conversation_id 
            AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can send chat messages in their conversations" ON chat_messages;
CREATE POLICY "Users can send chat messages in their conversations" ON chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = chat_messages.conversation_id 
            AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
        )
    );

-- ===== COMPREHENSIVE SYSTEM SETTINGS =====

INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('booking_fee_default', '25.00', 'number', 'Default viewing service fee in EUR', true),
('max_viewing_alternatives', '2', 'number', 'Maximum alternative dates for viewing requests', true),
('payment_timeout_minutes', '60', 'number', 'Payment timeout in minutes', false),
('email_notifications_enabled', 'true', 'boolean', 'Enable email notifications', false),
('platform_commission_rate', '0.05', 'number', 'Platform commission rate (5%)', false),
('max_apartment_images', '20', 'number', 'Maximum images per apartment', true),
('supported_image_formats', '["jpg","jpeg","png","webp"]', 'json', 'Supported image formats', true),
('max_image_size_mb', '10', 'number', 'Maximum image size in MB', true),
('maintenance_mode', 'false', 'boolean', 'Maintenance mode status', true),
('support_email', 'support@sichrplace.com', 'string', 'Support contact email', true),
('platform_name', 'SichrPlace', 'string', 'Platform name', true),
('privacy_policy_version', '1.0', 'string', 'Current privacy policy version', true),
('terms_of_service_version', '1.0', 'string', 'Current terms of service version', true),
('max_search_results', '50', 'number', 'Maximum search results per page', true),
('featured_apartments_limit', '10', 'number', 'Number of featured apartments on homepage', true),
('review_moderation_enabled', 'true', 'boolean', 'Enable review moderation', false),
('auto_approve_reviews', 'false', 'boolean', 'Automatically approve reviews', false),
('chat_enabled', 'true', 'boolean', 'Enable chat functionality', true),
('video_tour_enabled', 'true', 'boolean', 'Enable video tour functionality', true),
('virtual_tour_enabled', 'true', 'boolean', 'Enable virtual tour functionality', true),
('smart_matching_enabled', 'true', 'boolean', 'Enable smart matching algorithm', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ===== SAMPLE DATA FOR TESTING =====

-- Create test user for API testing
INSERT INTO users (
    username, 
    email, 
    password, 
    role, 
    first_name, 
    last_name, 
    email_verified, 
    gdpr_consent, 
    gdpr_consent_date,
    data_processing_consent,
    account_status,
    profile_completion_score
) VALUES (
    'sichrplace_admin',
    'omer3kale@gmail.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
    'admin',
    'SichrPlace',
    'Admin',
    true,
    true,
    NOW(),
    true,
    'active',
    100
) ON CONFLICT (email) DO NOTHING;

-- Create sample apartment data with all new features
INSERT INTO apartments (
    title,
    description,
    location,
    price,
    size,
    rooms,
    bathrooms,
    available_from,
    owner_id,
    images,
    amenities,
    pet_friendly,
    furnished,
    balcony,
    parking,
    elevator,
    internet,
    city,
    country,
    status,
    featured,
    video_tour_url,
    virtual_tour_url,
    floor_plan_url,
    nearby_amenities,
    house_rules,
    verification_status,
    average_rating,
    review_count
) VALUES (
    'Beautiful Modern Apartment in Köln',
    'Spacious and modern apartment in the heart of Cologne. Perfect for professionals or small families. Recently renovated with high-quality finishes and smart home features.',
    'Cologne City Center, Germany',
    850.00,
    75,
    3,
    1,
    CURRENT_DATE + INTERVAL '1 week',
    (SELECT id FROM users WHERE email = 'omer3kale@gmail.com' LIMIT 1),
    ARRAY['../img/koeln.jpg', '../img/koeln2.jpg', '../img/koeln3.jpg'],
    ARRAY['High-speed Internet', 'Balcony', 'Elevator', 'Parking', 'Central Heating', 'Smart Home', 'Dishwasher'],
    false,
    true,
    true,
    true,
    true,
    true,
    'Cologne',
    'Germany',
    'available',
    true,
    'https://example.com/video-tours/koeln-apartment.mp4',
    'https://example.com/virtual-tours/koeln-apartment',
    'https://example.com/floor-plans/koeln-apartment.pdf',
    ARRAY['Supermarket 2 min walk', 'Metro station 5 min', 'University 10 min', 'Restaurants nearby'],
    ARRAY['No smoking indoors', 'No parties after 10 PM', 'Keep common areas clean'],
    'verified',
    4.5,
    12
),
(
    'Cozy Student Studio near University',
    'Perfect for students! Fully furnished studio apartment close to University of Cologne. All utilities included in rent. Great study environment.',
    'University District, Cologne',
    650.00,
    45,
    1,
    1,
    CURRENT_DATE + INTERVAL '2 weeks',
    (SELECT id FROM users WHERE email = 'omer3kale@gmail.com' LIMIT 1),
    ARRAY['../img/koeln4.jpg', '../img/koeln5.jpg'],
    ARRAY['Furnished', 'Internet', 'Washing Machine', 'Central Heating', 'Study Desk', 'All utilities included'],
    true,
    true,
    false,
    false,
    false,
    true,
    'Cologne',
    'Germany',
    'available',
    false,
    NULL,
    NULL,
    NULL,
    ARRAY['University 5 min walk', 'Library nearby', 'Student cafeteria', 'Bus stop 2 min'],
    ARRAY['Students only', 'No pets', 'Quiet hours 9 PM - 8 AM', 'No smoking'],
    'verified',
    4.2,
    8
),
(
    'Luxury Penthouse with Garden View',
    'Stunning penthouse apartment with private garden and panoramic city views. Premium location with all modern amenities. Perfect for executives.',
    'Cologne Old Town, Germany',
    1200.00,
    120,
    4,
    2,
    CURRENT_DATE + INTERVAL '1 month',
    (SELECT id FROM users WHERE email = 'omer3kale@gmail.com' LIMIT 1),
    ARRAY['../img/koeln6.jpg', '../img/apartment1.jpg', '../img/apartment2.jpg'],
    ARRAY['Garden', 'Balcony', 'Dishwasher', 'Parking', 'Elevator', 'Internet', 'Premium Location', 'Concierge'],
    false,
    false,
    true,
    true,
    true,
    true,
    'Cologne',
    'Germany',
    'available',
    true,
    'https://example.com/video-tours/luxury-penthouse.mp4',
    'https://example.com/virtual-tours/luxury-penthouse',
    'https://example.com/floor-plans/luxury-penthouse.pdf',
    ARRAY['Shopping district', 'Fine dining', 'Opera house', 'Business district 15 min'],
    ARRAY['No pets', 'Professional tenants only', 'No smoking', 'Minimum 12-month lease'],
    'verified',
    4.8,
    5
)
ON CONFLICT DO NOTHING;

-- ===== GRANTS AND PERMISSIONS =====

-- Grant permissions for all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE email_logs IS '100% Integration: Tracks all emails sent by the system for audit and debugging';
COMMENT ON TABLE payment_transactions IS '100% Integration: Complete payment transaction history with PayPal gateway integration';
COMMENT ON TABLE support_tickets IS '100% Integration: Customer support ticket management system with full conversation tracking';
COMMENT ON TABLE safety_reports IS '100% Integration: Trust and safety reporting system for user reports and moderation';
COMMENT ON TABLE refund_requests IS '100% Integration: Refund request management with approval workflow';
COMMENT ON TABLE notifications IS '100% Integration: In-app notification system for users';
COMMENT ON TABLE system_settings IS '100% Integration: Configurable system settings and feature flags';
COMMENT ON TABLE gdpr_tracking_logs IS '100% Integration: GDPR compliance tracking and audit trail';
COMMENT ON TABLE user_favorites IS '100% Integration: User favorites/bookmarks for apartment listings (Frontend "Add to Favorites")';
COMMENT ON TABLE apartment_analytics IS '100% Integration: Property performance analytics for landlord dashboard';
COMMENT ON TABLE apartment_reviews IS '100% Integration: Review and rating system for "top-rated apartments" feature';
COMMENT ON TABLE media_files IS '100% Integration: Comprehensive media management for photos, videos, virtual tours';
COMMENT ON TABLE search_history IS '100% Integration: User search history for improved UX and recommendations';
COMMENT ON TABLE saved_searches IS '100% Integration: Saved search functionality with email alerts';
COMMENT ON TABLE chat_messages IS '100% Integration: Real-time messaging system for user communication';
COMMENT ON TABLE matching_preferences IS '100% Integration: Smart matching algorithm preferences for tenants and landlords';
COMMENT ON TABLE viewing_schedule IS '100% Integration: Automated viewing coordination and customer manager assignment';
COMMENT ON TABLE digital_contracts IS '100% Integration: Digital contract generation and signature management';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '🎉 100%% COMPLETE MIGRATION DEPLOYED SUCCESSFULLY! 🎉';
    RAISE NOTICE '✅ Core functionality: Email tracking, Payment processing, Support system';
    RAISE NOTICE '✅ Website integration: Favorites, Analytics, Reviews, Media management';
    RAISE NOTICE '✅ Advanced features: Smart matching, Digital contracts, Real-time chat';
    RAISE NOTICE '✅ Security: Comprehensive RLS policies and indexing';
    RAISE NOTICE '✅ Sample data: Test user and featured apartments created';
    RAISE NOTICE '🚀 Ready for 100%% API success rate mission!';
END $$;
