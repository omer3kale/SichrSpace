# SichrPlace — Architecture & Flow Diagrams

> Mermaid diagrams for the SichrPlace platform. Render in any Mermaid-compatible viewer (VS Code, GitHub, Notion, etc.)

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph Frontend["Frontend (Static HTML/CSS/JS)"]
        LP[Landing Page]
        AL[Apartment Listing]
        CH[Chat Page]
        LD[Landlord Dashboard]
        AD[Applicant Dashboard]
        VR[Viewing Request]
        PP[PayPal Checkout]
        ADMIN[Admin Dashboard]
    end

    subgraph SpringBoot["Java Backend (Spring Boot 3.2)"]
        SEC[Security Filter Chain]
        JWT[JWT Auth Filter]
        UC[UserController]
        AC[ApartmentController]
        VRC[ViewingRequestController]
        RC[ReviewController]
        NC[NotificationController]
        MC[MessageController]
        PC[PaymentController]
        ADC[AdminController]
        GC[GdprController]
    end

    subgraph Services["Service Layer"]
        US[UserService]
        AS[ApartmentService]
        VRS[ViewingRequestService]
        RS[ReviewService]
        NS[NotificationService]
        MS[MessageService]
        PS[PayPalService]
        ES[EmailService]
        GS[GdprService]
    end

    subgraph Database["MS SQL Server"]
        UT[(users)]
        AT[(apartments)]
        VRT[(viewing_requests)]
        CT[(conversations)]
        MT[(messages)]
        PT[(payment_transactions)]
        NT[(notifications)]
        RT[(apartment_reviews)]
        FT[(user_favorites)]
    end

    subgraph External["External Services"]
        PAYPAL[PayPal API v2]
        GMAIL[Gmail SMTP]
        GMAPS[Google Maps API]
    end

    Frontend -->|REST API / JSON| SEC
    SEC --> JWT
    JWT --> UC & AC & VRC & RC & NC & MC & PC & ADC & GC
    UC --> US
    AC --> AS
    VRC --> VRS
    RC --> RS
    NC --> NS
    MC --> MS
    PC --> PS
    ADC --> US & AS

    US --> UT
    AS --> AT
    VRS --> VRT
    MS --> CT & MT
    PS --> PT
    NS --> NT
    RS --> RT

    PS -->|Create/Capture Orders| PAYPAL
    ES -->|Send Emails| GMAIL
    AS -->|Geocode Addresses| GMAPS
```

---

## 2. Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password
        varchar role
        varchar first_name
        varchar last_name
        varchar phone
        date date_of_birth
        boolean gdpr_consent
        varchar account_status
        boolean email_verified
        timestamp created_at
    }

    APARTMENTS {
        uuid id PK
        uuid owner_id FK
        varchar title
        text description
        varchar city
        varchar district
        decimal monthly_rent
        decimal deposit_amount
        int size_sqm
        int rooms
        int bedrooms
        boolean furnished
        boolean pet_friendly
        varchar status
        varchar verification_status
        decimal average_rating
        timestamp created_at
    }

    VIEWING_REQUESTS {
        uuid id PK
        uuid apartment_id FK
        uuid tenant_id FK
        uuid landlord_id FK
        timestamp proposed_date_time
        timestamp confirmed_date_time
        varchar status
        varchar payment_status
        decimal booking_fee
        timestamp created_at
    }

    CONVERSATIONS {
        uuid id PK
        uuid apartment_id FK
        uuid participant_1_id FK
        uuid participant_2_id FK
        timestamp last_message_at
    }

    MESSAGES {
        uuid id PK
        uuid conversation_id FK
        uuid sender_id FK
        text content
        varchar message_type
        boolean read_by_recipient
        timestamp created_at
    }

    PAYMENT_TRANSACTIONS {
        uuid id PK
        varchar payment_id UK
        uuid user_id FK
        uuid viewing_request_id FK
        decimal amount
        varchar currency
        varchar status
        timestamp completed_at
    }

    APARTMENT_REVIEWS {
        uuid id PK
        uuid apartment_id FK
        uuid reviewer_id FK
        int rating
        varchar title
        text comment
        varchar status
        timestamp created_at
    }

    USER_FAVORITES {
        uuid id PK
        uuid user_id FK
        uuid apartment_id FK
        timestamp created_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        varchar type
        varchar title
        text message
        timestamp read_at
        timestamp created_at
    }

    REFUND_REQUESTS {
        uuid id PK
        uuid user_id FK
        uuid payment_transaction_id FK
        decimal amount
        varchar reason
        varchar status
    }

    SAVED_SEARCHES {
        uuid id PK
        uuid user_id FK
        varchar name
        text search_criteria
        boolean alerts_enabled
    }

    SCHUFA_CHECKS {
        uuid id PK
        uuid user_id FK
        int credit_score
        varchar risk_category
        boolean approved
        date valid_until
    }

    USERS ||--o{ APARTMENTS : "owns"
    USERS ||--o{ VIEWING_REQUESTS : "requests (tenant)"
    USERS ||--o{ VIEWING_REQUESTS : "receives (landlord)"
    APARTMENTS ||--o{ VIEWING_REQUESTS : "booked for"
    USERS ||--o{ CONVERSATIONS : "participates"
    CONVERSATIONS ||--o{ MESSAGES : "contains"
    USERS ||--o{ MESSAGES : "sends"
    APARTMENTS ||--o{ CONVERSATIONS : "about"
    USERS ||--o{ PAYMENT_TRANSACTIONS : "pays"
    VIEWING_REQUESTS ||--o| PAYMENT_TRANSACTIONS : "paid via"
    APARTMENTS ||--o{ APARTMENT_REVIEWS : "reviewed"
    USERS ||--o{ APARTMENT_REVIEWS : "writes"
    USERS ||--o{ USER_FAVORITES : "favorites"
    APARTMENTS ||--o{ USER_FAVORITES : "favorited"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ REFUND_REQUESTS : "requests"
    PAYMENT_TRANSACTIONS ||--o| REFUND_REQUESTS : "refund of"
    USERS ||--o{ SAVED_SEARCHES : "saves"
    USERS ||--o{ SCHUFA_CHECKS : "checked"
```

---

## 3. Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Browser
    participant Filter as JwtAuthFilter
    participant Security as SecurityContext
    participant Controller as UserController
    participant Service as UserService
    participant DB as MS SQL Server

    Note over User, DB: Registration Flow
    User->>Browser: Fill registration form
    Browser->>Controller: POST /api/auth/register
    Controller->>Service: register(request)
    Service->>DB: Check email/username exists
    DB-->>Service: Not found
    Service->>Service: BCrypt hash password
    Service->>Service: Generate verification token
    Service->>DB: INSERT INTO users
    DB-->>Service: User created
    Service->>Service: Generate JWT (24h)
    Service-->>Controller: UserAuthDto
    Controller-->>Browser: 201 {user, accessToken, redirectUrl}
    Browser->>User: Redirect to dashboard

    Note over User, DB: Login Flow
    User->>Browser: Enter credentials
    Browser->>Controller: POST /api/auth/login
    Controller->>Service: login(request)
    Service->>DB: Find by email/username
    DB-->>Service: User found
    Service->>Service: BCrypt verify password
    Service->>Service: Check account status
    Service->>Service: Generate JWT tokens
    Service->>DB: Update last_login_at
    Service-->>Controller: UserAuthDto
    Controller-->>Browser: 200 {accessToken, refreshToken, user}

    Note over User, DB: Protected Request
    User->>Browser: Access protected page
    Browser->>Filter: GET /api/apartments/owner/listings<br/>Authorization: Bearer {jwt}
    Filter->>Filter: Extract token from header
    Filter->>Filter: Validate JWT signature + expiry
    Filter->>Security: Set Authentication
    Security->>Controller: Authenticated request
    Controller->>Service: Business logic
    Service->>DB: Query with user context
    DB-->>Browser: Response data
```

---

## 4. Viewing Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : Tenant creates request

    PENDING --> CONFIRMED : Landlord confirms with date
    PENDING --> DECLINED : Landlord declines with reason
    PENDING --> CANCELLED : Tenant cancels

    CONFIRMED --> COMPLETED : After viewing occurs
    CONFIRMED --> CANCELLED : Either party cancels

    DECLINED --> [*] : Terminal state
    COMPLETED --> [*] : Terminal state
    CANCELLED --> [*] : Terminal state

    note right of PENDING
        Default booking fee: €25
        payment_status: PENDING
    end note

    note right of CONFIRMED
        confirmed_date_time set
        responded_at set
    end note

    note right of CANCELLED
        cancelled_by tracked
        cancellation_reason recorded
        If paid → payment_status: REFUNDED
    end note

    note right of COMPLETED
        completion_rating (1-5)
        completion_notes
    end note
```

---

## 5. PayPal Payment Flow

```mermaid
sequenceDiagram
    actor Tenant
    participant Browser
    participant PayPal SDK as PayPal JS SDK
    participant Backend as Spring Boot
    participant PayPal as PayPal REST API
    participant DB as Database

    Tenant->>Browser: Click "Pay €25 Viewing Fee"
    Browser->>PayPal SDK: Render PayPal buttons
    PayPal SDK->>Backend: POST /api/payments/create<br/>{amount: 25, apartmentId, type: "viewing_fee"}
    Backend->>PayPal: POST /v2/checkout/orders<br/>{intent: CAPTURE, amount: 25 EUR}
    PayPal-->>Backend: {id: "ORDER_ID", status: "CREATED"}
    Backend->>DB: INSERT payment_transaction (status: created)
    Backend-->>PayPal SDK: {orderId: "ORDER_ID"}

    PayPal SDK->>Tenant: Show PayPal login window
    Tenant->>PayPal: Approve payment
    PayPal-->>PayPal SDK: onApprove({orderId})

    PayPal SDK->>Backend: POST /api/payments/capture<br/>{orderId: "ORDER_ID"}
    Backend->>PayPal: POST /v2/checkout/orders/ORDER_ID/capture
    PayPal-->>Backend: {status: "COMPLETED", capture details}
    Backend->>DB: UPDATE payment_transaction (status: completed)
    Backend->>DB: UPDATE viewing_request (payment_status: PAID)
    Backend->>DB: INSERT notification (type: payment_success)
    Backend-->>Browser: {success: true, transaction}

    Note over PayPal, Backend: Webhook (async backup)
    PayPal->>Backend: POST /api/payments/webhooks<br/>PAYMENT.CAPTURE.COMPLETED
    Backend->>DB: Verify + update transaction
```

---

## 6. Review Moderation Flow

```mermaid
stateDiagram-v2
    [*] --> PENDING : Tenant submits review

    PENDING --> APPROVED : Admin approves
    PENDING --> REJECTED : Admin rejects

    APPROVED --> PENDING : Tenant edits → re-moderation
    REJECTED --> [*] : Can be deleted

    note right of PENDING
        Not visible to public
        Visible to reviewer
    end note

    note right of APPROVED
        Visible to all
        Counted in avg rating
    end note

    note left of REJECTED
        moderation_notes explain why
        moderated_by = admin UUID
    end note
```

---

## 7. GDPR Data Flow

```mermaid
flowchart TD
    A[User requests data export<br/>GET /api/gdpr/export] --> B{Authenticated?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[Gather all user data]
    D --> D1[Personal profile]
    D --> D2[Apartments owned]
    D --> D3[Viewing requests]
    D --> D4[Conversations & messages]
    D --> D5[Payment transactions]
    D --> D6[Reviews written]
    D --> D7[Favorites]
    D --> D8[Notifications]
    D --> D9[GDPR consent history]
    D1 & D2 & D3 & D4 & D5 & D6 & D7 & D8 & D9 --> E[Bundle as JSON]
    E --> F[Return as download]

    G[User requests deletion<br/>DELETE /api/gdpr/delete] --> H{Authenticated?}
    H -->|No| C
    H -->|Yes| I{Confirm string match?<br/>'DELETE MY ACCOUNT PERMANENTLY'}
    I -->|No| J[400 Bad Request]
    I -->|Yes| K{Future bookings?}
    K -->|Yes| L[409 Conflict<br/>Cancel bookings first]
    K -->|No| M[Anonymize user data]
    M --> M1[Set name to 'Deleted User']
    M --> M2[Clear email, phone, DOB]
    M --> M3[Set account_status = deactivated]
    M --> M4[Retain data structure<br/>for referential integrity]
    M --> M5[Log GDPR deletion event]
    M1 & M2 & M3 & M4 & M5 --> N[200 Account anonymized]
```

---

## 8. User Role Flow

```mermaid
flowchart LR
    subgraph Registration
        REG[Register Page] -->|role: TENANT| TD[Tenant Dashboard]
        REG -->|role: LANDLORD| LDD[Landlord Dashboard]
    end

    subgraph Tenant["Tenant Actions"]
        TD --> SEARCH[Search Apartments]
        TD --> FAV[Manage Favorites]
        TD --> VR[Request Viewings]
        TD --> CHAT[Chat with Landlords]
        TD --> REVIEW[Write Reviews]
        TD --> PAY[Make Payments]
        TD --> MATCH[Smart Matching]
    end

    subgraph Landlord["Landlord Actions"]
        LDD --> ADD[Add Property]
        LDD --> MANAGE[Manage Listings]
        LDD --> RESPOND[Respond to Viewings]
        LDD --> LCHAT[Chat with Tenants]
        LDD --> SCHUFA[Screen Tenants]
        LDD --> ANALYTICS[View Analytics]
    end

    subgraph Admin["Admin Actions"]
        ADMIND[Admin Dashboard] --> USERS[Manage Users]
        ADMIND --> MODERATE[Moderate Reviews]
        ADMIND --> VERIFY[Verify Apartments]
        ADMIND --> STATS[View Statistics]
        ADMIND --> TICKETS[Handle Tickets]
        ADMIND --> CONTENT[Content Moderation]
    end
```

---

## 9. Apartment Listing Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : Landlord creates listing

    PENDING --> AVAILABLE : Admin verifies
    PENDING --> REJECTED : Admin rejects

    AVAILABLE --> RENTED : Tenant moves in
    AVAILABLE --> ARCHIVED : Landlord deactivates

    RENTED --> AVAILABLE : Tenant moves out
    ARCHIVED --> AVAILABLE : Landlord reactivates

    REJECTED --> PENDING : Landlord updates & resubmits

    note right of AVAILABLE
        Visible in search
        Can receive viewings
        Can be favorited
    end note

    note right of PENDING
        verification_status: PENDING
        Hidden from search
    end note
```

---

## 10. Chat / Messaging Architecture

```mermaid
sequenceDiagram
    actor Tenant
    participant Browser as Browser (chat.html)
    participant API as Spring Boot
    participant DB as Database

    Note over Tenant, DB: Start Conversation
    Tenant->>Browser: Click "Contact Landlord" on listing
    Browser->>API: POST /api/conversations<br/>{apartmentId, participantId}
    API->>DB: Check existing conversation
    alt Conversation exists
        DB-->>API: Return existing
    else New conversation
        API->>DB: INSERT conversation
        DB-->>API: New conversation
    end
    API-->>Browser: ConversationDto

    Note over Tenant, DB: Send Message
    Tenant->>Browser: Type and send message
    Browser->>API: POST /api/conversations/{id}/messages<br/>{content: "Hello, is the apt still available?"}
    API->>DB: INSERT message
    API->>DB: UPDATE conversation.last_message_at
    API->>DB: INSERT notification (type: new_message)
    API-->>Browser: MessageDto

    Note over Tenant, DB: View Messages
    Browser->>API: GET /api/conversations/{id}/messages?page=0
    API->>DB: SELECT messages WHERE conversation_id ORDER BY created_at
    API->>DB: UPDATE messages SET read_by_recipient = true
    DB-->>API: Page<Message>
    API-->>Browser: Page<MessageDto>
```

---

## 11. Advanced Search Filter Architecture

```mermaid
flowchart TD
    A[User enters search criteria] --> B[Build Query Parameters]

    B --> C{Filter Categories}

    C --> D[Location Filters]
    D --> D1[city]
    D --> D2[district / Stadtteil]
    D --> D3[postalCode]
    D --> D4[latitude/longitude + radius]

    C --> E[Price Filters]
    E --> E1[minPrice / maxPrice<br/>Kaltmiete range]
    E --> E2[maxWarmRent<br/>Warmmiete cap]
    E --> E3[maxDeposit]

    C --> F[Size Filters]
    F --> F1[minSize / maxSize m²]
    F --> F2[minRooms / maxRooms]
    F --> F3[bedrooms]
    F --> F4[bathrooms]

    C --> G[Amenity Filters]
    G --> G1[furnished]
    G --> G2[petFriendly]
    G --> G3[parking]
    G --> G4[balcony]
    G --> G5[elevator]
    G --> G6[garden]

    C --> H[Availability]
    H --> H1[availableFrom]
    H --> H2[availableUntil]
    H --> H3[minLease / maxLease]

    C --> I[Sorting]
    I --> I1[price ASC/DESC]
    I --> I2[createdAt DESC]
    I --> I3[size ASC/DESC]
    I --> I4[rating DESC]

    D1 & D2 & D3 & E1 & F1 & F2 & G1 & G2 & H1 & I1 --> J[JPA Specification Builder]
    J --> K[Paginated Query<br/>default: 12/page, max: 50]
    K --> L[Page of ApartmentDto]
```

---

## 12. Deployment Pipeline

```mermaid
flowchart LR
    subgraph Dev["Development"]
        CODE[Source Code] --> BUILD[Gradle Build]
        BUILD --> TEST[JUnit Tests]
        TEST --> JAR[bootJar]
    end

    subgraph CI["CI/CD"]
        JAR --> LINT[Code Quality]
        LINT --> SEC[Security Scan]
        SEC --> DOCKER[Docker Image]
    end

    subgraph Prod["Production"]
        DOCKER --> APP[Spring Boot App<br/>Port 8080]
        APP --> MSSQL[(MS SQL Server<br/>Port 1433)]
        APP --> PAYPAL[PayPal API]
        APP --> GMAIL[Gmail SMTP]
        STATIC[Static Frontend<br/>HTML/CSS/JS] --> APP
    end
```

---

## 13. Data Model — Full Entity Map

```mermaid
graph TD
    subgraph Core["Core Domain"]
        U[Users]
        A[Apartments]
        VR[Viewing Requests]
    end

    subgraph Communication["Communication"]
        C[Conversations]
        M[Messages]
        N[Notifications]
    end

    subgraph Financial["Financial"]
        PT[Payment Transactions]
        RR[Refund Requests]
    end

    subgraph Experience["User Experience"]
        F[User Favorites]
        R[Apartment Reviews]
        SS[Saved Searches]
        RV[Recently Viewed]
    end

    subgraph Admin["Admin & Support"]
        ST[Support Tickets]
        SR[Safety Reports]
        UF[User Feedback]
    end

    subgraph Compliance["GDPR & Compliance"]
        GL[GDPR Tracking Logs]
        CA[Consent Audit Log]
        EL[Email Logs]
    end

    subgraph Analytics["Analytics"]
        AA[Apartment Analytics]
        SH[Search History]
    end

    subgraph Screening["Tenant Screening"]
        SC[SCHUFA Checks]
    end

    U -->|owns| A
    U -->|requests| VR
    A -->|booked| VR
    U -->|participates| C
    C -->|contains| M
    U -->|pays| PT
    VR -->|paid via| PT
    PT -->|refund| RR
    U -->|favorites| F
    A -->|favorited| F
    U -->|reviews| R
    A -->|reviewed| R
    U -->|receives| N
    U -->|saves| SS
    U -->|views| RV
    U -->|submits| ST
    U -->|reports| SR
    U -->|feedback| UF
    U -->|tracked| GL
    U -->|consent| CA
    U -->|emailed| EL
    A -->|metrics| AA
    U -->|screened| SC
```

---

## 14. Frontend Page Navigation Map

```mermaid
flowchart TD
    HOME[index.html<br/>Landing Page] --> LOGIN[login.html]
    HOME --> REG[create-account.html]
    HOME --> APTS[apartments-listing.html]
    HOME --> ABOUT[about.html]
    HOME --> FAQ[faq.html]

    LOGIN --> TD[applicant-dashboard.html<br/>Tenant]
    LOGIN --> LD[landlord-dashboard.html<br/>Landlord]
    LOGIN --> AD[admin-dashboard.html<br/>Admin]

    REG --> TD
    REG --> LD

    APTS --> DETAIL[offer.html<br/>Apartment Detail]
    APTS --> SEARCH[advanced-search.html]

    DETAIL --> VR[viewing-request.html]
    DETAIL --> CHAT[chat.html]
    VR --> PAY[paypal-checkout.html]

    TD --> APTS
    TD --> VRD[viewing-requests-dashboard.html]
    TD --> CHAT
    TD --> MATCH[Smart Matching]
    TD --> SCHUFA[tenant-screening-schufa.html]

    LD --> ADD[add-property.html]
    LD --> VRD
    LD --> CHAT
    LD --> MARKET[marketplace.html]

    AD --> USERS[User Management]
    AD --> MODERATE[Content Moderation]
    AD --> STATS[Analytics]

    HOME --> PRIVACY[privacy-policy.html]
    HOME --> TERMS[terms-of-service.html]

    style HOME fill:#2563EB,color:#fff
    style TD fill:#10b981,color:#fff
    style LD fill:#f59e0b,color:#fff
    style AD fill:#ef4444,color:#fff
```

---

> **Render these diagrams** using VS Code's Mermaid Preview extension, GitHub's built-in Mermaid support, or any compatible viewer.
