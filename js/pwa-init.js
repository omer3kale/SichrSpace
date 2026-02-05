// SichrPlace PWA Initialization
// Handles service worker registration, push notifications, and PWA features

class SichrPlacePWA {
  constructor() {
    this.swRegistration = null;
    this.isSubscribed = false;
    this.pushButton = null;
    this.applicationServerKey = null;
    this.init();
  }

  async init() {
    console.log('[PWA] Initializing SichrPlace PWA...');
    
    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
      await this.registerServiceWorker();
    } else {
      console.warn('[PWA] Service Worker not supported');
    }
    
    // Initialize push notifications
    if ('PushManager' in window) {
      await this.initializePushNotifications();
    } else {
      console.warn('[PWA] Push notifications not supported');
    }
    
    // Initialize PWA features
    this.initializePWAFeatures();
    
    // Set up install prompt
    this.setupInstallPrompt();
    
    console.log('[PWA] SichrPlace PWA initialized successfully');
  }

  async registerServiceWorker() {
    try {
      this.swRegistration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[PWA] Service Worker registered:', this.swRegistration);
      
      // Handle service worker updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });
      
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  async initializePushNotifications() {
    try {
      // Get VAPID public key from server
      const response = await fetch('/api/push/vapid-public-key');
      const data = await response.json();
      this.applicationServerKey = data.publicKey;
      
      // Check current subscription status
      if (this.swRegistration) {
        const subscription = await this.swRegistration.pushManager.getSubscription();
        this.isSubscribed = !(subscription === null);
        this.updatePushButton();
      }
      
    } catch (error) {
      console.error('[PWA] Failed to initialize push notifications:', error);
    }
  }

  async subscribeToPushNotifications() {
    try {
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.applicationServerKey)
      });

      console.log('[PWA] Push subscription:', subscription);
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      this.isSubscribed = true;
      this.updatePushButton();
      
      // Show success message
      this.showNotification('Notifications Enabled', 'You will now receive push notifications from SichrPlace');
      
    } catch (error) {
      console.error('[PWA] Failed to subscribe to push notifications:', error);
      this.showNotification('Notification Error', 'Failed to enable notifications. Please try again.');
    }
  }

  async unsubscribeFromPushNotifications() {
    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await this.removeSubscriptionFromServer(subscription);
        
        this.isSubscribed = false;
        this.updatePushButton();
        
        this.showNotification('Notifications Disabled', 'You will no longer receive push notifications');
      }
      
    } catch (error) {
      console.error('[PWA] Failed to unsubscribe from push notifications:', error);
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          userId: this.getCurrentUserId()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save subscription on server');
      }
      
    } catch (error) {
      console.error('[PWA] Failed to send subscription to server:', error);
      throw error;
    }
  }

  async removeSubscriptionFromServer(subscription) {
    try {
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription,
          userId: this.getCurrentUserId()
        })
      });
    } catch (error) {
      console.error('[PWA] Failed to remove subscription from server:', error);
    }
  }

  initializePWAFeatures() {
    // Add PWA install button if not already installed
    this.createInstallButton();
    
    // Add push notification toggle
    this.createPushNotificationToggle();
    
    // Add offline indicator
    this.createOfflineIndicator();
    
    // Handle online/offline events
    this.setupNetworkHandling();
  }

  createInstallButton() {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('[PWA] App is already installed');
      return;
    }
    
    // Create install button
    const installButton = document.createElement('button');
    installButton.id = 'pwa-install-btn';
    installButton.className = 'pwa-install-button hidden';
    installButton.innerHTML = `
      <i class="fas fa-download"></i>
      Install App
    `;
    
    installButton.addEventListener('click', () => {
      this.promptInstall();
    });
    
    // Add to header or create floating button
    const header = document.querySelector('header') || document.querySelector('.navbar');
    if (header) {
      header.appendChild(installButton);
    } else {
      installButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--primary, #2563EB);
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        font-size: 14px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(installButton);
    }
  }

  createPushNotificationToggle() {
    const toggle = document.createElement('div');
    toggle.id = 'push-notification-toggle';
    toggle.className = 'notification-toggle';
    toggle.innerHTML = `
      <label class="toggle-label">
        <span>Push Notifications</span>
        <button id="push-button" class="toggle-button">
          <i class="fas fa-bell"></i>
          <span class="button-text">Enable</span>
        </button>
      </label>
    `;
    
    // Add to settings or profile area
    const settingsArea = document.querySelector('.user-settings') || 
                        document.querySelector('.profile-section') ||
                        document.querySelector('.dashboard-settings');
    
    if (settingsArea) {
      settingsArea.appendChild(toggle);
    }
    
    this.pushButton = document.getElementById('push-button');
    if (this.pushButton) {
      this.pushButton.addEventListener('click', () => {
        if (this.isSubscribed) {
          this.unsubscribeFromPushNotifications();
        } else {
          this.subscribeToPushNotifications();
        }
      });
    }
  }

  createOfflineIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'offline-indicator';
    indicator.className = 'offline-indicator hidden';
    indicator.innerHTML = `
      <i class="fas fa-wifi"></i>
      <span>You are offline</span>
    `;
    
    indicator.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #f59e0b;
      color: white;
      text-align: center;
      padding: 8px;
      font-size: 14px;
      z-index: 9999;
      transform: translateY(-100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(indicator);
  }

  setupInstallPrompt() {
    let deferredPrompt;
    
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt available');
      e.preventDefault();
      deferredPrompt = e;
      
      // Show install button
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) {
        installBtn.classList.remove('hidden');
      }
    });
    
    this.promptInstall = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Install prompt outcome:', outcome);
        
        if (outcome === 'accepted') {
          this.showNotification('App Installed', 'SichrPlace has been installed successfully!');
        }
        
        deferredPrompt = null;
        
        // Hide install button
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) {
          installBtn.classList.add('hidden');
        }
      }
    };
  }

  setupNetworkHandling() {
    const offlineIndicator = document.getElementById('offline-indicator');
    
    window.addEventListener('online', () => {
      console.log('[PWA] Back online');
      if (offlineIndicator) {
        offlineIndicator.style.transform = 'translateY(-100%)';
      }
      
      // Trigger background sync
      if (this.swRegistration && this.swRegistration.sync) {
        this.swRegistration.sync.register('background-sync-messages');
        this.swRegistration.sync.register('background-sync-favorites');
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('[PWA] Gone offline');
      if (offlineIndicator) {
        offlineIndicator.style.transform = 'translateY(0)';
      }
    });
  }

  updatePushButton() {
    if (this.pushButton) {
      const icon = this.pushButton.querySelector('i');
      const text = this.pushButton.querySelector('.button-text');
      
      if (this.isSubscribed) {
        icon.className = 'fas fa-bell';
        text.textContent = 'Enabled';
        this.pushButton.classList.add('enabled');
      } else {
        icon.className = 'fas fa-bell-slash';
        text.textContent = 'Enable';
        this.pushButton.classList.remove('enabled');
      }
    }
  }

  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <span>A new version is available!</span>
        <button onclick="sichrPlacePWA.updateApp()">Update</button>
        <button onclick="this.parentElement.parentElement.remove()">Later</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 9999;
    `;
    
    document.body.appendChild(notification);
  }

  updateApp() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  showNotification(title, body) {
    // Try to use service worker notification first
    if (this.swRegistration) {
      this.swRegistration.showNotification(title, {
        body: body,
        icon: '/img/pwa-icon-192.png',
        tag: 'app-notification'
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/img/pwa-icon-192.png'
      });
    } else {
      // Fallback to in-app notification
      this.showInAppNotification(title, body);
    }
  }

  showInAppNotification(title, body) {
    const notification = document.createElement('div');
    notification.className = 'in-app-notification';
    notification.innerHTML = `
      <div class="notification-content">
        <h4>${title}</h4>
        <p>${body}</p>
        <button onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border-left: 4px solid var(--primary, #2563EB);
      border-radius: 4px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 9999;
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Utility functions
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getCurrentUserId() {
    // Get user ID from localStorage, sessionStorage, or JWT token
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.id || payload.userId;
      } catch (error) {
        console.error('[PWA] Failed to parse auth token:', error);
      }
    }
    
    // Fallback to user ID in DOM or other storage
    const userIdElement = document.querySelector('[data-user-id]');
    return userIdElement ? userIdElement.dataset.userId : null;
  }
}

// Initialize PWA when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.sichrPlacePWA = new SichrPlacePWA();
  });
} else {
  window.sichrPlacePWA = new SichrPlacePWA();
}

// Export for use in other scripts
window.SichrPlacePWA = SichrPlacePWA;
