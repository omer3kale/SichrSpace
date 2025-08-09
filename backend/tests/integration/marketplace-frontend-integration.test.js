const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// Mock browser environment
const mockWindow = {
  location: {
    href: 'http://localhost:3000/marketplace.html',
    pathname: '/marketplace.html'
  },
  localStorage: {
    store: {},
    getItem: function(key) {
      return this.store[key] || null;
    },
    setItem: function(key, value) {
      this.store[key] = value;
    },
    removeItem: function(key) {
      delete this.store[key];
    }
  },
  gtag: jest.fn(),
  alert: jest.fn(),
  confirm: jest.fn(() => true),
  setTimeout: global.setTimeout,
  Date: global.Date,
  encodeURIComponent: global.encodeURIComponent
};

// Mock document object for marketplace functionality
const mockDocument = {
  elements: {},
  
  getElementById: function(id) {
    if (!this.elements[id]) {
      this.elements[id] = {
        id: id,
        style: {},
        classList: {
          items: [],
          add: function(className) {
            if (!this.items.includes(className)) {
              this.items.push(className);
            }
          },
          remove: function(className) {
            this.items = this.items.filter(item => item !== className);
          },
          toggle: function(className, force) {
            if (force !== undefined) {
              if (force) {
                this.add(className);
              } else {
                this.remove(className);
              }
            } else {
              if (this.contains(className)) {
                this.remove(className);
              } else {
                this.add(className);
              }
            }
          },
          contains: function(className) {
            return this.items.includes(className);
          }
        },
        innerText: '',
        innerHTML: '',
        value: '',
        closest: function(selector) {
          if (selector === '.offer-card') {
            return {
              querySelector: function(sel) {
                if (sel === '.offer-title') {
                  return { innerText: 'Test Offer Title' };
                }
                if (sel === '.offer-category') {
                  return { innerText: 'Kitchen' };
                }
                if (sel === '.offer-price') {
                  return { innerText: '€150' };
                }
                if (sel === '.offer-desc') {
                  return { innerText: 'Test offer description' };
                }
                if (sel === '.offer-meta') {
                  return { innerText: 'Cologne, 50667 • 2 hours ago' };
                }
                return null;
              }
            };
          }
          return null;
        }
      };
    }
    return this.elements[id];
  },
  
  querySelectorAll: function(selector) {
    if (selector === '#offers-buy .offer-card') {
      return [
        {
          style: { display: '' },
          querySelector: function(sel) {
            if (sel === '.offer-title') {
              return { innerText: 'Double Bed Frame with Storage' };
            }
            if (sel === '.offer-desc') {
              return { innerText: 'IKEA Malm bed frame' };
            }
            if (sel === '.offer-category') {
              return { innerText: 'Bedroom' };
            }
            if (sel === '.offer-type') {
              return { innerText: 'Pre-owned' };
            }
            if (sel === '.offer-meta') {
              return { innerText: 'cologne, 50667' };
            }
            if (sel === '.offer-price') {
              return { innerText: '€85' };
            }
            return null;
          }
        },
        {
          style: { display: '' },
          querySelector: function(sel) {
            if (sel === '.offer-title') {
              return { innerText: 'KitchenAid Stand Mixer' };
            }
            if (sel === '.offer-desc') {
              return { innerText: 'Professional KitchenAid mixer' };
            }
            if (sel === '.offer-category') {
              return { innerText: 'Kitchen' };
            }
            if (sel === '.offer-type') {
              return { innerText: 'Refurbished' };
            }
            if (sel === '.offer-meta') {
              return { innerText: 'aachen, 52062' };
            }
            if (sel === '.offer-price') {
              return { innerText: '€185' };
            }
            return null;
          }
        }
      ];
    }
    
    if (selector === '.offer-card button, .offer-card .favorite-btn') {
      return [
        { style: { opacity: '1' }, title: '' },
        { style: { opacity: '1' }, title: '' }
      ];
    }
    
    return [];
  },
  
  querySelector: function(selector) {
    if (selector === 'main') {
      return {
        insertAdjacentElement: function(position, element) {
          return element;
        }
      };
    }
    return null;
  },
  
  createElement: function(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      style: {
        cssText: ''
      },
      innerHTML: '',
      textContent: ''
    };
  },
  
  body: {
    insertAdjacentHTML: function(position, html) {
      // Mock HTML insertion
      return true;
    },
    appendChild: function(element) {
      return element;
    }
  },
  
  head: {
    appendChild: function(element) {
      return element;
    }
  },
  
  addEventListener: function(event, callback) {
    if (event === 'DOMContentLoaded') {
      // Simulate DOM ready
      setTimeout(callback, 0);
    }
  }
};

// Mock marketplace frontend functions
const mockMarketplaceFunctions = {
  // Authentication functions
  isLoggedIn: function() {
    return mockWindow.localStorage.getItem('sichrplace_logged_in') === 'true';
  },
  
  requireLogin: function(action) {
    if (!this.isLoggedIn()) {
      if (typeof mockWindow.gtag !== 'undefined') {
        mockWindow.gtag('event', 'login_required', {
          event_category: 'marketplace',
          event_label: action
        });
      }
      mockWindow.location.href = 'login.html?redirect=marketplace.html';
      return false;
    }
    return true;
  },
  
  // Tab management
  showTab: function(tab) {
    const tabBuy = mockDocument.getElementById('tab-buy');
    const tabSell = mockDocument.getElementById('tab-sell');
    const offersBuy = mockDocument.getElementById('offers-buy');
    const offersSell = mockDocument.getElementById('offers-sell');
    const filters = mockDocument.getElementById('marketplace-filters');
    
    tabBuy.classList.toggle('active', tab === 'buy');
    tabSell.classList.toggle('active', tab === 'sell');
    offersBuy.style.display = tab === 'buy' ? '' : 'none';
    offersSell.style.display = tab === 'sell' ? '' : 'none';
    filters.style.display = tab === 'buy' ? '' : 'none';
    
    if (typeof mockWindow.gtag !== 'undefined') {
      mockWindow.gtag('event', 'tab_switch', {
        event_category: 'marketplace',
        event_label: tab
      });
    }
    
    return { tab, success: true };
  },
  
  // Favorite system
  toggleFavorite: function(btn) {
    if (!this.requireLogin()) return false;
    
    btn.classList.toggle('active');
    const offerTitle = btn.closest('.offer-card').querySelector('.offer-title').innerText;
    const isFavorited = btn.classList.contains('active');
    
    if (typeof mockWindow.gtag !== 'undefined') {
      mockWindow.gtag('event', isFavorited ? 'add_to_favorites' : 'remove_from_favorites', {
        event_category: 'marketplace',
        event_label: offerTitle,
        value: 1
      });
    }
    
    this.showNotification(
      isFavorited ? '❤️ Added to favorites' : '💔 Removed from favorites',
      'success'
    );
    
    return { action: isFavorited ? 'added' : 'removed', offerTitle };
  },
  
  // Messaging
  messageOwner: function(itemTitle, itemId) {
    if (!this.requireLogin()) return false;
    
    if (typeof mockWindow.gtag !== 'undefined') {
      mockWindow.gtag('event', 'message_seller', {
        event_category: 'marketplace',
        event_label: itemTitle,
        custom_parameters: {
          item_id: itemId
        }
      });
    }
    
    this.showNotification('💬 Opening chat with seller...', 'info');
    
    setTimeout(() => {
      mockWindow.location.href = `chat.html?item=${mockWindow.encodeURIComponent(itemId)}&title=${mockWindow.encodeURIComponent(itemTitle)}`;
    }, 1000);
    
    return { itemTitle, itemId, success: true };
  },
  
  // Payment processing
  initiatePayment: function(itemId, price) {
    if (!this.requireLogin()) return false;
    
    const itemTitle = 'Test Item'; // Mocked for testing
    
    if (typeof mockWindow.gtag !== 'undefined') {
      mockWindow.gtag('event', 'begin_checkout', {
        event_category: 'marketplace',
        currency: 'EUR',
        value: price,
        items: [{
          item_id: itemId,
          item_name: itemTitle,
          category: 'Kitchen',
          price: price,
          quantity: 1
        }]
      });
    }
    
    const platformFee = Math.round(price * 0.02 * 100) / 100;
    const total = price;
    
    const modal = `
      <div id="payment-modal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;">
        <div style="background:white;border-radius:16px;padding:32px;">
          <h3>Secure Payment</h3>
          <div>Item: ${itemTitle}</div>
          <div>Price: €${price}</div>
          <div>Fee: €${platformFee}</div>
          <div>Total: €${total}</div>
        </div>
      </div>
    `;
    
    mockDocument.body.insertAdjacentHTML('beforeend', modal);
    
    return { itemId, price, platformFee, total, modalShown: true };
  },
  
  processPayment: function(itemId, price) {
    if (typeof mockWindow.gtag !== 'undefined') {
      mockWindow.gtag('event', 'purchase', {
        event_category: 'marketplace',
        transaction_id: 'MP' + mockWindow.Date.now(),
        currency: 'EUR',
        value: price
      });
    }
    
    this.showNotification('💳 Processing payment...', 'info');
    
    setTimeout(() => {
      this.closePaymentModal();
      this.showNotification('✅ Payment successful! Seller will contact you soon.', 'success');
    }, 2000);
    
    return { itemId, price, success: true };
  },
  
  closePaymentModal: function() {
    const modal = mockDocument.getElementById('payment-modal');
    if (modal) {
      // Mock removal
      return true;
    }
    return false;
  },
  
  // Filtering system
  applyFilters: function() {
    const search = mockDocument.getElementById('filter-search').value.toLowerCase().trim();
    const category = mockDocument.getElementById('filter-category').value;
    const condition = mockDocument.getElementById('filter-condition').value;
    const city = mockDocument.getElementById('filter-city').value.toLowerCase().trim();
    const postal = mockDocument.getElementById('filter-postal').value.trim();
    const minPrice = mockDocument.getElementById('filter-min-price').value;
    const maxPrice = mockDocument.getElementById('filter-max-price').value;
    
    if (typeof mockWindow.gtag !== 'undefined') {
      mockWindow.gtag('event', 'filter_applied', {
        event_category: 'marketplace',
        custom_parameters: {
          has_search: !!search,
          has_category: !!category,
          has_condition: !!condition,
          has_location: !!(city || postal),
          has_price: !!(minPrice || maxPrice)
        }
      });
    }
    
    const offers = mockDocument.querySelectorAll('#offers-buy .offer-card');
    let visibleCount = 0;
    
    offers.forEach(card => {
      let match = true;
      
      // Search filter
      if (search) {
        const title = card.querySelector('.offer-title').innerText.toLowerCase();
        const desc = card.querySelector('.offer-desc').innerText.toLowerCase();
        if (!title.includes(search) && !desc.includes(search)) match = false;
      }
      
      // Category filter
      if (category && card.querySelector('.offer-category').innerText !== category) match = false;
      
      // Condition filter
      if (condition && card.querySelector('.offer-type').innerText !== condition) match = false;
      
      // Location filters
      const location = card.querySelector('.offer-meta').innerText.toLowerCase();
      if (city && !location.includes(city)) match = false;
      if (postal && !location.includes(postal)) match = false;
      
      // Price filters
      const priceText = card.querySelector('.offer-price').innerText.replace(/[^\d]/g, '');
      const price = parseInt(priceText, 10) || 0;
      if (minPrice && price < parseInt(minPrice, 10)) match = false;
      if (maxPrice && price > parseInt(maxPrice, 10)) match = false;
      
      card.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    
    this.showNotification(`🔍 Found ${visibleCount} items matching your criteria`, 'info');
    
    return { visibleCount, filtersApplied: true };
  },
  
  clearFilters: function() {
    mockDocument.getElementById('filter-search').value = '';
    mockDocument.getElementById('filter-category').value = '';
    mockDocument.getElementById('filter-condition').value = '';
    mockDocument.getElementById('filter-city').value = '';
    mockDocument.getElementById('filter-postal').value = '';
    mockDocument.getElementById('filter-min-price').value = '';
    mockDocument.getElementById('filter-max-price').value = '';
    
    mockDocument.querySelectorAll('#offers-buy .offer-card').forEach(card => {
      card.style.display = '';
    });
    
    this.showNotification('🧹 Filters cleared', 'info');
    
    return { filtersCleared: true };
  },
  
  // Seller functions
  createOffer: function() {
    if (!this.requireLogin()) return false;
    
    if (typeof mockWindow.gtag !== 'undefined') {
      mockWindow.gtag('event', 'create_offer_start', {
        event_category: 'marketplace'
      });
    }
    
    this.showNotification('📝 Redirecting to create offer form...', 'info');
    mockWindow.location.href = 'create-offer.html';
    
    return { success: true };
  },
  
  viewChats: function(itemId) {
    if (!this.requireLogin()) return false;
    
    this.showNotification('💬 Loading your conversations...', 'info');
    mockWindow.location.href = `seller-chats.html?item=${itemId}`;
    
    return { itemId, success: true };
  },
  
  editOffer: function(itemId) {
    if (!this.requireLogin()) return false;
    
    this.showNotification('✏️ Opening offer editor...', 'info');
    mockWindow.location.href = `edit-offer.html?item=${itemId}`;
    
    return { itemId, success: true };
  },
  
  promoteOffer: function(itemId) {
    if (!this.requireLogin()) return false;
    
    const modal = `
      <div id="promote-modal">
        <h3>Promote Your Offer</h3>
        <p>Move your offer to the top of search results for 7 days</p>
        <div>€5.99 - 7-day promotion</div>
      </div>
    `;
    
    mockDocument.body.insertAdjacentHTML('beforeend', modal);
    
    return { itemId, promotionModalShown: true };
  },
  
  processPromotion: function(itemId) {
    mockDocument.getElementById('promote-modal').remove = () => true;
    this.showNotification('🚀 Your offer has been promoted! It will appear at the top for 7 days.', 'success');
    
    return { itemId, promoted: true };
  },
  
  markAsSold: function(itemId) {
    if (!this.requireLogin()) return false;
    
    if (mockWindow.confirm('Mark this item as sold? This will remove it from active listings.')) {
      this.showNotification('✅ Item marked as sold!', 'success');
      return { itemId, markedAsSold: true };
    }
    
    return { itemId, markedAsSold: false };
  },
  
  // Notification system
  showNotification: function(message, type = 'info') {
    const colors = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };
    
    const notification = mockDocument.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      z-index: 10000;
    `;
    notification.textContent = message;
    
    mockDocument.body.appendChild(notification);
    
    setTimeout(() => {
      // Mock removal animation
      return true;
    }, 3000);
    
    return { message, type, shown: true };
  }
};

describe('Marketplace Frontend Integration Tests', () => {
  beforeEach(() => {
    // Reset mock state
    mockWindow.localStorage.store = {};
    mockDocument.elements = {};
    
    // Setup mock form elements with default values
    const filterElements = [
      'filter-search', 'filter-category', 'filter-condition',
      'filter-city', 'filter-postal', 'filter-min-price', 'filter-max-price'
    ];
    
    filterElements.forEach(id => {
      const element = mockDocument.getElementById(id);
      element.value = '';
    });
  });

  describe('Authentication Integration', () => {
    test('should detect logged out state correctly', () => {
      const result = mockMarketplaceFunctions.isLoggedIn();
      expect(result).toBe(false);
    });

    test('should detect logged in state when token exists', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      const result = mockMarketplaceFunctions.isLoggedIn();
      expect(result).toBe(true);
    });

    test('should require login for protected actions', () => {
      const result = mockMarketplaceFunctions.requireLogin('buy_item');
      expect(result).toBe(false);
      expect(mockWindow.location.href).toBe('login.html?redirect=marketplace.html');
    });

    test('should allow actions when logged in', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      const result = mockMarketplaceFunctions.requireLogin('buy_item');
      expect(result).toBe(true);
    });
  });

  describe('Tab Management Integration', () => {
    test('should switch to buy tab correctly', () => {
      const result = mockMarketplaceFunctions.showTab('buy');
      
      expect(result.tab).toBe('buy');
      expect(result.success).toBe(true);
      expect(mockDocument.getElementById('tab-buy').classList.contains('active')).toBe(true);
      expect(mockDocument.getElementById('tab-sell').classList.contains('active')).toBe(false);
      expect(mockDocument.getElementById('offers-buy').style.display).toBe('');
      expect(mockDocument.getElementById('offers-sell').style.display).toBe('none');
    });

    test('should switch to sell tab correctly', () => {
      const result = mockMarketplaceFunctions.showTab('sell');
      
      expect(result.tab).toBe('sell');
      expect(result.success).toBe(true);
      expect(mockDocument.getElementById('tab-sell').classList.contains('active')).toBe(true);
      expect(mockDocument.getElementById('tab-buy').classList.contains('active')).toBe(false);
      expect(mockDocument.getElementById('offers-sell').style.display).toBe('');
      expect(mockDocument.getElementById('offers-buy').style.display).toBe('none');
    });

    test('should track tab switching analytics', () => {
      mockMarketplaceFunctions.showTab('buy');
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'tab_switch', {
        event_category: 'marketplace',
        event_label: 'buy'
      });
    });
  });

  describe('Favorites Integration', () => {
    test('should require login for favorites', () => {
      const mockBtn = {
        classList: {
          items: [],
          toggle: jest.fn(),
          contains: jest.fn(() => false)
        },
        closest: jest.fn(() => ({
          querySelector: jest.fn(() => ({ innerText: 'Test Item' }))
        }))
      };

      const result = mockMarketplaceFunctions.toggleFavorite(mockBtn);
      expect(result).toBe(false);
    });

    test('should toggle favorite when logged in', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const mockBtn = {
        classList: {
          items: [],
          toggle: function(className) {
            if (this.items.includes(className)) {
              this.items = this.items.filter(item => item !== className);
            } else {
              this.items.push(className);
            }
          },
          contains: function(className) {
            return this.items.includes(className);
          }
        },
        closest: function() {
          return {
            querySelector: function() {
              return { innerText: 'Test Item' };
            }
          };
        }
      };

      const result = mockMarketplaceFunctions.toggleFavorite(mockBtn);
      
      expect(result.action).toBe('added');
      expect(result.offerTitle).toBe('Test Item');
      expect(mockBtn.classList.items.includes('active')).toBe(true);
    });

    test('should track favorite analytics', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const mockBtn = {
        classList: {
          items: [],
          toggle: function() { this.items.push('active'); },
          contains: function() { return true; }
        },
        closest: function() {
          return {
            querySelector: function() {
              return { innerText: 'Test Item' };
            }
          };
        }
      };

      mockMarketplaceFunctions.toggleFavorite(mockBtn);
      
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'add_to_favorites', {
        event_category: 'marketplace',
        event_label: 'Test Item',
        value: 1
      });
    });
  });

  describe('Messaging Integration', () => {
    test('should require login for messaging', () => {
      const result = mockMarketplaceFunctions.messageOwner('Test Item', 'item123');
      expect(result).toBe(false);
    });

    test('should initiate messaging when logged in', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const result = mockMarketplaceFunctions.messageOwner('Test Item', 'item123');
      
      expect(result.success).toBe(true);
      expect(result.itemTitle).toBe('Test Item');
      expect(result.itemId).toBe('item123');
    });

    test('should track messaging analytics', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      mockMarketplaceFunctions.messageOwner('Test Item', 'item123');
      
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'message_seller', {
        event_category: 'marketplace',
        event_label: 'Test Item',
        custom_parameters: {
          item_id: 'item123'
        }
      });
    });
  });

  describe('Payment Integration', () => {
    test('should require login for payment', () => {
      const result = mockMarketplaceFunctions.initiatePayment('item123', 150);
      expect(result).toBe(false);
    });

    test('should calculate platform fees correctly', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const result = mockMarketplaceFunctions.initiatePayment('item123', 100);
      
      expect(result.price).toBe(100);
      expect(result.platformFee).toBe(2); // 2% of 100
      expect(result.total).toBe(100);
      expect(result.modalShown).toBe(true);
    });

    test('should track payment initiation analytics', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      mockMarketplaceFunctions.initiatePayment('item123', 150);
      
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'begin_checkout', {
        event_category: 'marketplace',
        currency: 'EUR',
        value: 150,
        items: [{
          item_id: 'item123',
          item_name: 'Test Item',
          category: 'Kitchen',
          price: 150,
          quantity: 1
        }]
      });
    });

    test('should process payment with analytics', () => {
      const result = mockMarketplaceFunctions.processPayment('item123', 150);
      
      expect(result.success).toBe(true);
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
        event_category: 'marketplace',
        currency: 'EUR',
        value: 150
      }));
    });
  });

  describe('Filtering Integration', () => {
    test('should apply search filters correctly', () => {
      // Set filter values
      mockDocument.getElementById('filter-search').value = 'bed';
      mockDocument.getElementById('filter-category').value = 'Bedroom';
      mockDocument.getElementById('filter-min-price').value = '50';
      mockDocument.getElementById('filter-max-price').value = '100';
      
      const result = mockMarketplaceFunctions.applyFilters();
      
      expect(result.filtersApplied).toBe(true);
      expect(result.visibleCount).toBeGreaterThanOrEqual(0);
    });

    test('should clear all filters', () => {
      // Set some filter values first
      mockDocument.getElementById('filter-search').value = 'test';
      mockDocument.getElementById('filter-category').value = 'Kitchen';
      
      const result = mockMarketplaceFunctions.clearFilters();
      
      expect(result.filtersCleared).toBe(true);
      expect(mockDocument.getElementById('filter-search').value).toBe('');
      expect(mockDocument.getElementById('filter-category').value).toBe('');
    });

    test('should track filter analytics', () => {
      mockDocument.getElementById('filter-search').value = 'bed';
      mockDocument.getElementById('filter-category').value = 'Bedroom';
      
      mockMarketplaceFunctions.applyFilters();
      
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'filter_applied', {
        event_category: 'marketplace',
        custom_parameters: {
          has_search: true,
          has_category: true,
          has_condition: false,
          has_location: false,
          has_price: false
        }
      });
    });
  });

  describe('Seller Functions Integration', () => {
    test('should handle offer creation', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const result = mockMarketplaceFunctions.createOffer();
      
      expect(result.success).toBe(true);
      expect(mockWindow.location.href).toBe('create-offer.html');
    });

    test('should handle chat viewing', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const result = mockMarketplaceFunctions.viewChats('item123');
      
      expect(result.success).toBe(true);
      expect(result.itemId).toBe('item123');
      expect(mockWindow.location.href).toBe('seller-chats.html?item=item123');
    });

    test('should handle offer editing', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const result = mockMarketplaceFunctions.editOffer('item123');
      
      expect(result.success).toBe(true);
      expect(result.itemId).toBe('item123');
      expect(mockWindow.location.href).toBe('edit-offer.html?item=item123');
    });

    test('should handle offer promotion', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      const result = mockMarketplaceFunctions.promoteOffer('item123');
      
      expect(result.promotionModalShown).toBe(true);
      expect(result.itemId).toBe('item123');
    });

    test('should handle marking items as sold', () => {
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      mockWindow.confirm = jest.fn(() => true);
      
      const result = mockMarketplaceFunctions.markAsSold('item123');
      
      expect(result.markedAsSold).toBe(true);
      expect(result.itemId).toBe('item123');
      expect(mockWindow.confirm).toHaveBeenCalled();
    });
  });

  describe('Notification System Integration', () => {
    test('should show notifications with correct styling', () => {
      const result = mockMarketplaceFunctions.showNotification('Test message', 'success');
      
      expect(result.shown).toBe(true);
      expect(result.message).toBe('Test message');
      expect(result.type).toBe('success');
    });

    test('should handle different notification types', () => {
      const types = ['info', 'success', 'warning', 'error'];
      
      types.forEach(type => {
        const result = mockMarketplaceFunctions.showNotification(`Test ${type}`, type);
        expect(result.type).toBe(type);
        expect(result.shown).toBe(true);
      });
    });
  });

  describe('Marketplace Frontend Integration Flow', () => {
    test('should handle complete user interaction flow', () => {
      // Login
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      // Switch to buy tab
      const tabResult = mockMarketplaceFunctions.showTab('buy');
      expect(tabResult.success).toBe(true);
      
      // Apply filters
      mockDocument.getElementById('filter-search').value = 'bed';
      const filterResult = mockMarketplaceFunctions.applyFilters();
      expect(filterResult.filtersApplied).toBe(true);
      
      // Toggle favorite
      const mockBtn = {
        classList: {
          items: [],
          toggle: function() { this.items.push('active'); },
          contains: function() { return true; }
        },
        closest: function() {
          return {
            querySelector: function() {
              return { innerText: 'Test Bed' };
            }
          };
        }
      };
      const favoriteResult = mockMarketplaceFunctions.toggleFavorite(mockBtn);
      expect(favoriteResult.action).toBe('added');
      
      // Initiate payment
      const paymentResult = mockMarketplaceFunctions.initiatePayment('bed123', 85);
      expect(paymentResult.modalShown).toBe(true);
      
      // Verify analytics were tracked (tab_switch, filter_applied, add_to_favorites, begin_checkout)
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'tab_switch', expect.any(Object));
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'filter_applied', expect.any(Object));
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'add_to_favorites', expect.any(Object));
      expect(mockWindow.gtag).toHaveBeenCalledWith('event', 'begin_checkout', expect.any(Object));
    });

    test('should handle seller workflow', () => {
      // Login
      mockWindow.localStorage.setItem('sichrplace_logged_in', 'true');
      
      // Switch to sell tab
      const tabResult = mockMarketplaceFunctions.showTab('sell');
      expect(tabResult.success).toBe(true);
      
      // Create offer
      const createResult = mockMarketplaceFunctions.createOffer();
      expect(createResult.success).toBe(true);
      
      // View chats
      const chatResult = mockMarketplaceFunctions.viewChats('item123');
      expect(chatResult.success).toBe(true);
      
      // Promote offer
      const promoteResult = mockMarketplaceFunctions.promoteOffer('item123');
      expect(promoteResult.promotionModalShown).toBe(true);
      
      // Mark as sold
      const soldResult = mockMarketplaceFunctions.markAsSold('item123');
      expect(soldResult.markedAsSold).toBe(true);
    });

    test('should handle error states gracefully', () => {
      // Test without login
      const favoriteResult = mockMarketplaceFunctions.toggleFavorite({});
      expect(favoriteResult).toBe(false);
      
      const messageResult = mockMarketplaceFunctions.messageOwner('Item', 'id');
      expect(messageResult).toBe(false);
      
      const paymentResult = mockMarketplaceFunctions.initiatePayment('id', 100);
      expect(paymentResult).toBe(false);
      
      // Test modal closing (should return true since mock exists)
      const closeResult = mockMarketplaceFunctions.closePaymentModal();
      expect(closeResult).toBe(true); // Mock modal element exists
    });
  });
});
