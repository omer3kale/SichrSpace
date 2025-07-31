/**
 * Cookie Consent Banner for GDPR Compliance with Microsoft Clarity Integration
 * Include this script on all pages that use cookies
 */

class CookieConsent {
    constructor() {
        this.consentKey = 'sichrplace_cookie_consent';
        this.consent = this.getStoredConsent();
        this.trackingServices = ['analytics', 'marketing', 'functional'];
        this.init();
    }

    init() {
        // Only show banner if no consent has been given
        if (!this.consent) {
            this.showBanner();
        } else {
            // Apply stored consent settings
            this.applyConsentSettings();
        }
    }

    getStoredConsent() {
        try {
            const stored = localStorage.getItem(this.consentKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    }

    storeConsent(consent) {
        try {
            localStorage.setItem(this.consentKey, JSON.stringify(consent));
            this.consent = consent;
        } catch (error) {
            console.error('Failed to store consent:', error);
        }
    }

    showBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-consent-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: #2c3e50;
                color: white;
                padding: 20px;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                line-height: 1.5;
            ">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 300px;">
                        <strong>🍪 Cookie Notice</strong><br>
                        We use cookies to enhance your experience, analyze site traffic, and personalize content. 
                        By clicking "Accept All", you consent to our use of cookies. 
                        <a href="privacy-policy.html" style="color: #3498db;">Privacy Policy</a>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button id="reject-cookies" style="
                            background: transparent;
                            border: 1px solid #95a5a6;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Reject</button>
                        <button id="customize-cookies" style="
                            background: transparent;
                            border: 1px solid #3498db;
                            color: #3498db;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Customize</button>
                        <button id="accept-all-cookies" style="
                            background: #3498db;
                            border: none;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Accept All</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Add event listeners
        document.getElementById('accept-all-cookies').addEventListener('click', () => {
            this.acceptAll();
        });

        document.getElementById('reject-cookies').addEventListener('click', () => {
            this.rejectAll();
        });

        document.getElementById('customize-cookies').addEventListener('click', () => {
            this.showCustomizeModal();
        });
    }

    acceptAll() {
        const consent = {
            necessary: { given: true, timestamp: new Date().toISOString() },
            functional: { given: true, timestamp: new Date().toISOString() },
            analytics: { given: true, timestamp: new Date().toISOString() },
            marketing: { given: true, timestamp: new Date().toISOString() },
            privacyPolicyVersion: '1.0',
            consentMethod: 'banner_accept_all'
        };

        this.storeConsent(consent);
        this.applyConsentSettings();
        this.hideBanner();
        this.recordConsentAPI(consent);
    }

    rejectAll() {
        const consent = {
            necessary: { given: true, timestamp: new Date().toISOString() },
            functional: { given: false, timestamp: new Date().toISOString() },
            analytics: { given: false, timestamp: new Date().toISOString() },
            marketing: { given: false, timestamp: new Date().toISOString() },
            privacyPolicyVersion: '1.0',
            consentMethod: 'banner_reject_all'
        };

        this.storeConsent(consent);
        this.applyConsentSettings();
        this.hideBanner();
        this.recordConsentAPI(consent);
    }

    showCustomizeModal() {
        const modal = document.createElement('div');
        modal.id = 'cookie-customize-modal';
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 10001;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            ">
                <div style="
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    max-width: 600px;
                    width: 100%;
                    max-height: 80vh;
                    overflow-y: auto;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                ">
                    <h2 style="margin-top: 0; color: #2c3e50;">Customize Cookie Settings</h2>
                    
                    <div style="margin: 20px 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
                            <div>
                                <strong>Essential Cookies</strong><br>
                                <small style="color: #666;">Required for basic site functionality</small>
                            </div>
                            <label style="position: relative; width: 50px; height: 24px;">
                                <input type="checkbox" checked disabled style="opacity: 0; width: 0; height: 0;">
                                <span style="
                                    position: absolute;
                                    cursor: not-allowed;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background-color: #95a5a6;
                                    transition: .4s;
                                    border-radius: 24px;
                                "></span>
                                <span style="
                                    position: absolute;
                                    content: '';
                                    height: 18px;
                                    width: 18px;
                                    left: 29px;
                                    bottom: 3px;
                                    background-color: white;
                                    transition: .4s;
                                    border-radius: 50%;
                                "></span>
                            </label>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
                            <div>
                                <strong>Functional Cookies</strong><br>
                                <small style="color: #666;">Enhanced features and personalization</small>
                            </div>
                            <label class="cookie-toggle" style="position: relative; width: 50px; height: 24px;">
                                <input type="checkbox" id="modal-functional" style="opacity: 0; width: 0; height: 0;">
                                <span class="cookie-slider" style="
                                    position: absolute;
                                    cursor: pointer;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background-color: #ccc;
                                    transition: .4s;
                                    border-radius: 24px;
                                "></span>
                                <span class="cookie-slider-dot" style="
                                    position: absolute;
                                    content: '';
                                    height: 18px;
                                    width: 18px;
                                    left: 3px;
                                    bottom: 3px;
                                    background-color: white;
                                    transition: .4s;
                                    border-radius: 50%;
                                "></span>
                            </label>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;">
                            <div>
                                <strong>Analytics Cookies</strong><br>
                                <small style="color: #666;">Help us improve our website</small>
                            </div>
                            <label class="cookie-toggle" style="position: relative; width: 50px; height: 24px;">
                                <input type="checkbox" id="modal-analytics" style="opacity: 0; width: 0; height: 0;">
                                <span class="cookie-slider" style="
                                    position: absolute;
                                    cursor: pointer;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background-color: #ccc;
                                    transition: .4s;
                                    border-radius: 24px;
                                "></span>
                                <span class="cookie-slider-dot" style="
                                    position: absolute;
                                    content: '';
                                    height: 18px;
                                    width: 18px;
                                    left: 3px;
                                    bottom: 3px;
                                    background-color: white;
                                    transition: .4s;
                                    border-radius: 50%;
                                "></span>
                            </label>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0;">
                            <div>
                                <strong>Marketing Cookies</strong><br>
                                <small style="color: #666;">Personalized ads and campaigns</small>
                            </div>
                            <label class="cookie-toggle" style="position: relative; width: 50px; height: 24px;">
                                <input type="checkbox" id="modal-marketing" style="opacity: 0; width: 0; height: 0;">
                                <span class="cookie-slider" style="
                                    position: absolute;
                                    cursor: pointer;
                                    top: 0;
                                    left: 0;
                                    right: 0;
                                    bottom: 0;
                                    background-color: #ccc;
                                    transition: .4s;
                                    border-radius: 24px;
                                "></span>
                                <span class="cookie-slider-dot" style="
                                    position: absolute;
                                    content: '';
                                    height: 18px;
                                    width: 18px;
                                    left: 3px;
                                    bottom: 3px;
                                    background-color: white;
                                    transition: .4s;
                                    border-radius: 50%;
                                "></span>
                            </label>
                        </div>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px;">
                        <button id="modal-cancel" style="
                            background: #95a5a6;
                            border: none;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Cancel</button>
                        <button id="modal-save" style="
                            background: #3498db;
                            border: none;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Save Preferences</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add CSS for toggle animation
        const style = document.createElement('style');
        style.textContent = `
            .cookie-toggle input:checked + .cookie-slider {
                background-color: #3498db !important;
            }
            .cookie-toggle input:checked + .cookie-slider .cookie-slider-dot {
                transform: translateX(26px);
            }
        `;
        document.head.appendChild(style);

        // Add event listeners
        document.getElementById('modal-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        document.getElementById('modal-save').addEventListener('click', () => {
            const consent = {
                necessary: { given: true, timestamp: new Date().toISOString() },
                functional: { given: document.getElementById('modal-functional').checked, timestamp: new Date().toISOString() },
                analytics: { given: document.getElementById('modal-analytics').checked, timestamp: new Date().toISOString() },
                marketing: { given: document.getElementById('modal-marketing').checked, timestamp: new Date().toISOString() },
                privacyPolicyVersion: '1.0',
                consentMethod: 'banner_customize'
            };

            this.storeConsent(consent);
            this.applyConsentSettings();
            this.hideBanner();
            this.recordConsentAPI(consent);
            document.body.removeChild(modal);
        });
    }

    hideBanner() {
        const banner = document.getElementById('cookie-consent-banner');
        if (banner) {
            banner.remove();
        }
    }

    applyConsentSettings() {
        if (!this.consent) return;

        // Dispatch consent change event for Clarity and other tracking services
        this.dispatchConsentEvent();

        // Apply analytics consent
        if (this.consent.analytics?.given) {
            this.enableAnalytics();
        } else {
            this.disableAnalytics();
        }

        // Apply marketing consent
        if (this.consent.marketing?.given) {
            this.enableMarketing();
        } else {
            this.disableMarketing();
        }

        // Apply functional consent
        if (this.consent.functional?.given) {
            this.enableFunctional();
        } else {
            this.disableFunctional();
        }
    }

    /**
     * Dispatch consent change event for external tracking services
     */
    dispatchConsentEvent() {
        const consentDetail = {
            necessary: this.consent.necessary?.given || false,
            functional: this.consent.functional?.given || false,
            analytics: this.consent.analytics?.given || false,
            marketing: this.consent.marketing?.given || false,
            timestamp: new Date().toISOString(),
            version: this.consent.privacyPolicyVersion || '1.0'
        };

        // Dispatch for Clarity and other services
        document.dispatchEvent(new CustomEvent('cookieConsentChanged', { 
            detail: consentDetail 
        }));

        // Also dispatch privacy settings event
        document.dispatchEvent(new CustomEvent('privacySettingsUpdated', { 
            detail: consentDetail 
        }));

        console.log('Consent events dispatched:', consentDetail);
    }

    enableAnalytics() {
        // Initialize Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                analytics_storage: 'granted'
            });
        }
        
        // Microsoft Clarity will be initialized via ClarityGDPRManager
        // when it receives the cookieConsentChanged event
        
        console.log('Analytics cookies enabled - Tracking services will initialize');
    }

    disableAnalytics() {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                analytics_storage: 'denied'
            });
        }
        
        // Microsoft Clarity will be disabled via ClarityGDPRManager
        // when it receives the cookieConsentChanged event
        
        console.log('Analytics cookies disabled - Tracking services will stop');
    }

    enableMarketing() {
        // Initialize marketing pixels, ad tracking, etc.
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted'
            });
        }
        console.log('Marketing cookies enabled');
    }

    disableMarketing() {
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied'
            });
        }
        console.log('Marketing cookies disabled');
    }

    enableFunctional() {
        // Enable functional features
        console.log('Functional cookies enabled');
    }

    disableFunctional() {
        // Disable functional features
        console.log('Functional cookies disabled');
    }

    async recordConsentAPI(consent) {
        // If user is logged in, record consent in backend
        const token = localStorage.getItem('token');
        if (token) {
            try {
                await fetch('/api/gdpr/consent', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        consentTypes: {
                            necessary: consent.necessary,
                            functional: consent.functional,
                            analytics: consent.analytics,
                            marketing: consent.marketing
                        },
                        privacyPolicyVersion: consent.privacyPolicyVersion
                    })
                });
            } catch (error) {
                console.error('Failed to record consent:', error);
            }
        }
    }

    // Method to withdraw consent for a specific type
    async withdrawConsent(consentType) {
        if (this.consent && this.consent[consentType]) {
            this.consent[consentType] = { given: false, timestamp: new Date().toISOString() };
            this.storeConsent(this.consent);
            this.applyConsentSettings();

            // Record withdrawal in backend if user is logged in
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    await fetch('/api/gdpr/withdraw-consent', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ consentType })
                    });
                } catch (error) {
                    console.error('Failed to record consent withdrawal:', error);
                }
            }
        }
    }

    // Method to check if a specific consent is given
    hasConsent(consentType) {
        return this.consent && this.consent[consentType] && this.consent[consentType].given;
    }

    // Method to reset all consent (for testing or user request)
    resetConsent() {
        localStorage.removeItem(this.consentKey);
        this.consent = null;
        this.init();
    }
}

// Initialize cookie consent when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cookieConsent = new CookieConsent();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookieConsent;
}
