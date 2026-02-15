// SichrPlace Mobile App Integration Edge Function
// Handles PWA features, push notifications, and mobile-specific APIs

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    switch (action) {
      case 'register-device':
        return await registerDevice(req, supabase)
      case 'send-push':
        return await sendPushNotification(req, supabase)
      case 'offline-sync':
        return await handleOfflineSync(req, supabase)
      case 'manifest':
        return await generateManifest(req)
      case 'service-worker':
        return await generateServiceWorker(req)
      case 'install-prompt':
        return await handleInstallPrompt(req, supabase)
      case 'geolocation':
        return await handleGeolocation(req, supabase)
      case 'camera-upload':
        return await handleCameraUpload(req, supabase)
      default:
        throw new Error(`Unknown mobile action: ${action}`)
    }

  } catch (error) {
    console.error('🚨 Mobile integration error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function registerDevice(req: Request, supabase: any) {
  const { 
    user_id, 
    device_token, 
    device_type, 
    app_version, 
    os_version,
    push_subscription 
  } = await req.json()

  console.log('📱 Registering device:', { user_id, device_type })

  // Store device registration
  const { data: device, error } = await supabase
    .from('user_devices')
    .upsert({
      user_id,
      device_token,
      device_type, // 'ios', 'android', 'web'
      app_version,
      os_version,
      push_subscription: push_subscription ? JSON.stringify(push_subscription) : null,
      last_active: new Date().toISOString(),
      is_active: true
    }, {
      onConflict: 'user_id,device_token'
    })
    .select()
    .single()

  if (error) throw error

  // Send welcome push notification
  if (push_subscription || device_token) {
    try {
      await sendWelcomePush(supabase, user_id, device)
    } catch (pushError) {
      console.warn('⚠️ Failed to send welcome push:', pushError)
    }
  }

  // Track device registration
  await supabase
    .from('analytics_events')
    .insert({
      event_type: 'device_registered',
      user_id,
      metadata: {
        device_type,
        app_version,
        os_version
      },
      timestamp: new Date().toISOString()
    })

  return new Response(
    JSON.stringify({
      success: true,
      device_id: device.id,
      features: {
        pushNotifications: true,
        offlineSync: true,
        geolocation: true,
        camera: true,
        installPrompt: device_type === 'web'
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function sendPushNotification(req: Request, supabase: any) {
  const { 
    user_id, 
    title, 
    message, 
    data, 
    action_url,
    priority = 'normal'
  } = await req.json()

  console.log('🔔 Sending push notification:', { user_id, title })

  // Get user's active devices
  const { data: devices } = await supabase
    .from('user_devices')
    .select('*')
    .eq('user_id', user_id)
    .eq('is_active', true)

  if (!devices || devices.length === 0) {
    throw new Error('No active devices found for user')
  }

  const results = []

  for (const device of devices) {
    try {
      let pushResult
      
      if (device.device_type === 'web' && device.push_subscription) {
        // Web Push Notification
        pushResult = await sendWebPush(device.push_subscription, {
          title,
          body: message,
          data: { ...data, action_url },
          badge: '/img/badge.png',
          icon: '/img/icon-192.png'
        })
      } else if (device.device_type === 'ios' && device.device_token) {
        // iOS Push Notification (APNs)
        pushResult = await sendAPNs(device.device_token, {
          title,
          body: message,
          data,
          priority
        })
      } else if (device.device_type === 'android' && device.device_token) {
        // Android Push Notification (FCM)
        pushResult = await sendFCM(device.device_token, {
          title,
          body: message,
          data,
          priority
        })
      }

      results.push({
        device_id: device.id,
        device_type: device.device_type,
        status: 'sent',
        result: pushResult
      })

    } catch (error) {
      results.push({
        device_id: device.id,
        device_type: device.device_type,
        status: 'failed',
        error: error.message
      })
    }
  }

  // Log notification
  await supabase
    .from('notification_log')
    .insert({
      user_id,
      title,
      message,
      data: JSON.stringify(data),
      devices_sent: results.filter(r => r.status === 'sent').length,
      devices_failed: results.filter(r => r.status === 'failed').length,
      sent_at: new Date().toISOString()
    })

  return new Response(
    JSON.stringify({
      success: true,
      results,
      summary: {
        total: results.length,
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function handleOfflineSync(req: Request, supabase: any) {
  const { user_id, last_sync, sync_data } = await req.json()

  console.log('🔄 Handling offline sync:', { user_id, last_sync })

  const lastSyncDate = last_sync ? new Date(last_sync) : new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Get updated data since last sync
  const syncResponse = {
    apartments: [],
    messages: [],
    viewingRequests: [],
    notifications: [],
    lastSync: new Date().toISOString()
  }

  // Sync apartments (if user has favorites or recent searches)
  const { data: apartments } = await supabase
    .from('apartments')
    .select(`
      *,
      apartment_images!inner (image_url, is_primary)
    `)
    .gte('updated_at', lastSyncDate.toISOString())
    .eq('status', 'available')
    .limit(50)

  syncResponse.apartments = apartments || []

  // Sync user's messages
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('recipient_id', user_id)
    .gte('created_at', lastSyncDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  syncResponse.messages = messages || []

  // Sync viewing requests
  const { data: viewingRequests } = await supabase
    .from('viewing_requests')
    .select('*')
    .eq('user_id', user_id)
    .gte('updated_at', lastSyncDate.toISOString())
    .order('created_at', { ascending: false })

  syncResponse.viewingRequests = viewingRequests || []

  // Sync notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user_id)
    .gte('created_at', lastSyncDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(50)

  syncResponse.notifications = notifications || []

  // Process any offline data that was uploaded
  if (sync_data && sync_data.length > 0) {
    const uploadResults = []
    
    for (const item of sync_data) {
      try {
        const result = await processOfflineItem(supabase, user_id, item)
        uploadResults.push({ id: item.id, status: 'success', result })
      } catch (error) {
        uploadResults.push({ id: item.id, status: 'failed', error: error.message })
      }
    }
    
    syncResponse.uploadResults = uploadResults
  }

  // Cache frequently accessed data for offline use
  const cacheData = await generateOfflineCache(supabase, user_id)
  syncResponse.cache = cacheData

  return new Response(
    JSON.stringify({
      success: true,
      sync: syncResponse
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function generateManifest(req: Request) {
  const manifest = {
    name: "SichrPlace - Apartment Search",
    short_name: "SichrPlace",
    description: "Find your perfect apartment in Germany",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/img/icon-72.png",
        sizes: "72x72",
        type: "image/png",
        purpose: "maskable any"
      },
      {
        src: "/img/icon-96.png",
        sizes: "96x96",
        type: "image/png",
        purpose: "maskable any"
      },
      {
        src: "/img/icon-128.png",
        sizes: "128x128",
        type: "image/png",
        purpose: "maskable any"
      },
      {
        src: "/img/icon-144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "maskable any"
      },
      {
        src: "/img/icon-152.png",
        sizes: "152x152",
        type: "image/png",
        purpose: "maskable any"
      },
      {
        src: "/img/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable any"
      },
      {
        src: "/img/icon-384.png",
        sizes: "384x384",
        type: "image/png",
        purpose: "maskable any"
      },
      {
        src: "/img/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable any"
      }
    ],
    screenshots: [
      {
        src: "/img/screenshot-mobile-1.png",
        sizes: "375x812",
        type: "image/png",
        form_factor: "narrow"
      },
      {
        src: "/img/screenshot-desktop-1.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide"
      }
    ],
    categories: ["lifestyle", "utilities"],
    shortcuts: [
      {
        name: "Search Apartments",
        short_name: "Search",
        description: "Search for apartments",
        url: "/search",
        icons: [
          {
            src: "/img/shortcut-search.png",
            sizes: "96x96"
          }
        ]
      },
      {
        name: "My Dashboard",
        short_name: "Dashboard",
        description: "View your dashboard",
        url: "/dashboard",
        icons: [
          {
            src: "/img/shortcut-dashboard.png",
            sizes: "96x96"
          }
        ]
      }
    ],
    related_applications: [
      {
        platform: "webapp",
        url: "https://sichrplace.com"
      }
    ],
    prefer_related_applications: false
  }

  return new Response(
    JSON.stringify(manifest, null, 2),
    {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=86400' // Cache for 24 hours
      },
      status: 200,
    },
  )
}

async function generateServiceWorker(req: Request) {
  const serviceWorkerCode = `
// SichrPlace Service Worker
const CACHE_NAME = 'sichrplace-v1.0.0'
const STATIC_CACHE = 'sichrplace-static-v1.0.0'
const DYNAMIC_CACHE = 'sichrplace-dynamic-v1.0.0'

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/main.js',
  '/img/logo.jpg',
  '/img/icon-192.png',
  '/offline.html'
]

// Install event
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activating...')
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      return self.clients.claim()
    })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // API requests - Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone))
          return response
        })
        .catch(() => {
          return caches.match(request)
            .then(response => {
              if (response) {
                return response
              }
              // Return offline data if available
              return new Response(JSON.stringify({
                error: 'Offline',
                offline: true
              }), {
                headers: { 'Content-Type': 'application/json' }
              })
            })
        })
    )
    return
  }

  // Static assets - Cache first
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          return response || fetch(request)
        })
    )
    return
  }

  // Other requests - Network first, cache fallback
  event.respondWith(
    fetch(request)
      .then(response => {
        // Only cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, responseClone))
        }
        return response
      })
      .catch(() => {
        return caches.match(request)
          .then(response => {
            if (response) {
              return response
            }
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/offline.html')
            }
          })
      })
  )
})

// Push event
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received')
  
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { title: 'SichrPlace', body: 'New notification' }
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/img/icon-192.png',
    badge: '/img/badge.png',
    data: data.data || {},
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/img/action-view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/img/action-dismiss.png'
      }
    ],
    tag: data.tag || 'general',
    requireInteraction: data.priority === 'high'
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'SichrPlace', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event.action)
  
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const urlToOpen = event.notification.data?.action_url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen)
        }
      })
  )
})

// Background sync
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag)
  
  if (event.tag === 'apartment-sync') {
    event.waitUntil(syncApartmentData())
  }
})

async function syncApartmentData() {
  try {
    // Sync offline data when connection is restored
    const response = await fetch('/api/mobile/offline-sync', {
      method: 'POST',
      body: JSON.stringify(getOfflineData()),
      headers: { 'Content-Type': 'application/json' }
    })
    
    if (response.ok) {
      clearOfflineData()
    }
  } catch (error) {
    console.error('Sync failed:', error)
  }
}

function getOfflineData() {
  // Get data stored while offline
  return JSON.parse(localStorage.getItem('offline-data') || '[]')
}

function clearOfflineData() {
  localStorage.removeItem('offline-data')
}
`

  return new Response(
    serviceWorkerCode,
    {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      status: 200,
    },
  )
}

async function handleInstallPrompt(req: Request, supabase: any) {
  const { user_id, action } = await req.json() // 'shown', 'accepted', 'dismissed'

  console.log('📲 Install prompt:', { user_id, action })

  // Track install prompt interactions
  await supabase
    .from('analytics_events')
    .insert({
      event_type: 'pwa_install_prompt',
      user_id,
      metadata: { action },
      timestamp: new Date().toISOString()
    })

  // Update user preferences
  if (action === 'dismissed') {
    await supabase
      .from('user_preferences')
      .upsert({
        user_id,
        pwa_prompt_dismissed: true,
        pwa_prompt_dismissed_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
  }

  return new Response(
    JSON.stringify({
      success: true,
      action,
      recommendation: action === 'dismissed' ? 'dont_show_for_week' : 'continue'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function handleGeolocation(req: Request, supabase: any) {
  const { user_id, latitude, longitude, accuracy, timestamp } = await req.json()

  console.log('📍 Processing geolocation:', { user_id, latitude, longitude })

  // Store location for user (with privacy controls)
  await supabase
    .from('user_locations')
    .insert({
      user_id,
      latitude,
      longitude,
      accuracy,
      recorded_at: timestamp || new Date().toISOString()
    })

  // Find nearby apartments
  const { data: nearbyApartments } = await supabase
    .rpc('apartments_within_radius', {
      lat: latitude,
      lng: longitude,
      radius_km: 10
    })

  // Get location-based recommendations
  const recommendations = await generateLocationRecommendations(supabase, user_id, latitude, longitude)

  return new Response(
    JSON.stringify({
      success: true,
      location: { latitude, longitude, accuracy },
      nearbyApartments: nearbyApartments?.slice(0, 20) || [],
      recommendations
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function handleCameraUpload(req: Request, supabase: any) {
  const formData = await req.formData()
  const file = formData.get('image') as File
  const user_id = formData.get('user_id') as string
  const apartment_id = formData.get('apartment_id') as string
  const upload_type = formData.get('upload_type') as string // 'apartment_photo', 'profile_photo', 'verification'

  if (!file) {
    throw new Error('No image file provided')
  }

  console.log('📷 Handling camera upload:', { user_id, apartment_id, upload_type })

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${user_id}/${upload_type}/${Date.now()}.${fileExt}`

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('apartment-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('apartment-images')
    .getPublicUrl(fileName)

  // Store image record
  const { data: imageRecord, error: recordError } = await supabase
    .from('apartment_images')
    .insert({
      apartment_id,
      image_url: urlData.publicUrl,
      upload_type,
      uploaded_by: user_id,
      is_primary: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  if (recordError) throw recordError

  return new Response(
    JSON.stringify({
      success: true,
      image: {
        id: imageRecord.id,
        url: urlData.publicUrl,
        fileName,
        uploadType: upload_type
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

// Helper functions
async function sendWelcomePush(supabase: any, user_id: string, device: any) {
  // Send a welcome push notification
  return sendWebPush(device.push_subscription, {
    title: 'Welcome to SichrPlace! 🏠',
    body: 'Your apartment search journey begins now. Start exploring available apartments.',
    data: { action_url: '/dashboard' }
  })
}

async function sendWebPush(subscription: string, payload: any) {
  // In a real implementation, this would use Web Push Protocol
  // For now, return a mock response
  return { messageId: `mock_${Date.now()}`, status: 'sent' }
}

async function sendAPNs(deviceToken: string, payload: any) {
  // In a real implementation, this would use APNs
  return { messageId: `apns_${Date.now()}`, status: 'sent' }
}

async function sendFCM(deviceToken: string, payload: any) {
  // In a real implementation, this would use FCM
  return { messageId: `fcm_${Date.now()}`, status: 'sent' }
}

async function processOfflineItem(supabase: any, user_id: string, item: any) {
  // Process data that was collected while offline
  switch (item.type) {
    case 'apartment_view':
      return await supabase
        .from('analytics_events')
        .insert({
          event_type: 'apartment_view',
          user_id,
          apartment_id: item.apartment_id,
          timestamp: item.timestamp,
          metadata: { offline: true }
        })
    
    case 'search':
      return await supabase
        .from('analytics_events')
        .insert({
          event_type: 'search',
          user_id,
          metadata: { ...item.data, offline: true },
          timestamp: item.timestamp
        })
    
    default:
      throw new Error(`Unknown offline item type: ${item.type}`)
  }
}

async function generateOfflineCache(supabase: any, user_id: string) {
  // Generate data for offline use
  const { data: favoriteApartments } = await supabase
    .from('user_favorites')
    .select(`
      apartments (
        *,
        apartment_images (image_url, is_primary)
      )
    `)
    .eq('user_id', user_id)

  const { data: recentSearches } = await supabase
    .from('analytics_events')
    .select('metadata')
    .eq('user_id', user_id)
    .eq('event_type', 'search')
    .order('timestamp', { ascending: false })
    .limit(10)

  return {
    favoriteApartments: favoriteApartments || [],
    recentSearches: recentSearches?.map(s => s.metadata) || [],
    lastCached: new Date().toISOString()
  }
}

async function generateLocationRecommendations(supabase: any, user_id: string, lat: number, lng: number) {
  // Get user's viewing history for personalization
  const { data: viewingHistory } = await supabase
    .from('analytics_events')
    .select('apartment_id, apartments(city, rooms)')
    .eq('user_id', user_id)
    .eq('event_type', 'apartment_view')
    .not('apartment_id', 'is', null)
    .limit(20)

  const recommendations = []

  // Location-based recommendations
  recommendations.push({
    type: 'nearby',
    title: 'Apartments Near You',
    description: 'Found apartments within 5km of your location',
    action: 'search_nearby'
  })

  if (viewingHistory && viewingHistory.length > 0) {
    const cities = [...new Set(viewingHistory.map(h => h.apartments?.city).filter(Boolean))]
    if (cities.length > 0) {
      recommendations.push({
        type: 'preferred_areas',
        title: 'Your Preferred Areas',
        description: `Based on your searches in ${cities.join(', ')}`,
        action: 'search_preferred_cities'
      })
    }
  }

  return recommendations
}
