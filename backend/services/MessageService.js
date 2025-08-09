const { supabase } = require('../config/supabase');

class MessageService {
  static async create(messageData) {
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select(`
        *,
        conversation:conversations(
          id,
          apartment_id,
          participant_1_id,
          participant_2_id
        ),
        sender:users!messages_sender_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        conversation:conversations(
          id,
          apartment_id,
          participant_1_id,
          participant_2_id
        ),
        sender:users!messages_sender_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findByConversation(conversationId, options = {}) {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  static async markAsRead(messageId, readAt = new Date().toISOString()) {
    const { data, error } = await supabase
      .from('messages')
      .update({ read_at: readAt })
      .eq('id', messageId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async getUnreadCount(userId) {
    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .neq('sender_id', userId)
      .is('read_at', null)
      .in('conversation_id', 
        supabase
          .from('conversations')
          .select('id')
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      );
    
    if (error) throw error;
    return data.length;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
}

class ConversationService {
  static async create(conversationData) {
    const { data, error } = await supabase
      .from('conversations')
      .insert([conversationData])
      .select(`
        *,
        apartment:apartments(
          id,
          title,
          location,
          price
        ),
        participant_1:users!conversations_participant_1_id_fkey(
          id,
          username,
          first_name,
          last_name
        ),
        participant_2:users!conversations_participant_2_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async findOrCreate(apartmentId, participant1Id, participant2Id) {
    // Try to find existing conversation
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .eq('apartment_id', apartmentId)
      .or(`and(participant_1_id.eq.${participant1Id},participant_2_id.eq.${participant2Id}),and(participant_1_id.eq.${participant2Id},participant_2_id.eq.${participant1Id})`)
      .single();
    
    if (existing) {
      return existing;
    }
    
    // Create new conversation if not found
    if (findError && findError.code === 'PGRST116') {
      return this.create({
        apartment_id: apartmentId,
        participant_1_id: participant1Id,
        participant_2_id: participant2Id
      });
    }
    
    throw findError;
  }

  static async findByUser(userId, options = {}) {
    let query = supabase
      .from('conversations')
      .select(`
        *,
        apartment:apartments(
          id,
          title,
          location,
          price,
          images
        ),
        participant_1:users!conversations_participant_1_id_fkey(
          id,
          username,
          first_name,
          last_name
        ),
        participant_2:users!conversations_participant_2_id_fkey(
          id,
          username,
          first_name,
          last_name
        )
      `)
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  }

  static async updateLastMessage(conversationId) {
    const { data, error } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
}

module.exports = {
  MessageService,
  ConversationService
};
