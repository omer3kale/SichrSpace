/**
 * Google Analytics 4 (GA4) Integration with GDPR Compliance
 * This script manages Google Analytics initialization with proper cookie consent
 * Works alongside Microsoft Clarity integration
 */

class GoogleAnalyticsManager {
    constructor(measurementId = 'G-XXXXXXXXXX') {
        this.measurementId = measurementId;
        this.isInitialized = false;
        this.isConsented = false;
        this.debug = window.location.hostname === 'localhost';
        
        // Bind methods to preserve context
        this.handleConsentChange = this.handleConsentChange.bind(this);
        
        this.init();
    }

    init() {
        // Listen for cookie consent events
        document.addEventListener('cookieConsentChanged', this.handleConsentChange);
        
        // Check existing consent on load
        this.checkExistingConsent();
        
        if (this.debug) {
            console.log('🔍 Google Analytics Manager initialized:', {
                measurementId: this.measurementId,
                debug: this.debug
            });
        }
    }

    checkExistingConsent() {
        try {
            const consent = localStorage.getItem('cookieConsent');
            if (consent) {
                const consentData = JSON.parse(consent);
                if (consentData.analytics && consentData.timestamp) {
                    this.isConsented = true;
                    this.initializeGoogleAnalytics();
                }
            }
        } catch (error) {
            console.error('Error checking existing GA consent:', error);
        }
    }

    handleConsentChange(event) {
        const { analytics, marketing } = event.detail;
        
        if (analytics && !this.isConsented) {
            this.isConsented = true;
            this.initializeGoogleAnalytics();
            this.logTrackingEvent('google_analytics_initialized', 'consent_given');
        } else if (!analytics && this.isConsented) {
            this.isConsented = false;
            this.terminateGoogleAnalytics();
            this.logTrackingEvent('google_analytics_terminated', 'consent_withdrawn');
        }
    }

    initializeGoogleAnalytics() {
        if (this.isInitialized) {
            console.log('⚠️ Google Analytics already initialized');
            return;
        }

        try {
            // Load Google Analytics script
            this.loadGoogleAnalyticsScript();
            
            // Configure gtag
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            
            gtag('js', new Date());
            
            // Configure with privacy-focused settings
            gtag('config', this.measurementId, {
                // GDPR compliant settings
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
                
                // Enhanced privacy settings
                restricted_data_processing: true,
                
                // Cookie settings
                cookie_expires: 30 * 24 * 60 * 60, // 30 days in seconds
                cookie_update: true,
                cookie_flags: 'SameSite=Strict;Secure',
                
                // Custom parameters
                custom_map: {
                    'custom_parameter_1': 'gdpr_compliant'
                }
            });

            // Set user privacy settings
            gtag('consent', 'default', {
                'analytics_storage': 'granted',
                'ad_storage': 'denied',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
                'functionality_storage': 'granted',
                'security_storage': 'granted'
            });

            this.isInitialized = true;
            
            if (this.debug) {
                console.log('✅ Google Analytics initialized with privacy settings:', {
                    measurementId: this.measurementId,
                    anonymizeIp: true,
                    adPersonalization: false
                });
            }

            // Send initial page view
            this.trackPageView();
            
            // Track initialization event
            this.trackEvent('analytics_initialized', {
                'event_category': 'system',
                'event_label': 'google_analytics',
                'custom_parameter_1': 'gdpr_compliant'
            });

        } catch (error) {
            console.error('❌ Error initializing Google Analytics:', error);
        }
    }

    loadGoogleAnalyticsScript() {
        if (document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${this.measurementId}"]`)) {
            return; // Script already loaded
        }

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
        script.onerror = () => {
            console.error('❌ Failed to load Google Analytics script');
        };
        
        document.head.appendChild(script);
    }

    terminateGoogleAnalytics() {
        if (!this.isInitialized) {
            return;
        }

        try {
            // Disable Google Analytics
            if (window.gtag) {
                window.gtag('consent', 'update', {
                    'analytics_storage': 'denied'
                });
            }

            // Clear GA cookies
            this.clearGoogleAnalyticsCookies();
            
            this.isInitialized = false;
            
            if (this.debug) {
                console.log('🛑 Google Analytics terminated and cookies cleared');
            }

        } catch (error) {
            console.error('❌ Error terminating Google Analytics:', error);
        }
    }

    clearGoogleAnalyticsCookies() {
        const gaCookies = [
            '_ga',
            '_ga_' + this.measurementId.replace('G-', ''),
            '_gid',
            '_gat',
            '_gat_gtag_' + this.measurementId,
            '__utma',
            '__utmt',
            '__utmb',
            '__utmc',
            '__utmz',
            '__utmv'
        ];

        gaCookies.forEach(cookieName => {
            // Clear for current domain
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict; Secure`;
            
            // Clear for all subdomains
            const domain = window.location.hostname;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}; SameSite=Strict; Secure`;
        });
    }

    // Tracking methods
    trackPageView(page_title = document.title, page_location = window.location.href) {
        if (!this.isConsented || !window.gtag) return;

        try {
            window.gtag('event', 'page_view', {
                page_title,
                page_location,
                custom_parameter_1: 'gdpr_compliant'
            });

            if (this.debug) {
                console.log('📊 GA Page view tracked:', { page_title, page_location });
            }

        } catch (error) {
            console.error('Error tracking page view:', error);
        }
    }

    trackEvent(eventName, parameters = {}) {
        if (!this.isConsented || !window.gtag) return;

        try {
            const eventData = {
                ...parameters,
                custom_parameter_1: 'gdpr_compliant'
            };

            window.gtag('event', eventName, eventData);

            if (this.debug) {
                console.log('📊 GA Event tracked:', eventName, eventData);
            }

        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    trackUserInteraction(action, category = 'user_interaction', label = null) {
        this.trackEvent('user_interaction', {
            event_category: category,
            event_label: label,
            interaction_type: action
        });
    }

    trackConversion(conversionName, value = null, currency = 'EUR') {
        this.trackEvent(conversionName, {
            event_category: 'conversion',
            value: value,
            currency: currency
        });
    }

    // GDPR audit logging
    logTrackingEvent(event, action) {
        try {
            // Send to backend GDPR audit log
            fetch('/api/gdpr/log-tracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    service: 'google_analytics',
                    event: event,
                    action: action,
                    measurementId: this.measurementId,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    ipAddress: 'anonymized' // Server will handle IP anonymization
                })
            }).catch(error => {
                if (this.debug) {
                    console.log('Could not log GA tracking event (normal during development):', error.message);
                }
            });
        } catch (error) {
            console.error('Error logging GA tracking event:', error);
        }
    }

    // Utility methods
    getTrackingId() {
        return this.measurementId;
    }

    isTrackingActive() {
        return this.isConsented && this.isInitialized;
    }

    updateMeasurementId(newMeasurementId) {
        if (this.isInitialized) {
            console.warn('⚠️ Cannot change measurement ID while GA is active. Terminate first.');
            return false;
        }
        this.measurementId = newMeasurementId;
        return true;
    }
}

// Initialize Google Analytics Manager
// Using your actual Google Analytics Measurement ID
window.GoogleAnalyticsManager = new GoogleAnalyticsManager('G-2FG8XLMM35');

// Expose global tracking functions for easy use
window.trackGAEvent = function(eventName, parameters) {
    if (window.GoogleAnalyticsManager) {
        window.GoogleAnalyticsManager.trackEvent(eventName, parameters);
    }
};

window.trackGAPageView = function(title, location) {
    if (window.GoogleAnalyticsManager) {
        window.GoogleAnalyticsManager.trackPageView(title, location);
    }
};

window.trackGAUserInteraction = function(action, category, label) {
    if (window.GoogleAnalyticsManager) {
        window.GoogleAnalyticsManager.trackUserInteraction(action, category, label);
    }
};

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleAnalyticsManager;
}
