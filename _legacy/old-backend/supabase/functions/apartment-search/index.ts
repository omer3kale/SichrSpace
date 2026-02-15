// SichrPlace Apartment Search Edge Function
// Integrates with Google Maps for location-based searches

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Google Maps API key
    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')!

    const { searchParams, center, radius, priceRange, rooms, furnished } = await req.json()

    console.log('🔍 Apartment search request:', { center, radius, priceRange })

    // Build the database query
    let query = supabase
      .from('apartments')
      .select(`
        *,
        apartment_images (
          image_url,
          display_order
        ),
        users!apartments_landlord_id_fkey (
          first_name,
          last_name,
          email
        )
      `)
      .eq('status', 'available')

    // Add price range filter
    if (priceRange) {
      if (priceRange.min) query = query.gte('rent_amount', priceRange.min)
      if (priceRange.max) query = query.lte('rent_amount', priceRange.max)
    }

    // Add rooms filter
    if (rooms) {
      query = query.gte('rooms', rooms)
    }

    // Add furnished filter
    if (furnished !== undefined) {
      query = query.eq('furnished', furnished)
    }

    // Execute the query
    const { data: apartments, error } = await query

    if (error) {
      throw error
    }

    // Filter by location if center and radius are provided
    let filteredApartments = apartments
    if (center && radius) {
      filteredApartments = apartments.filter(apartment => {
        if (!apartment.latitude || !apartment.longitude) return false
        
        // Calculate distance using Haversine formula
        const distance = calculateDistance(
          center.lat,
          center.lng,
          apartment.latitude,
          apartment.longitude
        )
        
        return distance <= radius
      })
    }

    // Enhance apartments with Google Maps data
    const enhancedApartments = await Promise.all(
      filteredApartments.map(async (apartment) => {
        try {
          // Get place details from Google Maps
          const placeData = await getPlaceDetails(apartment, googleMapsApiKey)
          
          // Calculate commute times to major locations
          const commuteScores = await calculateCommuteScores(apartment, googleMapsApiKey)
          
          return {
            ...apartment,
            placeDetails: placeData,
            commuteScores,
            images: apartment.apartment_images || [],
            landlord: apartment.users
          }
        } catch (error) {
          console.error('Error enhancing apartment:', error)
          return {
            ...apartment,
            images: apartment.apartment_images || [],
            landlord: apartment.users
          }
        }
      })
    )

    // Sort by relevance (distance, price, etc.)
    enhancedApartments.sort((a, b) => {
      if (center) {
        const distanceA = calculateDistance(center.lat, center.lng, a.latitude, a.longitude)
        const distanceB = calculateDistance(center.lat, center.lng, b.latitude, b.longitude)
        return distanceA - distanceB
      }
      return a.rent_amount - b.rent_amount
    })

    return new Response(
      JSON.stringify({
        success: true,
        apartments: enhancedApartments,
        total: enhancedApartments.length,
        searchParams: {
          center,
          radius,
          priceRange,
          rooms,
          furnished
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('🚨 Search error:', error)
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

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Get Google Maps place details
async function getPlaceDetails(apartment: any, apiKey: string) {
  try {
    const address = `${apartment.address}, ${apartment.city}`
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    
    const response = await fetch(geocodeUrl)
    const data = await response.json()
    
    if (data.results && data.results.length > 0) {
      return {
        formatted_address: data.results[0].formatted_address,
        place_id: data.results[0].place_id,
        types: data.results[0].types
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting place details:', error)
    return null
  }
}

// Calculate commute scores to major locations
async function calculateCommuteScores(apartment: any, apiKey: string) {
  const majorDestinations = [
    { name: 'Cologne City Center', address: 'Cologne Cathedral, Cologne, Germany' },
    { name: 'Cologne Main Station', address: 'Cologne Hauptbahnhof, Germany' },
    { name: 'University of Cologne', address: 'University of Cologne, Germany' }
  ]

  const commuteScores = []

  for (const destination of majorDestinations) {
    try {
      const origin = `${apartment.latitude},${apartment.longitude}`
      const destAddress = encodeURIComponent(destination.address)
      
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destAddress}&mode=transit&key=${apiKey}`
      
      const response = await fetch(directionsUrl)
      const data = await response.json()
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0]
        const leg = route.legs[0]
        
        commuteScores.push({
          destination: destination.name,
          duration: leg.duration.text,
          durationValue: leg.duration.value,
          distance: leg.distance.text,
          distanceValue: leg.distance.value,
          transitSteps: leg.steps.filter(step => step.travel_mode === 'TRANSIT').length
        })
      }
    } catch (error) {
      console.error(`Error calculating commute to ${destination.name}:`, error)
    }
  }

  return commuteScores
}
