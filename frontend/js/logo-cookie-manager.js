// 🍪 SichrPlace Logo Cookie Consent System
// Handles cookie consent for displaying logo images

class LogoCookieManager {
    constructor() {
        this.cookieName = 'sichrplace-logo-consent';
        this.hasConsent = this.getLogoConsent();
        this.init();
    }

    init() {
        if (!this.hasConsent) {
            this.showLogoConsentNotice();
        } else {
            this.enableLogos();
        }
    }

    getLogoConsent() {
        const consent = localStorage.getItem(this.cookieName);
        return consent === 'true';
    }

    setLogoConsent(consent) {
        localStorage.setItem(this.cookieName, consent.toString());
        this.hasConsent = consent;
        
        if (consent) {
            this.enableLogos();
        } else {
            this.disableLogos();
        }
    }

    showLogoConsentNotice() {
        const notice = document.createElement('div');
        notice.className = 'logo-cookie-notice';
        notice.innerHTML = `
            <h4>🛡️ Logo Display</h4>
            <p>We'd like to display our certified logos and shields. This helps verify our platform's authenticity and German certification status.</p>
            <div class="logo-cookie-buttons">
                <button class="logo-cookie-btn accept" onclick="logoCookieManager.acceptLogos()">
                    Allow Logos
                </button>
                <button class="logo-cookie-btn decline" onclick="logoCookieManager.declineLogos()">
                    Text Only
                </button>
            </div>
        `;

        document.body.appendChild(notice);
        
        // Show with animation
        setTimeout(() => {
            notice.classList.add('show');
        }, 500);
    }

    acceptLogos() {
        this.setLogoConsent(true);
        this.hideConsentNotice();
    }

    declineLogos() {
        this.setLogoConsent(false);
        this.hideConsentNotice();
    }

    hideConsentNotice() {
        const notice = document.querySelector('.logo-cookie-notice');
        if (notice) {
            notice.classList.remove('show');
            setTimeout(() => {
                notice.remove();
            }, 300);
        }
    }

    enableLogos() {
        document.body.classList.add('logos-enabled');
        document.body.classList.remove('logos-disabled');
        
        // Replace text-only logos with visual ones
        this.replacePlaceholderLogos();
    }

    disableLogos() {
        document.body.classList.add('logos-disabled');
        document.body.classList.remove('logos-enabled');
        
        // Replace visual logos with text-only versions
        this.replaceLogosWithText();
    }

    replacePlaceholderLogos() {
        // Find all logo placeholders and replace with visual logos
        const placeholders = document.querySelectorAll('.logo-placeholder');
        placeholders.forEach(placeholder => {
            const logoHtml = this.createVisualLogo(placeholder.dataset.type || 'default');
            placeholder.outerHTML = logoHtml;
        });

        // Update existing text-only logos
        const textLogos = document.querySelectorAll('.sichrplace-text-only');
        textLogos.forEach(textLogo => {
            textLogo.classList.remove('sichrplace-text-only');
            textLogo.classList.add('sichrplace-logo');
            
            // Add shield if not present
            if (!textLogo.querySelector('.sichrplace-shield')) {
                const shield = document.createElement('div');
                shield.className = 'sichrplace-shield sichrplace-certified';
                textLogo.insertBefore(shield, textLogo.firstChild);
            }
        });
    }

    replaceLogosWithText() {
        // Replace visual logos with text-only versions
        const logos = document.querySelectorAll('.sichrplace-logo');
        logos.forEach(logo => {
            logo.classList.add('sichrplace-text-only');
            logo.classList.remove('sichrplace-logo');
            
            // Remove shields
            const shields = logo.querySelectorAll('.sichrplace-shield');
            shields.forEach(shield => shield.remove());
        });
    }

    createVisualLogo(type = 'default') {
        const logoTypes = {
            'navbar': `
                <a href="/" class="sichrplace-logo navbar-brand">
                    <div class="sichrplace-shield sichrplace-certified"></div>
                    <span class="sichrplace-text">SichrPlace</span>
                    <span class="german-certification">Certified</span>
                </a>
            `,
            'header': `
                <div class="sichrplace-logo header-logo">
                    <div class="sichrplace-shield large sichrplace-certified"></div>
                    <span class="sichrplace-text">SichrPlace</span>
                    <span class="german-certification">German Certified</span>
                </div>
            `,
            'footer': `
                <div class="sichrplace-logo">
                    <div class="sichrplace-shield sichrplace-certified"></div>
                    <span class="sichrplace-text">SichrPlace</span>
                </div>
            `,
            'default': `
                <div class="sichrplace-logo">
                    <div class="sichrplace-shield sichrplace-certified"></div>
                    <span class="sichrplace-text">SichrPlace</span>
                </div>
            `
        };

        return logoTypes[type] || logoTypes['default'];
    }

    createCertificationFooter() {
        return `
            <div class="footer-certification">
                <div class="certification-badges">
                    <div class="certification-badge german-authority">
                        <span>German Authority Certified</span>
                    </div>
                    <div class="certification-badge security-verified">
                        <span>Security Verified</span>
                    </div>
                    <div class="certification-badge data-protection">
                        <span>GDPR Compliant</span>
                    </div>
                </div>
                <div class="certification-text">
                    SichrPlace is certified by German authorities as a trusted rental platform. 
                    Our security measures and data protection protocols meet the highest European standards.
                    Trademark and certification marks are displayed with proper authorization.
                </div>
            </div>
        `;
    }

    // Public method to manually trigger logo update
    updateLogoDisplay() {
        if (this.hasConsent) {
            this.enableLogos();
        } else {
            this.disableLogos();
        }
    }
}

// Initialize logo cookie manager
const logoCookieManager = new LogoCookieManager();

// Make it globally available
window.logoCookieManager = logoCookieManager;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogoCookieManager;
}
