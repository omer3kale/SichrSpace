'use client'

import { useState, useEffect } from 'react'
import { supabase, type Apartment, demoApartments } from '@/lib/supabase'

export default function Home() {
  const [apartments, setApartments] = useState<Apartment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string>('all')

  useEffect(() => {
    async function fetchApartments() {
      try {
        const { data, error } = await supabase
          .from('apartments')
          .select('*')
          .eq('status', 'available')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Using demo data due to Supabase error:', error)
          setApartments(demoApartments)
        } else {
          setApartments(data || demoApartments)
        }
      } catch (err) {
        console.warn('Using demo data due to connection error:', err)
        setApartments(demoApartments)
      } finally {
        setLoading(false)
      }
    }

    fetchApartments()
  }, [])

  const filteredApartments = selectedCity === 'all' 
    ? apartments 
    : apartments.filter(apt => apt.city.toLowerCase() === selectedCity.toLowerCase())

  const cities = ['all', ...Array.from(new Set(apartments.map(apt => apt.city)))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading apartments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SichrPlace</h1>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Demo</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-500 hover:text-gray-900">Find Apartments</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">List Property</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">About</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Find Your Perfect Student Apartment
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Secure, verified apartments for students and young professionals in Germany. 
            Real-time messaging, trusted landlords, and seamless booking experience.
          </p>
          
          {/* City Filter */}
          <div className="flex justify-center mb-8">
            <select 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {cities.map(city => (
                <option key={city} value={city}>
                  {city === 'all' ? 'All Cities' : city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Apartments Grid */}
      <section className="pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {error && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                Note: This is a demo showing sample data. In production, this would connect to live apartment listings.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApartments.map((apartment) => (
              <div key={apartment.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">📷 Photo Gallery</span>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {apartment.title}
                    </h3>
                    <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full ml-2">
                      Available
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {apartment.description}
                  </p>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span className="mr-4">📍 {apartment.location}</span>
                    <span>{apartment.size_sqm}m²</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span className="mr-4">🛏️ {apartment.bedrooms} bed</span>
                    <span>🚿 {apartment.bathrooms} bath</span>
                  </div>
                  
                  {apartment.amenities && apartment.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {apartment.amenities.slice(0, 3).map((amenity, index) => (
                        <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {amenity}
                        </span>
                      ))}
                      {apartment.amenities.length > 3 && (
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          +{apartment.amenities.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-blue-600">€{apartment.price}</span>
                      <span className="text-gray-500 text-sm">/month</span>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredApartments.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No apartments found in {selectedCity}.</p>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Why Choose SichrPlace?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl">🔒</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Secure & Verified</h4>
              <p className="text-gray-600">All apartments and landlords are verified for your safety and peace of mind.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl">💬</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Real-time Chat</h4>
              <p className="text-gray-600">Connect instantly with landlords through our secure messaging system.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl">📱</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Mobile-First</h4>
              <p className="text-gray-600">Progressive Web App that works seamlessly on all devices, online and offline.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            SichrPlace Demo - Built with Next.js, Supabase, and deployed on GitHub Pages
          </p>
          <p className="text-gray-500 text-sm mt-2">
            View the full project: <a href="https://github.com/omer3kale/SichrPlace77" className="text-blue-400 hover:text-blue-300">GitHub Repository</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
