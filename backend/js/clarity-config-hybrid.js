/**
 * Microsoft Clarity GDPR Integration using CDN + NPM hybrid approach
 * This version works with your existing setup and provides enhanced features
 */

class ClarityGDPRManagerHybrid {
    constructor() {
        this.clarityProjectId = 'smib1d4kq5'; // Your actual Clarity project ID
        this.consentStorage = 'clarity_consent';
        this.isInitialized = false;
        this.consentGiven = false;
        this.useNPMPackage = false; // Will detect if NPM package is available
        
        // Detect if NPM package is available
        this.detectImplementation();
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Detect which Clarity implementation to use
     */
    detectImplementation() {
        // Check if NPM package is available
        if (typeof window !== 'undefined' && window.require) {
            try {
                const clarity = window.require('@microsoft/clarity');
                if (clarity) {
                    this.useNPMPackage = true;
                    this.clarityNPM = clarity;
                    console.log('Using Microsoft Clarity NPM package');
                }
            } catch (error) {
                console.log('NPM package not available, using CDN version');
            }
        }
    }

    /**
     * Initialize Clarity manager
     */
    init() {
        console.log('Initializing Clarity GDPR Manager (Hybrid version)...');
        
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
        console.log('Consent change detected (Hybrid version):', consentData);
        
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
                version: '1.0',
                implementation: this.useNPMPackage ? 'npm_package' : 'cdn_script'
            };
            
            localStorage.setItem(this.consentStorage, JSON.stringify(consentRecord));
            console.log('Consent saved to localStorage (Hybrid version)');
        } catch (error) {
            console.error('Error saving consent:', error);
        }
    }

    /**
     * Initialize Microsoft Clarity using appropriate method
     */
    initializeClarity() {
        if (this.isInitialized) {
            console.log('Clarity already initialized (Hybrid version)');
            return;
        }

        try {
            console.log('Initializing Microsoft Clarity (Hybrid version)...');
            
            if (this.useNPMPackage && this.clarityNPM) {
                // Use NPM package if available
                this.initializeClarityNPM();
            } else {
                // Fall back to CDN script
                this.initializeClarityCDN();
            }
            
            this.isInitialized = true;
            console.log('Microsoft Clarity initialized successfully (Hybrid version)');
            
            // Log initialization for GDPR audit trail
            this.logTrackingEvent('clarity_initialized', {
                timestamp: new Date().toISOString(),
                consent_version: '1.0',
                user_agent: navigator.userAgent,
                implementation: this.useNPMPackage ? 'npm_package' : 'cdn_script'
            });
            
        } catch (error) {
            console.error('Error initializing Clarity (Hybrid version):', error);
        }
    }

    /**
     * Initialize Clarity using NPM package
     */
    initializeClarityNPM() {
        this.clarityNPM.init(this.clarityProjectId);
        this.configurePrivacySettingsNPM();
    }

    /**
     * Initialize Clarity using CDN script (your original method)
     */
    initializeClarityCDN() {
        // Microsoft Clarity tracking script
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", this.clarityProjectId);

        // Configure privacy settings after script loads
        setTimeout(() => {
            this.configurePrivacySettingsCDN();
        }, 1000);
    }

    /**
     * Configure privacy settings for NPM version
     */
    configurePrivacySettingsNPM() {
        try {
            // Set custom tags for GDPR compliance
            this.clarityNPM.set('tag', 'gdpr_compliant', 'true');
            this.clarityNPM.set('tag', 'consent_timestamp', new Date().toISOString());
            this.clarityNPM.set('tag', 'implementation', 'npm_package');

            // Mask sensitive elements
            const sensitiveSelectors = [
                'input[type="password"]',
                'input[name*="ssn"]',
                'input[name*="social"]',
                'input[name*="tax"]',
                'input[name*="credit"]',
                'input[name*="card"]',
                '.sensitive-data',
                '.gdpr-sensitive'
            ];

            sensitiveSelectors.forEach(selector => {
                this.clarityNPM.set('mask', selector);
            });

        } catch (error) {
            console.error('Error configuring privacy settings (NPM):', error);
        }
    }

    /**
     * Configure privacy settings for CDN version
     */
    configurePrivacySettingsCDN() {
        if (typeof clarity !== 'undefined') {
            try {
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
                    "input[name*='credit']",
                    "input[name*='card']",
                    ".sensitive-data",
                    ".gdpr-sensitive"
                ]);

                // Set custom tags for GDPR compliance
                clarity("set", "tag", "gdpr_compliant", "true");
                clarity("set", "tag", "consent_timestamp", new Date().toISOString());
                clarity("set", "tag", "implementation", "cdn_script");

                console.log('Privacy settings configured (CDN version)');
            } catch (error) {
                console.error('Error configuring privacy settings (CDN):', error);
            }
        }
    }

    /**
     * Disable Clarity tracking
     */
    disableClarity() {
        console.log('Disabling Microsoft Clarity (Hybrid version)...');
        
        try {
            if (this.useNPMPackage && this.clarityNPM && this.clarityNPM.stop) {
                // Stop using NPM package
                this.clarityNPM.stop();
            } else if (typeof clarity !== 'undefined' && clarity.stop) {
                // Stop using CDN version
                clarity("stop");
            }

            // Clear Clarity cookies
            this.clearClarityCookies();
            
            // Reset initialization flag
            this.isInitialized = false;
            
            // Log withdrawal for GDPR audit trail
            this.logTrackingEvent('clarity_disabled', {
                timestamp: new Date().toISOString(),
                reason: 'consent_withdrawn',
                implementation: this.useNPMPackage ? 'npm_package' : 'cdn_script'
            });
            
            console.log('Clarity tracking stopped (Hybrid version)');
            
        } catch (error) {
            console.error('Error disabling Clarity (Hybrid version):', error);
        }
    }

    /**
     * Clear Clarity-related cookies
     */
    clearClarityCookies() {
        const clarityDomains = [
            window.location.hostname,
            '.clarity.ms',
            '.microsoft.com'
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

        console.log('Clarity cookies cleared (Hybrid version)');
    }

    /**
     * Enhanced event tracking with GDPR compliance
     * @param {string} eventName - Name of the event
     * @param {Object} eventData - Event data
     */
    trackEvent(eventName, eventData = {}) {
        if (!this.consentGiven || !this.isInitialized) {
            console.log('Event tracking blocked - no consent or not initialized');
            return;
        }

        try {
            // Filter out sensitive data
            const filteredData = this.filterSensitiveData(eventData);
            
            if (this.useNPMPackage && this.clarityNPM) {
                this.clarityNPM.event(eventName, filteredData);
            } else if (typeof clarity !== 'undefined') {
                clarity("event", eventName, filteredData);
            }
            
            console.log(`Event tracked (Hybrid version): ${eventName}`, filteredData);
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    /**
     * Filter sensitive data from event tracking
     * @param {Object} data - Raw event data
     * @returns {Object} Filtered event data
     */
    filterSensitiveData(data) {
        const sensitiveKeys = ['password', 'ssn', 'social', 'tax', 'credit', 'card', 'email', 'phone'];
        const filtered = {};
        
        for (const [key, value] of Object.entries(data)) {
            const keyLower = key.toLowerCase();
            const isSensitive = sensitiveKeys.some(sensitive => keyLower.includes(sensitive));
            
            if (!isSensitive) {
                filtered[key] = value;
            } else {
                filtered[key] = '[REDACTED]';
            }
        }
        
        return filtered;
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
                    console.error('Error logging tracking event (Hybrid version):', error);
                });
            }
        } catch (error) {
            console.error('Error in logTrackingEvent (Hybrid version):', error);
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
     * Get implementation type
     * @returns {string} Implementation type
     */
    getImplementationType() {
        return this.useNPMPackage ? 'npm_package' : 'cdn_script';
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
            implementation: this.getImplementationType(),
            exportTimestamp: new Date().toISOString()
        };
    }

    /**
     * Delete all user data for GDPR compliance
     */
    deleteUserData() {
        console.log('Deleting user tracking data (Hybrid version)...');
        
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
            reason: 'gdpr_deletion_request',
            implementation: this.getImplementationType()
        });
        
        console.log('User tracking data deleted (Hybrid version)');
    }
}

// Global instance
window.clarityGDPRManagerHybrid = new ClarityGDPRManagerHybrid();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClarityGDPRManagerHybrid;
}
