-- Enable Supabase Realtime for SichrPlace Chat
-- Run this in your Supabase SQL Editor

-- Enable realtime for messages table (core chat functionality)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for conversations table (chat rooms)
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Enable realtime for users table (online presence)
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Verify what tables have realtime enabled
SELECT 
    schemaname,
    tablename 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime'
ORDER BY tablename;
