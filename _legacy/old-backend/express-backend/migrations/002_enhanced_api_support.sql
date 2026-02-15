-- Enhanced API Support Migration
-- Additional tables and enhancements for comprehensive API functionality
-- Run this in your Supabase SQL editor after the initial migration

-- Email tracking table for audit and debugging
CREATE TABLE email_logs (
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
CREATE TABLE payment_transactions (
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
CREATE TABLE support_tickets (
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
CREATE TABLE support_ticket_messages (
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
CREATE TABLE safety_reports (
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
CREATE TABLE refund_requests (
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
CREATE TABLE notifications (
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
CREATE TABLE system_settings (
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
CREATE TABLE gdpr_tracking_logs (
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

-- Indexes for new tables
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

CREATE INDEX idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_viewing_request ON payment_transactions(viewing_request_id);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_tickets_number ON support_tickets(ticket_number);

CREATE INDEX idx_safety_reports_reporter ON safety_reports(reporter_id);
CREATE INDEX idx_safety_reports_reported_user ON safety_reports(reported_user_id);
CREATE INDEX idx_safety_reports_status ON safety_reports(status);

CREATE INDEX idx_refund_requests_user_id ON refund_requests(user_id);
CREATE INDEX idx_refund_requests_status ON refund_requests(status);
CREATE INDEX idx_refund_requests_payment ON refund_requests(payment_transaction_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_gdpr_tracking_user_id ON gdpr_tracking_logs(user_id);
CREATE INDEX idx_gdpr_tracking_event ON gdpr_tracking_logs(event);
CREATE INDEX idx_gdpr_tracking_created_at ON gdpr_tracking_logs(created_at);
CREATE INDEX idx_gdpr_tracking_retention ON gdpr_tracking_logs(retention_date);

-- Updated at triggers for new tables
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_reports_updated_at BEFORE UPDATE ON safety_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refund_requests_updated_at BEFORE UPDATE ON refund_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_tracking_logs_updated_at BEFORE UPDATE ON gdpr_tracking_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique ticket/report numbers
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

-- Triggers to auto-generate numbers
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

CREATE TRIGGER support_tickets_set_number BEFORE INSERT ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION set_ticket_number();

CREATE TRIGGER safety_reports_set_number BEFORE INSERT ON safety_reports
    FOR EACH ROW EXECUTE FUNCTION set_report_number();

CREATE TRIGGER refund_requests_set_number BEFORE INSERT ON refund_requests
    FOR EACH ROW EXECUTE FUNCTION set_refund_number();

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('booking_fee_default', '10.00', 'number', 'Default booking fee in EUR', true),
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
('terms_of_service_version', '1.0', 'string', 'Current terms of service version', true);

-- Row Level Security for new tables
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_tracking_logs ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be expanded based on requirements)
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own support tickets" ON support_tickets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create support tickets" ON support_tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public system settings are viewable" ON system_settings
    FOR SELECT USING (is_public = true);

-- Grant permissions for new tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create a test user for API testing
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
    account_status
) VALUES (
    'sicherplace',
    'sicherplace@gmail.com',
    '$2b$10$GJJXpzUpoHcneADWQzaJMugPd8Y8rtUCE3wbK4htdq.aSomzOLiNu', -- Hashed version of 'Gokhangulec29*'
    'admin',
    'Admin',
    'User',
    true,
    true,
    NOW(),
    true,
    'active'
) ON CONFLICT (email) DO NOTHING;

-- Create sample apartment data with photos from img folder
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
    featured
) VALUES (
    'Beautiful Apartment in Köln',
    'Spacious and modern apartment in the heart of Cologne. Perfect for professionals or small families. Recently renovated with high-quality finishes.',
    'Cologne City Center, Germany',
    850.00,
    75,
    3,
    1,
    CURRENT_DATE + INTERVAL '1 week',
    (SELECT id FROM users WHERE email = 'sicherplace@gmail.com' LIMIT 1),
    ARRAY['../img/koeln.jpg', '../img/koeln2.jpg', '../img/koeln3.jpg'],
    ARRAY['High-speed Internet', 'Balcony', 'Elevator', 'Parking', 'Central Heating'],
    false,
    true,
    true,
    true,
    true,
    true,
    'Cologne',
    'Germany',
    'available',
    true
),
(
    'Cozy Studio near University',
    'Perfect for students! Fully furnished studio apartment close to University of Cologne. All utilities included in rent.',
    'University District, Cologne',
    650.00,
    45,
    1,
    1,
    CURRENT_DATE + INTERVAL '2 weeks',
    (SELECT id FROM users WHERE email = 'sicherplace@gmail.com' LIMIT 1),
    ARRAY['../img/koeln4.jpg', '../img/koeln5.jpg'],
    ARRAY['Furnished', 'Internet', 'Washing Machine', 'Central Heating'],
    true,
    true,
    false,
    false,
    false,
    true,
    'Cologne',
    'Germany',
    'available',
    false
),
(
    'Luxury Penthouse with Garden',
    'Stunning penthouse apartment with private garden and panoramic city views. Premium location with all modern amenities.',
    'Cologne Old Town, Germany',
    1200.00,
    120,
    4,
    2,
    CURRENT_DATE + INTERVAL '1 month',
    (SELECT id FROM users WHERE email = 'sicherplace@gmail.com' LIMIT 1),
    ARRAY['../img/koeln6.jpg', '../img/apartment1.jpg', '../img/apartment2.jpg'],
    ARRAY['Garden', 'Balcony', 'Dishwasher', 'Parking', 'Elevator', 'Internet', 'Premium Location'],
    false,
    false,
    true,
    true,
    true,
    true,
    'Cologne',
    'Germany',
    'available',
    true
);

COMMENT ON TABLE email_logs IS 'Tracks all emails sent by the system for audit and debugging';
COMMENT ON TABLE payment_transactions IS 'Complete payment transaction history with gateway integration';
COMMENT ON TABLE support_tickets IS 'Customer support ticket management system';
COMMENT ON TABLE safety_reports IS 'Trust and safety reporting system for user reports';
COMMENT ON TABLE refund_requests IS 'Refund request management with approval workflow';
COMMENT ON TABLE notifications IS 'In-app notification system for users';
COMMENT ON TABLE system_settings IS 'Configurable system settings and feature flags';
