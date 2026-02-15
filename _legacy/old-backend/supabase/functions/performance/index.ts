// SichrPlace Performance Optimization Edge Function
// Handles caching, data optimization, and performance monitoring

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory cache for frequently requested data
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

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
      case 'optimize-search':
        return await optimizeSearch(req, supabase)
      case 'cache-popular':
        return await cachePopularData(req, supabase)
      case 'preload-images':
        return await preloadImages(req, supabase)
      case 'optimize-db':
        return await optimizeDatabase(req, supabase)
      case 'performance-report':
        return await getPerformanceReport(req, supabase)
      case 'clear-cache':
        return await clearCache(req)
      default:
        throw new Error(`Unknown optimization action: ${action}`)
    }

  } catch (error) {
    console.error('🚨 Performance optimization error:', error)
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

async function optimizeSearch(req: Request, supabase: any) {
  const startTime = performance.now()
  const { query, filters, location, radius = 10 } = await req.json()

  console.log('🔍 Optimizing search:', { query, filters, location })

  // Generate cache key
  const cacheKey = `search:${JSON.stringify({ query, filters, location, radius })}`
  
  // Check cache first
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log('✅ Cache hit for search')
    return new Response(
      JSON.stringify({
        success: true,
        results: cached,
        cached: true,
        responseTime: performance.now() - startTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }

  // Build optimized query
  let searchQuery = supabase
    .from('apartments')
    .select(`
      id,
      title,
      address,
      rent_amount,
      rooms,
      size_sqm,
      furnished,
      city,
      created_at,
      location,
      apartment_images!inner (
        image_url,
        is_primary
      ),
      apartment_analytics!left (
        total_views,
        total_likes
      )
    `)
    .eq('status', 'available')

  // Apply filters efficiently
  if (filters) {
    if (filters.minPrice) searchQuery = searchQuery.gte('rent_amount', filters.minPrice)
    if (filters.maxPrice) searchQuery = searchQuery.lte('rent_amount', filters.maxPrice)
    if (filters.rooms) searchQuery = searchQuery.eq('rooms', filters.rooms)
    if (filters.furnished !== undefined) searchQuery = searchQuery.eq('furnished', filters.furnished)
    if (filters.city) searchQuery = searchQuery.eq('city', filters.city)
  }

  // Text search optimization
  if (query) {
    searchQuery = searchQuery.or(`title.ilike.%${query}%,address.ilike.%${query}%,description.ilike.%${query}%`)
  }

  // Location-based search with PostGIS
  if (location && location.lat && location.lng) {
    const { data: nearbyApartments } = await supabase
      .rpc('apartments_within_radius', {
        lat: location.lat,
        lng: location.lng,
        radius_km: radius
      })

    if (nearbyApartments && nearbyApartments.length > 0) {
      const nearbyIds = nearbyApartments.map((apt: any) => apt.id)
      searchQuery = searchQuery.in('id', nearbyIds)
    }
  }

  // Execute optimized query
  const { data: apartments, error } = await searchQuery
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error

  // Post-process results for better performance
  const optimizedResults = apartments.map(apartment => ({
    ...apartment,
    primaryImage: apartment.apartment_images?.find((img: any) => img.is_primary)?.image_url || 
                  apartment.apartment_images?.[0]?.image_url,
    totalViews: apartment.apartment_analytics?.[0]?.total_views || 0,
    totalLikes: apartment.apartment_analytics?.[0]?.total_likes || 0,
    // Remove nested objects to reduce payload size
    apartment_images: undefined,
    apartment_analytics: undefined
  }))

  // Cache results
  setCache(cacheKey, optimizedResults)

  const responseTime = performance.now() - startTime
  console.log(`🚀 Search completed in ${responseTime.toFixed(2)}ms`)

  return new Response(
    JSON.stringify({
      success: true,
      results: optimizedResults,
      cached: false,
      responseTime,
      resultCount: optimizedResults.length
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function cachePopularData(req: Request, supabase: any) {
  console.log('🔥 Caching popular data...')

  // Cache popular apartments (most viewed)
  const { data: popularApartments } = await supabase
    .from('apartments')
    .select(`
      *,
      apartment_images!inner (image_url, is_primary),
      apartment_analytics!inner (total_views)
    `)
    .eq('status', 'available')
    .order('apartment_analytics.total_views', { ascending: false })
    .limit(20)

  setCache('popular_apartments', popularApartments)

  // Cache cities with apartment counts
  const { data: cities } = await supabase
    .rpc('get_cities_with_counts')

  setCache('cities_with_counts', cities)

  // Cache price ranges
  const { data: priceStats } = await supabase
    .rpc('get_price_statistics')

  setCache('price_statistics', priceStats)

  // Cache trending searches
  const { data: trendingSearches } = await supabase
    .from('analytics_events')
    .select('metadata')
    .eq('event_type', 'search')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(100)

  // Extract common search terms
  const searchTerms: { [key: string]: number } = {}
  trendingSearches?.forEach(event => {
    if (event.metadata?.query) {
      const term = event.metadata.query.toLowerCase()
      searchTerms[term] = (searchTerms[term] || 0) + 1
    }
  })

  const topSearches = Object.entries(searchTerms)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }))

  setCache('trending_searches', topSearches)

  return new Response(
    JSON.stringify({
      success: true,
      cached: {
        popularApartments: popularApartments?.length || 0,
        cities: cities?.length || 0,
        priceStats: !!priceStats,
        trendingSearches: topSearches.length
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function preloadImages(req: Request, supabase: any) {
  const { apartmentIds } = await req.json()

  console.log('🖼️ Preloading images for apartments:', apartmentIds)

  const { data: images } = await supabase
    .from('apartment_images')
    .select('image_url, apartment_id')
    .in('apartment_id', apartmentIds)
    .order('is_primary', { ascending: false })

  // Group images by apartment
  const imageMap: { [key: string]: string[] } = {}
  images?.forEach(img => {
    if (!imageMap[img.apartment_id]) {
      imageMap[img.apartment_id] = []
    }
    imageMap[img.apartment_id].push(img.image_url)
  })

  // Generate optimized image URLs with different sizes
  const optimizedImages: { [key: string]: any } = {}
  Object.entries(imageMap).forEach(([apartmentId, urls]) => {
    optimizedImages[apartmentId] = {
      thumbnail: urls.map(url => generateOptimizedUrl(url, 'thumbnail')),
      medium: urls.map(url => generateOptimizedUrl(url, 'medium')),
      large: urls.map(url => generateOptimizedUrl(url, 'large')),
      original: urls
    }
  })

  return new Response(
    JSON.stringify({
      success: true,
      images: optimizedImages,
      preloadScript: generatePreloadScript(optimizedImages)
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function optimizeDatabase(req: Request, supabase: any) {
  console.log('🗄️ Running database optimization...')

  const optimizations = []

  // Clean old analytics data
  try {
    const { data: cleanupResult } = await supabase
      .rpc('cleanup_old_analytics', { retention_days: 90 })
    
    optimizations.push({
      operation: 'cleanup_analytics',
      result: `Cleaned ${cleanupResult} old records`,
      status: 'success'
    })
  } catch (error) {
    optimizations.push({
      operation: 'cleanup_analytics',
      result: error.message,
      status: 'error'
    })
  }

  // Update apartment analytics summaries
  try {
    await supabase.rpc('refresh_apartment_analytics')
    optimizations.push({
      operation: 'refresh_analytics',
      result: 'Analytics summaries updated',
      status: 'success'
    })
  } catch (error) {
    optimizations.push({
      operation: 'refresh_analytics',
      result: error.message,
      status: 'error'
    })
  }

  // Vacuum and analyze tables (if permissions allow)
  try {
    await supabase.rpc('optimize_tables')
    optimizations.push({
      operation: 'optimize_tables',
      result: 'Tables optimized',
      status: 'success'
    })
  } catch (error) {
    optimizations.push({
      operation: 'optimize_tables',
      result: 'Limited permissions - ' + error.message,
      status: 'warning'
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      optimizations,
      timestamp: new Date().toISOString()
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function getPerformanceReport(req: Request, supabase: any) {
  const startTime = performance.now()

  // Cache statistics
  const cacheStats = {
    totalKeys: cache.size,
    memoryUsage: JSON.stringify([...cache.entries()]).length,
    hitRate: getCacheHitRate()
  }

  // Database performance check
  const dbCheckStart = performance.now()
  const { data: dbTest } = await supabase
    .from('apartments')
    .select('id')
    .limit(1)
  const dbResponseTime = performance.now() - dbCheckStart

  // Query slow operations
  const { data: slowQueries } = await supabase
    .from('analytics_events')
    .select('event_type, metadata')
    .eq('event_type', 'slow_query')
    .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('timestamp', { ascending: false })
    .limit(10)

  // System metrics
  const systemMetrics = {
    functionResponseTime: performance.now() - startTime,
    databaseResponseTime: dbResponseTime,
    cacheStats,
    slowQueries: slowQueries?.length || 0,
    timestamp: new Date().toISOString()
  }

  // Performance recommendations
  const recommendations = generatePerformanceRecommendations(systemMetrics)

  return new Response(
    JSON.stringify({
      success: true,
      performance: systemMetrics,
      recommendations,
      status: dbResponseTime < 100 ? 'good' : dbResponseTime < 500 ? 'warning' : 'critical'
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function clearCache(req: Request) {
  const url = new URL(req.url)
  const pattern = url.searchParams.get('pattern')

  if (pattern) {
    // Clear specific pattern
    const keysToDelete = [...cache.keys()].filter(key => key.includes(pattern))
    keysToDelete.forEach(key => cache.delete(key))
    
    return new Response(
      JSON.stringify({
        success: true,
        cleared: keysToDelete.length,
        pattern
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } else {
    // Clear all cache
    const count = cache.size
    cache.clear()
    
    return new Response(
      JSON.stringify({
        success: true,
        cleared: count,
        pattern: 'all'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
}

// Utility functions
function getFromCache(key: string) {
  const item = cache.get(key)
  if (!item) return null
  
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  
  // Track cache hit
  trackCacheHit(true)
  return item.data
}

function setCache(key: string, data: any) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  })
}

let cacheHits = 0
let cacheMisses = 0

function trackCacheHit(hit: boolean) {
  if (hit) {
    cacheHits++
  } else {
    cacheMisses++
  }
}

function getCacheHitRate() {
  const total = cacheHits + cacheMisses
  return total > 0 ? ((cacheHits / total) * 100).toFixed(2) : 0
}

function generateOptimizedUrl(originalUrl: string, size: 'thumbnail' | 'medium' | 'large') {
  // In a real implementation, this would generate URLs for image optimization service
  // For now, return original URL with size parameter
  const url = new URL(originalUrl)
  
  const dimensions = {
    thumbnail: '150x150',
    medium: '400x300',
    large: '800x600'
  }
  
  url.searchParams.set('resize', dimensions[size])
  url.searchParams.set('quality', '85')
  url.searchParams.set('format', 'webp')
  
  return url.toString()
}

function generatePreloadScript(images: any) {
  // Generate JavaScript for preloading images
  const preloadUrls = Object.values(images)
    .flatMap((apartment: any) => apartment.thumbnail.slice(0, 2)) // First 2 thumbnails
  
  return `
    // Preload critical images
    const preloadImages = ${JSON.stringify(preloadUrls)};
    preloadImages.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      document.head.appendChild(link);
    });
  `
}

function generatePerformanceRecommendations(metrics: any) {
  const recommendations = []

  if (metrics.databaseResponseTime > 500) {
    recommendations.push({
      type: 'database',
      priority: 'high',
      title: 'Slow Database Queries',
      description: 'Database response time is over 500ms. Consider adding indexes or optimizing queries.',
      action: 'Review and optimize database queries'
    })
  }

  if (metrics.cacheStats.hitRate < 70) {
    recommendations.push({
      type: 'cache',
      priority: 'medium',
      title: 'Low Cache Hit Rate',
      description: `Cache hit rate is ${metrics.cacheStats.hitRate}%. Consider caching more frequently accessed data.`,
      action: 'Increase cache coverage and TTL'
    })
  }

  if (metrics.slowQueries > 5) {
    recommendations.push({
      type: 'performance',
      priority: 'medium',
      title: 'Multiple Slow Queries',
      description: `${metrics.slowQueries} slow queries detected in the last 24 hours.`,
      action: 'Investigate and optimize slow queries'
    })
  }

  return recommendations
}
