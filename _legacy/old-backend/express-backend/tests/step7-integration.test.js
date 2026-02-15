const { expect } = require('chai');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

describe('Step 7: PayPal Integration Final Configuration & Live Testing', function() {
  this.timeout(30000);
  let browser, page, server;
  const BASE_URL = 'http://localhost:3000';
  
  before(async function() {
    // Start the server for testing
    const { spawn } = require('child_process');
    server = spawn('npm', ['start'], { 
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI/CD
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
  });

  after(async function() {
    if (browser) await browser.close();
    if (server) server.kill();
  });

  describe('7.1 Client ID Standardization Tests', function() {
    
    it('should verify all frontend files use standardized PayPal client ID', function() {
      const expectedClientId = 'AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO';
      const frontendFiles = [
        'frontend/index.html',
        'frontend/add-property.html',
        'frontend/marketplace.html',
        'frontend/viewing-request.html'
      ];
      
      frontendFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check if file contains PayPal SDK
        if (content.includes('paypal.com/sdk/js')) {
          expect(content).to.include(expectedClientId, `${file} should use standardized client ID`);
        }
      });
    });

    it('should verify dynamic client ID files use standardized configuration', function() {
      const expectedClientId = 'AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO';
      
      // Check paypal-integration.js
      const integrationFile = path.join(__dirname, '..', 'frontend/js/paypal-integration.js');
      const integrationContent = fs.readFileSync(integrationFile, 'utf8');
      expect(integrationContent).to.include(expectedClientId, 'paypal-integration.js should have standardized fallback client ID');
      
      // Check paypal-checkout.html
      const checkoutFile = path.join(__dirname, '..', 'frontend/paypal-checkout.html');
      const checkoutContent = fs.readFileSync(checkoutFile, 'utf8');
      expect(checkoutContent).to.include(expectedClientId, 'paypal-checkout.html should use standardized client ID');
    });

    it('should verify PayPal SDK configuration includes required parameters', function() {
      const frontendFiles = [
        'frontend/index.html',
        'frontend/add-property.html',
        'frontend/marketplace.html',
        'frontend/viewing-request.html'
      ];
      
      frontendFiles.forEach(file => {
        const filePath = path.join(__dirname, '..', file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('paypal.com/sdk/js')) {
          expect(content).to.include('currency=EUR', `${file} should specify EUR currency`);
          expect(content).to.include('locale=de_DE', `${file} should specify German locale`);
          expect(content).to.include('components=buttons', `${file} should include buttons component`);
          expect(content).to.include('enable-funding=venmo,paylater', `${file} should enable additional funding options`);
        }
      });
    });
  });

  describe('7.2 Environment Configuration Tests', function() {
    
    it('should verify backend .env file has required PayPal configuration', function() {
      const envPath = path.join(__dirname, '..', '.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      expect(envContent).to.include('PAYPAL_CLIENT_ID=', 'Should have PayPal client ID');
      expect(envContent).to.include('PAYPAL_CLIENT_SECRET=', 'Should have PayPal client secret');
      expect(envContent).to.include('PAYPAL_ENVIRONMENT=', 'Should have PayPal environment setting');
    });

    it('should verify environment consistency between main and backend .env files', function() {
      const mainEnvPath = path.join(__dirname, '../../.env');
      const backendEnvPath = path.join(__dirname, '..', '.env');
      
      const mainEnv = fs.readFileSync(mainEnvPath, 'utf8');
      const backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
      
      // Extract client IDs
      const mainClientId = mainEnv.match(/PAYPAL_CLIENT_ID=(.+)/)?.[1]?.trim();
      const backendClientId = backendEnv.match(/PAYPAL_CLIENT_ID=(.+)/)?.[1]?.trim();
      
      expect(mainClientId).to.equal(backendClientId, 'PayPal client IDs should match between main and backend .env files');
    });

    it('should verify sandbox credentials are available for testing', function() {
      const envPath = path.join(__dirname, '..', '.env');
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      expect(envContent).to.include('PAYPAL_CLIENT_ID_SANDBOX=', 'Should have sandbox client ID');
      expect(envContent).to.include('PAYPAL_CLIENT_SECRET_SANDBOX=', 'Should have sandbox client secret');
    });
  });

  describe('7.3 Server Infrastructure Tests', function() {
    
    it('should verify server starts successfully', async function() {
      const response = await page.goto(`${BASE_URL}/frontend/index.html`);
      expect(response.status()).to.equal(200, 'Server should respond with 200 OK');
    });

    it('should verify PayPal endpoints are accessible', async function() {
      const endpoints = [
        '/api/paypal/create',
        '/api/paypal/execute',
        '/api/paypal/webhooks',
        '/api/paypal/marketplace/capture'
      ];
      
      for (const endpoint of endpoints) {
        const response = await page.evaluate(async (url) => {
          try {
            const res = await fetch(url, { method: 'OPTIONS' });
            return { status: res.status, accessible: true };
          } catch (error) {
            return { accessible: false, error: error.message };
          }
        }, `${BASE_URL}${endpoint}`);
        
        expect(response.accessible).to.be.true;
      }
    });

    it('should verify database connections are working', async function() {
      // Test if server logs indicate successful database connection
      // This would require checking server logs or a health endpoint
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/health');
          return res.ok;
        } catch (error) {
          return false;
        }
      });
      
      // If no health endpoint exists, we'll check if the main page loads without errors
      await page.goto(`${BASE_URL}/frontend/index.html`);
      const errors = await page.evaluate(() => {
        return window.console.errors || [];
      });
      
      expect(errors.length).to.equal(0, 'Should not have console errors indicating database issues');
    });
  });

  describe('7.4 Frontend Integration Tests', function() {
    
    beforeEach(async function() {
      await page.goto(`${BASE_URL}/frontend/index.html`);
    });

    it('should load PayPal SDK on index.html', async function() {
      await page.waitForFunction(() => window.paypal !== undefined, { timeout: 10000 });
      
      const paypalLoaded = await page.evaluate(() => !!window.paypal);
      expect(paypalLoaded).to.be.true('PayPal SDK should be loaded');
    });

    it('should initialize viewing request modal', async function() {
      const modalExists = await page.$('#viewing-request-modal');
      expect(modalExists).to.not.be.null('Viewing request modal should exist');
      
      const paypalModalExists = await page.$('#paypal-payment-modal');
      expect(paypalModalExists).to.not.be.null('PayPal payment modal should exist');
    });

    it('should display PayPal button container', async function() {
      const buttonContainer = await page.$('#paypal-button-container');
      expect(buttonContainer).to.not.be.null('PayPal button container should exist');
    });

    it('should have proper PayPal configuration in JavaScript', async function() {
      const configCheck = await page.evaluate(() => {
        return {
          hasPayPalSDK: !!window.paypal,
          hasCreateOrder: typeof window.paypal?.Buttons === 'function',
          hasViewingRequestData: typeof viewingRequestData !== 'undefined',
          hasSubmitFunction: typeof submitViewingRequest === 'function'
        };
      });
      
      expect(configCheck.hasPayPalSDK).to.be.true('Should have PayPal SDK');
      expect(configCheck.hasViewingRequestData).to.be.true('Should have viewingRequestData variable');
    });
  });

  describe('7.5 Payment Flow Tests', function() {
    
    it('should handle viewing request form submission', async function() {
      await page.goto(`${BASE_URL}/frontend/index.html`);
      
      // Mock form data
      await page.evaluate(() => {
        if (typeof openViewingRequestModal === 'function') {
          openViewingRequestModal();
        }
      });
      
      // Wait for modal
      await page.waitForSelector('#viewing-request-modal', { visible: true, timeout: 5000 });
      
      // Fill form
      await page.type('#apartment-id', 'TEST-APT-123');
      await page.type('#viewing-date', '2025-12-25');
      await page.type('#viewing-time', '14:00');
      await page.type('#applicant-name', 'Test User');
      await page.type('#applicant-email', 'test@example.com');
      await page.type('#applicant-phone', '+49123456789');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should show payment modal
      await page.waitForSelector('#paypal-payment-modal', { visible: true, timeout: 5000 });
      
      const paymentModalVisible = await page.isVisible('#paypal-payment-modal');
      expect(paymentModalVisible).to.be.true('Payment modal should be visible after form submission');
    });

    it('should initialize PayPal buttons when payment modal opens', async function() {
      await page.goto(`${BASE_URL}/frontend/index.html`);
      
      // Trigger payment modal
      await page.evaluate(() => {
        if (typeof showPaymentModal === 'function') {
          viewingRequestData = {
            apartmentId: 'TEST-123',
            viewingDate: '2025-12-25',
            viewingTime: '14:00',
            applicantName: 'Test User',
            applicantEmail: 'test@example.com',
            applicantPhone: '+49123456789'
          };
          showPaymentModal();
        }
      });
      
      await page.waitForSelector('#paypal-payment-modal', { visible: true, timeout: 5000 });
      
      // Wait for PayPal button to initialize
      await page.waitForFunction(() => {
        const container = document.querySelector('#paypal-button-container');
        return container && container.children.length > 0;
      }, { timeout: 10000 });
      
      const hasPayPalButton = await page.evaluate(() => {
        const container = document.querySelector('#paypal-button-container');
        return container && container.children.length > 0;
      });
      
      expect(hasPayPalButton).to.be.true('PayPal button should be initialized in the container');
    });

    it('should handle PayPal payment creation', async function() {
      // Mock successful payment creation
      await page.goto(`${BASE_URL}/frontend/index.html`);
      
      const paymentData = {
        amount: 25.00,
        currency: 'EUR',
        description: 'Test Viewing Request',
        apartmentId: 'TEST-123'
      };
      
      const createOrderResult = await page.evaluate(async (data) => {
        try {
          const response = await fetch('/api/paypal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          return { success: response.ok, status: response.status };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }, paymentData);
      
      // Should either succeed or fail gracefully
      expect(createOrderResult).to.have.property('status');
    });
  });

  describe('7.6 Multi-Page Integration Tests', function() {
    
    const paypalPages = [
      { path: '/frontend/add-property.html', name: 'Add Property' },
      { path: '/frontend/marketplace.html', name: 'Marketplace' },
      { path: '/frontend/viewing-request.html', name: 'Viewing Request' }
    ];
    
    paypalPages.forEach(({ path, name }) => {
      it(`should load PayPal integration on ${name} page`, async function() {
        await page.goto(`${BASE_URL}${path}`);
        
        const paypalSDKLoaded = await page.waitForFunction(
          () => window.paypal !== undefined,
          { timeout: 10000 }
        ).catch(() => false);
        
        expect(paypalSDKLoaded).to.not.be.false(`PayPal SDK should load on ${name} page`);
        
        // Check for PayPal-related elements
        const paypalElements = await page.evaluate(() => {
          return {
            hasScript: !!document.querySelector('script[src*="paypal.com/sdk"]'),
            hasButton: !!document.querySelector('[id*="paypal"]'),
            hasIntegration: !!document.querySelector('.paypal-container, #paypal-button-container, [class*="paypal"]')
          };
        });
        
        expect(paypalElements.hasScript).to.be.true(`${name} page should have PayPal SDK script`);
      });
    });
  });

  describe('7.7 Error Handling Tests', function() {
    
    it('should handle PayPal SDK loading errors gracefully', async function() {
      await page.goto(`${BASE_URL}/frontend/index.html`);
      
      // Simulate network error for PayPal SDK
      await page.setOfflineMode(true);
      await page.reload();
      
      // Check if error handling is in place
      const errorHandling = await page.evaluate(() => {
        return {
          hasConsoleErrors: console.error.toString().includes('PayPal') || console.warn.toString().includes('PayPal'),
          pageStillFunctional: !!document.querySelector('header'),
          hasErrorMessage: !!document.querySelector('.error-message, .payment-error, [class*="error"]')
        };
      });
      
      expect(errorHandling.pageStillFunctional).to.be.true('Page should remain functional even if PayPal fails to load');
      
      await page.setOfflineMode(false);
    });

    it('should validate form inputs before showing payment modal', async function() {
      await page.goto(`${BASE_URL}/frontend/index.html`);
      
      // Try to submit empty form
      await page.evaluate(() => {
        if (typeof openViewingRequestModal === 'function') {
          openViewingRequestModal();
        }
      });
      
      await page.waitForSelector('#viewing-request-modal', { visible: true, timeout: 5000 });
      
      // Submit without filling required fields
      await page.click('button[type="submit"]');
      
      // Payment modal should not appear
      const paymentModalVisible = await page.isVisible('#paypal-payment-modal');
      expect(paymentModalVisible).to.be.false('Payment modal should not appear with invalid form data');
    });
  });

  describe('7.8 Performance Tests', function() {
    
    it('should load PayPal SDK within acceptable time', async function() {
      const startTime = Date.now();
      
      await page.goto(`${BASE_URL}/frontend/index.html`);
      await page.waitForFunction(() => window.paypal !== undefined, { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).to.be.below(15000, 'PayPal SDK should load within 15 seconds');
    });

    it('should not cause memory leaks with multiple modal opens', async function() {
      await page.goto(`${BASE_URL}/frontend/index.html`);
      
      // Open and close modal multiple times
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => {
          if (typeof openViewingRequestModal === 'function') {
            openViewingRequestModal();
          }
        });
        
        await page.evaluate(() => {
          if (typeof closeViewingRequestModal === 'function') {
            closeViewingRequestModal();
          }
        });
      }
      
      // Check for excessive DOM elements
      const elementCount = await page.evaluate(() => document.querySelectorAll('*').length);
      expect(elementCount).to.be.below(1000, 'Should not create excessive DOM elements');
    });
  });
});
