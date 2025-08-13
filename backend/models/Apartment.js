// Apartment model for Supabase PostgreSQL
// This is a mock model for compatibility with existing code

const Apartment = {
  // Mock methods for compatibility
  find: () => Promise.resolve([]),
  findById: (id) => Promise.resolve(null),
  create: (data) => Promise.resolve({ id: 'mock-id', ...data }),
  findByIdAndUpdate: (id, data) => Promise.resolve({ id, ...data }),
  findByIdAndDelete: (id) => Promise.resolve({ id }),
  
  // Static properties
  schema: {
    title: String,
    description: String,
    price: Number,
    location: String,
    address: String,
    latitude: Number,
    longitude: Number,
    place_id: String,
    bedrooms: Number,
    bathrooms: Number,
    area: Number,
    landlord_id: String,
    images: [String],
    amenities: [String],
    availability: Date,
    created_at: Date,
    updated_at: Date
  }
};

module.exports = Apartment;
