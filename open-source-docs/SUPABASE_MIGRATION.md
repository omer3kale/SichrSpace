# Supabase Migration Guide

## Environment Variables

Add these variables to your `.env` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Remove these MongoDB variables (no longer needed)
# MONGODB_URI=
# MONGO_URI=
```

## Getting Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project
3. Go to Settings > API
4. Copy the following:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `backend/migrations/001_initial_supabase_setup.sql`
4. This will create all necessary tables and set up Row Level Security

## Migration Status

### ✅ Completed
- [x] Supabase client configuration
- [x] Database schema migration script
- [x] UserService (replaces User model)
- [x] ApartmentService (replaces Apartment model)
- [x] ViewingRequestService (replaces ViewingRequest model)
- [x] Updated package.json dependencies
- [x] Updated server.js connection

### 🚧 In Progress
- [ ] Update auth middleware to use Supabase
- [ ] Update API routes to use new services
- [ ] Migrate existing API endpoints
- [ ] Update frontend API calls
- [ ] Test all functionality

### 📋 TODO - Update These Files
1. `backend/middleware/auth.js` - Update to use UserService
2. `backend/routes/auth.js` - Update authentication logic
3. `backend/api/*.js` - Update all API endpoints
4. Frontend forms and JavaScript - Update API calls

## Benefits of Supabase Migration

1. **Better Performance**: PostgreSQL is more robust than MongoDB for relational data
2. **Real-time Features**: Built-in subscriptions for live updates
3. **Built-in Auth**: Supabase handles authentication, email verification, etc.
4. **Row Level Security**: Better data protection at the database level
5. **Better Scaling**: PostgreSQL scales better for complex queries
6. **SQL Support**: Use familiar SQL instead of MongoDB queries

## Database Structure

### Key Changes from MongoDB:
- `_id` → `id` (UUID instead of ObjectId)
- Proper foreign key relationships
- Timestamp fields use PostgreSQL timestamp with timezone
- Array fields properly supported in PostgreSQL
- Better indexing for performance

### New Features:
- Row Level Security policies
- Automatic updated_at triggers
- UUID primary keys
- Better data validation at database level

## Testing the Migration

1. Set up your `.env` file with Supabase credentials
2. Run the SQL migration script in Supabase
3. Start your server: `npm run dev`
4. Check the console for "✅ Connected to Supabase successfully"
5. Test API endpoints that have been migrated

## Need Help?

- Supabase Documentation: https://supabase.com/docs
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Migration issues: Check the console logs for specific errors
