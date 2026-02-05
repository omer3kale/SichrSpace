// PayPal UI Integration Helper Functions
// Add this to any page that needs PayPal integration

class PayPalIntegration {
  constructor() {
    this.clientId = null;
    this.environment = 'sandbox';
    this.isSDKLoaded = false;
  }

  // Initialize PayPal SDK
  async initializeSDK() {
    if (this.isSDKLoaded) return;

    try {
      // Fetch PayPal config from backend
      const configResponse = await fetch('/api/paypal/config');
      const config = await configResponse.json();
      
      // Use standardized PayPal client ID
      this.clientId = config.clientId || 'AcPYlXozR8VS9kJSk7rv5MW36lMV66ZMyqZKjM0YVuvt0dJ1cIyHRvDmGeux0qu3gBOh6XswI5gin2WO';
      this.environment = config.environment || 'production';

      // Dynamically load PayPal SDK with standardized configuration
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${this.clientId}&currency=EUR&locale=de_DE&components=buttons&enable-funding=venmo,paylater&intent=capture`;
      script.onload = () => {
        this.isSDKLoaded = true;
        console.log('✅ PayPal SDK loaded successfully');
      };
      script.onerror = () => {
        console.error('❌ Failed to load PayPal SDK');
      };
      document.head.appendChild(script);

      // Wait for SDK to load
      await new Promise((resolve, reject) => {
        script.onload = resolve;
        script.onerror = reject;
      });

    } catch (error) {
      console.error('PayPal SDK initialization error:', error);
    }
  }

  // Create PayPal button for viewing request
  createViewingPaymentButton(containerId, viewingData) {
    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container ${containerId} not found`);
      return;
    }

    container.innerHTML = ''; // Clear existing content

    window.paypal.Buttons({
      style: {
        shape: 'rect',
        layout: 'vertical',
        color: 'blue',
        label: 'paypal',
        height: 40
      },

      createOrder: async () => {
        try {
          const response = await fetch('/api/paypal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: 25.00,
              currency: 'EUR',
              description: `SichrPlace Viewing Service - Apartment ${viewingData.apartmentId}`,
              apartmentId: viewingData.apartmentId,
              viewingRequestId: `vr_${Date.now()}`,
              returnUrl: `${window.location.origin}/frontend/viewing-success.html`,
              cancelUrl: `${window.location.origin}/frontend/viewing-cancelled.html`
            })
          });

          const result = await response.json();
          if (result.success && result.paymentId) {
            this.currentPaymentId = result.paymentId;
            return result.paymentId;
          }
          throw new Error(result.error || 'Failed to create payment');
        } catch (error) {
          console.error('PayPal create order error:', error);
          this.showMessage(`Payment initialization failed: ${error.message}`, 'error');
        }
      },

      onApprove: async (data) => {
        try {
          const response = await fetch('/api/paypal/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: this.currentPaymentId || data.orderID,
              payerId: data.payerID
            })
          });

          const result = await response.json();
          if (result.success && result.status === 'completed') {
            await this.submitViewingRequest(viewingData, result.transactionId);
            this.showMessage('✅ Payment completed! Your viewing request has been submitted.', 'success');
          } else {
            throw new Error(result.error || 'Payment execution failed');
          }
        } catch (error) {
          console.error('PayPal approve error:', error);
          this.showMessage(`Payment processing failed: ${error.message}`, 'error');
        }
      },

      onError: (err) => {
        console.error('PayPal error:', err);
        this.showMessage('PayPal payment error occurred. Please try again.', 'error');
      },

      onCancel: () => {
        this.showMessage('Payment was cancelled.', 'warning');
      }

    }).render(`#${containerId}`);
  }

  // Create PayPal button for premium features
  createPremiumPaymentButton(containerId, premiumData) {
    if (!window.paypal) {
      console.error('PayPal SDK not loaded');
      return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    window.paypal.Buttons({
      style: {
        shape: 'rect',
        layout: 'horizontal',
        color: 'gold',
        label: 'pay',
        height: 40
      },

      createOrder: async () => {
        try {
          const response = await fetch('/api/paypal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: premiumData.amount,
              currency: 'EUR',
              description: premiumData.description,
              returnUrl: `${window.location.origin}/frontend/payment-success.html`,
              cancelUrl: `${window.location.origin}/frontend/payment-cancelled.html`
            })
          });

          const result = await response.json();
          if (result.success && result.paymentId) {
            return result.paymentId;
          }
          throw new Error(result.error || 'Failed to create payment');
        } catch (error) {
          console.error('Premium payment create error:', error);
          this.showMessage(`Payment initialization failed: ${error.message}`, 'error');
        }
      },

      onApprove: async (data) => {
        try {
          const response = await fetch('/api/paypal/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: data.orderID,
              payerId: data.payerID
            })
          });

          const result = await response.json();
          if (result.success) {
            this.showMessage('✅ Premium feature activated!', 'success');
            if (premiumData.onSuccess) premiumData.onSuccess(result);
          } else {
            throw new Error(result.error || 'Payment execution failed');
          }
        } catch (error) {
          console.error('Premium payment approve error:', error);
          this.showMessage(`Payment processing failed: ${error.message}`, 'error');
        }
      },

      onError: (err) => {
        console.error('Premium PayPal error:', err);
        this.showMessage('Payment error occurred. Please try again.', 'error');
      },

      onCancel: () => {
        this.showMessage('Payment was cancelled.', 'warning');
      }

    }).render(`#${containerId}`);
  }

  // Submit viewing request after successful payment
  async submitViewingRequest(viewingData, transactionId) {
    try {
      const response = await fetch('/api/viewing-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...viewingData,
          paymentId: this.currentPaymentId,
          transactionId: transactionId,
          paymentStatus: 'completed',
          paymentAmount: 25.00,
          paymentCurrency: 'EUR'
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit viewing request');
      }

      return result;
    } catch (error) {
      console.error('Viewing request submission error:', error);
      throw error;
    }
  }

  // Show user feedback messages
  showMessage(message, type = 'info') {
    const messageContainer = document.getElementById('paypal-message') || this.createMessageContainer();
    
    const bgColors = {
      success: '#ecfdf5',
      error: '#fef2f2',
      warning: '#fffbeb',
      info: '#eff6ff'
    };

    const textColors = {
      success: '#065f46',
      error: '#991b1b',
      warning: '#92400e',
      info: '#1e40af'
    };

    messageContainer.style.display = 'block';
    messageContainer.style.background = bgColors[type];
    messageContainer.style.color = textColors[type];
    messageContainer.innerHTML = message;

    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageContainer.style.display = 'none';
    }, 5000);
  }

  // Create message container if it doesn't exist
  createMessageContainer() {
    const container = document.createElement('div');
    container.id = 'paypal-message';
    container.style.cssText = `
      display: none;
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 8px;
      border: 1px solid;
      font-size: 14px;
      text-align: center;
    `;
    
    // Try to insert after PayPal button container or at the end of body
    const paypalContainer = document.getElementById('paypal-button-container');
    if (paypalContainer && paypalContainer.parentNode) {
      paypalContainer.parentNode.insertBefore(container, paypalContainer.nextSibling);
    } else {
      document.body.appendChild(container);
    }

    return container;
  }

  /**
   * Creates PayPal payment button for marketplace items
   * @param {Object} options - Payment configuration
   * @param {string} options.itemName - Name of the marketplace item
   * @param {number} options.amount - Item price in EUR
   * @param {string} options.sellerId - Seller's ID for contact after payment
   * @param {string} options.sellerEmail - Seller's email for contact
   * @param {string} options.containerSelector - Container for PayPal button
   * @param {Function} options.onSuccess - Success callback
   * @param {Function} options.onError - Error callback
   * @returns {Promise} PayPal button promise
   */
  createMarketplacePaymentButton(options = {}) {
    const {
      itemName = 'Marketplace Item',
      amount = 50.00,
      sellerId = '',
      sellerEmail = '',
      containerSelector = '#paypal-button-container',
      onSuccess = null,
      onError = null
    } = options;

    if (!this.isSDKLoaded()) {
      console.warn('PayPal SDK not loaded. Button will be created when SDK is ready.');
      return this.initializeSDK().then(() => 
        this.createMarketplacePaymentButton(options)
      );
    }

    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error(`PayPal button container not found: ${containerSelector}`);
      return Promise.reject(new Error('Container not found'));
    }

    // Clear existing content
    container.innerHTML = '';

    return window.paypal.Buttons({
      style: {
        layout: 'horizontal',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
        height: 40
      },
      
      createOrder: (data, actions) => {
        console.log('Creating marketplace payment order:', { itemName, amount, sellerId });
        
        return actions.order.create({
          purchase_units: [{
            amount: {
              currency_code: 'EUR',
              value: amount.toFixed(2)
            },
            description: `Marketplace Item: ${itemName}`,
            custom_id: `marketplace_${sellerId}_${Date.now()}`,
            soft_descriptor: 'SichrPlace Market'
          }],
          application_context: {
            brand_name: 'SichrPlace Marketplace',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: `${window.location.origin}/marketplace.html?payment=success`,
            cancel_url: `${window.location.origin}/marketplace.html?payment=cancelled`
          }
        });
      },
      
      onApprove: async (data, actions) => {
        try {
          console.log('Marketplace payment approved:', data);
          this.showProcessingIndicator('Processing your marketplace purchase...');
          
          const details = await actions.order.capture();
          console.log('Marketplace payment captured:', details);
          
          // Process payment on backend
          const response = await fetch('/api/paypal/marketplace/capture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
              orderID: data.orderID,
              paymentID: details.id,
              itemName,
              amount,
              sellerId,
              sellerEmail,
              payerDetails: details.payer
            })
          });
          
          if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
          }
          
          const result = await response.json();
          console.log('Marketplace payment processed:', result);
          
          this.hideProcessingIndicator();
          
          // Show success message
          this.showSuccessMessage(
            `Payment successful! You've purchased "${itemName}" for €${amount}. The seller will contact you shortly at the email provided during checkout.`
          );
          
          // Call success callback
          if (onSuccess && typeof onSuccess === 'function') {
            onSuccess(result, details);
          } else {
            // Default success behavior - show seller contact info
            setTimeout(() => {
              const contactInfo = sellerEmail ? 
                `Seller contact: ${sellerEmail}` : 
                'Check your email for seller contact details.';
              
              alert(`Purchase complete!\n\nItem: ${itemName}\nAmount: €${amount}\n\n${contactInfo}`);
              
              // Optionally redirect or refresh
              window.location.reload();
            }, 3000);
          }
          
        } catch (error) {
          console.error('Marketplace payment processing failed:', error);
          this.hideProcessingIndicator();
          this.showErrorMessage(`Payment processing failed: ${error.message}`);
          
          if (onError && typeof onError === 'function') {
            onError(error);
          }
        }
      },
      
      onError: (error) => {
        console.error('PayPal marketplace payment error:', error);
        this.hideProcessingIndicator();
        this.showErrorMessage('Payment failed. Please try again or contact support.');
        
        if (onError && typeof onError === 'function') {
          onError(error);
        }
      },
      
      onCancel: (data) => {
        console.log('Marketplace payment cancelled:', data);
        this.hideProcessingIndicator();
        this.showErrorMessage('Payment was cancelled.');
      }
      
    }).render(containerSelector);
  }
}

// Global PayPal integration instance
window.paypalIntegration = new PayPalIntegration();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.paypalIntegration.initializeSDK();
  });
} else {
  window.paypalIntegration.initializeSDK();
}
