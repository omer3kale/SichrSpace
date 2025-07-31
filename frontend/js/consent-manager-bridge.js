/**
 * Consent Manager Integration for SichrPlace Analytics
 * Bridges consentmanager.net with Microsoft Clarity and Google Analytics
 * 
 * This script ensures that:
 * - Microsoft Clarity (smib1d4kq5) respects Consent Manager decisions
 * - Google Analytics 4 (G-2FG8XLMM35) respects Consent Manager decisions
 * - GDPR audit logging continues to work
 * - All tracking only happens with proper consent
 */

class ConsentManagerBridge {
    constructor() {
        this.debug = window.location.hostname === 'localhost';
        this.consentData = null;
        this.initialized = false;
        
        this.init();
    }

    init() {
        if (this.debug) {
            console.log('🔗 Consent Manager Bridge initializing...');
        }

        // Wait for Consent Manager to load
        this.waitForConsentManager();
    }

    waitForConsentManager() {
        // Check if Consent Manager is available
        if (typeof window.__cmp === 'function' || window.cmp_waitingQueue) {
            this.setupConsentManagerListeners();
        } else if (typeof window.cmp_addCallback === 'function') {
            // Alternative Consent Manager API
            this.setupAlternativeListeners();
        } else {
            // Wait longer for Consent Manager to load
            setTimeout(() => this.waitForConsentManager(), 100);
        }
    }

    setupConsentManagerListeners() {
        if (this.debug) {
            console.log('🎯 Setting up Consent Manager listeners...');
        }

        // Listen for consent changes
        this.checkConsentStatus();

        // Set up interval to check for consent changes
        setInterval(() => {
            this.checkConsentStatus();
        }, 1000);

        // Listen for window events that might indicate consent changes
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'consent-changed') {
                this.handleConsentChange();
            }
        });
    }

    setupAlternativeListeners() {
        if (typeof window.cmp_addCallback === 'function') {
            window.cmp_addCallback('consent', (consent) => {
                this.handleConsentData(consent);
            });
        }
    }

    checkConsentStatus() {
        try {
            // Try different methods to get consent status
            this.getConsentFromCMP()
                .then(consent => {
                    if (consent && this.hasConsentChanged(consent)) {
                        this.handleConsentData(consent);
                    }
                })
                .catch(error => {
                    if (this.debug) {
                        console.log('Consent check failed (normal during initialization):', error.message);
                    }
                });
        } catch (error) {
            // Silent fail - normal during initialization
        }
    }

    async getConsentFromCMP() {
        return new Promise((resolve, reject) => {
            // Method 1: Standard CMP API
            if (typeof window.__cmp === 'function') {
                window.__cmp('getVendorConsents', null, (result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(new Error('No CMP result'));
                    }
                });
                return;
            }

            // Method 2: Check for consent cookies
            const consentCookie = this.getConsentFromCookie();
            if (consentCookie) {
                resolve(consentCookie);
                return;
            }

            // Method 3: Check localStorage
            const consentStorage = this.getConsentFromStorage();
            if (consentStorage) {
                resolve(consentStorage);
                return;
            }

            reject(new Error('No consent data available'));
        });
    }

    getConsentFromCookie() {
        try {
            // Common consent manager cookie names
            const cookieNames = [
                'euconsent-v2',
                'consentmanager',
                'cmp-data',
                'consent-data'
            ];

            for (const cookieName of cookieNames) {
                const cookie = document.cookie
                    .split('; ')
                    .find(row => row.startsWith(cookieName + '='));
                
                if (cookie) {
                    const value = cookie.split('=')[1];
                    // Try to decode consent data
                    return this.decodeConsentString(value);
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    getConsentFromStorage() {
        try {
            const storageKeys = [
                'cmp-data',
                'consent-data',
                'euconsent-v2'
            ];

            for (const key of storageKeys) {
                const stored = localStorage.getItem(key);
                if (stored) {
                    return JSON.parse(stored);
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    decodeConsentString(consentString) {
        try {
            // Basic consent string parsing
            // This is simplified - real implementations vary by consent manager
            return {
                analytics: consentString.includes('analytics') || consentString.includes('1'),
                marketing: consentString.includes('marketing') || consentString.includes('1'),
                functional: true // Usually always allowed
            };
        } catch (error) {
            return null;
        }
    }

    hasConsentChanged(newConsent) {
        if (!this.consentData) return true;
        
        return (
            this.consentData.analytics !== newConsent.analytics ||
            this.consentData.marketing !== newConsent.marketing ||
            this.consentData.functional !== newConsent.functional
        );
    }

    handleConsentData(consent) {
        this.consentData = consent;
        
        if (this.debug) {
            console.log('🍪 Consent Manager data received:', consent);
        }

        // Apply consent to our analytics systems
        this.applyConsentToAnalytics(consent);
        
        // Update our internal consent system
        this.updateInternalConsent(consent);
        
        // Log for GDPR compliance
        this.logConsentChange(consent);
    }

    applyConsentToAnalytics(consent) {
        // Handle Microsoft Clarity
        if (window.clarityGDPRManagerHybrid) {
            if (consent.analytics) {
                if (!window.clarityGDPRManagerHybrid.getConsentStatus()) {
                    if (this.debug) {
                        console.log('✅ Enabling Microsoft Clarity based on Consent Manager');
                    }
                    window.clarityGDPRManagerHybrid.handleConsentChange({
                        detail: { analytics: true, marketing: consent.marketing }
                    });
                }
            } else {
                if (window.clarityGDPRManagerHybrid.getConsentStatus()) {
                    if (this.debug) {
                        console.log('🛑 Disabling Microsoft Clarity based on Consent Manager');
                    }
                    window.clarityGDPRManagerHybrid.handleConsentChange({
                        detail: { analytics: false, marketing: false }
                    });
                }
            }
        }

        // Handle Google Analytics
        if (window.GoogleAnalyticsManager) {
            if (consent.analytics) {
                if (!window.GoogleAnalyticsManager.isTrackingActive()) {
                    if (this.debug) {
                        console.log('✅ Enabling Google Analytics based on Consent Manager');
                    }
                    window.GoogleAnalyticsManager.handleConsentChange({
                        detail: { analytics: true, marketing: consent.marketing }
                    });
                }
            } else {
                if (window.GoogleAnalyticsManager.isTrackingActive()) {
                    if (this.debug) {
                        console.log('🛑 Disabling Google Analytics based on Consent Manager');
                    }
                    window.GoogleAnalyticsManager.handleConsentChange({
                        detail: { analytics: false, marketing: false }
                    });
                }
            }
        }
    }

    updateInternalConsent(consent) {
        // Update our internal consent system to match Consent Manager
        const internalConsent = {
            analytics: consent.analytics,
            marketing: consent.marketing,
            functional: consent.functional,
            timestamp: new Date().toISOString(),
            source: 'consent_manager',
            version: '1.0'
        };

        try {
            localStorage.setItem('sichrplace_cookie_consent', JSON.stringify(internalConsent));
        } catch (error) {
            console.error('Failed to update internal consent:', error);
        }

        // Dispatch event for other systems
        const event = new CustomEvent('cookieConsentChanged', {
            detail: internalConsent
        });
        document.dispatchEvent(event);
    }

    logConsentChange(consent) {
        try {
            // Log to GDPR audit system
            fetch('/api/gdpr/log-tracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    service: 'consent_manager',
                    event: 'consent_changed',
                    action: consent.analytics ? 'analytics_enabled' : 'analytics_disabled',
                    consent: consent,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    source: 'consentmanager.net'
                })
            }).catch(error => {
                if (this.debug) {
                    console.log('Could not log consent change (normal during development):', error.message);
                }
            });
        } catch (error) {
            console.error('Error logging consent change:', error);
        }
    }

    // Public methods for testing
    getCurrentConsent() {
        return this.consentData;
    }

    forceConsentCheck() {
        this.checkConsentStatus();
    }

    isAnalyticsEnabled() {
        return this.consentData && this.consentData.analytics;
    }

    isMarketingEnabled() {
        return this.consentData && this.consentData.marketing;
    }
}

// Initialize the bridge
window.ConsentManagerBridge = new ConsentManagerBridge();

// Expose global functions for easy testing
window.checkConsentManagerStatus = function() {
    console.log('🔍 Consent Manager Bridge Status:');
    console.log('=====================================');
    console.log('Bridge initialized:', !!window.ConsentManagerBridge);
    console.log('Current consent:', window.ConsentManagerBridge?.getCurrentConsent());
    console.log('Analytics enabled:', window.ConsentManagerBridge?.isAnalyticsEnabled());
    console.log('Marketing enabled:', window.ConsentManagerBridge?.isMarketingEnabled());
    console.log('Clarity active:', window.clarityGDPRManagerHybrid?.getConsentStatus());
    console.log('GA4 active:', window.GoogleAnalyticsManager?.isTrackingActive());
};

// Auto-check status after initialization
setTimeout(() => {
    if (window.ConsentManagerBridge && window.ConsentManagerBridge.debug) {
        window.checkConsentManagerStatus();
    }
}, 2000);
