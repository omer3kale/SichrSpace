/**
 * Frontend Real-time Chat Manager
 * Integrates with Supabase Realtime for live chat functionality
 */

class FrontendRealtimeChat {
  constructor(supabase) {
    this.supabase = supabase;
    this.currentUserId = null;
    this.currentConversationId = null;
    this.channel = null;
    this.typingTimeout = null;
    this.onlineUsers = new Set();
    
    // Callbacks
    this.callbacks = {
      onMessage: null,
      onTyping: null,
      onUserOnline: null,
      onUserOffline: null,
      onMessageRead: null
    };
  }

  /**
   * Initialize the real-time chat system
   * @param {string} userId - Current user ID
   */
  async initialize(userId) {
    this.currentUserId = userId;
    console.log('🚀 Real-time chat initialized for user:', userId);
  }

  /**
   * Join a conversation and start real-time updates
   * @param {string} conversationId - The conversation ID to join
   * @param {Object} callbacks - Event callbacks
   */
  async joinConversation(conversationId, callbacks = {}) {
    // Leave previous conversation if any
    if (this.channel) {
      await this.leaveConversation();
    }

    this.currentConversationId = conversationId;
    this.callbacks = { ...this.callbacks, ...callbacks };

    // Create Supabase channel for this conversation
    this.channel = this.supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => this.handleNewMessage(payload.new)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => this.handleMessageUpdate(payload.new)
      )
      .on('broadcast', { event: 'typing' }, (payload) => 
        this.handleTypingIndicator(payload)
      )
      .on('presence', { event: 'sync' }, () => {
        const presenceState = this.channel.presenceState();
        this.updateOnlineUsers(presenceState);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.onlineUsers.add(key);
        if (this.callbacks.onUserOnline) {
          this.callbacks.onUserOnline(key, newPresences[0]);
        }
        this.updateOnlineStatus();
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.onlineUsers.delete(key);
        if (this.callbacks.onUserOffline) {
          this.callbacks.onUserOffline(key, leftPresences[0]);
        }
        this.updateOnlineStatus();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Connected to conversation:', conversationId);
          this.trackPresence();
        }
      });

    return this.channel;
  }

  /**
   * Track user presence in the conversation
   */
  async trackPresence() {
    if (this.channel && this.currentUserId) {
      await this.channel.track({
        user_id: this.currentUserId,
        online_at: new Date().toISOString()
      });
    }
  }

  /**
   * Send a message
   * @param {string} content - Message content
   * @param {string} messageType - Type of message (text, image, file)
   */
  async sendMessage(content, messageType = 'text') {
    if (!this.currentConversationId || !this.currentUserId) {
      throw new Error('Not connected to a conversation');
    }

    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: this.currentConversationId,
          sender_id: this.currentUserId,
          content: content,
          message_type: messageType,
          created_at: new Date().toISOString()
        })
        .select(`
          *,
          sender:users(id, name, email, avatar_url)
        `)
        .single();

      if (error) throw error;

      // Update conversation timestamp
      await this.supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentConversationId);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator
   * @param {boolean} isTyping - Whether user is typing
   */
  async sendTyping(isTyping = true) {
    if (this.channel && this.currentUserId) {
      await this.channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_id: this.currentUserId,
          is_typing: isTyping,
          timestamp: new Date().toISOString()
        }
      });

      // Auto-stop typing after 3 seconds
      if (isTyping) {
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
          this.sendTyping(false);
        }, 3000);
      }
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - The message ID
   */
  async markAsRead(messageId) {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({ 
          read_at: new Date().toISOString(),
          read_by: this.currentUserId
        })
        .eq('id', messageId)
        .neq('sender_id', this.currentUserId); // Don't mark own messages

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  /**
   * Handle new message received
   * @param {Object} message - The new message
   */
  handleNewMessage(message) {
    console.log('📨 New message received:', message);
    
    // Don't show our own messages (they're already displayed)
    if (message.sender_id === this.currentUserId) {
      return;
    }

    // Mark as read if conversation is active
    if (document.hasFocus() && this.currentConversationId) {
      this.markAsRead(message.id);
    }

    // Call callback
    if (this.callbacks.onMessage) {
      this.callbacks.onMessage(message);
    }

    // Show browser notification if tab is not focused
    if (!document.hasFocus()) {
      this.showNotification(message);
    }
  }

  /**
   * Handle message update (like read status)
   * @param {Object} message - The updated message
   */
  handleMessageUpdate(message) {
    console.log('📝 Message updated:', message);
    
    if (this.callbacks.onMessageRead && message.read_at) {
      this.callbacks.onMessageRead(message);
    }
  }

  /**
   * Handle typing indicator
   * @param {Object} payload - Typing payload
   */
  handleTypingIndicator(payload) {
    const { user_id, is_typing } = payload.payload;
    
    // Don't show our own typing
    if (user_id === this.currentUserId) {
      return;
    }

    console.log('⌨️ Typing indicator:', user_id, is_typing);
    
    if (this.callbacks.onTyping) {
      this.callbacks.onTyping(user_id, is_typing);
    }
  }

  /**
   * Update online users display
   * @param {Object} presenceState - Current presence state
   */
  updateOnlineUsers(presenceState) {
    this.onlineUsers.clear();
    Object.keys(presenceState).forEach(userId => {
      this.onlineUsers.add(userId);
    });
    this.updateOnlineStatus();
  }

  /**
   * Update online status in UI
   */
  updateOnlineStatus() {
    // Update online indicators in the UI
    document.querySelectorAll('.user-online-indicator').forEach(indicator => {
      const userId = indicator.dataset.userId;
      if (this.onlineUsers.has(userId)) {
        indicator.classList.add('online');
        indicator.classList.remove('offline');
      } else {
        indicator.classList.add('offline');
        indicator.classList.remove('online');
      }
    });
  }

  /**
   * Show browser notification for new message
   * @param {Object} message - The message object
   */
  async showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Get sender info
      const { data: sender } = await this.supabase
        .from('users')
        .select('name')
        .eq('id', message.sender_id)
        .single();

      const notification = new Notification(`New message from ${sender?.name || 'Someone'}`, {
        body: message.content,
        icon: '/img/logo.jpg',
        tag: `message-${message.id}`
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  /**
   * Leave current conversation
   */
  async leaveConversation() {
    if (this.channel) {
      await this.supabase.removeChannel(this.channel);
      this.channel = null;
      this.currentConversationId = null;
      this.onlineUsers.clear();
      clearTimeout(this.typingTimeout);
      console.log('👋 Left conversation');
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.leaveConversation();
    clearTimeout(this.typingTimeout);
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount() {
    return this.onlineUsers.size;
  }

  /**
   * Check if user is online
   * @param {string} userId - User ID to check
   */
  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  }
}

// Export for use in chat.html
window.FrontendRealtimeChat = FrontendRealtimeChat;
