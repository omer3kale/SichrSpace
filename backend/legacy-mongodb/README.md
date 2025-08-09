# Legacy MongoDB Files

This directory contains files from the previous MongoDB/Mongoose-based implementation of SichrPlace77.

**⚠️ These files are NO LONGER USED in the current application.**

## Migration Status

The application has been **successfully migrated to Supabase PostgreSQL**. All the functionality previously provided by these MongoDB models is now handled by:

- **Database**: Supabase PostgreSQL tables
- **Services**: Located in `/backend/services/`
- **Models**: Database interactions handled by Supabase client

## Contents

- **models/**: Old Mongoose schema definitions
- **tests/**: Old test files that used MongoDB models
- **server-fixed.js**: Previous server implementation with MongoDB
- **seedDemoData.js**: Old data seeding script for MongoDB
- **privacyComplianceScanner.js**: Old GDPR compliance scanner using Mongoose

## Current Implementation

For the current Supabase-based implementation, refer to:
- `/backend/services/` - Business logic services
- `/backend/config/supabase.js` - Database configuration
- `/backend/server.js` - Current server implementation
- Database schema is managed in Supabase dashboard

## Why These Files Were Kept

These files are preserved for:
1. **Historical reference** - Understanding the migration process
2. **Documentation** - Original business logic and data structures
3. **Backup** - In case any functionality needs to be cross-referenced

## Clean Up

If you're certain all functionality has been migrated successfully, this entire directory can be safely deleted.
