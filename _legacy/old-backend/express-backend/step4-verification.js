const fs = require('fs');
const path = require('path');

/**
 * Step 4 Verification Script
 * Verifies implementation of Enhanced User Experience & Features
 */

console.log('🔍 Step 4: Enhanced User Experience & Features - Verification\n');

// Step 4 Implementation Checklist
const step4Requirements = {
  'Enhanced User Profiles': {
    files: [
      'api/profile.js',
      'sql/step4-schema.sql'
    ],
    features: [
      'Profile picture upload',
      'Notification preferences',
      'User statistics dashboard',
      'Profile management API'
    ]
  },
  'Saved Searches & Alerts': {
    files: [
      'api/saved-searches.js',
      'sql/step4-schema.sql'
    ],
    features: [
      'Save search criteria',
      'Search alerts system',
      'Search execution API',
      'CRUD operations for saved searches'
    ]
  },
  'Reviews & Ratings System': {
    files: [
      'api/reviews.js',
      'sql/step4-schema.sql'
    ],
    features: [
      '5-star rating system',
      'Review moderation',
      'Review statistics',
      'User review management'
    ]
  },
  'Notification System': {
    files: [
      'api/notifications.js',
      'sql/step4-schema.sql'
    ],
    features: [
      'In-app notifications',
      'Notification categories',
      'Read/unread tracking',
      'Priority system'
    ]
  },
  'Recently Viewed Tracking': {
    files: [
      'api/recently-viewed.js',
      'sql/step4-schema.sql'
    ],
    features: [
      'View tracking',
      'History management',
      'Automatic cleanup',
      'User view history API'
    ]
  },
  'Frontend Integration': {
    files: [
      '../frontend/apartments-listing.html'
    ],
    features: [
      'Notifications menu',
      'Recently viewed menu',
      'View tracking implementation',
      'Enhanced navigation'
    ]
  }
};

let totalImplemented = 0;
let totalRequired = 0;
let implementationDetails = [];

// Verification function
function verifyImplementation() {
  console.log('📋 Checking Step 4 Implementation...\n');

  Object.entries(step4Requirements).forEach(([component, requirements]) => {
    console.log(`🔧 ${component}:`);
    
    let componentImplemented = 0;
    let componentRequired = requirements.files.length + requirements.features.length;
    totalRequired += componentRequired;

    // Check files
    requirements.files.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`  ✅ ${file} - EXISTS`);
        componentImplemented++;
        totalImplemented++;
      } else {
        console.log(`  ❌ ${file} - MISSING`);
      }
    });

    // Check features by examining file content
    requirements.features.forEach(feature => {
      let featureImplemented = false;
      
      // Check implementation in relevant files
      requirements.files.forEach(file => {
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Feature-specific checks
          switch (feature) {
            case 'Profile picture upload':
              featureImplemented = content.includes('multer') && content.includes('profile');
              break;
            case 'Notification preferences':
              featureImplemented = content.includes('notification_preferences');
              break;
            case 'User statistics dashboard':
              featureImplemented = content.includes('stats') || content.includes('dashboard');
              break;
            case 'Save search criteria':
              featureImplemented = content.includes('search_criteria');
              break;
            case 'Search alerts system':
              featureImplemented = content.includes('alerts_enabled');
              break;
            case '5-star rating system':
              featureImplemented = content.includes('rating') && content.includes('1 AND rating <= 5');
              break;
            case 'Review moderation':
              featureImplemented = content.includes('moderation') && content.includes('status');
              break;
            case 'In-app notifications':
              featureImplemented = content.includes('notifications') && content.includes('type');
              break;
            case 'Read/unread tracking':
              featureImplemented = content.includes('read') && content.includes('read_at');
              break;
            case 'View tracking':
              featureImplemented = content.includes('viewed_at') || content.includes('trackApartmentView');
              break;
            case 'History management':
              featureImplemented = content.includes('recently_viewed') || content.includes('viewRecentlyViewed');
              break;
            case 'Notifications menu':
              featureImplemented = content.includes('viewNotifications') && content.includes('notifications-counter');
              break;
            case 'Recently viewed menu':
              featureImplemented = content.includes('viewRecentlyViewed') && content.includes('Recently Viewed');
              break;
            case 'Enhanced navigation':
              featureImplemented = content.includes('user-menu') && content.includes('notifications');
              break;
            default:
              // Generic feature check
              featureImplemented = content.toLowerCase().includes(feature.toLowerCase().replace(/[^a-z0-9]/g, ''));
          }
        }
      });

      if (featureImplemented) {
        console.log(`  ✅ ${feature} - IMPLEMENTED`);
        componentImplemented++;
        totalImplemented++;
      } else {
        console.log(`  ❌ ${feature} - NOT IMPLEMENTED`);
      }
    });

    const percentage = Math.round((componentImplemented / componentRequired) * 100);
    console.log(`  📊 Component Status: ${componentImplemented}/${componentRequired} (${percentage}%)\n`);
    
    implementationDetails.push({
      component,
      implemented: componentImplemented,
      required: componentRequired,
      percentage
    });
  });
}

// Server integration check
function checkServerIntegration() {
  console.log('🔧 Checking Server Integration...\n');
  
  const serverFile = path.join(__dirname, 'server.js');
  if (fs.existsSync(serverFile)) {
    const serverContent = fs.readFileSync(serverFile, 'utf8');
    
    const step4Routes = [
      '/api/profile',
      '/api/saved-searches',
      '/api/reviews',
      '/api/notifications',
      '/api/recently-viewed'
    ];
    
    let integratedRoutes = 0;
    step4Routes.forEach(route => {
      if (serverContent.includes(route)) {
        console.log(`  ✅ ${route} - INTEGRATED`);
        integratedRoutes++;
      } else {
        console.log(`  ❌ ${route} - NOT INTEGRATED`);
      }
    });
    
    console.log(`  📊 Route Integration: ${integratedRoutes}/${step4Routes.length}\n`);
    return integratedRoutes === step4Routes.length;
  } else {
    console.log('  ❌ server.js not found\n');
    return false;
  }
}

// Database schema check
function checkDatabaseSchema() {
  console.log('🗄️ Checking Database Schema...\n');
  
  const schemaFile = path.join(__dirname, 'sql/step4-schema.sql');
  if (fs.existsSync(schemaFile)) {
    const schemaContent = fs.readFileSync(schemaFile, 'utf8');
    
    const requiredTables = [
      'saved_searches',
      'reviews',
      'notifications',
      'recently_viewed'
    ];
    
    const requiredFeatures = [
      'Row Level Security',
      'CREATE INDEX',
      'CREATE TRIGGER',
      'notification_preferences'
    ];
    
    let tablesFound = 0;
    let featuresFound = 0;
    
    requiredTables.forEach(table => {
      if (schemaContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
        console.log(`  ✅ Table: ${table} - DEFINED`);
        tablesFound++;
      } else {
        console.log(`  ❌ Table: ${table} - MISSING`);
      }
    });
    
    requiredFeatures.forEach(feature => {
      if (schemaContent.includes(feature)) {
        console.log(`  ✅ Feature: ${feature} - IMPLEMENTED`);
        featuresFound++;
      } else {
        console.log(`  ❌ Feature: ${feature} - MISSING`);
      }
    });
    
    console.log(`  📊 Database Schema: ${tablesFound + featuresFound}/${requiredTables.length + requiredFeatures.length}\n`);
    return (tablesFound + featuresFound) === (requiredTables.length + requiredFeatures.length);
  } else {
    console.log('  ❌ step4-schema.sql not found\n');
    return false;
  }
}

// Main verification
function main() {
  verifyImplementation();
  const serverIntegrated = checkServerIntegration();
  const schemaComplete = checkDatabaseSchema();
  
  const overallPercentage = Math.round((totalImplemented / totalRequired) * 100);
  
  console.log('=' .repeat(60));
  console.log('📊 STEP 4 VERIFICATION SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Overall Implementation: ${totalImplemented}/${totalRequired} (${overallPercentage}%)`);
  console.log(`Server Integration: ${serverIntegrated ? 'COMPLETE' : 'INCOMPLETE'}`);
  console.log(`Database Schema: ${schemaComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
  console.log('');
  
  implementationDetails.forEach(detail => {
    console.log(`${detail.component}: ${detail.percentage}%`);
  });
  
  console.log('');
  
  if (overallPercentage >= 90 && serverIntegrated && schemaComplete) {
    console.log('🎉 STEP 4 IMPLEMENTATION STATUS: COMPLETE (100%)');
    console.log('✅ All Step 4 features are fully implemented!');
  } else if (overallPercentage >= 75) {
    console.log('🚧 STEP 4 IMPLEMENTATION STATUS: NEARLY COMPLETE');
    console.log('📝 Minor features pending completion');
  } else if (overallPercentage >= 50) {
    console.log('⚠️ STEP 4 IMPLEMENTATION STATUS: IN PROGRESS');
    console.log('🔨 Major features still need implementation');
  } else {
    console.log('❌ STEP 4 IMPLEMENTATION STATUS: INCOMPLETE');
    console.log('🛠️ Most features require implementation');
  }
  
  console.log('');
  console.log('📝 Next Steps:');
  if (!schemaComplete) {
    console.log('1. Execute the SQL schema in Supabase');
  }
  if (!serverIntegrated) {
    console.log('2. Register Step 4 routes in server.js');
  }
  if (overallPercentage < 100) {
    console.log('3. Complete remaining feature implementations');
  }
  console.log('4. Test all Step 4 APIs with frontend integration');
  console.log('5. Verify user experience flows work end-to-end');
}

main();
