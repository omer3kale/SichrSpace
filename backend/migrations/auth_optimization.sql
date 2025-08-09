-- SichrPlace User Authentication Database Optimization
-- This script enhances the existing users table for better authentication integration

-- Add missing columns for enhanced authentication features
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending', 'blocked'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);

-- Update existing role constraint to be more flexible while maintaining compatibility
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'tenant', 'landlord'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a view for user authentication data (excluding sensitive info)
CREATE OR REPLACE VIEW user_auth_view AS
SELECT 
    id,
    username,
    email,
    role,
    first_name,
    last_name,
    phone,
    bio,
    account_status,
    email_verified,
    two_factor_enabled,
    created_at,
    updated_at,
    last_login
FROM users;

-- Create a function to safely create users with role mapping
CREATE OR REPLACE FUNCTION create_user_with_role_mapping(
    p_username VARCHAR(32),
    p_email VARCHAR(64),
    p_password VARCHAR(255),
    p_first_name VARCHAR(50),
    p_last_name VARCHAR(50),
    p_phone VARCHAR(20),
    p_frontend_role VARCHAR(20),
    p_email_verification_token VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_db_role VARCHAR(10);
    v_bio TEXT;
BEGIN
    -- Map frontend roles to database roles
    CASE p_frontend_role
        WHEN 'tenant' THEN 
            v_db_role := 'user';
            v_bio := 'tenant';
        WHEN 'landlord' THEN 
            v_db_role := 'user';
            v_bio := 'landlord';
        WHEN 'admin' THEN 
            v_db_role := 'admin';
            v_bio := 'admin';
        ELSE 
            v_db_role := 'user';
            v_bio := p_frontend_role;
    END CASE;

    -- Insert the user
    INSERT INTO users (
        username,
        email,
        password,
        role,
        first_name,
        last_name,
        phone,
        bio,
        email_verification_token,
        email_verification_expires,
        account_status,
        created_at,
        updated_at
    ) VALUES (
        p_username,
        LOWER(p_email),
        p_password,
        v_db_role,
        p_first_name,
        p_last_name,
        p_phone,
        v_bio,
        p_email_verification_token,
        NOW() + INTERVAL '24 hours',
        'active',
        NOW(),
        NOW()
    ) RETURNING id INTO v_user_id;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update login tracking
CREATE OR REPLACE FUNCTION update_user_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        last_login = NOW(),
        failed_login_attempts = 0,
        last_failed_login = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to track failed login attempts
CREATE OR REPLACE FUNCTION track_failed_login(p_email VARCHAR(64))
RETURNS VOID AS $$
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
        last_failed_login = NOW(),
        updated_at = NOW()
    WHERE email = LOWER(p_email);
    
    -- Auto-suspend account after 5 failed attempts
    UPDATE users 
    SET account_status = 'suspended'
    WHERE email = LOWER(p_email) 
    AND failed_login_attempts >= 5 
    AND account_status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Insert default admin user if it doesn't exist
INSERT INTO users (
    username,
    email,
    password,
    role,
    first_name,
    last_name,
    bio,
    email_verified,
    account_status,
    created_at,
    updated_at
) VALUES (
    'admin',
    'sichrplace@gmail.com',
    '$2b$12$LQv3c1yqBwEHxE5hsHBlVOoUA7jBOjwmBizkJGXHEMqPdpLs.7LYO', -- hashed version of 'Gokhangulec29*'
    'admin',
    'SichrPlace',
    'Admin',
    'admin',
    true,
    'active',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions (adjust based on your RLS policies)
-- Note: These would be run by a database admin

COMMENT ON TABLE users IS 'Enhanced users table with authentication features and role mapping support';
COMMENT ON FUNCTION create_user_with_role_mapping IS 'Safely creates users with proper role mapping from frontend to database schema';
COMMENT ON FUNCTION update_user_login IS 'Updates user login tracking information';
COMMENT ON FUNCTION track_failed_login IS 'Tracks failed login attempts and auto-suspends accounts after threshold';

-- Display optimization summary
SELECT 'User authentication database optimization completed successfully!' as status;
