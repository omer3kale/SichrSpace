/**
 * SichrPlace Real-time Chat - STOMP/SockJS Client
 * Replaces Supabase Realtime with self-hosted Spring WebSocket
 * Zero third-party cloud dependencies
 *
 * Dependencies (loaded via CDN in HTML):
 *   - https://cdn.jsdelivr.net/npm/sockjs-client@1/dist/sockjs.min.js
 *   - https://cdn.jsdelivr.net/npm/@stomp/stompjs@7/bundles/stomp.umd.min.js
 */

class SichrPlaceChat {
  constructor() {
    this.stompClient = null;
    this.subscriptions = {};
    this.currentUserId = null;
    this.currentConversationId = null;
    this.typingTimeout = null;
    this.onlineUsers = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;

    this.callbacks = {
      onMessage: null,
      onTyping: null,
      onUserOnline: null,
      onUserOffline: null,
      onMessageRead: null,
      onConnectionChange: null,
    };
  }

  // ============================
  // Connection Management
  // ============================

  /**
   * Connect to WebSocket server
   * @param {string} userId - Current user ID
   */
  async connect(userId) {
    this.currentUserId = userId;
    const wsUrl = SichrPlaceAPI.CONFIG.WS_URL || `${SichrPlaceAPI.CONFIG.BASE_URL}/ws`;
    const token = SichrPlaceAPI.Auth.getToken();

    return new Promise((resolve, reject) => {
      // Use SockJS for broad browser compatibility
      const socket = new SockJS(wsUrl.replace('wss://', 'https://').replace('ws://', 'http://'));

      this.stompClient = new StompJs.Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (msg) => {
          if (window.SICHRPLACE_DEBUG) console.log('STOMP:', msg);
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
      });

      this.stompClient.onConnect = (frame) => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this._notifyConnectionChange('connected');

        // Subscribe to personal notification queue
        this.subscriptions['notifications'] = this.stompClient.subscribe(
          `/queue/notifications/${userId}`,
          (message) => this._handleNotification(JSON.parse(message.body))
        );

        resolve(frame);
      };

      this.stompClient.onStompError = (frame) => {
        console.error('STOMP error:', frame.headers['message']);
        this._notifyConnectionChange('error');
        reject(new Error(frame.headers['message']));
      };

      this.stompClient.onDisconnect = () => {
        console.log('🔌 WebSocket disconnected');
        this._notifyConnectionChange('disconnected');
      };

      this.stompClient.onWebSocketClose = () => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
          console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          this._notifyConnectionChange('reconnecting');
        }
      };

      this.stompClient.activate();
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  async disconnect() {
    if (this.stompClient && this.stompClient.connected) {
      // Unsubscribe all
      Object.values(this.subscriptions).forEach(sub => sub.unsubscribe());
      this.subscriptions = {};
      await this.stompClient.deactivate();
      this.stompClient = null;
    }
  }

  // ============================
  // Conversation Management
  // ============================

  /**
   * Join a conversation and subscribe to real-time updates
   * @param {string} conversationId - The conversation ID
   * @param {Object} callbacks - Event callbacks
   */
  async joinConversation(conversationId, callbacks = {}) {
    if (this.currentConversationId) {
      await this.leaveConversation();
    }

    this.currentConversationId = conversationId;
    this.callbacks = { ...this.callbacks, ...callbacks };

    if (!this.stompClient || !this.stompClient.connected) {
      throw new Error('WebSocket not connected. Call connect() first.');
    }

    // Subscribe to conversation messages
    this.subscriptions[`conv-${conversationId}`] = this.stompClient.subscribe(
      `/topic/conversation/${conversationId}`,
      (message) => this._handleNewMessage(JSON.parse(message.body))
    );

    // Subscribe to typing indicators
    this.subscriptions[`typing-${conversationId}`] = this.stompClient.subscribe(
      `/topic/conversation/${conversationId}/typing`,
      (message) => this._handleTypingIndicator(JSON.parse(message.body))
    );

    // Subscribe to read receipts
    this.subscriptions[`read-${conversationId}`] = this.stompClient.subscribe(
      `/topic/conversation/${conversationId}/read`,
      (message) => this._handleReadReceipt(JSON.parse(message.body))
    );

    // Subscribe to presence
    this.subscriptions[`presence-${conversationId}`] = this.stompClient.subscribe(
      `/topic/conversation/${conversationId}/presence`,
      (message) => this._handlePresence(JSON.parse(message.body))
    );

    // Announce presence
    this._publishPresence('join');

    console.log('✅ Joined conversation:', conversationId);
    return conversationId;
  }

  /**
   * Leave current conversation
   */
  async leaveConversation() {
    if (this.currentConversationId) {
      this._publishPresence('leave');

      // Unsubscribe conversation-specific channels
      const prefixes = ['conv-', 'typing-', 'read-', 'presence-'];
      prefixes.forEach(prefix => {
        const key = `${prefix}${this.currentConversationId}`;
        if (this.subscriptions[key]) {
          this.subscriptions[key].unsubscribe();
          delete this.subscriptions[key];
        }
      });

      this.currentConversationId = null;
      this.onlineUsers.clear();
      clearTimeout(this.typingTimeout);
      console.log('👋 Left conversation');
    }
  }

  // ============================
  // Messaging
  // ============================

  /**
   * Send a message via STOMP
   * @param {string} content - Message content
   * @param {string} messageType - Type (text, image, file)
   */
  sendMessage(content, messageType = 'text') {
    if (!this.currentConversationId || !this.stompClient?.connected) {
      throw new Error('Not connected to a conversation');
    }

    this.stompClient.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        conversationId: this.currentConversationId,
        senderId: this.currentUserId,
        content: content,
        type: messageType,
      }),
    });
  }

  /**
   * Send typing indicator
   * @param {boolean} isTyping
   */
  sendTyping(isTyping = true) {
    if (!this.currentConversationId || !this.stompClient?.connected) return;

    this.stompClient.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        conversationId: this.currentConversationId,
        userId: this.currentUserId,
        isTyping: isTyping,
      }),
    });

    if (isTyping) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = setTimeout(() => this.sendTyping(false), 3000);
    }
  }

  /**
   * Mark messages in conversation as read
   */
  markAsRead() {
    if (!this.currentConversationId) return;

    // REST call is more reliable for persistence
    SichrPlaceAPI.Messages.markAsRead(this.currentConversationId).catch(console.error);

    // Also notify via STOMP for real-time read receipts
    if (this.stompClient?.connected) {
      this.stompClient.publish({
        destination: '/app/chat.read',
        body: JSON.stringify({
          conversationId: this.currentConversationId,
          userId: this.currentUserId,
          readAt: new Date().toISOString(),
        }),
      });
    }
  }

  // ============================
  // Event Handlers (private)
  // ============================

  _handleNewMessage(message) {
    console.log('📨 New message:', message);

    if (message.senderId === this.currentUserId) return;

    if (document.hasFocus() && this.currentConversationId) {
      this.markAsRead();
    }

    this.callbacks.onMessage?.(message);

    if (!document.hasFocus()) {
      this._showNotification(message);
    }
  }

  _handleTypingIndicator(data) {
    if (data.userId === this.currentUserId) return;
    this.callbacks.onTyping?.(data.userId, data.isTyping);
  }

  _handleReadReceipt(data) {
    if (data.userId === this.currentUserId) return;
    this.callbacks.onMessageRead?.(data);
  }

  _handlePresence(data) {
    if (data.action === 'join') {
      this.onlineUsers.add(data.userId);
      this.callbacks.onUserOnline?.(data.userId);
    } else {
      this.onlineUsers.delete(data.userId);
      this.callbacks.onUserOffline?.(data.userId);
    }
    this._updateOnlineStatus();
  }

  _handleNotification(notification) {
    console.log('🔔 Notification:', notification);
    // Trigger app-level notification handler
    window.dispatchEvent(new CustomEvent('sichrplace:notification', { detail: notification }));
  }

  // ============================
  // Presence & Notifications
  // ============================

  _publishPresence(action) {
    if (!this.stompClient?.connected || !this.currentConversationId) return;
    this.stompClient.publish({
      destination: '/app/chat.presence',
      body: JSON.stringify({
        conversationId: this.currentConversationId,
        userId: this.currentUserId,
        action: action,
        onlineAt: new Date().toISOString(),
      }),
    });
  }

  _updateOnlineStatus() {
    document.querySelectorAll('.user-online-indicator').forEach(el => {
      const userId = el.dataset.userId;
      el.classList.toggle('online', this.onlineUsers.has(userId));
      el.classList.toggle('offline', !this.onlineUsers.has(userId));
    });
  }

  _notifyConnectionChange(status) {
    this.callbacks.onConnectionChange?.(status);
    window.dispatchEvent(new CustomEvent('sichrplace:ws-status', { detail: status }));
  }

  async _showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const n = new Notification(`New message from ${message.senderName || 'Someone'}`, {
        body: message.content,
        icon: '/img/logo.jpg',
        tag: `message-${message.id}`,
      });
      n.onclick = () => { window.focus(); n.close(); };
      setTimeout(() => n.close(), 5000);
    }
  }

  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      return (await Notification.requestPermission()) === 'granted';
    }
    return Notification.permission === 'granted';
  }

  // ============================
  // Status Helpers
  // ============================

  isConnected() { return this.stompClient?.connected === true; }
  getOnlineUsersCount() { return this.onlineUsers.size; }
  isUserOnline(userId) { return this.onlineUsers.has(userId); }

  async cleanup() {
    await this.leaveConversation();
    await this.disconnect();
    clearTimeout(this.typingTimeout);
  }
}

// Export globally
window.SichrPlaceChat = SichrPlaceChat;
