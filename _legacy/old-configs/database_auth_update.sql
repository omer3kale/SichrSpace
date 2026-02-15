-- SichrPlace Authentication System Database Schema Updates
-- This script updates the users table to support the enhanced authentication system

-- First, let's check and update the users table structure
-- Add missing columns for enhanced authentication

-- 1. Add email verification expiration column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verification_expires') THEN
        ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Add failed login tracking columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'failed_login_attempts') THEN
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'locked_until') THEN
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Add security tracking columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'password_changed_at') THEN
        ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 4. Update role constraint to include our authentication roles
DO $$ 
BEGIN
    -- Drop existing role constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'users' AND constraint_name LIKE '%role%') THEN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    END IF;
    
    -- Add new role constraint with our required roles
    ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('tenant', 'landlord', 'admin', 'user'));
END $$;

-- 5. Ensure email is unique
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'users' AND constraint_name = 'users_email_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

-- 6. Ensure username is unique (optional, can be nullable for email-only auth)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'users' AND constraint_name = 'users_username_key') THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 8. Update any existing users to have default values
UPDATE users 
SET 
    failed_login_attempts = 0,
    password_changed_at = COALESCE(password_changed_at, created_at),
    email_verified = COALESCE(email_verified, false)
WHERE failed_login_attempts IS NULL 
   OR password_changed_at IS NULL;

-- 9. Set default role for existing users without roles
UPDATE users 
SET role = 'user' 
WHERE role IS NULL OR role = '';

-- 10. Create a function to generate usernames from email if needed
CREATE OR REPLACE FUNCTION generate_username_from_email(email_input TEXT)
RETURNS TEXT AS $$
DECLARE
    base_username TEXT;
    counter INTEGER := 0;
    final_username TEXT;
BEGIN
    -- Extract username part from email and clean it
    base_username := REGEXP_REPLACE(
        SPLIT_PART(email_input, '@', 1), 
        '[^a-zA-Z0-9]', '', 'g'
    );
    
    -- Ensure minimum length
    IF LENGTH(base_username) < 3 THEN
        base_username := 'user' || base_username;
    END IF;
    
    -- Check if username exists and increment counter if needed
    final_username := base_username;
    WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := base_username || counter::TEXT;
    END LOOP;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- 11. Update any users with missing usernames
UPDATE users 
SET username = generate_username_from_email(email)
WHERE username IS NULL OR username = '';

-- 12. Ensure all columns have appropriate constraints
ALTER TABLE users 
    ALTER COLUMN email SET NOT NULL,
    ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN email_verified SET DEFAULT false,
    ALTER COLUMN failed_login_attempts SET DEFAULT 0,
    ALTER COLUMN created_at SET DEFAULT NOW();

-- 13. Create a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 14. Enable Row Level Security (RLS) for enhanced security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow public registration (insert)
DROP POLICY IF EXISTS "Allow public registration" ON users;
CREATE POLICY "Allow public registration" ON users
    FOR INSERT WITH CHECK (true);

-- Admin can see all users
DROP POLICY IF EXISTS "Admin can view all users" ON users;
CREATE POLICY "Admin can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Service role can do everything (for our backend)
DROP POLICY IF EXISTS "Service role full access" ON users;
CREATE POLICY "Service role full access" ON users
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE users IS 'Enhanced users table with comprehensive authentication support';
COMMENT ON COLUMN users.email_verification_expires IS 'Timestamp when email verification token expires';
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.locked_until IS 'Timestamp until which the account is locked';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp when password was last changed';

-- Output success message
SELECT 'SichrPlace Authentication Database Schema Updated Successfully!' as status;
