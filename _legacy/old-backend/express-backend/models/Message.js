// Message model for Supabase PostgreSQL
// This is a mock model for compatibility with existing code

const Message = {
  // Mock methods for compatibility
  find: () => Promise.resolve([]),
  findById: (id) => Promise.resolve(null),
  create: (data) => Promise.resolve({ id: 'mock-id', ...data }),
  findByIdAndUpdate: (id, data) => Promise.resolve({ id, ...data }),
  findByIdAndDelete: (id) => Promise.resolve({ id }),
  
  // Static properties
  schema: {
    sender_id: String,
    recipient_id: String,
    conversation_id: String,
    content: String,
    message_type: String,
    read_at: Date,
    created_at: Date,
    updated_at: Date
  }
};

module.exports = Message;
