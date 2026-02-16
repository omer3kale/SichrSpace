# WebSocket & Real-Time Architecture

> Full STOMP topic routing, subscriptions, typing indicators, presence, and read receipts.

## Connection & Topic Routing

```mermaid
flowchart TD
    subgraph "Browser (SichrPlaceChat class)"
        SOCK["SockJS connects to /ws"]
        STOMP["STOMP Client activates"]
        AUTH_H["Sends Authorization: Bearer JWT"]
    end

    subgraph "Spring Boot"
        EP["/ws endpoint<br/>WebSocketConfig"]
        BROKER["SimpleBroker<br/>/topic, /queue"]
        APP_PREFIX["/app destination prefix"]
    end

    subgraph "STOMP Destinations"
        direction TB
        T1["/topic/conversation/{id}<br/>← New messages"]
        T2["/topic/conversation/{id}/typing<br/>← Typing indicators"]
        T3["/topic/conversation/{id}/read<br/>← Read receipts"]
        T4["/topic/conversation/{id}/presence<br/>← Join/Leave events"]
        T5["/queue/notifications/{userId}<br/>← Personal notifications"]
    end

    subgraph "Server-Side Handlers (MessageController)"
        H1["@MessageMapping('/chat.send')<br/>→ Save to DB → Broadcast"]
        H2["@MessageMapping('/chat.typing')<br/>→ Broadcast typing state"]
        H3["@MessageMapping('/chat.presence')<br/>→ Broadcast join/leave"]
    end

    SOCK -->|"SockJS/HTTP fallback"| EP
    STOMP -->|"CONNECT frame"| AUTH_H
    EP --> BROKER

    STOMP -->|"SUBSCRIBE"| T1 & T2 & T3 & T4 & T5
    STOMP -->|"SEND /app/chat.send"| H1
    STOMP -->|"SEND /app/chat.typing"| H2
    STOMP -->|"SEND /app/chat.presence"| H3

    H1 -->|"SimpMessagingTemplate"| T1
    H2 -->|"SimpMessagingTemplate"| T2
    H3 -->|"SimpMessagingTemplate"| T4

    style SOCK fill:#FF9800,color:white
    style BROKER fill:#6DB33F,color:white
    style T1 fill:#1565c0,color:white
    style T5 fill:#9C27B0,color:white
```

## Message Send Sequence (Bidirectional)

```mermaid
sequenceDiagram
    participant A as User A (Browser)
    participant STOMP_A as STOMP Client A
    participant SPRING as Spring Boot
    participant DB as MSSQL
    participant STOMP_B as STOMP Client B
    participant B as User B (Browser)

    Note over A,B: Both users subscribed to /topic/conversation/{id}

    A->>STOMP_A: sendMessage("Hello!")
    STOMP_A->>SPRING: SEND /app/chat.send<br/>{conversationId, senderId, content}

    SPRING->>DB: INSERT INTO messages
    SPRING->>DB: UPDATE conversations SET last_message_at

    SPRING->>STOMP_A: BROADCAST /topic/conversation/{id}
    SPRING->>STOMP_B: BROADCAST /topic/conversation/{id}

    STOMP_A-->>A: _handleNewMessage() → skip own
    STOMP_B-->>B: _handleNewMessage() → render + sound

    Note over B: Document not focused?
    B->>B: Browser Notification API<br/>"New message from User A"

    B->>STOMP_B: markAsRead()
    STOMP_B->>SPRING: POST /api/messages/{id}/read (REST)
    STOMP_B->>SPRING: SEND /app/chat.read (STOMP)
    SPRING->>DB: UPDATE messages SET read = true
    SPRING->>STOMP_A: BROADCAST /topic/.../read
    STOMP_A-->>A: Show "✓✓ Read" indicator
```

## Reconnection Strategy

```mermaid
stateDiagram-v2
    [*] --> Connecting: connect(userId)
    Connecting --> Connected: STOMP CONNECTED frame

    Connected --> Disconnected: Network error / server restart

    Disconnected --> Reconnecting: Auto (5s delay)
    Reconnecting --> Connected: Success
    Reconnecting --> Reconnecting: Attempt < 10

    Reconnecting --> Failed: attempts >= 10
    Failed --> Connecting: Manual reconnect

    Connected --> [*]: disconnect()

    note right of Connected
        reconnectAttempts = 0
        Subscribe to all topics
        Announce presence "join"
    end note

    note right of Reconnecting
        reconnectAttempts++
        Emit 'sichrplace:ws-status' = 'reconnecting'
    end note
```
