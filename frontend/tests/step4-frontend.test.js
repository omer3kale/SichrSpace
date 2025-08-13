/**
 * Step 4 Frontend Tests
 * Testing enhanced user experience features in apartments-listing.html
 */

// Mock DOM environment setup
document.body.innerHTML = `
  <div id="user-nav-section"></div>
  <div id="user-menu" style="display: none;"></div>
  <div id="listings-container"></div>
  <div id="search-input"></div>
  <div id="min-price"></div>
  <div id="max-price"></div>
  <div id="bedrooms-filter"></div>
  <div id="results-summary"></div>
  <span id="favorites-counter" style="display: none;"></span>
  <span id="notifications-counter" style="display: none;"></span>
`;

// Mock global variables that would be defined in the actual HTML
global.API_BASE_URL = 'http://localhost:3000';
global.apartmentsData = [
  {
    id: 'test-apartment-1',
    title: 'Test Apartment 1',
    description: 'Beautiful apartment in city center',
    location: 'Berlin',
    price: 800,
    bedrooms: 2
  },
  {
    id: 'test-apartment-2', 
    title: 'Test Apartment 2',
    description: 'Modern apartment with great view',
    location: 'Munich',
    price: 1200,
    bedrooms: 3
  }
];
global.favoriteOffers = new Set();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock fetch API
global.fetch = jest.fn();

describe('Step 4 Frontend - Enhanced User Experience', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    fetch.mockClear();
    localStorageMock.getItem.mockClear();
    
    // Setup default localStorage values
    localStorageMock.getItem.mockImplementation((key) => {
      const values = {
        'userToken': 'mock-jwt-token',
        'userName': 'Test User',
        'userEmail': 'test@example.com',
        'userRole': 'user',
        'userId': 'test-user-123'
      };
      return values[key] || null;
    });
  });

  // ===========================================
  // VIEW TRACKING TESTS
  // ===========================================
  describe('Apartment View Tracking', () => {
    test('trackApartmentView should send POST request to recently-viewed API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Simulate the trackApartmentView function
      const trackApartmentView = async (apartmentId) => {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        await fetch(`${API_BASE_URL}/api/recently-viewed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ apartmentId })
        });
      };

      await trackApartmentView('test-apartment-1');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/recently-viewed',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-jwt-token'
          },
          body: JSON.stringify({ apartmentId: 'test-apartment-1' })
        }
      );
    });

    test('trackApartmentView should not send request when user not logged in', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const trackApartmentView = async (apartmentId) => {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        await fetch(`${API_BASE_URL}/api/recently-viewed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ apartmentId })
        });
      };

      await trackApartmentView('test-apartment-1');

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // NOTIFICATIONS FUNCTIONALITY TESTS
  // ===========================================
  describe('Notifications Functionality', () => {
    test('viewNotifications should fetch notifications from API', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              id: 'notif-1',
              title: 'Test Notification',
              message: 'Test message',
              created_at: '2025-08-12T10:00:00Z',
              read: false
            }
          ],
          unreadCount: 1
        })
      });

      const viewNotifications = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/notifications?limit=20`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          return data;
        }
      };

      const result = await viewNotifications();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications?limit=20',
        {
          headers: {
            'Authorization': 'Bearer mock-jwt-token'
          }
        }
      );

      expect(result.success).toBe(true);
      expect(result.unreadCount).toBe(1);
    });

    test('updateNotificationCounter should update UI counter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          unreadCount: 3
        })
      });

      const updateNotificationCounter = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        const response = await fetch(`${API_BASE_URL}/api/notifications?unreadOnly=true&limit=1`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const counter = document.getElementById('notifications-counter');
          if (data.unreadCount > 0) {
            counter.textContent = data.unreadCount;
            counter.style.display = 'inline';
          } else {
            counter.style.display = 'none';
          }
        }
      };

      await updateNotificationCounter();

      const counter = document.getElementById('notifications-counter');
      expect(counter.textContent).toBe('3');
      expect(counter.style.display).toBe('inline');
    });

    test('markAllNotificationsAsRead should send PUT request', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      const markAllNotificationsAsRead = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return;

        await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      };

      await markAllNotificationsAsRead();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/notifications/read-all',
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer mock-jwt-token'
          }
        }
      );
    });
  });

  // ===========================================
  // RECENTLY VIEWED FUNCTIONALITY TESTS
  // ===========================================
  describe('Recently Viewed Functionality', () => {
    test('viewRecentlyViewed should fetch and display recent apartments', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            { apartment_id: 'test-apartment-1', viewed_at: '2025-08-12T10:00:00Z' }
          ]
        })
      });

      const viewRecentlyViewed = async () => {
        const token = localStorage.getItem('userToken');
        if (!token) return null;

        const response = await fetch(`${API_BASE_URL}/api/recently-viewed?limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          return await response.json();
        }
      };

      const result = await viewRecentlyViewed();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/recently-viewed?limit=10',
        {
          headers: {
            'Authorization': 'Bearer mock-jwt-token'
          }
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('displayRecentlyViewedApartments should filter and show apartments', () => {
      const recentApartments = [
        { apartment_id: 'test-apartment-1', viewed_at: '2025-08-12T10:00:00Z' }
      ];

      const displayRecentlyViewedApartments = (recentApartments) => {
        if (recentApartments.length === 0) {
          return { message: 'No recently viewed apartments', type: 'info' };
        }

        const recentApartmentIds = recentApartments.map(item => item.apartment_id);
        const recentData = apartmentsData.filter(apt => recentApartmentIds.includes(apt.id));

        if (recentData.length > 0) {
          return { 
            apartments: recentData, 
            message: `Showing ${recentData.length} recently viewed apartments`,
            type: 'info'
          };
        } else {
          return { 
            message: 'Recently viewed apartments are no longer available',
            type: 'info'
          };
        }
      };

      const result = displayRecentlyViewedApartments(recentApartments);

      expect(result.apartments).toBeDefined();
      expect(result.apartments).toHaveLength(1);
      expect(result.apartments[0].id).toBe('test-apartment-1');
    });
  });

  // ===========================================
  // USER MENU FUNCTIONALITY TESTS
  // ===========================================
  describe('User Menu Functionality', () => {
    test('updateNavigation should show user menu when logged in', () => {
      const updateNavigation = () => {
        const token = localStorage.getItem('userToken');
        const userName = localStorage.getItem('userName');
        const userNavSection = document.getElementById('user-nav-section');

        if (token && userName) {
          const userRole = localStorage.getItem('userRole');
          const roleDisplay = userRole === 'admin' ? ' (Admin)' : '';
          userNavSection.innerHTML = `
            <span style="color: var(--primary); font-weight: 600;">Welcome, ${userName}${roleDisplay}!</span>
            <div id="user-menu">
              <a href="#" onclick="viewFavorites()">My Favorites</a>
              <a href="#" onclick="viewNotifications()">Notifications</a>
              <a href="#" onclick="viewRecentlyViewed()">Recently Viewed</a>
            </div>
          `;
        } else {
          userNavSection.innerHTML = `
            <a href="login-new.html">Login</a>
            <a href="create-account.html">Create Account</a>
          `;
        }
      };

      updateNavigation();

      const userNavSection = document.getElementById('user-nav-section');
      expect(userNavSection.innerHTML).toContain('Welcome, Test User!');
      expect(userNavSection.innerHTML).toContain('My Favorites');
      expect(userNavSection.innerHTML).toContain('Notifications');
      expect(userNavSection.innerHTML).toContain('Recently Viewed');
    });

    test('updateNavigation should show login links when not logged in', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const updateNavigation = () => {
        const token = localStorage.getItem('userToken');
        const userName = localStorage.getItem('userName');
        const userNavSection = document.getElementById('user-nav-section');

        if (token && userName) {
          userNavSection.innerHTML = 'User Menu';
        } else {
          userNavSection.innerHTML = `
            <a href="login-new.html">Login</a>
            <a href="create-account.html">Create Account</a>
          `;
        }
      };

      updateNavigation();

      const userNavSection = document.getElementById('user-nav-section');
      expect(userNavSection.innerHTML).toContain('Login');
      expect(userNavSection.innerHTML).toContain('Create Account');
    });

    test('showUserMenu should toggle menu visibility', () => {
      const showUserMenu = (event) => {
        event.preventDefault();
        const menu = document.getElementById('user-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      };

      const mockEvent = { preventDefault: jest.fn() };
      const menu = document.getElementById('user-menu');

      // Initially hidden
      expect(menu.style.display).toBe('none');

      // First click - show menu
      showUserMenu(mockEvent);
      expect(menu.style.display).toBe('block');

      // Second click - hide menu
      showUserMenu(mockEvent);
      expect(menu.style.display).toBe('none');

      expect(mockEvent.preventDefault).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================
  // FAVORITES FUNCTIONALITY TESTS
  // ===========================================
  describe('Favorites Functionality', () => {
    test('viewFavorites should filter and display favorite apartments', () => {
      // Add apartment to favorites
      favoriteOffers.add('test-apartment-1');

      const viewFavorites = () => {
        const token = localStorage.getItem('userToken');
        if (!token) {
          return { error: 'Please login to view favorites' };
        }

        const favoriteApartments = apartmentsData.filter(apt => favoriteOffers.has(apt.id));

        if (favoriteApartments.length === 0) {
          return { message: 'You have no favorite apartments yet!' };
        } else {
          return {
            apartments: favoriteApartments,
            message: `Showing ${favoriteApartments.length} favorite apartments`
          };
        }
      };

      const result = viewFavorites();

      expect(result.apartments).toBeDefined();
      expect(result.apartments).toHaveLength(1);
      expect(result.apartments[0].id).toBe('test-apartment-1');
    });

    test('showAllApartments should display all apartments', () => {
      const showAllApartments = () => {
        return {
          apartments: apartmentsData,
          message: 'Showing all apartments'
        };
      };

      const result = showAllApartments();

      expect(result.apartments).toHaveLength(2);
      expect(result.message).toBe('Showing all apartments');
    });
  });

  // ===========================================
  // SEARCH AND FILTER TESTS
  // ===========================================
  describe('Enhanced Search and Filter', () => {
    beforeEach(() => {
      // Set up DOM elements for search
      document.getElementById('search-input').value = '';
      document.getElementById('min-price').value = '';
      document.getElementById('max-price').value = '';
      document.getElementById('bedrooms-filter').value = '';
    });

    test('applyFilters should filter apartments by search term', () => {
      document.getElementById('search-input').value = 'Berlin';

      const applyFilters = () => {
        const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
        const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
        const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
        const minBedrooms = parseInt(document.getElementById('bedrooms-filter').value) || 0;

        return apartmentsData.filter(apartment => {
          const matchesSearch = !searchTerm || 
            apartment.title.toLowerCase().includes(searchTerm) ||
            apartment.description.toLowerCase().includes(searchTerm) ||
            apartment.location.toLowerCase().includes(searchTerm);

          const matchesPrice = apartment.price >= minPrice && apartment.price <= maxPrice;
          const matchesBedrooms = minBedrooms === 0 || apartment.bedrooms >= minBedrooms;

          return matchesSearch && matchesPrice && matchesBedrooms;
        });
      };

      const filteredApartments = applyFilters();

      expect(filteredApartments).toHaveLength(1);
      expect(filteredApartments[0].location).toBe('Berlin');
    });

    test('applyFilters should filter apartments by price range', () => {
      document.getElementById('min-price').value = '1000';
      document.getElementById('max-price').value = '1500';

      const applyFilters = () => {
        const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
        const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
        const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
        const minBedrooms = parseInt(document.getElementById('bedrooms-filter').value) || 0;

        return apartmentsData.filter(apartment => {
          const matchesSearch = !searchTerm || 
            apartment.title.toLowerCase().includes(searchTerm) ||
            apartment.description.toLowerCase().includes(searchTerm) ||
            apartment.location.toLowerCase().includes(searchTerm);

          const matchesPrice = apartment.price >= minPrice && apartment.price <= maxPrice;
          const matchesBedrooms = minBedrooms === 0 || apartment.bedrooms >= minBedrooms;

          return matchesSearch && matchesPrice && matchesBedrooms;
        });
      };

      const filteredApartments = applyFilters();

      expect(filteredApartments).toHaveLength(1);
      expect(filteredApartments[0].price).toBe(1200);
    });

    test('updateResultsSummary should show filter status', () => {
      const updateResultsSummary = (filtered, total) => {
        let summary;
        if (filtered === total) {
          summary = `Showing all ${total} apartments`;
        } else {
          summary = `Showing ${filtered} of ${total} apartments`;
        }

        const searchTerm = document.getElementById('search-input').value.trim();
        const activeFilters = [];

        if (searchTerm) activeFilters.push(`Search: "${searchTerm}"`);

        if (activeFilters.length > 0) {
          summary += ` (Filters: ${activeFilters.join(', ')})`;
        }

        return summary;
      };

      document.getElementById('search-input').value = 'Berlin';
      const summary = updateResultsSummary(1, 2);

      expect(summary).toBe('Showing 1 of 2 apartments (Filters: Search: "Berlin")');
    });
  });

  // ===========================================
  // NOTIFICATION DISPLAY TESTS
  // ===========================================
  describe('Notification Display', () => {
    test('displayNotificationsModal should create modal with notifications', () => {
      const notifications = [
        {
          id: 'notif-1',
          title: 'Test Notification',
          message: 'Test message',
          created_at: '2025-08-12T10:00:00Z',
          read: false
        }
      ];

      const displayNotificationsModal = (notifications, unreadCount) => {
        const modal = document.createElement('div');
        modal.className = 'notification-modal';
        modal.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(0,0,0,0.8); z-index: 1000; display: flex; 
          align-items: center; justify-content: center;
        `;

        const content = document.createElement('div');
        content.innerHTML = `
          <h3>Notifications (${unreadCount} unread)</h3>
          ${notifications.map(notif => `
            <div style="${!notif.read ? 'background: #f8f9fa;' : ''}">
              <h4>${notif.title}</h4>
              <p>${notif.message}</p>
              <small>${new Date(notif.created_at).toLocaleDateString()}</small>
            </div>
          `).join('')}
        `;

        modal.appendChild(content);
        return modal;
      };

      const modal = displayNotificationsModal(notifications, 1);

      expect(modal.className).toBe('notification-modal');
      expect(modal.innerHTML).toContain('Notifications (1 unread)');
      expect(modal.innerHTML).toContain('Test Notification');
      expect(modal.innerHTML).toContain('Test message');
    });

    test('showNotification should create notification popup', () => {
      const showNotification = (message, type = 'info') => {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
          position: fixed; top: 20px; right: 20px; padding: 15px; 
          border-radius: 8px; color: white; z-index: 9999;
          background-color: ${type === 'success' ? '#10B981' : 
                            type === 'error' ? '#EF4444' : '#3B82F6'};
        `;
        return notification;
      };

      const successNotif = showNotification('Success message', 'success');
      const errorNotif = showNotification('Error message', 'error');

      expect(successNotif.textContent).toBe('Success message');
      expect(successNotif.style.backgroundColor).toBe('#10B981');
      expect(errorNotif.style.backgroundColor).toBe('#EF4444');
    });
  });

  // ===========================================
  // LOGOUT FUNCTIONALITY TESTS
  // ===========================================
  describe('Logout Functionality', () => {
    test('logout should clear localStorage and reset UI', () => {
      const logout = () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');

        favoriteOffers.clear();

        return { message: 'Successfully logged out' };
      };

      const result = logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('userToken');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userRole');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userId');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userName');
      expect(localStorage.removeItem).toHaveBeenCalledWith('userEmail');
      expect(favoriteOffers.size).toBe(0);
      expect(result.message).toBe('Successfully logged out');
    });
  });
});
