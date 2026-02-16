# Role-Based Access Control (RBAC) Matrix

> Complete endpoint → required role mapping derived from SecurityConfig and @PreAuthorize annotations.

## Access Control Tiers

```mermaid
flowchart TD
    subgraph "Tier 1: PUBLIC (no auth required)"
        P1["GET  /api/health"]
        P2["POST /api/auth/login"]
        P3["POST /api/auth/register"]
        P4["GET  /api/apartments"]
        P5["GET  /api/apartments/{id}"]
        P6["GET  /api/apartments/{id}/reviews"]
        P7["GET  /swagger-ui/**"]
        P8["GET  /api-docs/**"]
        P9["GET  /ws/** (SockJS handshake)"]
    end

    subgraph "Tier 2: AUTHENTICATED USER (any valid JWT)"
        U1["GET    /api/auth/me"]
        U2["POST   /api/apartments"]
        U3["PUT    /api/apartments/{id}  (own only)"]
        U4["DELETE /api/apartments/{id}  (own only)"]
        U5["POST   /api/apartments/{id}/images"]
        U6["GET    /api/messages/conversations"]
        U7["GET    /api/messages/conversations/{id}"]
        U8["POST   /api/messages/send"]
        U9["POST   /api/messages/conversations/{id}/read"]
        U10["POST  /api/viewing-requests"]
        U11["GET   /api/viewing-requests/my-requests"]
        U12["GET   /api/viewing-requests/landlord-requests"]
        U13["PATCH /api/viewing-requests/{id}/status (landlord)"]
        U14["GET   /api/favorites"]
        U15["POST  /api/favorites"]
        U16["DEL   /api/favorites/{id}"]
        U17["GET   /api/saved-searches"]
        U18["POST  /api/saved-searches"]
        U19["DEL   /api/saved-searches/{id}"]
        U20["POST  /api/reviews"]
        U21["GET   /api/notifications"]
        U22["GET   /api/notifications/unread-count"]
        U23["POST  /api/notifications/mark-read"]
        U24["GET   /api/gdpr/my-data"]
        U25["POST  /api/gdpr/data-export"]
        U26["POST  /api/gdpr/data-deletion"]
        U27["POST  /api/gdpr/consent"]
        U28["GET   /api/gdpr/requests"]
    end

    subgraph "Tier 3: ADMIN ONLY (@PreAuthorize hasRole ADMIN)"
        A1["GET   /api/admin/dashboard"]
        A2["GET   /api/admin/users"]
        A3["PATCH /api/admin/users/{id}/block"]
        A4["GET   /api/admin/reviews/pending"]
        A5["PATCH /api/admin/reviews/{id}/moderate"]
    end

    style P1 fill:#4CAF50,color:white
    style P2 fill:#4CAF50,color:white
    style U1 fill:#2196F3,color:white
    style U10 fill:#2196F3,color:white
    style A1 fill:#c62828,color:white
    style A3 fill:#c62828,color:white
```

## Authorization Decision Flow

```mermaid
flowchart TD
    REQ["Incoming HTTP Request"] --> FILTER["JwtAuthFilter.doFilterInternal()"]
    
    FILTER --> HAS_TOKEN{"Authorization<br/>header present?"}
    
    HAS_TOKEN -->|No| NO_AUTH["SecurityContext = anonymous"]
    HAS_TOKEN -->|Yes| VALIDATE["JwtTokenProvider.validateToken()"]
    
    VALIDATE --> VALID{"Signature valid?<br/>Not expired?"}
    VALID -->|No| NO_AUTH
    VALID -->|Yes| LOAD_USER["UserRepository.findById(userId)"]
    
    LOAD_USER --> BLOCKED{"user.blocked?"}
    BLOCKED -->|Yes| NO_AUTH
    BLOCKED -->|No| SET_AUTH["Set SecurityContext<br/>authorities = ROLE_{role}"]
    
    SET_AUTH --> SECURITY["SecurityConfig filter chain"]
    NO_AUTH --> SECURITY
    
    SECURITY --> PATH_CHECK{"Path matches<br/>public pattern?"}
    
    PATH_CHECK -->|"Yes: /api/auth/**, /api/health,<br/>/api/apartments (GET)"| ALLOW["✅ 200 Allow"]
    PATH_CHECK -->|"No"| AUTH_CHECK{"Authenticated?"}
    
    AUTH_CHECK -->|No| DENY_401["❌ 401 Unauthorized"]
    AUTH_CHECK -->|Yes| ROLE_CHECK{"@PreAuthorize<br/>check?"}
    
    ROLE_CHECK -->|"No annotation or<br/>role matches"| ALLOW
    ROLE_CHECK -->|"hasRole('ADMIN')<br/>but role != admin"| DENY_403["❌ 403 Forbidden"]
    
    style ALLOW fill:#2e7d32,color:white
    style DENY_401 fill:#c62828,color:white
    style DENY_403 fill:#e65100,color:white
```

## Nginx Rate Limiting by Endpoint Category

```mermaid
graph LR
    subgraph "Rate Limit Zones"
        Z1["zone=api<br/>100 req/min<br/>burst=20<br/>All /api/** routes"]
        Z2["zone=auth<br/>10 req/min<br/>burst=5<br/>/api/auth/** only"]
        Z3["No limit<br/>/api/health<br/>/swagger-ui/**"]
    end

    subgraph "Defense Stack"
        D1["1. Nginx rate limit"]
        D2["2. TLS 1.2/1.3 only"]
        D3["3. Security headers (CSP, HSTS, X-Frame)"]
        D4["4. JWT validation"]
        D5["5. Role authorization"]
        D6["6. Bean Validation (@Valid)"]
        D7["7. Parameterized SQL (JPA)"]
    end

    D1 --> D2 --> D3 --> D4 --> D5 --> D6 --> D7

    style Z2 fill:#c62828,color:white
    style Z1 fill:#FF9800,color:white
    style Z3 fill:#4CAF50,color:white
```
