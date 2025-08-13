// SichrPlace Analytics Edge Function
// Tracks user behavior and apartment performance metrics

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
      case 'track':
        return await trackEvent(req, supabase)
      case 'dashboard':
        return await getAnalyticsDashboard(req, supabase)
      case 'apartment-performance':
        return await getApartmentPerformance(req, supabase)
      case 'user-insights':
        return await getUserInsights(req, supabase)
      default:
        throw new Error(`Unknown analytics action: ${action}`)
    }

  } catch (error) {
    console.error('🚨 Analytics error:', error)
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

async function trackEvent(req: Request, supabase: any) {
  const { event_type, user_id, apartment_id, metadata, session_id } = await req.json()

  console.log('📊 Tracking event:', { event_type, user_id, apartment_id })

  // Store the event
  const { data: event, error } = await supabase
    .from('analytics_events')
    .insert({
      event_type,
      user_id,
      apartment_id,
      metadata,
      session_id,
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    })
    .select()
    .single()

  if (error) throw error

  // Update real-time counters
  await updateRealTimeCounters(supabase, event_type, apartment_id, user_id)

  return new Response(
    JSON.stringify({
      success: true,
      event_id: event.id
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function updateRealTimeCounters(supabase: any, event_type: string, apartment_id?: string, user_id?: string) {
  const today = new Date().toISOString().split('T')[0]

  // Update apartment-specific counters
  if (apartment_id) {
    switch (event_type) {
      case 'apartment_view':
        await supabase.rpc('increment_apartment_views', { 
          apartment_id, 
          date: today 
        })
        break
      case 'apartment_like':
        await supabase.rpc('increment_apartment_likes', { 
          apartment_id, 
          date: today 
        })
        break
      case 'viewing_request':
        await supabase.rpc('increment_viewing_requests', { 
          apartment_id, 
          date: today 
        })
        break
    }
  }

  // Update global counters
  await supabase.rpc('increment_global_counter', {
    counter_type: event_type,
    date: today
  })
}

async function getAnalyticsDashboard(req: Request, supabase: any) {
  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') || '7')
  const user_id = url.searchParams.get('user_id')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get global metrics
  const { data: globalMetrics } = await supabase
    .from('analytics_summary')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  // Get top performing apartments
  const { data: topApartments } = await supabase
    .from('apartment_analytics')
    .select(`
      apartment_id,
      apartments (title, address, rent_amount),
      total_views,
      total_likes,
      viewing_requests,
      conversion_rate
    `)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('total_views', { ascending: false })
    .limit(10)

  // Get user activity if user_id provided
  let userActivity = null
  if (user_id) {
    const { data } = await supabase
      .from('analytics_events')
      .select('event_type, timestamp, apartment_id, apartments(title)')
      .eq('user_id', user_id)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(50)
    
    userActivity = data
  }

  // Calculate insights
  const insights = await calculateInsights(supabase, days)

  return new Response(
    JSON.stringify({
      success: true,
      dashboard: {
        globalMetrics,
        topApartments,
        userActivity,
        insights,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        }
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function getApartmentPerformance(req: Request, supabase: any) {
  const url = new URL(req.url)
  const apartment_id = url.searchParams.get('apartment_id')
  const days = parseInt(url.searchParams.get('days') || '30')

  if (!apartment_id) {
    throw new Error('apartment_id is required')
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get apartment basic info
  const { data: apartment } = await supabase
    .from('apartments')
    .select('*')
    .eq('id', apartment_id)
    .single()

  // Get daily analytics
  const { data: dailyAnalytics } = await supabase
    .from('apartment_analytics')
    .select('*')
    .eq('apartment_id', apartment_id)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  // Get viewing requests conversion
  const { data: viewingStats } = await supabase
    .from('viewing_requests')
    .select('status, created_at, payment_status')
    .eq('apartment_id', apartment_id)
    .gte('created_at', startDate.toISOString())

  // Calculate performance metrics
  const totalViews = dailyAnalytics.reduce((sum, day) => sum + (day.total_views || 0), 0)
  const totalLikes = dailyAnalytics.reduce((sum, day) => sum + (day.total_likes || 0), 0)
  const totalViewingRequests = viewingStats.length
  const confirmedViewings = viewingStats.filter(v => v.status === 'confirmed').length
  const completedViewings = viewingStats.filter(v => v.status === 'completed').length
  
  const metrics = {
    totalViews,
    totalLikes,
    totalViewingRequests,
    confirmedViewings,
    completedViewings,
    viewToRequestRate: totalViews > 0 ? (totalViewingRequests / totalViews * 100).toFixed(2) : 0,
    requestToConfirmRate: totalViewingRequests > 0 ? (confirmedViewings / totalViewingRequests * 100).toFixed(2) : 0,
    completionRate: confirmedViewings > 0 ? (completedViewings / confirmedViewings * 100).toFixed(2) : 0
  }

  // Get competitor analysis (similar apartments)
  const { data: similarApartments } = await supabase
    .from('apartments')
    .select(`
      id,
      title,
      rent_amount,
      apartment_analytics!inner (
        total_views,
        total_likes,
        viewing_requests
      )
    `)
    .eq('city', apartment.city)
    .gte('rent_amount', apartment.rent_amount * 0.8)
    .lte('rent_amount', apartment.rent_amount * 1.2)
    .neq('id', apartment_id)
    .limit(5)

  return new Response(
    JSON.stringify({
      success: true,
      apartment,
      metrics,
      dailyAnalytics,
      viewingStats,
      similarApartments,
      recommendations: generateRecommendations(metrics, apartment)
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function getUserInsights(req: Request, supabase: any) {
  const url = new URL(req.url)
  const user_id = url.searchParams.get('user_id')
  const days = parseInt(url.searchParams.get('days') || '30')

  if (!user_id) {
    throw new Error('user_id is required')
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  // Get user activity
  const { data: userEvents } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', user_id)
    .gte('timestamp', startDate.toISOString())
    .order('timestamp', { ascending: false })

  // Analyze user behavior
  const behaviorAnalysis = analyzeUserBehavior(userEvents)
  
  // Get user preferences based on activity
  const preferences = await extractUserPreferences(supabase, user_id, userEvents)

  // Get recommended apartments
  const recommendations = await getPersonalizedRecommendations(supabase, user_id, preferences)

  return new Response(
    JSON.stringify({
      success: true,
      userInsights: {
        behaviorAnalysis,
        preferences,
        recommendations,
        activitySummary: {
          totalEvents: userEvents.length,
          apartmentsViewed: new Set(userEvents.filter(e => e.event_type === 'apartment_view').map(e => e.apartment_id)).size,
          searchesPerformed: userEvents.filter(e => e.event_type === 'search').length,
          averageSessionLength: calculateAverageSessionLength(userEvents)
        }
      }
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    },
  )
}

async function calculateInsights(supabase: any, days: number) {
  // Calculate various business insights
  const insights = []

  // Peak activity hours
  const { data: hourlyActivity } = await supabase
    .from('analytics_events')
    .select('timestamp')
    .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

  const hourCounts = {}
  hourlyActivity.forEach(event => {
    const hour = new Date(event.timestamp).getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  const peakHour = Object.keys(hourCounts).reduce((a, b) => hourCounts[a] > hourCounts[b] ? a : b)
  insights.push({
    type: 'peak_activity',
    title: 'Peak Activity Hour',
    description: `Most user activity occurs at ${peakHour}:00`,
    value: `${peakHour}:00`,
    impact: 'high'
  })

  return insights
}

function analyzeUserBehavior(events: any[]) {
  const eventTypes = {}
  const timeSpent = {}
  const searchPatterns = []

  events.forEach(event => {
    eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1
    
    if (event.event_type === 'search' && event.metadata) {
      searchPatterns.push(event.metadata)
    }
  })

  return {
    eventTypes,
    searchPatterns: analyzeSearchPatterns(searchPatterns),
    activityLevel: calculateActivityLevel(events),
    preferredTimes: extractPreferredTimes(events)
  }
}

function analyzeSearchPatterns(searches: any[]) {
  const priceRanges = []
  const locations = []
  const roomCounts = []

  searches.forEach(search => {
    if (search.priceRange) priceRanges.push(search.priceRange)
    if (search.location) locations.push(search.location)
    if (search.rooms) roomCounts.push(search.rooms)
  })

  return {
    averagePriceRange: calculateAveragePriceRange(priceRanges),
    preferredLocations: getMostCommon(locations),
    preferredRoomCount: getMostCommon(roomCounts)
  }
}

function calculateActivityLevel(events: any[]) {
  const daysSinceFirst = Math.max(1, Math.ceil((Date.now() - new Date(events[events.length - 1]?.timestamp || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
  const eventsPerDay = events.length / daysSinceFirst
  
  if (eventsPerDay > 10) return 'high'
  if (eventsPerDay > 3) return 'medium'
  return 'low'
}

function extractPreferredTimes(events: any[]) {
  const hours = events.map(e => new Date(e.timestamp).getHours())
  const hourCounts = {}
  hours.forEach(hour => {
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })
  
  return Object.keys(hourCounts)
    .sort((a, b) => hourCounts[b] - hourCounts[a])
    .slice(0, 3)
    .map(h => `${h}:00`)
}

async function extractUserPreferences(supabase: any, user_id: string, events: any[]) {
  // Extract preferences from user behavior
  const viewedApartments = events
    .filter(e => e.event_type === 'apartment_view' && e.apartment_id)
    .map(e => e.apartment_id)

  if (viewedApartments.length === 0) {
    return { insufficient_data: true }
  }

  // Get apartment details for viewed apartments
  const { data: apartments } = await supabase
    .from('apartments')
    .select('rent_amount, rooms, city, furnished, size_sqm')
    .in('id', viewedApartments)

  // Calculate preferences
  const rentAmounts = apartments.map(a => a.rent_amount).filter(Boolean)
  const roomCounts = apartments.map(a => a.rooms).filter(Boolean)
  const cities = apartments.map(a => a.city).filter(Boolean)

  return {
    preferredPriceRange: {
      min: Math.min(...rentAmounts),
      max: Math.max(...rentAmounts),
      average: rentAmounts.reduce((a, b) => a + b, 0) / rentAmounts.length
    },
    preferredRoomCount: getMostCommon(roomCounts),
    preferredCities: getMostCommon(cities),
    furnishedPreference: apartments.filter(a => a.furnished).length / apartments.length > 0.5,
    averageSize: apartments.map(a => a.size_sqm).filter(Boolean).reduce((a, b) => a + b, 0) / apartments.length || null
  }
}

async function getPersonalizedRecommendations(supabase: any, user_id: string, preferences: any) {
  if (preferences.insufficient_data) {
    return []
  }

  // Build query based on preferences
  let query = supabase
    .from('apartments')
    .select(`
      *,
      apartment_images (image_url),
      apartment_analytics (total_views, total_likes)
    `)
    .eq('status', 'available')

  // Apply preference filters
  if (preferences.preferredPriceRange) {
    query = query
      .gte('rent_amount', preferences.preferredPriceRange.min * 0.8)
      .lte('rent_amount', preferences.preferredPriceRange.max * 1.2)
  }

  if (preferences.preferredRoomCount) {
    query = query.eq('rooms', preferences.preferredRoomCount)
  }

  if (preferences.preferredCities && preferences.preferredCities.length > 0) {
    query = query.in('city', preferences.preferredCities)
  }

  const { data: recommendations } = await query.limit(10)

  return recommendations || []
}

function getMostCommon(arr: any[]) {
  const counts = {}
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1
  })
  
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
}

function calculateAveragePriceRange(ranges: any[]) {
  if (ranges.length === 0) return null
  
  const mins = ranges.map(r => r.min).filter(Boolean)
  const maxs = ranges.map(r => r.max).filter(Boolean)
  
  return {
    min: mins.reduce((a, b) => a + b, 0) / mins.length,
    max: maxs.reduce((a, b) => a + b, 0) / maxs.length
  }
}

function calculateAverageSessionLength(events: any[]) {
  // Group events by session_id
  const sessions = {}
  events.forEach(event => {
    if (!sessions[event.session_id]) {
      sessions[event.session_id] = []
    }
    sessions[event.session_id].push(new Date(event.timestamp).getTime())
  })

  // Calculate session lengths
  const sessionLengths = Object.values(sessions).map((timestamps: any) => {
    if (timestamps.length < 2) return 0
    return Math.max(...timestamps) - Math.min(...timestamps)
  }).filter(length => length > 0)

  if (sessionLengths.length === 0) return 0
  
  return Math.round(sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length / 1000 / 60) // in minutes
}

function generateRecommendations(metrics: any, apartment: any) {
  const recommendations = []

  if (parseFloat(metrics.viewToRequestRate) < 5) {
    recommendations.push({
      type: 'low_conversion',
      title: 'Improve Apartment Photos',
      description: 'Your view-to-request rate is low. Consider adding high-quality photos.',
      priority: 'high'
    })
  }

  if (metrics.totalViews < 50) {
    recommendations.push({
      type: 'low_visibility',
      title: 'Boost Visibility',
      description: 'Your apartment has low visibility. Consider updating the description or reducing the price.',
      priority: 'medium'
    })
  }

  return recommendations
}
