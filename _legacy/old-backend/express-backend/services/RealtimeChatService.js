/**
 * Real-time Chat Service using Supabase Realtime
 * Handles live message updates, typing indicators, and online status
 */

class RealtimeChatService {
  constructor(supabase) {
    this.supabase = supabase;
    this.channels = new Map(); // Track active channels
    this.typingUsers = new Map(); // Track typing users per conversation
    this.onlineUsers = new Set(); // Track online users
  }

  /**
   * Subscribe to real-time messages for a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Function} onMessage - Callback for new messages
   * @param {Function} onTyping - Callback for typing indicators
   */
  subscribeToConversation(conversationId, callbacks = {}) {
    const {
      onMessage,
      onTyping,
      onUserOnline,
      onUserOffline,
      onMessageRead
    } = callbacks;

    // Create channel for this conversation
    const channel = this.supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('New message received:', payload.new);
          if (onMessage) onMessage(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          console.log('Message updated:', payload.new);
          if (onMessageRead && payload.new.read_at) {
            onMessageRead(payload.new);
          }
        }
      )
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('Typing indicator:', payload);
        if (onTyping) onTyping(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        console.log('Presence sync:', newState);
        
        // Update online users
        Object.keys(newState).forEach(userId => {
          this.onlineUsers.add(userId);
          if (onUserOnline) onUserOnline(userId);
        });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
        this.onlineUsers.add(key);
        if (onUserOnline) onUserOnline(key);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
        this.onlineUsers.delete(key);
        if (onUserOffline) onUserOffline(key);
      })
      .subscribe();

    // Store channel reference
    this.channels.set(conversationId, channel);

    return channel;
  }

  /**
   * Track user presence in conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user ID
   * @param {Object} userInfo - User information
   */
  async trackPresence(conversationId, userId, userInfo = {}) {
    const channel = this.channels.get(conversationId);
    if (channel) {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
        ...userInfo
      });
    }
  }

  /**
   * Send typing indicator
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The user ID
   * @param {boolean} isTyping - Whether user is typing
   */
  async sendTypingIndicator(conversationId, userId, isTyping = true) {
    const channel = this.channels.get(conversationId);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: userId,
          is_typing: isTyping,
          timestamp: new Date().toISOString()
        }
      });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        setTimeout(() => {
          this.sendTypingIndicator(conversationId, userId, false);
        }, 3000);
      }
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - The message ID
   * @param {string} userId - The user ID who read it
   */
  async markMessageAsRead(messageId, userId) {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({ 
          read_at: new Date().toISOString(),
          read_by: userId
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  /**
   * Send a new message
   * @param {string} conversationId - The conversation ID
   * @param {string} userId - The sender user ID
   * @param {string} content - The message content
   * @param {string} messageType - The message type (text, image, file, etc.)
   */
  async sendMessage(conversationId, userId, content, messageType = 'text') {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content,
          message_type: messageType,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update conversation's last_message_at
      await this.supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a conversation
   * @param {string} conversationId - The conversation ID
   */
  async unsubscribeFromConversation(conversationId) {
    const channel = this.channels.get(conversationId);
    if (channel) {
      await this.supabase.removeChannel(channel);
      this.channels.delete(conversationId);
    }
  }

  /**
   * Get online users for a conversation
   * @param {string} conversationId - The conversation ID
   */
  getOnlineUsers(conversationId) {
    const channel = this.channels.get(conversationId);
    if (channel) {
      return Object.keys(channel.presenceState());
    }
    return [];
  }

  /**
   * Cleanup - unsubscribe from all channels
   */
  async cleanup() {
    for (const [conversationId, channel] of this.channels) {
      await this.supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.onlineUsers.clear();
    this.typingUsers.clear();
  }
}

module.exports = RealtimeChatService;
