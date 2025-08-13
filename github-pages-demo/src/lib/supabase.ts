import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Apartment {
  id: string
  title: string
  description: string
  price: number
  location: string
  city: string
  bedrooms: number
  bathrooms: number
  size_sqm: number
  images?: string[]
  amenities?: string[]
  available_from: string
  contact_email: string
  created_at: string
  status: 'available' | 'rented' | 'pending'
}

export interface Message {
  id: string
  apartment_id: string
  sender_name: string
  sender_email: string
  message: string
  created_at: string
}

// Demo data fallback for when Supabase is not available
export const demoApartments: Apartment[] = [
  {
    id: '1',
    title: 'Modern Student Apartment in Berlin Mitte',
    description: 'Beautiful 1-bedroom apartment perfect for students. Close to Humboldt University.',
    price: 850,
    location: 'Berlin Mitte',
    city: 'Berlin',
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 35,
    amenities: ['WiFi', 'Washing Machine', 'Furnished', 'Balcony'],
    available_from: '2025-09-01',
    contact_email: 'landlord@example.com',
    created_at: '2025-08-13T00:00:00Z',
    status: 'available'
  },
  {
    id: '2',
    title: 'Cozy WG Room in Munich',
    description: 'Shared apartment with 2 other students. Great location near TU Munich.',
    price: 650,
    location: 'Munich Schwabing',
    city: 'Munich',
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 20,
    amenities: ['WiFi', 'Shared Kitchen', 'Public Transport'],
    available_from: '2025-10-01',
    contact_email: 'wg@example.com',
    created_at: '2025-08-13T00:00:00Z',
    status: 'available'
  },
  {
    id: '3',
    title: 'Studio Apartment in Hamburg',
    description: 'Perfect studio for young professionals. Modern amenities and great location.',
    price: 750,
    location: 'Hamburg Altona',
    city: 'Hamburg',
    bedrooms: 1,
    bathrooms: 1,
    size_sqm: 28,
    amenities: ['WiFi', 'Kitchenette', 'Bike Storage'],
    available_from: '2025-08-15',
    contact_email: 'hamburg@example.com',
    created_at: '2025-08-13T00:00:00Z',
    status: 'available'
  }
]
