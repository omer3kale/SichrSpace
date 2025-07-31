/**
 * Microsoft Clarity Configuration with GDPR Compliance
 * Handles user consent management and privacy-compliant tracking
 */

class ClarityGDPRManager {
    constructor() {
        this.clarityProjectId = 'smib1d4kq5'; // Your actual Clarity project ID
        this.consentStorage = 'clarity_consent';
        this.isInitialized = false;
        this.consentGiven = false;
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize Clarity manager
     */
    init() {
        console.log('Initializing Clarity GDPR Manager...');
        
        // Check existing consent
        this.checkExistingConsent();
        
        // Set up consent listeners
        this.setupConsentListeners();
        
        // If consent already given, initialize Clarity
        if (this.consentGiven) {
            this.initializeClarity();
        }
    }

    /**
     * Check for existing user consent
     */
    checkExistingConsent() {
        try {
            const storedConsent = localStorage.getItem(this.consentStorage);
            if (storedConsent) {
                const consentData = JSON.parse(storedConsent);
                
                // Check if consent is still valid (not expired)
                if (consentData.expiryDate && new Date() < new Date(consentData.expiryDate)) {
                    this.consentGiven = consentData.analytics === true;
                    console.log('Existing consent found:', this.consentGiven ? 'Granted' : 'Denied');
                } else {
                    // Consent expired, remove it
                    localStorage.removeItem(this.consentStorage);
                    console.log('Consent expired, removed from storage');
                }
            }
        } catch (error) {
            console.error('Error checking existing consent:', error);
            // Clean up corrupted data
            localStorage.removeItem(this.consentStorage);
        }
    }

    /**
     * Set up event listeners for consent changes
     */
    setupConsentListeners() {
        // Listen for custom consent events
        document.addEventListener('cookieConsentChanged', (event) => {
            this.handleConsentChange(event.detail);
        });

        // Listen for privacy settings updates
        document.addEventListener('privacySettingsUpdated', (event) => {
            this.handleConsentChange(event.detail);
        });
    }

    /**
     * Handle consent change events
     * @param {Object} consentData - The consent data object
     */
    handleConsentChange(consentData) {
        console.log('Consent change detected:', consentData);
        
        const analyticsConsent = consentData.analytics || false;
        
        if (analyticsConsent && !this.consentGiven) {
            // User granted consent, initialize Clarity
            this.consentGiven = true;
            this.saveConsent(consentData);
            this.initializeClarity();
        } else if (!analyticsConsent && this.consentGiven) {
            // User withdrew consent, disable Clarity
            this.consentGiven = false;
            this.saveConsent(consentData);
            this.disableClarity();
        }
    }

    /**
     * Save consent to localStorage
     * @param {Object} consentData - The consent data to save
     */
    saveConsent(consentData) {
        try {
            const consentRecord = {
                ...consentData,
                timestamp: new Date().toISOString(),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
                version: '1.0'
            };
            
            localStorage.setItem(this.consentStorage, JSON.stringify(consentRecord));
            console.log('Consent saved to localStorage');
        } catch (error) {
            console.error('Error saving consent:', error);
        }
    }

    /**
     * Initialize Microsoft Clarity with privacy settings
     */
    initializeClarity() {
        if (this.isInitialized) {
            console.log('Clarity already initialized');
            return;
        }

        try {
            console.log('Initializing Microsoft Clarity...');
            
            // Microsoft Clarity tracking script
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", this.clarityProjectId);

            // Configure privacy settings
            this.configurePrivacySettings();
            
            this.isInitialized = true;
            console.log('Microsoft Clarity initialized successfully');
            
            // Log initialization for GDPR audit trail
            this.logTrackingEvent('clarity_initialized', {
                timestamp: new Date().toISOString(),
                consent_version: '1.0',
                user_agent: navigator.userAgent
            });
            
        } catch (error) {
            console.error('Error initializing Clarity:', error);
        }
    }

    /**
     * Configure Clarity privacy settings
     */
    configurePrivacySettings() {
        if (typeof clarity !== 'undefined') {
            // Set user privacy preferences
            clarity("set", "privacy", {
                "cookieConsent": true,
                "dataMinimization": true,
                "retentionPeriod": 90 // 90 days retention
            });

            // Mask sensitive form fields
            clarity("set", "mask", [
                "input[type='password']",
                "input[name*='ssn']",
                "input[name*='social']",
                "input[name*='tax']",
                ".sensitive-data",
                ".gdpr-sensitive"
            ]);

            // Set custom tags for GDPR compliance
            clarity("set", "tag", "gdpr_compliant", "true");
            clarity("set", "tag", "consent_timestamp", new Date().toISOString());
        }
    }

    /**
     * Disable Clarity tracking
     */
    disableClarity() {
        console.log('Disabling Microsoft Clarity...');
        
        try {
            // Stop Clarity tracking
            if (typeof clarity !== 'undefined') {
                clarity("stop");
                console.log('Clarity tracking stopped');
            }

            // Clear Clarity cookies
            this.clearClarityCookies();
            
            // Log withdrawal for GDPR audit trail
            this.logTrackingEvent('clarity_disabled', {
                timestamp: new Date().toISOString(),
                reason: 'consent_withdrawn'
            });
            
        } catch (error) {
            console.error('Error disabling Clarity:', error);
        }
    }

    /**
     * Clear Clarity-related cookies
     */
    clearClarityCookies() {
        const clarityDomains = [
            window.location.hostname,
            '.clarity.ms',
            '.Microsoft.com'
        ];

        const clarityCookies = [
            '_clck',
            '_clsk',
            'CLID',
            'SM'
        ];

        clarityCookies.forEach(cookieName => {
            clarityDomains.forEach(domain => {
                // Clear cookie for current domain
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`;
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            });
        });

        console.log('Clarity cookies cleared');
    }

    /**
     * Log tracking events for GDPR audit trail
     * @param {string} event - The event name
     * @param {Object} data - The event data
     */
    logTrackingEvent(event, data) {
        try {
            // Send to backend for GDPR audit logging
            if (typeof fetch !== 'undefined') {
                fetch('/api/gdpr/tracking-log', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event,
                        data,
                        timestamp: new Date().toISOString(),
                        userAgent: navigator.userAgent,
                        url: window.location.href
                    })
                }).catch(error => {
                    console.error('Error logging tracking event:', error);
                });
            }
        } catch (error) {
            console.error('Error in logTrackingEvent:', error);
        }
    }

    /**
     * Get current consent status
     * @returns {boolean} Current consent status
     */
    getConsentStatus() {
        return this.consentGiven;
    }

    /**
     * Get Clarity initialization status
     * @returns {boolean} Initialization status
     */
    getInitializationStatus() {
        return this.isInitialized;
    }

    /**
     * Manually trigger consent check (for testing)
     */
    recheckConsent() {
        this.checkExistingConsent();
        if (this.consentGiven && !this.isInitialized) {
            this.initializeClarity();
        } else if (!this.consentGiven && this.isInitialized) {
            this.disableClarity();
        }
    }

    /**
     * Export user data for GDPR compliance
     * @returns {Object} User's tracking data
     */
    exportUserData() {
        const consentData = localStorage.getItem(this.consentStorage);
        
        return {
            clarityConsent: consentData ? JSON.parse(consentData) : null,
            clarityInitialized: this.isInitialized,
            clarityProjectId: this.clarityProjectId,
            exportTimestamp: new Date().toISOString()
        };
    }

    /**
     * Delete all user data for GDPR compliance
     */
    deleteUserData() {
        console.log('Deleting user tracking data...');
        
        // Remove consent data
        localStorage.removeItem(this.consentStorage);
        
        // Disable tracking
        this.disableClarity();
        
        // Clear cookies
        this.clearClarityCookies();
        
        // Reset state
        this.consentGiven = false;
        this.isInitialized = false;
        
        // Log deletion for audit trail
        this.logTrackingEvent('user_data_deleted', {
            timestamp: new Date().toISOString(),
            reason: 'gdpr_deletion_request'
        });
        
        console.log('User tracking data deleted');
    }
}

// Global instance
window.clarityGDPRManager = new ClarityGDPRManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClarityGDPRManager;
}
