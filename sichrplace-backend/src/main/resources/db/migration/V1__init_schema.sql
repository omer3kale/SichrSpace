-- =====================================================
-- SichrPlace MSSQL Database Schema
-- Self-Hosted Migration from Supabase PostgreSQL
-- MSSQL Server 2022 Compatible
-- =====================================================

USE master;
GO

-- Create database if not exists
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'SichrPlaceDB')
BEGIN
    CREATE DATABASE SichrPlaceDB
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

USE SichrPlaceDB;
GO

-- =====================================================
-- 1. USERS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'users') AND type = 'U')
CREATE TABLE users (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    username NVARCHAR(100) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    role NVARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    first_name NVARCHAR(100),
    last_name NVARCHAR(100),
    phone NVARCHAR(20),
    bio NVARCHAR(MAX),
    profile_picture NVARCHAR(MAX),
    notification_preferences NVARCHAR(MAX) DEFAULT '{"email":true,"sms":false,"push":true,"marketing":false}',
    email_verified BIT DEFAULT 0,
    email_verification_token NVARCHAR(255),
    account_status NVARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted')),
    failed_login_attempts INT DEFAULT 0,
    blocked BIT DEFAULT 0,
    gdpr_consent BIT DEFAULT 0,
    last_login DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 2. APARTMENTS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'apartments') AND type = 'U')
CREATE TABLE apartments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX),
    price DECIMAL(10,2) NOT NULL,
    location NVARCHAR(200),
    address NVARCHAR(200),
    city NVARCHAR(100),
    latitude FLOAT,
    longitude FLOAT,
    place_id NVARCHAR(255),
    rooms INT,
    bedrooms INT,
    bathrooms INT,
    size_sqm FLOAT,
    images NVARCHAR(MAX),           -- JSON array of image URLs
    amenities NVARCHAR(MAX),        -- JSON array of amenity strings
    status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'rented', 'inactive')),
    verified BIT DEFAULT 0,
    owner_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    available_from DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 3. CONVERSATIONS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'conversations') AND type = 'U')
CREATE TABLE conversations (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    apartment_id UNIQUEIDENTIFIER REFERENCES apartments(id) ON DELETE SET NULL,
    participant_1_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    participant_2_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    last_message_at DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 4. MESSAGES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'messages') AND type = 'U')
CREATE TABLE messages (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    conversation_id UNIQUEIDENTIFIER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    content NVARCHAR(MAX) NOT NULL,
    is_read BIT DEFAULT 0,
    read_at DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 5. VIEWING REQUESTS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'viewing_requests') AND type = 'U')
CREATE TABLE viewing_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    apartment_id UNIQUEIDENTIFIER NOT NULL REFERENCES apartments(id) ON DELETE NO ACTION,
    requester_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    landlord_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
    requested_date DATETIMEOFFSET,
    notes NVARCHAR(MAX),
    payment_id NVARCHAR(MAX),
    payment_amount DECIMAL(10,2),
    payment_status NVARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'notifications') AND type = 'U')
CREATE TABLE notifications (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type NVARCHAR(50) NOT NULL,
    title NVARCHAR(200) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    data NVARCHAR(MAX) DEFAULT '{}',
    action_url NVARCHAR(MAX),
    priority NVARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    is_read BIT DEFAULT 0,
    read_at DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 7. REVIEWS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'reviews') AND type = 'U')
CREATE TABLE reviews (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    apartment_id UNIQUEIDENTIFIER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewing_request_id UNIQUEIDENTIFIER REFERENCES viewing_requests(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title NVARCHAR(100) NOT NULL,
    comment NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderation_note NVARCHAR(MAX),
    moderated_at DATETIMEOFFSET,
    moderated_by UNIQUEIDENTIFIER REFERENCES users(id),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT UQ_reviews_apartment_user UNIQUE (apartment_id, user_id)
);
GO

-- =====================================================
-- 8. SAVED SEARCHES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'saved_searches') AND type = 'U')
CREATE TABLE saved_searches (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name NVARCHAR(100) NOT NULL,
    search_criteria NVARCHAR(MAX) NOT NULL,       -- JSON search parameters
    alerts_enabled BIT DEFAULT 1,
    alert_frequency NVARCHAR(20) DEFAULT 'daily' CHECK (alert_frequency IN ('immediately', 'daily', 'weekly')),
    last_executed DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    updated_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 9. FAVORITES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'favorites') AND type = 'U')
CREATE TABLE favorites (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UNIQUEIDENTIFIER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT UQ_favorites_user_apartment UNIQUE (user_id, apartment_id)
);
GO

-- =====================================================
-- 10. RECENTLY VIEWED TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'recently_viewed') AND type = 'U')
CREATE TABLE recently_viewed (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UNIQUEIDENTIFIER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    viewed_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT UQ_recently_viewed_user_apartment UNIQUE (user_id, apartment_id)
);
GO

-- =====================================================
-- 11. GDPR REQUESTS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'gdpr_requests') AND type = 'U')
CREATE TABLE gdpr_requests (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    request_type NVARCHAR(50) NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'consent_withdrawal', 'access_request')),
    status NVARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    response_data NVARCHAR(MAX),
    completed_at DATETIMEOFFSET,
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 12. SECURE VIDEOS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'secure_videos') AND type = 'U')
CREATE TABLE secure_videos (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    apartment_id UNIQUEIDENTIFIER NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    uploaded_by UNIQUEIDENTIFIER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    file_path NVARCHAR(500) NOT NULL,
    title NVARCHAR(200),
    description NVARCHAR(MAX),
    status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);
GO

-- =====================================================
-- 13. PERFORMANCE INDEXES
-- =====================================================

-- Users
CREATE NONCLUSTERED INDEX IX_users_email ON users(email);
CREATE NONCLUSTERED INDEX IX_users_username ON users(username);
CREATE NONCLUSTERED INDEX IX_users_role ON users(role);

-- Apartments
CREATE NONCLUSTERED INDEX IX_apartments_owner_id ON apartments(owner_id);
CREATE NONCLUSTERED INDEX IX_apartments_city ON apartments(city);
CREATE NONCLUSTERED INDEX IX_apartments_status ON apartments(status);
CREATE NONCLUSTERED INDEX IX_apartments_price ON apartments(price);
CREATE NONCLUSTERED INDEX IX_apartments_created_at ON apartments(created_at DESC);

-- Conversations
CREATE NONCLUSTERED INDEX IX_conversations_participant1 ON conversations(participant_1_id);
CREATE NONCLUSTERED INDEX IX_conversations_participant2 ON conversations(participant_2_id);
CREATE NONCLUSTERED INDEX IX_conversations_last_message ON conversations(last_message_at DESC);

-- Messages
CREATE NONCLUSTERED INDEX IX_messages_conversation ON messages(conversation_id);
CREATE NONCLUSTERED INDEX IX_messages_sender ON messages(sender_id);
CREATE NONCLUSTERED INDEX IX_messages_created_at ON messages(created_at ASC);
CREATE NONCLUSTERED INDEX IX_messages_is_read ON messages(is_read);

-- Viewing Requests
CREATE NONCLUSTERED INDEX IX_viewing_requests_apartment ON viewing_requests(apartment_id);
CREATE NONCLUSTERED INDEX IX_viewing_requests_requester ON viewing_requests(requester_id);
CREATE NONCLUSTERED INDEX IX_viewing_requests_landlord ON viewing_requests(landlord_id);
CREATE NONCLUSTERED INDEX IX_viewing_requests_status ON viewing_requests(status);

-- Notifications
CREATE NONCLUSTERED INDEX IX_notifications_user ON notifications(user_id);
CREATE NONCLUSTERED INDEX IX_notifications_is_read ON notifications(is_read);
CREATE NONCLUSTERED INDEX IX_notifications_created_at ON notifications(created_at DESC);

-- Reviews
CREATE NONCLUSTERED INDEX IX_reviews_apartment ON reviews(apartment_id);
CREATE NONCLUSTERED INDEX IX_reviews_user ON reviews(user_id);
CREATE NONCLUSTERED INDEX IX_reviews_status ON reviews(status);

-- Saved Searches
CREATE NONCLUSTERED INDEX IX_saved_searches_user ON saved_searches(user_id);

-- Favorites
CREATE NONCLUSTERED INDEX IX_favorites_user ON favorites(user_id);

-- Recently Viewed
CREATE NONCLUSTERED INDEX IX_recently_viewed_user ON recently_viewed(user_id);
CREATE NONCLUSTERED INDEX IX_recently_viewed_viewed_at ON recently_viewed(viewed_at DESC);

-- GDPR
CREATE NONCLUSTERED INDEX IX_gdpr_requests_user ON gdpr_requests(user_id);

-- Secure Videos
CREATE NONCLUSTERED INDEX IX_secure_videos_apartment ON secure_videos(apartment_id);
GO

-- =====================================================
-- 14. UPDATE TRIGGER (simulates PostgreSQL updated_at)
-- =====================================================
CREATE OR ALTER TRIGGER TR_users_updated_at ON users
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE users SET updated_at = SYSDATETIMEOFFSET()
    FROM users u INNER JOIN inserted i ON u.id = i.id;
END
GO

CREATE OR ALTER TRIGGER TR_apartments_updated_at ON apartments
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE apartments SET updated_at = SYSDATETIMEOFFSET()
    FROM apartments a INNER JOIN inserted i ON a.id = i.id;
END
GO

CREATE OR ALTER TRIGGER TR_viewing_requests_updated_at ON viewing_requests
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE viewing_requests SET updated_at = SYSDATETIMEOFFSET()
    FROM viewing_requests v INNER JOIN inserted i ON v.id = i.id;
END
GO

CREATE OR ALTER TRIGGER TR_reviews_updated_at ON reviews
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE reviews SET updated_at = SYSDATETIMEOFFSET()
    FROM reviews r INNER JOIN inserted i ON r.id = i.id;
END
GO

CREATE OR ALTER TRIGGER TR_saved_searches_updated_at ON saved_searches
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE saved_searches SET updated_at = SYSDATETIMEOFFSET()
    FROM saved_searches s INNER JOIN inserted i ON s.id = i.id;
END
GO

-- =====================================================
-- 15. SEED DATA (Admin + Test User)
-- =====================================================
-- Password is BCrypt hash of 'Gokhangulec29*' (strength 12)
-- You MUST generate a fresh BCrypt hash in production!

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'sichrplace@gmail.com')
BEGIN
    INSERT INTO users (id, username, email, password, role, first_name, last_name, gdpr_consent, email_verified)
    VALUES (
        'E7532CFC-493C-4BF1-9458-A3F11FA6602A',
        'sichrplace',
        'sichrplace@gmail.com',
        '$2a$12$LJ3UlvJh8sY5yXjXl5vCbuK6HxYqKkRxuVqVf7JhR2aEq1Qi3aqXW', -- REPLACE with actual BCrypt hash
        'admin',
        'SichrPlace',
        'Admin',
        1,
        1
    );
END

IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'omer3kale@gmail.com')
BEGIN
    INSERT INTO users (id, username, email, password, role, first_name, last_name, gdpr_consent, email_verified)
    VALUES (
        'BBD03609-D3A6-49E4-8701-FA84445B3CAB',
        'omer3kale',
        'omer3kale@gmail.com',
        '$2a$12$LJ3UlvJh8sY5yXjXl5vCbuK6HxYqKkRxuVqVf7JhR2aEq1Qi3aqXW', -- REPLACE with actual BCrypt hash
        'user',
        'Omer',
        'Kale',
        1,
        1
    );
END
GO

PRINT '✅ SichrPlace MSSQL schema created successfully!';
PRINT '📊 12 tables, indexes, triggers, and seed data ready.';
GO
