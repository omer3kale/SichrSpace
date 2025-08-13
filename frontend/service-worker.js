// SichrPlace PWA Service Worker
// Handles caching, offline functionality, and push notifications

const CACHE_NAME = 'sichrplace-v1.0.0';
const CACHE_STATIC = 'sichrplace-static-v1.0.0';
const CACHE_DYNAMIC = 'sichrplace-dynamic-v1.0.0';

// Files to cache for offline access
const STATIC_FILES = [
  '/',
  '/index.html',
  '/marketplace.html',
  '/login.html',
  '/create-account.html',
  '/applicant-dashboard.html',
  '/landlord-dashboard.html',
  '/chat.html',
  '/manifest.json',
  '/img/logo-shield.svg',
  '/img/koeln.jpg',
  '/img/koeln2.jpg',
  '/img/koeln3.jpg',
  '/js/app.js',
  '/js/pwa-init.js',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&family=Roboto:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// Network-first cache strategy for API calls
const API_ENDPOINTS = [
  '/api/',
  '/backend/api/'
];

// Cache-first strategy for static assets
const STATIC_ASSETS = [
  '/img/',
  '/css/',
  '/js/',
  '.css',
  '.js',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...', event);
  
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        console.log('[SW] Precaching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('[SW] Error during install:', error);
      })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...', event);
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            }
          })
        );
      })
  );
  
  // Take control of all pages
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Skip cross-origin requests that can't be cached
  if (!url.startsWith(self.location.origin) && !url.includes('fonts.googleapis.com') && !url.includes('cdnjs.cloudflare.com')) {
    return;
  }
  
  // API requests - Network first, cache fallback
  if (API_ENDPOINTS.some(endpoint => url.includes(endpoint))) {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // Static assets - Cache first, network fallback
  if (STATIC_ASSETS.some(asset => url.includes(asset))) {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // HTML pages - Stale while revalidate
  if (event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
    return;
  }
  
  // Default strategy
  event.respondWith(networkFirstStrategy(event.request));
});

// Network first strategy (for API calls)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, serving from cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for API calls
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'You are currently offline. Please check your connection.' 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    throw error;
  }
}

// Cache first strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url);
    throw error;
  }
}

// Stale while revalidate strategy (for HTML pages)
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_DYNAMIC);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Return cached version if network fails
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received:', event);
  
  const options = {
    title: 'SichrPlace',
    body: 'You have a new notification',
    icon: '/img/pwa-icon-192.png',
    badge: '/img/pwa-icon-72.png',
    tag: 'sichrplace-notification',
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      url: '/',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/img/pwa-icon-72.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      options.title = payload.title || options.title;
      options.body = payload.body || payload.message || options.body;
      options.icon = payload.icon || options.icon;
      options.tag = payload.tag || options.tag;
      options.data = { ...options.data, ...payload.data };
      
      // Custom actions based on notification type
      if (payload.type === 'message') {
        options.data.url = '/chat.html';
        options.actions = [
          { action: 'reply', title: 'Reply' },
          { action: 'view', title: 'View Chat' }
        ];
      } else if (payload.type === 'viewing_request') {
        options.data.url = '/landlord-dashboard.html';
        options.actions = [
          { action: 'approve', title: 'Approve' },
          { action: 'view', title: 'View Request' }
        ];
      } else if (payload.type === 'new_apartment') {
        options.data.url = '/marketplace.html';
        options.actions = [
          { action: 'view', title: 'View Apartment' },
          { action: 'save', title: 'Save for Later' }
        ];
      }
    } catch (error) {
      console.error('[SW] Error parsing push payload:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  let url = data.url || '/';
  
  // Handle different actions
  switch (action) {
    case 'reply':
      url = '/chat.html';
      break;
    case 'approve':
      url = '/landlord-dashboard.html';
      break;
    case 'save':
      // Handle save action via API
      handleSaveApartment(data);
      return;
    case 'dismiss':
      return;
    case 'view':
    default:
      // Use the URL from notification data
      break;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus existing tab
        for (const client of clientList) {
          if (client.url.includes(url.split('?')[0]) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'background-sync-messages') {
    event.waitUntil(syncMessages());
  } else if (event.tag === 'background-sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

// Sync messages when back online
async function syncMessages() {
  try {
    const cache = await caches.open(CACHE_DYNAMIC);
    const pendingMessages = await cache.match('/api/messages/pending');
    
    if (pendingMessages) {
      const messages = await pendingMessages.json();
      
      for (const message of messages) {
        try {
          await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          });
        } catch (error) {
          console.error('[SW] Failed to sync message:', error);
        }
      }
      
      await cache.delete('/api/messages/pending');
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Sync favorites when back online
async function syncFavorites() {
  try {
    const cache = await caches.open(CACHE_DYNAMIC);
    const pendingFavorites = await cache.match('/api/favorites/pending');
    
    if (pendingFavorites) {
      const favorites = await pendingFavorites.json();
      
      for (const favorite of favorites) {
        try {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(favorite)
          });
        } catch (error) {
          console.error('[SW] Failed to sync favorite:', error);
        }
      }
      
      await cache.delete('/api/favorites/pending');
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Handle save apartment action
async function handleSaveApartment(data) {
  try {
    if (data.apartmentId) {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apartmentId: data.apartmentId })
      });
      
      // Show success notification
      self.registration.showNotification('Apartment Saved', {
        body: 'The apartment has been added to your favorites',
        icon: '/img/pwa-icon-192.png',
        tag: 'save-success'
      });
    }
  } catch (error) {
    console.error('[SW] Failed to save apartment:', error);
  }
}

// Handle message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker loaded successfully');
