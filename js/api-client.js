/**
 * SichrPlace API Client
 * Replaces Supabase SDK with direct REST calls to Spring Boot backend
 * Self-hosted - Zero third-party dependencies
 */

const SichrPlaceAPI = (() => {
  // ============================
  // Configuration
  // ============================
  const CONFIG = {
    // In production, this points to your Nginx reverse proxy
    BASE_URL: window.SICHRPLACE_API_URL || 'https://api.sichrplace.com',
    WS_URL:   window.SICHRPLACE_WS_URL  || 'wss://api.sichrplace.com/ws',
    TOKEN_KEY: 'sichrplace_token',
    USER_KEY:  'sichrplace_user',
  };

  let _token = localStorage.getItem(CONFIG.TOKEN_KEY);
  let _user  = JSON.parse(localStorage.getItem(CONFIG.USER_KEY) || 'null');

  // ============================
  // HTTP Helpers
  // ============================
  async function request(method, path, body = null, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    Object.assign(headers, options.headers || {});

    const fetchOpts = { method, headers };
    if (body && method !== 'GET') {
      fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(`${CONFIG.BASE_URL}${path}`, fetchOpts);

    if (res.status === 401) {
      logout();
      window.dispatchEvent(new CustomEvent('sichrplace:unauthorized'));
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `Request failed: ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  const get    = (path) => request('GET', path);
  const post   = (path, body) => request('POST', path, body);
  const put    = (path, body) => request('PUT', path, body);
  const del    = (path) => request('DELETE', path);

  async function upload(path, file, fieldName = 'file') {
    const form = new FormData();
    form.append(fieldName, file);
    const headers = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;

    const res = await fetch(`${CONFIG.BASE_URL}${path}`, {
      method: 'POST', headers, body: form
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  // ============================
  // Auth Module
  // ============================
  const Auth = {
    async login(email, password) {
      const data = await post('/api/auth/login', { email, password });
      _token = data.token;
      _user  = data.user;
      localStorage.setItem(CONFIG.TOKEN_KEY, _token);
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(_user));
      window.dispatchEvent(new CustomEvent('sichrplace:login', { detail: _user }));
      return data;
    },

    async register(userData) {
      const data = await post('/api/auth/register', userData);
      _token = data.token;
      _user  = data.user;
      localStorage.setItem(CONFIG.TOKEN_KEY, _token);
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(_user));
      window.dispatchEvent(new CustomEvent('sichrplace:login', { detail: _user }));
      return data;
    },

    async me() {
      const data = await get('/api/auth/me');
      _user = data;
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(_user));
      return data;
    },

    getUser()  { return _user; },
    getToken() { return _token; },
    isAuthenticated() { return !!_token; },
  };

  function logout() {
    _token = null;
    _user  = null;
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    window.dispatchEvent(new CustomEvent('sichrplace:logout'));
  }

  // ============================
  // Apartments
  // ============================
  const Apartments = {
    search(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return get(`/api/apartments/search?${qs}`);
    },
    getById(id) { return get(`/api/apartments/${id}`); },
    create(data) { return post('/api/apartments', data); },
    update(id, data) { return put(`/api/apartments/${id}`, data); },
    remove(id) { return del(`/api/apartments/${id}`); },
    uploadImage(id, file) { return upload(`/api/apartments/${id}/images`, file, 'image'); },
  };

  // ============================
  // Messages & Conversations
  // ============================
  const Messages = {
    getConversations() { return get('/api/messages/conversations'); },
    getMessages(conversationId) { return get(`/api/messages/conversations/${conversationId}/messages`); },
    send(conversationId, content) {
      return post(`/api/messages/conversations/${conversationId}/messages`, { content });
    },
    markAsRead(conversationId) {
      return put(`/api/messages/conversations/${conversationId}/read`);
    },
    getUnreadCount() { return get('/api/messages/unread/count'); },
    startConversation(participantId, aboutApartmentId) {
      return post('/api/messages/conversations', { participantId, aboutApartmentId });
    },
  };

  // ============================
  // Viewing Requests
  // ============================
  const ViewingRequests = {
    create(data) { return post('/api/viewing-requests', data); },
    getMine() { return get('/api/viewing-requests'); },
    updateStatus(id, status) { return put(`/api/viewing-requests/${id}/status`, { status }); },
  };

  // ============================
  // User Features
  // ============================
  const Favorites = {
    list() { return get('/api/user/favorites'); },
    add(apartmentId) { return post(`/api/user/favorites/${apartmentId}`); },
    remove(apartmentId) { return del(`/api/user/favorites/${apartmentId}`); },
    check(apartmentId) { return get(`/api/user/favorites/${apartmentId}/check`); },
  };

  const SavedSearches = {
    list() { return get('/api/user/saved-searches'); },
    save(data) { return post('/api/user/saved-searches', data); },
    remove(id) { return del(`/api/user/saved-searches/${id}`); },
  };

  const Reviews = {
    getForApartment(apartmentId) { return get(`/api/user/reviews/apartment/${apartmentId}`); },
    create(data) { return post('/api/user/reviews', data); },
  };

  const Notifications = {
    list() { return get('/api/user/notifications'); },
    markAllRead() { return put('/api/user/notifications/read-all'); },
  };

  // ============================
  // GDPR
  // ============================
  const Gdpr = {
    exportData() { return get('/api/gdpr/export'); },
    requestDeletion() { return post('/api/gdpr/delete'); },
    getConsent() { return get('/api/gdpr/consent'); },
    updateConsent(data) { return put('/api/gdpr/consent', data); },
  };

  // ============================
  // Admin
  // ============================
  const Admin = {
    dashboard() { return get('/api/admin/dashboard'); },
    getUsers(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return get(`/api/admin/users?${qs}`);
    },
    toggleUserActive(userId) { return put(`/api/admin/users/${userId}/toggle-active`); },
    getPendingReviews() { return get('/api/admin/reviews/pending'); },
    moderateReview(reviewId, action) { return put(`/api/admin/reviews/${reviewId}/${action}`); },
  };

  // ============================
  // Health
  // ============================
  const Health = {
    check() { return get('/api/health'); },
  };

  // ============================
  // Public API
  // ============================
  return {
    CONFIG,
    Auth,
    logout,
    Apartments,
    Messages,
    ViewingRequests,
    Favorites,
    SavedSearches,
    Reviews,
    Notifications,
    Gdpr,
    Admin,
    Health,
    // Raw helpers for custom calls
    _request: request,
    _upload: upload,
  };
})();

// Make globally available
window.SichrPlaceAPI = SichrPlaceAPI;
