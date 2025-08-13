// GdprRequest model for Supabase PostgreSQL
// This is a mock model for compatibility with existing code

const GdprRequest = {
  // Mock methods for compatibility
  find: () => Promise.resolve([]),
  findById: (id) => Promise.resolve(null),
  create: (data) => Promise.resolve({ id: 'mock-id', status: 'pending', ...data }),
  findByIdAndUpdate: (id, data) => Promise.resolve({ id, status: 'updated', ...data }),
  findByIdAndDelete: (id) => Promise.resolve({ id }),
  
  // Static properties
  schema: {
    user_id: String,
    request_type: String,
    status: String,
    requested_at: Date,
    processed_at: Date,
    data_export: Object,
    deletion_confirmed: Boolean,
    created_at: Date,
    updated_at: Date
  }
};

module.exports = GdprRequest;
