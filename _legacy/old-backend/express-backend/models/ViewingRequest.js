// ViewingRequest model for Supabase PostgreSQL
// This is a mock model for compatibility with existing code

const ViewingRequest = {
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
    viewing_date: Date,
    status: String,
    message: String,
    created_at: Date,
    updated_at: Date
  }
};

module.exports = ViewingRequest;
