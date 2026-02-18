# SichrPlace — Sequence Diagrams

> Request-response sequences for the core user workflows.
> Each diagram maps directly to controller endpoints and service methods.

---

## 1. User Registration & Login

```mermaid
sequenceDiagram
    actor U as User / Frontend
    participant C as UserController
    participant S as UserServiceImpl
    participant R as UserRepository
    participant JWT as JwtTokenProvider
    participant DB as Database

    Note over U,DB: POST /api/auth/register
    U->>C: RegisterRequest(firstName, lastName, email, password, role)
    C->>S: register(registerRequest)
    S->>R: existsByEmail(email)
    R->>DB: SELECT COUNT(*) FROM users WHERE email = ?
    DB-->>R: 0
    R-->>S: false
    S->>S: passwordEncoder.encode(password)
    S->>R: save(User entity)
    R->>DB: INSERT INTO users(...)
    DB-->>R: User (id=1)
    R-->>S: saved User
    S->>JWT: generateToken(user)
    JWT-->>S: "eyJhbGciOiJIUzI1NiI..."
    S-->>C: AuthResponse(token, userId, email, role)
    C-->>U: 200 OK { token, userId, email, role }

    Note over U,DB: POST /api/auth/login
    U->>C: LoginRequest(email, password)
    C->>S: login(loginRequest)
    S->>R: findByEmail(email)
    R->>DB: SELECT * FROM users WHERE email = ?
    DB-->>R: User entity
    R-->>S: Optional<User>
    S->>S: passwordEncoder.matches(raw, encoded)
    alt Password mismatch
        S-->>C: throw BadCredentialsException
        C-->>U: 401 Unauthorized
    else Password matches
        S->>JWT: generateToken(user)
        JWT-->>S: "eyJhbGciOiJIUzI1NiI..."
        S-->>C: AuthResponse(token, userId, email, role)
        C-->>U: 200 OK { token, userId, email, role }
    end
```

---

## 2. Create Apartment (Landlord)

```mermaid
sequenceDiagram
    actor L as Landlord
    participant F as JwtAuthenticationFilter
    participant C as ApartmentController
    participant S as ApartmentServiceImpl
    participant UR as UserRepository
    participant AR as ApartmentRepository
    participant DB as Database

    L->>F: POST /api/apartments<br/>Authorization: Bearer <token>
    F->>F: validateToken(token) → userId, role
    F->>F: Set SecurityContext (ROLE_LANDLORD)
    F->>C: Forward request

    Note right of C: @PreAuthorize("hasAnyRole('LANDLORD','ADMIN')")

    C->>S: createApartment(apartmentRequest, userId)
    S->>UR: findById(userId)
    UR->>DB: SELECT * FROM users WHERE id = ?
    DB-->>UR: User (role=LANDLORD)
    UR-->>S: User entity

    S->>S: Map DTO → Apartment entity
    S->>S: Set status = PENDING
    S->>S: Set owner = User
    S->>AR: save(apartment)
    AR->>DB: INSERT INTO apartments(...)
    DB-->>AR: Apartment (id=42)
    AR-->>S: saved Apartment

    S->>S: Map entity → ApartmentResponse DTO
    S-->>C: ApartmentResponse
    C-->>L: 201 Created { id, title, status=PENDING, ... }
```

---

## 3. Send Message in Conversation

```mermaid
sequenceDiagram
    actor U as Sender
    participant F as JwtAuthenticationFilter
    participant C as ConversationController
    participant S as ConversationServiceImpl
    participant CR as ConversationRepository
    participant MR as MessageRepository
    participant NR as NotificationRepository
    participant DB as Database

    U->>F: POST /api/conversations/{convId}/messages<br/>Authorization: Bearer <token>
    F->>F: validateToken → userId
    F->>C: Forward

    C->>S: sendMessage(convId, messageRequest, senderId)
    S->>CR: findById(convId)
    CR->>DB: SELECT * FROM conversations WHERE id = ?
    DB-->>CR: Conversation (tenant, landlord, apartment)
    CR-->>S: Conversation entity

    S->>S: Verify sender is participant
    alt Not a participant
        S-->>C: throw AccessDeniedException
        C-->>U: 403 Forbidden
    end

    S->>S: Create Message entity (type=TEXT, content=...)
    S->>MR: save(message)
    MR->>DB: INSERT INTO messages(...)
    DB-->>MR: Message (id=99)
    MR-->>S: saved Message

    Note over S,NR: Notify the other participant
    S->>S: Determine recipientId
    S->>NR: save(Notification(type=NEW_MESSAGE, userId=recipientId))
    NR->>DB: INSERT INTO notifications(...)
    DB-->>NR: Notification

    S-->>C: MessageResponse
    C-->>U: 201 Created { id, content, senderName, sentAt }
```

---

## 4. Submit & Moderate Review

```mermaid
sequenceDiagram
    actor T as Tenant
    actor A as Admin
    participant C as ReviewController
    participant S as ReviewServiceImpl
    participant AR as ApartmentRepository
    participant RR as ApartmentReviewRepository
    participant NS as NotificationService
    participant DB as Database

    Note over T,DB: Step 1: Tenant submits review
    T->>C: POST /api/reviews<br/>{apartmentId, rating, comment}
    C->>S: createReview(reviewRequest, tenantId)
    S->>AR: findById(apartmentId)
    AR->>DB: SELECT * FROM apartments WHERE id = ?
    DB-->>AR: Apartment
    AR-->>S: Apartment entity

    S->>S: Create ApartmentReview<br/>status = PENDING
    S->>RR: save(review)
    RR->>DB: INSERT INTO apartment_reviews(...)
    DB-->>RR: Review (id=7, status=PENDING)

    S->>NS: createNotification(admin, NEW_REVIEW)
    S-->>C: ReviewResponse (status=PENDING)
    C-->>T: 201 Created

    Note over A,DB: Step 2: Admin moderates review
    A->>C: PATCH /api/reviews/7/approve
    C->>S: approveReview(reviewId=7, adminId)
    S->>RR: findById(7)
    RR->>DB: SELECT * FROM apartment_reviews WHERE id = 7
    DB-->>RR: Review (status=PENDING)
    RR-->>S: Review entity

    S->>S: Set status = APPROVED
    S->>RR: save(review)
    RR->>DB: UPDATE apartment_reviews SET status='APPROVED' WHERE id=7
    DB-->>RR: OK

    S->>NS: createNotification(tenantId, REVIEW_APPROVED)
    S-->>C: ReviewResponse (status=APPROVED)
    C-->>A: 200 OK
```

---

## 5. Request Apartment Viewing

```mermaid
sequenceDiagram
    actor T as Tenant
    actor L as Landlord
    participant C as ViewingRequestController
    participant S as ViewingRequestServiceImpl
    participant VR as ViewingRequestRepository
    participant AR as ApartmentRepository
    participant UR as UserRepository
    participant NS as NotificationService
    participant DB as Database

    Note over T,DB: Step 1: Tenant requests viewing
    T->>C: POST /api/viewing-requests<br/>{apartmentId, preferredDate, message}
    C->>S: createViewingRequest(request, tenantId)
    S->>AR: findById(apartmentId)
    AR->>DB: SELECT * FROM apartments ...
    DB-->>AR: Apartment (ownerId = landlordId)

    S->>UR: findById(tenantId)
    UR->>DB: SELECT * FROM users ...
    DB-->>UR: User (TENANT)

    S->>S: Create ViewingRequest<br/>status = PENDING
    S->>VR: save(viewingRequest)
    VR->>DB: INSERT INTO viewing_requests(...)
    DB-->>VR: ViewingRequest (id=5, status=PENDING)

    S->>NS: notify(landlordId, VIEWING_REQUESTED)
    S-->>C: ViewingRequestResponse
    C-->>T: 201 Created

    Note over L,DB: Step 2: Landlord confirms
    L->>C: PATCH /api/viewing-requests/5/confirm
    C->>S: confirmViewingRequest(5, landlordId)
    S->>VR: findById(5)
    VR->>DB: SELECT * FROM viewing_requests WHERE id = 5
    DB-->>VR: ViewingRequest (PENDING)
    VR-->>S: ViewingRequest entity

    S->>S: Verify landlord owns the apartment
    S->>S: Set status = CONFIRMED
    S->>VR: save(viewingRequest)
    VR->>DB: UPDATE viewing_requests SET status='CONFIRMED' ...

    S->>NS: notify(tenantId, VIEWING_CONFIRMED)
    S-->>C: ViewingRequestResponse (CONFIRMED)
    C-->>L: 200 OK
```

---

## 6. Toggle Favorite Apartment

```mermaid
sequenceDiagram
    actor U as User
    participant C as FavoriteController
    participant S as FavoriteServiceImpl
    participant FR as UserFavoriteRepository
    participant AR as ApartmentRepository
    participant DB as Database

    U->>C: POST /api/favorites/toggle<br/>{apartmentId: 42}
    C->>S: toggleFavorite(userId, apartmentId)

    S->>FR: findByUserIdAndApartmentId(userId, 42)
    FR->>DB: SELECT * FROM user_favorites<br/>WHERE user_id=? AND apartment_id=42
    DB-->>FR: result

    alt Already favorited
        FR-->>S: UserFavorite exists
        S->>FR: delete(favorite)
        FR->>DB: DELETE FROM user_favorites WHERE id=?
        S-->>C: { favorited: false }
        C-->>U: 200 OK { favorited: false }
    else Not yet favorited
        FR-->>S: empty
        S->>AR: findById(42)
        AR->>DB: SELECT * FROM apartments WHERE id=42
        DB-->>AR: Apartment entity
        S->>S: Create UserFavorite(user, apartment)
        S->>FR: save(favorite)
        FR->>DB: INSERT INTO user_favorites(...)
        S-->>C: { favorited: true }
        C-->>U: 200 OK { favorited: true }
    end
```

---

## 7. Admin Dashboard Flow

```mermaid
sequenceDiagram
    actor A as Admin
    participant F as JwtAuthenticationFilter
    participant C as AdminController
    participant S as AdminServiceImpl
    participant UR as UserRepository
    participant AR as ApartmentRepository
    participant RR as ApartmentReviewRepository
    participant DB as Database

    A->>F: GET /api/admin/dashboard<br/>Authorization: Bearer <admin-token>
    F->>F: validateToken → role=ADMIN
    F->>C: Forward

    Note right of C: @PreAuthorize("hasRole('ADMIN')")

    par Fetch counts in parallel
        C->>S: getDashboard()
        S->>UR: count()
        UR->>DB: SELECT COUNT(*) FROM users
        DB-->>UR: 128

        S->>AR: count()
        AR->>DB: SELECT COUNT(*) FROM apartments
        DB-->>AR: 45

        S->>RR: countByStatus(PENDING)
        RR->>DB: SELECT COUNT(*) FROM reviews WHERE status='PENDING'
        DB-->>RR: 3
    end

    S-->>C: DashboardResponse(users=128, apartments=45, pendingReviews=3)
    C-->>A: 200 OK { users: 128, apartments: 45, pendingReviews: 3 }
```

---

## Reading Guide for Students

| Diagram | Key Concepts Shown |
|---------|-------------------|
| **1. Register/Login** | DTO validation, password hashing, JWT generation, conditional flows |
| **2. Create Apartment** | Role-based @PreAuthorize, entity mapping, PENDING default state |
| **3. Send Message** | Participant verification, cross-entity notification side-effect |
| **4. Submit Review** | Two-phase workflow (submit → moderate), state transitions |
| **5. Viewing Request** | Multi-step lifecycle, ownership verification, notification pipeline |
| **6. Toggle Favorite** | Idempotent toggle pattern, existence check → create/delete |
| **7. Admin Dashboard** | Parallel aggregation queries, role gating |

> **Study tip:** Trace each sequence diagram back to the actual Java source code.
> Start with the controller method, follow the service call, and check
> which repository methods are invoked. The file paths are documented in
> [TUTORIUM_ROADMAP.md](../../TUTORIUM_ROADMAP.md).
