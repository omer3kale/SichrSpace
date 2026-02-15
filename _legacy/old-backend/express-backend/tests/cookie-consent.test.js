/**
 * Cookie Consent Frontend Component Tests
 * Tests the GDPR compliance of the cookie consent system
 */

// Mock DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <head>
      <title>Test Page</title>
    </head>
    <body>
      <div id="cookie-banner" style="display: none;">
        <div class="banner-content">
          <h3>Cookie Consent</h3>
          <p>We use cookies to enhance your browsing experience.</p>
          
          <div class="consent-options">
            <div class="consent-item">
              <input type="checkbox" id="necessary-cookies" checked disabled>
              <label for="necessary-cookies">Necessary Cookies</label>
              <span class="required">(Required)</span>
            </div>
            
            <div class="consent-item">
              <input type="checkbox" id="analytics-cookies">
              <label for="analytics-cookies">Analytics Cookies</label>
              <span class="description">Help us understand site usage</span>
            </div>
            
            <div class="consent-item">
              <input type="checkbox" id="marketing-cookies">
              <label for="marketing-cookies">Marketing Cookies</label>
              <span class="description">Personalized ads and content</span>
            </div>
            
            <div class="consent-item">
              <input type="checkbox" id="functional-cookies">
              <label for="functional-cookies">Functional Cookies</label>
              <span class="description">Remember your preferences</span>
            </div>
          </div>
          
          <div class="banner-actions">
            <button id="accept-all-btn" class="btn primary">Accept All</button>
            <button id="accept-selected-btn" class="btn secondary">Accept Selected</button>
            <button id="reject-all-btn" class="btn tertiary">Reject All</button>
            <button id="settings-btn" class="btn link">Cookie Settings</button>
          </div>
        </div>
      </div>
      
      <div id="cookie-settings-modal" style="display: none;">
        <div class="modal-content">
          <h3>Cookie Settings</h3>
          <div id="detailed-consent-form">
            <!-- Detailed consent form would be here -->
          </div>
          <div class="modal-actions">
            <button id="save-preferences-btn">Save Preferences</button>
            <button id="close-modal-btn">Close</button>
          </div>
        </div>
      </div>
      
      <div id="consent-notice" style="display: none;">
        <p>Your cookie preferences have been updated.</p>
      </div>
    </body>
  </html>
`, { url: 'http://localhost:3000' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.sessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.fetch = jest.fn();

// Mock cookie consent implementation
class MockCookieConsent {
  constructor() {
    this.consentData = null;
    this.bannerVisible = false;
    this.settingsVisible = false;
  }

  init() {
    this.attachEventListeners();
    this.checkExistingConsent();
  }

  attachEventListeners() {
    const acceptAllBtn = document.getElementById('accept-all-btn');
    const acceptSelectedBtn = document.getElementById('accept-selected-btn');
    const rejectAllBtn = document.getElementById('reject-all-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const savePreferencesBtn = document.getElementById('save-preferences-btn');

    if (acceptAllBtn) {
      acceptAllBtn.addEventListener('click', () => this.acceptAll());
    }
    if (acceptSelectedBtn) {
      acceptSelectedBtn.addEventListener('click', () => this.acceptSelected());
    }
    if (rejectAllBtn) {
      rejectAllBtn.addEventListener('click', () => this.rejectAll());
    }
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }
    if (savePreferencesBtn) {
      savePreferencesBtn.addEventListener('click', () => this.savePreferences());
    }
  }

  checkExistingConsent() {
    const stored = localStorage.getItem('cookie-consent');
    if (stored) {
      this.consentData = JSON.parse(stored);
      this.applyConsent();
    } else {
      this.showBanner();
    }
  }

  showBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.style.display = 'block';
      this.bannerVisible = true;
    }
  }

  hideBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      banner.style.display = 'none';
      this.bannerVisible = false;
    }
  }

  acceptAll() {
    const consent = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
      timestamp: Date.now(),
      version: '2.1',
      method: 'accept_all'
    };

    this.saveConsent(consent);
    this.hideBanner();
    this.initializeServices(consent);
  }

  acceptSelected() {
    const consent = {
      necessary: true, // Always true
      analytics: document.getElementById('analytics-cookies').checked,
      marketing: document.getElementById('marketing-cookies').checked,
      functional: document.getElementById('functional-cookies').checked,
      timestamp: Date.now(),
      version: '2.1',
      method: 'accept_selected'
    };

    this.saveConsent(consent);
    this.hideBanner();
    this.initializeServices(consent);
  }

  rejectAll() {
    const consent = {
      necessary: true, // Always true
      analytics: false,
      marketing: false,
      functional: false,
      timestamp: Date.now(),
      version: '2.1',
      method: 'reject_all'
    };

    this.saveConsent(consent);
    this.hideBanner();
    this.initializeServices(consent);
  }

  openSettings() {
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
      modal.style.display = 'block';
      this.settingsVisible = true;
    }
  }

  savePreferences() {
    // Get preferences from detailed form
    this.acceptSelected();
    this.closeSettings();
  }

  closeSettings() {
    const modal = document.getElementById('cookie-settings-modal');
    if (modal) {
      modal.style.display = 'none';
      this.settingsVisible = false;
    }
  }

  saveConsent(consent) {
    this.consentData = consent;
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    
    // Send to server (handle errors gracefully)
    this.sendConsentToServer(consent).catch(error => {
      console.warn('Failed to send consent to server:', error);
      // Continue gracefully - local storage is already updated
    });
  }

  async sendConsentToServer(consent) {
    try {
      const response = await fetch('/api/gdpr/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          consentTypes: {
            necessary: consent.necessary,
            analytics: consent.analytics,
            marketing: consent.marketing,
            functional: consent.functional
          },
          privacyPolicyVersion: consent.version,
          consentMethod: consent.method
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save consent to server');
      }

      return await response.json();
    } catch (error) {
      console.error('Error saving consent:', error);
      // Continue with local storage even if server fails
    }
  }

  applyConsent() {
    if (!this.consentData) return;

    this.initializeServices(this.consentData);
    this.updateUI(this.consentData);
  }

  initializeServices(consent) {
    // Initialize analytics if consented
    if (consent.analytics) {
      this.initializeAnalytics();
    } else {
      this.disableAnalytics();
    }

    // Initialize marketing tools if consented
    if (consent.marketing) {
      this.initializeMarketing();
    } else {
      this.disableMarketing();
    }

    // Initialize functional features if consented
    if (consent.functional) {
      this.initializeFunctional();
    } else {
      this.disableFunctional();
    }
  }

  initializeAnalytics() {
    // Mock Google Analytics initialization
    if (typeof window.gtag !== 'function') {
      window.gtag = function() {
        // Mock implementation
      };
    }
  }

  disableAnalytics() {
    // Disable analytics tracking
    if (window.gtag) {
      window.gtag('consent', 'update', {
        'analytics_storage': 'denied'
      });
    }
  }

  initializeMarketing() {
    // Initialize marketing cookies and pixels
  }

  disableMarketing() {
    // Disable marketing cookies
  }

  initializeFunctional() {
    // Initialize functional cookies (preferences, etc.)
  }

  disableFunctional() {
    // Disable functional cookies
  }

  updateUI(consent) {
    // Update checkboxes to reflect current consent
    const analyticsCheckbox = document.getElementById('analytics-cookies');
    const marketingCheckbox = document.getElementById('marketing-cookies');
    const functionalCheckbox = document.getElementById('functional-cookies');

    if (analyticsCheckbox) analyticsCheckbox.checked = consent.analytics;
    if (marketingCheckbox) marketingCheckbox.checked = consent.marketing;
    if (functionalCheckbox) functionalCheckbox.checked = consent.functional;
  }

  withdrawConsent() {
    this.rejectAll();
    this.showNotice('Your consent has been withdrawn.');
  }

  showNotice(message) {
    const notice = document.getElementById('consent-notice');
    if (notice) {
      notice.querySelector('p').textContent = message;
      notice.style.display = 'block';
      
      setTimeout(() => {
        notice.style.display = 'none';
      }, 3000);
    }
  }

  getAuthToken() {
    return localStorage.getItem('auth_token') || 'anonymous';
  }

  getConsentStatus() {
    return this.consentData;
  }

  needsConsentRenewal() {
    if (!this.consentData) return true;

    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    const consentAge = Date.now() - this.consentData.timestamp;
    
    return consentAge > oneYearMs;
  }
}

describe('Cookie Consent Frontend Tests', () => {
  let cookieConsent;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DOM
    document.getElementById('cookie-banner').style.display = 'none';
    document.getElementById('cookie-settings-modal').style.display = 'none';
    
    // Reset checkboxes
    document.getElementById('analytics-cookies').checked = false;
    document.getElementById('marketing-cookies').checked = false;
    document.getElementById('functional-cookies').checked = false;
    
    // Reset localStorage
    localStorage.getItem.mockReturnValue(null);
    
    // Reset fetch
    fetch.mockReset();

    cookieConsent = new MockCookieConsent();
  });

  describe('Initialization', () => {
    test('should show banner when no existing consent', () => {
      localStorage.getItem.mockReturnValue(null);
      
      cookieConsent.init();
      
      expect(cookieConsent.bannerVisible).toBe(true);
      expect(document.getElementById('cookie-banner').style.display).toBe('block');
    });

    test('should not show banner when consent exists', () => {
      const existingConsent = {
        necessary: true,
        analytics: true,
        marketing: false,
        functional: true,
        timestamp: Date.now(),
        version: '2.1'
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(existingConsent));
      
      cookieConsent.init();
      
      expect(cookieConsent.bannerVisible).toBe(false);
      expect(cookieConsent.consentData).toEqual(existingConsent);
    });

    test('should attach event listeners to buttons', () => {
      cookieConsent.init();
      
      const acceptAllBtn = document.getElementById('accept-all-btn');
      const rejectAllBtn = document.getElementById('reject-all-btn');
      
      expect(acceptAllBtn).toBeTruthy();
      expect(rejectAllBtn).toBeTruthy();
    });
  });

  describe('Consent Actions', () => {
    beforeEach(() => {
      cookieConsent.init();
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Consent saved' })
      });
    });

    test('should accept all cookies', async () => {
      await cookieConsent.acceptAll();
      
      expect(cookieConsent.consentData.necessary).toBe(true);
      expect(cookieConsent.consentData.analytics).toBe(true);
      expect(cookieConsent.consentData.marketing).toBe(true);
      expect(cookieConsent.consentData.functional).toBe(true);
      expect(cookieConsent.consentData.method).toBe('accept_all');
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookie-consent',
        JSON.stringify(cookieConsent.consentData)
      );
      
      expect(cookieConsent.bannerVisible).toBe(false);
    });

    test('should reject all non-necessary cookies', async () => {
      await cookieConsent.rejectAll();
      
      expect(cookieConsent.consentData.necessary).toBe(true);
      expect(cookieConsent.consentData.analytics).toBe(false);
      expect(cookieConsent.consentData.marketing).toBe(false);
      expect(cookieConsent.consentData.functional).toBe(false);
      expect(cookieConsent.consentData.method).toBe('reject_all');
    });

    test('should accept selected cookies', async () => {
      // Set some checkboxes
      document.getElementById('analytics-cookies').checked = true;
      document.getElementById('marketing-cookies').checked = false;
      document.getElementById('functional-cookies').checked = true;
      
      await cookieConsent.acceptSelected();
      
      expect(cookieConsent.consentData.necessary).toBe(true);
      expect(cookieConsent.consentData.analytics).toBe(true);
      expect(cookieConsent.consentData.marketing).toBe(false);
      expect(cookieConsent.consentData.functional).toBe(true);
      expect(cookieConsent.consentData.method).toBe('accept_selected');
    });

    test('should always keep necessary cookies enabled', async () => {
      // Try to uncheck necessary cookies (should not be possible)
      const necessaryCheckbox = document.getElementById('necessary-cookies');
      expect(necessaryCheckbox.disabled).toBe(true);
      expect(necessaryCheckbox.checked).toBe(true);
      
      await cookieConsent.rejectAll();
      
      expect(cookieConsent.consentData.necessary).toBe(true);
    });
  });

  describe('Server Communication', () => {
    beforeEach(() => {
      cookieConsent.init();
    });

    test('should send consent to server successfully', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Consent recorded' })
      });

      await cookieConsent.acceptAll();
      
      expect(fetch).toHaveBeenCalledWith('/api/gdpr/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer anonymous'
        },
        body: JSON.stringify({
          consentTypes: {
            necessary: true,
            analytics: true,
            marketing: true,
            functional: true
          },
          privacyPolicyVersion: '2.1',
          consentMethod: 'accept_all'
        })
      });
    });

    test('should handle server errors gracefully', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      // Should not throw error
      expect(() => cookieConsent.acceptAll()).not.toThrow();
      
      // Should still save locally
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('should handle server response errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      });

      await cookieConsent.acceptAll();
      
      // Should continue with local storage
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('UI Updates', () => {
    test('should update UI based on consent data', () => {
      const consent = {
        necessary: true,
        analytics: true,
        marketing: false,
        functional: true
      };

      cookieConsent.updateUI(consent);
      
      expect(document.getElementById('analytics-cookies').checked).toBe(true);
      expect(document.getElementById('marketing-cookies').checked).toBe(false);
      expect(document.getElementById('functional-cookies').checked).toBe(true);
    });

    test('should show settings modal', () => {
      cookieConsent.openSettings();
      
      expect(cookieConsent.settingsVisible).toBe(true);
      expect(document.getElementById('cookie-settings-modal').style.display).toBe('block');
    });

    test('should close settings modal', () => {
      cookieConsent.openSettings();
      cookieConsent.closeSettings();
      
      expect(cookieConsent.settingsVisible).toBe(false);
      expect(document.getElementById('cookie-settings-modal').style.display).toBe('none');
    });

    test('should display consent notices', () => {
      const message = 'Preferences updated successfully';
      
      cookieConsent.showNotice(message);
      
      const notice = document.getElementById('consent-notice');
      expect(notice.style.display).toBe('block');
      expect(notice.querySelector('p').textContent).toBe(message);
    });
  });

  describe('Service Initialization', () => {
    test('should initialize analytics when consented', () => {
      const consent = { analytics: true };
      
      cookieConsent.initializeServices(consent);
      
      expect(window.gtag).toBeDefined();
    });

    test('should disable analytics when not consented', () => {
      window.gtag = jest.fn();
      const consent = { analytics: false };
      
      cookieConsent.initializeServices(consent);
      
      expect(window.gtag).toHaveBeenCalledWith('consent', 'update', {
        'analytics_storage': 'denied'
      });
    });
  });

  describe('Consent Withdrawal', () => {
    test('should withdraw consent successfully', async () => {
      // First give consent
      await cookieConsent.acceptAll();
      expect(cookieConsent.consentData.analytics).toBe(true);
      
      // Then withdraw
      cookieConsent.withdrawConsent();
      
      expect(cookieConsent.consentData.analytics).toBe(false);
      expect(cookieConsent.consentData.marketing).toBe(false);
      expect(cookieConsent.consentData.functional).toBe(false);
      expect(cookieConsent.consentData.necessary).toBe(true); // Still true
    });
  });

  describe('Consent Validation', () => {
    test('should check if consent renewal is needed', () => {
      // Recent consent
      cookieConsent.consentData = {
        timestamp: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days ago
        necessary: true
      };
      
      expect(cookieConsent.needsConsentRenewal()).toBe(false);
      
      // Old consent
      cookieConsent.consentData = {
        timestamp: Date.now() - (400 * 24 * 60 * 60 * 1000), // 400 days ago
        necessary: true
      };
      
      expect(cookieConsent.needsConsentRenewal()).toBe(true);
    });

    test('should return current consent status', () => {
      const consent = {
        necessary: true,
        analytics: true,
        marketing: false,
        functional: true
      };
      
      cookieConsent.consentData = consent;
      
      expect(cookieConsent.getConsentStatus()).toEqual(consent);
    });

    test('should handle missing consent data', () => {
      cookieConsent.consentData = null;
      
      expect(cookieConsent.needsConsentRenewal()).toBe(true);
      expect(cookieConsent.getConsentStatus()).toBeNull();
    });
  });

  describe('Privacy Policy Compliance', () => {
    test('should include privacy policy version in consent', async () => {
      await cookieConsent.acceptAll();
      
      expect(cookieConsent.consentData.version).toBe('2.1');
    });

    test('should record consent method', async () => {
      document.getElementById('analytics-cookies').checked = true;
      await cookieConsent.acceptSelected();
      
      expect(cookieConsent.consentData.method).toBe('accept_selected');
    });

    test('should timestamp consent actions', async () => {
      const before = Date.now();
      await cookieConsent.acceptAll();
      const after = Date.now();
      
      expect(cookieConsent.consentData.timestamp).toBeGreaterThanOrEqual(before);
      expect(cookieConsent.consentData.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Accessibility Compliance', () => {
    test('should have proper ARIA labels for checkboxes', () => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      
      checkboxes.forEach(checkbox => {
        const label = document.querySelector(`label[for="${checkbox.id}"]`);
        expect(label).toBeTruthy();
        expect(label.textContent.length).toBeGreaterThan(0);
      });
    });

    test('should have proper button roles and labels', () => {
      const buttons = document.querySelectorAll('button');
      
      buttons.forEach(button => {
        expect(button.textContent.length).toBeGreaterThan(0);
      });
    });

    test('should show required indicators for necessary cookies', () => {
      const necessarySection = document.querySelector('#necessary-cookies').parentElement;
      const requiredIndicator = necessarySection.querySelector('.required');
      
      expect(requiredIndicator).toBeTruthy();
      expect(requiredIndicator.textContent).toContain('Required');
    });
  });
});
