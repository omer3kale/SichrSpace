/**
 * Analytics Verification Script
 * Quick test to verify both Microsoft Clarity and Google Analytics are working
 * Use this in browser console to test your dual analytics setup
 */

function verifyAnalyticsSetup() {
    console.log('🔍 SichrPlace Analytics Verification (with Consent Manager)');
    console.log('===========================================================');
    
    // Check Consent Manager
    console.log('\n🏛️ Consent Manager Status:');
    if (window.ConsentManagerBridge) {
        console.log('✅ Consent Manager Bridge: Loaded');
        console.log('📋 Current Consent:', window.ConsentManagerBridge.getCurrentConsent());
        console.log('🎯 Analytics Enabled:', window.ConsentManagerBridge.isAnalyticsEnabled());
        console.log('📢 Marketing Enabled:', window.ConsentManagerBridge.isMarketingEnabled());
    } else {
        console.log('❌ Consent Manager Bridge: Not loaded');
    }
    
    // Check Microsoft Clarity
    console.log('\n📊 Microsoft Clarity Status:');
    if (window.clarityGDPRManagerHybrid) {
        console.log('✅ Clarity Manager: Loaded');
        console.log('📋 Project ID:', window.clarityGDPRManagerHybrid.projectId || 'smib1d4kq5');
        console.log('🎯 Consent Status:', window.clarityGDPRManagerHybrid.getConsentStatus());
        console.log('🔧 Implementation:', window.clarityGDPRManagerHybrid.getImplementationType());
    } else {
        console.log('❌ Clarity Manager: Not loaded');
    }
    
    // Check Google Analytics
    console.log('\n📈 Google Analytics 4 Status:');
    if (window.GoogleAnalyticsManager) {
        console.log('✅ GA Manager: Loaded');
        console.log('📋 Measurement ID:', window.GoogleAnalyticsManager.getTrackingId());
        console.log('🎯 Tracking Active:', window.GoogleAnalyticsManager.isTrackingActive());
        console.log('🔧 Consent Status:', window.GoogleAnalyticsManager.isConsented ? 'Consented' : 'Not Consented');
    } else {
        console.log('❌ GA Manager: Not loaded');
    }
    
    // Check Cookie Consent
    console.log('\n🍪 Cookie Consent Status:');
    try {
        const consent = localStorage.getItem('sichrplace_cookie_consent');
        if (consent) {
            const consentData = JSON.parse(consent);
            console.log('✅ Consent Data:', consentData);
        } else {
            console.log('⚠️ No consent data found');
        }
    } catch (error) {
        console.log('❌ Error reading consent:', error.message);
    }
    
    // Network Check
    console.log('\n🌐 Network Requests Check:');
    console.log('Look in Network tab for:');
    console.log('- Microsoft Clarity: clarity.ms/tag/smib1d4kq5');
    console.log('- Google Analytics: googletagmanager.com/gtag/js?id=G-2FG8XLMM35');
    
    // Test Functions
    console.log('\n🧪 Test Functions Available:');
    console.log('- testClarityTracking()');
    console.log('- testGoogleAnalyticsTracking()');
    console.log('- testDualTracking()');
    
    console.log('\n✅ Verification Complete!');
}

function testClarityTracking() {
    console.log('🧪 Testing Microsoft Clarity Tracking...');
    if (window.clarityGDPRManagerHybrid && window.clarityGDPRManagerHybrid.getConsentStatus()) {
        window.clarityGDPRManagerHybrid.trackEvent('test_event', {
            source: 'console_test',
            timestamp: new Date().toISOString()
        });
        console.log('✅ Clarity test event sent');
    } else {
        console.log('❌ Clarity not available or no consent');
    }
}

function testGoogleAnalyticsTracking() {
    console.log('🧪 Testing Google Analytics Tracking...');
    if (window.GoogleAnalyticsManager && window.GoogleAnalyticsManager.isTrackingActive()) {
        window.GoogleAnalyticsManager.trackEvent('test_event', {
            event_category: 'console_test',
            event_label: 'manual_verification',
            source: 'verification_script'
        });
        console.log('✅ Google Analytics test event sent');
    } else {
        console.log('❌ Google Analytics not available or no consent');
    }
}

function testDualTracking() {
    console.log('🧪 Testing Dual Analytics Tracking...');
    
    // Test both systems
    testClarityTracking();
    testGoogleAnalyticsTracking();
    
    // Global function tests
    if (typeof window.trackGAEvent === 'function') {
        window.trackGAEvent('dual_test', {
            event_category: 'verification',
            event_label: 'dual_tracking_test'
        });
        console.log('✅ Global GA function test sent');
    }
    
    console.log('🎯 Dual tracking test complete!');
}

// Auto-run verification
verifyAnalyticsSetup();

// Instructions
console.log('\n📋 Quick Test Instructions:');
console.log('1. Accept analytics cookies if prompted');
console.log('2. Run: testDualTracking()');
console.log('3. Check Network tab for requests');
console.log('4. Check your analytics dashboards in 2-3 minutes');

// Export functions globally for easy testing
window.verifyAnalyticsSetup = verifyAnalyticsSetup;
window.testClarityTracking = testClarityTracking;
window.testGoogleAnalyticsTracking = testGoogleAnalyticsTracking;
window.testDualTracking = testDualTracking;
