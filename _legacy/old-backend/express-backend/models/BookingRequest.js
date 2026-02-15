// BookingRequest model for Supabase PostgreSQL
// This is a mock model for compatibility with existing code

const BookingRequest = {
  // Mock methods for compatibility
  find: () => Promise.resolve([]),
  findById: (id) => Promise.resolve(null),
  create: (data) => Promise.resolve({ id: 'mock-id', ...data }),
  findByIdAndUpdate: (id, data) => Promise.resolve({ id, ...data }),
  findByIdAndDelete: (id) => Promise.resolve({ id }),
  
  // Static properties
  schema: {
    user_id: String,
    apartment_id: String,
    start_date: Date,
    end_date: Date,
    total_price: Number,
    status: String,
    special_requests: String,
    created_at: Date,
    updated_at: Date
  }
};

module.exports = BookingRequest;
