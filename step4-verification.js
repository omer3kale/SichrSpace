#!/usr/bin/env node
/**
 * Step 4 Implementation Verification Script
 * Checks if Step 4 (Enhanced User Experience & Features) is fully integrated
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 STEP 4 IMPLEMENTATION VERIFICATION');
console.log('=====================================');

const projectRoot = '/Users/omer3kale/SichrPlace77/SichrPlace77';
const results = {
  implemented: [],
  missing: [],
  partial: []
};

// Step 4.1: User Dashboard & Profile Management
function checkUserDashboardAndProfiles() {
  console.log('\n📋 Checking Step 4.1: User Dashboard & Profile Management...');
  
  const checks = [
    {
      name: 'Enhanced User Profile API',
      check: () => {
        const authRoutes = path.join(projectRoot, 'backend/routes/auth.js');
        if (!fs.existsSync(authRoutes)) return false;
        const content = fs.readFileSync(authRoutes, 'utf8');
        return content.includes('/profile') && content.includes('firstName') && content.includes('lastName');
      }
    },
    {
      name: 'User Profile Update API',
      check: () => {
        const authRoutes = path.join(projectRoot, 'backend/routes/auth.js');
        if (!fs.existsSync(authRoutes)) return false;
        const content = fs.readFileSync(authRoutes, 'utf8');
        return content.includes('PUT') && content.includes('profile');
      }
    },
    {
      name: 'Profile Picture Upload',
      check: () => {
        const uploadsDir = path.join(projectRoot, 'backend/api/upload-profile.js');
        return fs.existsSync(uploadsDir) || 
               fs.existsSync(path.join(projectRoot, 'backend/routes/profile.js'));
      }
    },
    {
      name: 'User Dashboard Frontend',
      check: () => {
        const dashboards = ['applicant-dashboard.html', 'landlord-dashboard.html', 'admin-dashboard.html'];
        return dashboards.every(dashboard => 
          fs.existsSync(path.join(projectRoot, 'frontend', dashboard))
        );
      }
    },
    {
      name: 'Notification Preferences',
      check: () => {
        const userModel = path.join(projectRoot, 'backend/models/User.js');
        if (!fs.existsSync(userModel)) return false;
        const content = fs.readFileSync(userModel, 'utf8');
        return content.includes('notification') || content.includes('preferences');
      }
    }
  ];

  let passed = 0;
  checks.forEach(check => {
    const result = check.check();
    console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
    if (result) passed++;
  });

  const percentage = Math.round((passed / checks.length) * 100);
  if (percentage === 100) {
    results.implemented.push(`Step 4.1: User Dashboard & Profile Management (${percentage}%)`);
  } else if (percentage > 50) {
    results.partial.push(`Step 4.1: User Dashboard & Profile Management (${percentage}%)`);
  } else {
    results.missing.push(`Step 4.1: User Dashboard & Profile Management (${percentage}%)`);
  }

  return percentage;
}

// Step 4.2: Favorites & Saved Searches System
function checkFavoritesAndSavedSearches() {
  console.log('\n⭐ Checking Step 4.2: Favorites & Saved Searches System...');
  
  const checks = [
    {
      name: 'Favorites API Routes',
      check: () => {
        const favoritesApi = path.join(projectRoot, 'backend/api/favorites.js');
        return fs.existsSync(favoritesApi);
      }
    },
    {
      name: 'Favorites Backend Integration',
      check: () => {
        const serverFile = path.join(projectRoot, 'backend/server.js');
        if (!fs.existsSync(serverFile)) return false;
        const content = fs.readFileSync(serverFile, 'utf8');
        return content.includes('favorites') || content.includes('/api/favorites');
      }
    },
    {
      name: 'Frontend Favorites System',
      check: () => {
        const apartmentsListing = path.join(projectRoot, 'frontend/apartments-listing.html');
        if (!fs.existsSync(apartmentsListing)) return false;
        const content = fs.readFileSync(apartmentsListing, 'utf8');
        return content.includes('toggleFavorite') && content.includes('favoriteOffers');
      }
    },
    {
      name: 'Saved Searches API',
      check: () => {
        const searchApi = path.join(projectRoot, 'backend/api/saved-searches.js');
        return fs.existsSync(searchApi) || 
               fs.existsSync(path.join(projectRoot, 'backend/routes/searches.js'));
      }
    },
    {
      name: 'User Favorites Database Table',
      check: () => {
        try {
          const backendFiles = fs.readdirSync(path.join(projectRoot, 'backend'), { recursive: true })
            .filter(file => typeof file === 'string' && (file.includes('migration') || file.includes('supabase') || file.includes('.sql')))
            .map(file => path.join(projectRoot, 'backend', file));
          
          return backendFiles.some(file => {
            try {
              if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
              const content = fs.readFileSync(file, 'utf8');
              return content.includes('user_favorites') || content.includes('favorites');
            } catch (e) {
              return false;
            }
          });
        } catch (e) {
          // Check if favorites API exists as alternative evidence
          return fs.existsSync(path.join(projectRoot, 'backend/api/favorites.js'));
        }
      }
    },
    {
      name: 'Recently Viewed System',
      check: () => {
        const apartmentsListing = path.join(projectRoot, 'frontend/apartments-listing.html');
        if (!fs.existsSync(apartmentsListing)) return false;
        const content = fs.readFileSync(apartmentsListing, 'utf8');
        return content.includes('recently') || content.includes('viewed');
      }
    }
  ];

  let passed = 0;
  checks.forEach(check => {
    const result = check.check();
    console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
    if (result) passed++;
  });

  const percentage = Math.round((passed / checks.length) * 100);
  if (percentage === 100) {
    results.implemented.push(`Step 4.2: Favorites & Saved Searches System (${percentage}%)`);
  } else if (percentage > 50) {
    results.partial.push(`Step 4.2: Favorites & Saved Searches System (${percentage}%)`);
  } else {
    results.missing.push(`Step 4.2: Favorites & Saved Searches System (${percentage}%)`);
  }

  return percentage;
}

// Step 4.3: Reviews & Rating System
function checkReviewsAndRatings() {
  console.log('\n⭐ Checking Step 4.3: Reviews & Rating System...');
  
  const checks = [
    {
      name: 'Reviews API Routes',
      check: () => {
        const reviewsApi = path.join(projectRoot, 'backend/api/reviews.js');
        return fs.existsSync(reviewsApi) || 
               fs.existsSync(path.join(projectRoot, 'backend/routes/reviews.js'));
      }
    },
    {
      name: 'Reviews Database Models',
      check: () => {
        const reviewModel = path.join(projectRoot, 'backend/models/Review.js');
        return fs.existsSync(reviewModel);
      }
    },
    {
      name: 'Frontend Reviews Display',
      check: () => {
        const apartmentsListing = path.join(projectRoot, 'frontend/apartments-listing.html');
        if (!fs.existsSync(apartmentsListing)) return false;
        const content = fs.readFileSync(apartmentsListing, 'utf8');
        return content.includes('rating') || content.includes('review');
      }
    },
    {
      name: 'Post-Viewing Review System',
      check: () => {
        const viewingDashboard = path.join(projectRoot, 'frontend/viewing-requests-dashboard.html');
        if (!fs.existsSync(viewingDashboard)) return false;
        const content = fs.readFileSync(viewingDashboard, 'utf8');
        return content.includes('review') || content.includes('rating');
      }
    },
    {
      name: 'Review Moderation System',
      check: () => {
        const adminDashboard = path.join(projectRoot, 'frontend/admin-dashboard.html');
        if (!fs.existsSync(adminDashboard)) return false;
        const content = fs.readFileSync(adminDashboard, 'utf8');
        return content.includes('review') && content.includes('moderate');
      }
    }
  ];

  let passed = 0;
  checks.forEach(check => {
    const result = check.check();
    console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
    if (result) passed++;
  });

  const percentage = Math.round((passed / checks.length) * 100);
  if (percentage === 100) {
    results.implemented.push(`Step 4.3: Reviews & Rating System (${percentage}%)`);
  } else if (percentage > 50) {
    results.partial.push(`Step 4.3: Reviews & Rating System (${percentage}%)`);
  } else {
    results.missing.push(`Step 4.3: Reviews & Rating System (${percentage}%)`);
  }

  return percentage;
}

// Additional Step 4 Features
function checkAdditionalStep4Features() {
  console.log('\n🔔 Checking Additional Step 4 Features...');
  
  const checks = [
    {
      name: 'In-app Notifications System',
      check: () => {
        const notificationsApi = path.join(projectRoot, 'backend/api/notifications.js');
        return fs.existsSync(notificationsApi) || 
               fs.existsSync(path.join(projectRoot, 'backend/routes/notifications.js'));
      }
    },
    {
      name: 'User Verification System',
      check: () => {
        const authRoutes = path.join(projectRoot, 'backend/routes/auth.js');
        if (!fs.existsSync(authRoutes)) return false;
        const content = fs.readFileSync(authRoutes, 'utf8');
        return content.includes('verify') || content.includes('verification');
      }
    },
    {
      name: 'Enhanced Search Filters',
      check: () => {
        const apartmentsListing = path.join(projectRoot, 'frontend/apartments-listing.html');
        if (!fs.existsSync(apartmentsListing)) return false;
        const content = fs.readFileSync(apartmentsListing, 'utf8');
        return content.includes('filter') && content.includes('search');
      }
    },
    {
      name: 'User Activity Tracking',
      check: () => {
        const analyticsDir = path.join(projectRoot, 'backend/services/analytics.js');
        return fs.existsSync(analyticsDir) || 
               fs.existsSync(path.join(projectRoot, 'backend/middleware/analytics.js'));
      }
    }
  ];

  let passed = 0;
  checks.forEach(check => {
    const result = check.check();
    console.log(`  ${result ? '✅' : '❌'} ${check.name}`);
    if (result) passed++;
  });

  const percentage = Math.round((passed / checks.length) * 100);
  return percentage;
}

// Main verification
function runVerification() {
  console.log('🚀 Starting Step 4 Implementation Verification...\n');

  const step41 = checkUserDashboardAndProfiles();
  const step42 = checkFavoritesAndSavedSearches();
  const step43 = checkReviewsAndRatings();
  const additional = checkAdditionalStep4Features();

  const overallPercentage = Math.round((step41 + step42 + step43 + additional) / 4);

  console.log('\n📊 STEP 4 VERIFICATION SUMMARY');
  console.log('================================');
  console.log(`Step 4.1 (User Dashboards): ${step41}%`);
  console.log(`Step 4.2 (Favorites): ${step42}%`);
  console.log(`Step 4.3 (Reviews): ${step43}%`);
  console.log(`Additional Features: ${additional}%`);
  console.log(`\n🎯 OVERALL STEP 4 COMPLETION: ${overallPercentage}%`);

  console.log('\n✅ FULLY IMPLEMENTED:');
  results.implemented.forEach(item => console.log(`  • ${item}`));

  console.log('\n🔄 PARTIALLY IMPLEMENTED:');
  results.partial.forEach(item => console.log(`  • ${item}`));

  console.log('\n❌ NOT IMPLEMENTED:');
  results.missing.forEach(item => console.log(`  • ${item}`));

  console.log('\n🎯 STEP 4 STATUS:');
  if (overallPercentage >= 90) {
    console.log('  🎉 STEP 4 IS FULLY INTEGRATED!');
  } else if (overallPercentage >= 70) {
    console.log('  🔄 STEP 4 IS MOSTLY INTEGRATED - Minor components missing');
  } else if (overallPercentage >= 50) {
    console.log('  ⚠️  STEP 4 IS PARTIALLY INTEGRATED - Significant work needed');
  } else {
    console.log('  ❌ STEP 4 IS NOT INTEGRATED - Implementation required');
  }

  console.log('\n📋 RECOMMENDATION:');
  if (overallPercentage < 70) {
    console.log('  Focus on implementing missing Step 4 components.');
    console.log('  Priority order: User Dashboards → Favorites → Reviews');
  } else {
    console.log('  Step 4 foundation is solid! Consider enhancing existing features.');
  }

  return overallPercentage;
}

// Run the verification
if (require.main === module) {
  runVerification();
}

module.exports = { runVerification };
