#!/usr/bin/env node

/**
 * Supabase Migration Status Checker
 * Runs through the codebase and identifies which files have been migrated
 * and which still need attention.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.join(__dirname, '..');

// Files that need migration
const MIGRATION_TARGETS = [
  // Middleware
  { file: 'middleware/auth.js', status: '✅', description: 'Authentication middleware' },
  
  // Routes
  { file: 'routes/auth.js', status: '✅', description: 'Authentication routes' },
  { file: 'routes/admin.js', status: '🚧', description: 'Admin routes' },
  { file: 'routes/gdpr.js', status: '🚧', description: 'GDPR routes' },
  { file: 'routes/gdpr-tracking.js', status: '🚧', description: 'GDPR tracking' },
  { file: 'routes/advancedGdpr.js', status: '🚧', description: 'Advanced GDPR' },
  { file: 'routes/messages.js', status: '🚧', description: 'Message routes' },
  { file: 'routes/googleForms.js', status: '🚧', description: 'Google Forms integration' },
  
  // API endpoints
  { file: 'api/viewing-request.js', status: '✅', description: 'Viewing requests' },
  { file: 'api/viewing-confirmed.js', status: '🚧', description: 'Viewing confirmations' },
  { file: 'api/viewing-ready.js', status: '🚧', description: 'Viewing ready notifications' },
  { file: 'api/viewing-didnt-work-out.js', status: '🚧', description: 'Viewing cancellations' },
  { file: 'api/send-message.js', status: '🚧', description: 'Message sending' },
  { file: 'api/feedback.js', status: '✅', description: 'Feedback system' },
  { file: 'api/upload-apartment.js', status: '🚧', description: 'Apartment uploads' },
  
  // Models (to be removed)
  { file: 'models/User.js', status: '❌', description: 'Replace with UserService' },
  { file: 'models/Apartment.js', status: '❌', description: 'Replace with ApartmentService' },
  { file: 'models/ViewingRequest.js', status: '❌', description: 'Replace with ViewingRequestService' },
  { file: 'models/Message.js', status: '❌', description: 'Replace with MessageService' },
  { file: 'models/Conversation.js', status: '❌', description: 'Replace with MessageService' },
  { file: 'models/Feedback.js', status: '❌', description: 'Replace with GdprService' },
  { file: 'models/GdprRequest.js', status: '❌', description: 'Replace with GdprService' },
  { file: 'models/Consent.js', status: '❌', description: 'Replace with GdprService' },
  { file: 'models/ConsentPurpose.js', status: '❌', description: 'Replace with GdprService' },
  { file: 'models/DataBreach.js', status: '❌', description: 'Replace with GdprService' },
  { file: 'models/DataProcessingLog.js', status: '❌', description: 'Replace with GdprService' },
  { file: 'models/DPIA.js', status: '❌', description: 'Replace with GdprService' },
  { file: 'models/Offer.js', status: '❌', description: 'Replace with OfferService (TBD)' }
];

// New services created
const NEW_SERVICES = [
  { file: 'services/UserService.js', status: '✅', description: 'User management service' },
  { file: 'services/ApartmentService.js', status: '✅', description: 'Apartment management service' },
  { file: 'services/ViewingRequestService.js', status: '✅', description: 'Viewing request service' },
  { file: 'services/MessageService.js', status: '✅', description: 'Message and conversation service' },
  { file: 'services/GdprService.js', status: '✅', description: 'GDPR and feedback service' },
  { file: 'config/supabase.js', status: '✅', description: 'Supabase configuration' }
];

// Database migration files
const MIGRATION_FILES = [
  { file: 'migrations/001_initial_supabase_setup.sql', status: '✅', description: 'Initial database schema' }
];

function checkFileExists(filePath) {
  return fs.existsSync(path.join(BACKEND_DIR, filePath));
}

function checkFileContains(filePath, searchTerm) {
  try {
    const content = fs.readFileSync(path.join(BACKEND_DIR, filePath), 'utf8');
    return content.includes(searchTerm);
  } catch {
    return false;
  }
}

function generateReport() {
  console.log('\n🔄 SUPABASE MIGRATION STATUS REPORT');
  console.log('=====================================\n');
  
  console.log('📊 OVERVIEW:');
  const completed = MIGRATION_TARGETS.filter(t => t.status === '✅').length;
  const inProgress = MIGRATION_TARGETS.filter(t => t.status === '🚧').length;
  const notStarted = MIGRATION_TARGETS.filter(t => t.status === '❌').length;
  
  console.log(`✅ Completed: ${completed}`);
  console.log(`🚧 In Progress: ${inProgress}`);
  console.log(`❌ Not Started: ${notStarted}`);
  console.log(`📈 Progress: ${Math.round((completed / MIGRATION_TARGETS.length) * 100)}%\n`);
  
  console.log('🎯 MIGRATION TARGETS:\n');
  MIGRATION_TARGETS.forEach(target => {
    const exists = checkFileExists(target.file);
    const hasMongoose = exists && checkFileContains(target.file, 'mongoose');
    const hasSupabase = exists && (checkFileContains(target.file, 'supabase') || checkFileContains(target.file, 'Service'));
    
    let status = target.status;
    if (target.status === '🚧' && hasSupabase && !hasMongoose) {
      status = '✅'; // Auto-detect completion
    }
    
    console.log(`${status} ${target.file.padEnd(35)} - ${target.description}`);
    if (!exists) {
      console.log(`   ⚠️  File not found`);
    } else if (hasMongoose && target.status !== '❌') {
      console.log(`   🔴 Still uses Mongoose models`);
    } else if (hasSupabase && target.status === '✅') {
      console.log(`   🟢 Uses Supabase services`);
    }
  });
  
  console.log('\n🚀 NEW SERVICES CREATED:\n');
  NEW_SERVICES.forEach(service => {
    const exists = checkFileExists(service.file);
    console.log(`${exists ? '✅' : '❌'} ${service.file.padEnd(35)} - ${service.description}`);
  });
  
  console.log('\n📋 DATABASE MIGRATION:\n');
  MIGRATION_FILES.forEach(migration => {
    const exists = checkFileExists(migration.file);
    console.log(`${exists ? '✅' : '❌'} ${migration.file.padEnd(35)} - ${migration.description}`);
  });
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Update remaining API routes to use new services');
  console.log('2. Remove old Mongoose models after migration');
  console.log('3. Test all endpoints with Supabase');
  console.log('4. Update frontend API calls if needed');
  console.log('5. Deploy with new environment variables\n');
  
  // Check for common issues
  console.log('🔍 COMMON ISSUES TO CHECK:');
  const serverFile = path.join(BACKEND_DIR, 'server.js');
  if (fs.existsSync(serverFile)) {
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    if (serverContent.includes('mongoose.connect')) {
      console.log('⚠️  server.js still has mongoose.connect');
    }
    if (serverContent.includes('require(\'mongoose\')')) {
      console.log('⚠️  server.js still requires mongoose');
    }
    if (!serverContent.includes('supabase')) {
      console.log('⚠️  server.js doesn\'t use Supabase yet');
    } else {
      console.log('✅ server.js updated for Supabase');
    }
  }
  
  const packageFile = path.join(BACKEND_DIR, 'package.json');
  if (fs.existsSync(packageFile)) {
    const packageContent = fs.readFileSync(packageFile, 'utf8');
    const pkg = JSON.parse(packageContent);
    if (pkg.dependencies && pkg.dependencies.mongoose) {
      console.log('⚠️  package.json still has mongoose dependency');
    }
    if (pkg.dependencies && pkg.dependencies['@supabase/supabase-js']) {
      console.log('✅ package.json has Supabase dependency');
    }
  }
}

if (require.main === module) {
  generateReport();
}

module.exports = { generateReport, MIGRATION_TARGETS, NEW_SERVICES };
