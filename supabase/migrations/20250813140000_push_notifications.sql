-- Migration: Add push_subscriptions table for PWA push notifications
-- Created: 2025-08-13

-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, endpoint),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_push_subscriptions_updated_at 
    BEFORE UPDATE ON push_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
    FOR DELETE USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for sending notifications)
CREATE POLICY "Service role can manage all push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Add notification preferences to user profile
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "push_enabled": true,
    "email_enabled": true,
    "marketing_enabled": false,
    "new_messages": true,
    "viewing_requests": true,
    "new_apartments": true,
    "system_updates": true
}'::jsonb;

-- Add indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_users_notification_preferences ON users USING GIN (notification_preferences);

-- Function to send notification (placeholder for integration)
CREATE OR REPLACE FUNCTION send_push_notification(
    user_ids UUID[],
    title TEXT,
    body TEXT,
    notification_type TEXT DEFAULT 'general',
    data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    subscription_count INTEGER;
BEGIN
    -- Count active subscriptions for the users
    SELECT COUNT(*) INTO subscription_count
    FROM push_subscriptions 
    WHERE user_id = ANY(user_ids);
    
    -- Return metadata about the notification
    result := jsonb_build_object(
        'success', true,
        'user_count', array_length(user_ids, 1),
        'subscription_count', subscription_count,
        'title', title,
        'body', body,
        'type', notification_type,
        'timestamp', NOW()
    );
    
    -- Log the notification request
    INSERT INTO system_logs (
        log_level,
        message,
        metadata,
        created_at
    ) VALUES (
        'INFO',
        'Push notification request',
        result,
        NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired subscriptions
CREATE OR REPLACE FUNCTION cleanup_expired_push_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete subscriptions older than 6 months without recent activity
    DELETE FROM push_subscriptions
    WHERE updated_at < NOW() - INTERVAL '6 months';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup
    INSERT INTO system_logs (
        log_level,
        message,
        metadata,
        created_at
    ) VALUES (
        'INFO',
        'Push subscription cleanup completed',
        jsonb_build_object('deleted_count', deleted_count),
        NOW()
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions for PWA';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh_key IS 'ECDH public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth_key IS 'Authentication secret for encryption';

COMMENT ON FUNCTION send_push_notification IS 'Logs push notification requests and returns metadata';
COMMENT ON FUNCTION cleanup_expired_push_subscriptions IS 'Removes old push subscriptions to maintain database health';
