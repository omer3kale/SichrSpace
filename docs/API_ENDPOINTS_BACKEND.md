# SichrPlace — Backend API Endpoints (Spring Boot)

> **Last updated:** February 2026
> **Base URL (local):** `http://localhost:8080`
> **Base URL (beta):** `https://sichrplace.com` (Caddy reverse proxy → port 8080)
> **Auth:** Bearer JWT — obtain via `POST /api/auth/login`

---

## Quick Reference

| # | Method | URL | Auth | Controller | Description |
|---|--------|-----|------|------------|-------------|
| 1 | POST | `/api/auth/register` | — | UserController | Register new user |
| 2 | POST | `/api/auth/login` | — | UserController | Login, receive JWT |
| 3 | GET | `/api/auth/profile` | Bearer | UserController | Get own profile |
| 4 | PUT | `/api/auth/profile` | Bearer | UserController | Update own profile |
| 5 | GET | `/api/auth/users/{id}` | — | UserController | Public user info |
| 6 | POST | `/api/apartments` | LANDLORD/ADMIN | ApartmentController | Create apartment |
| 7 | GET | `/api/apartments` | — | ApartmentController | List/search apartments |
| 8 | GET | `/api/apartments/{id}` | — | ApartmentController | Apartment details |
| 9 | GET | `/api/apartments/owner/listings` | LANDLORD/ADMIN | ApartmentController | My listings |
| 10 | PUT | `/api/apartments/{id}` | LANDLORD/ADMIN | ApartmentController | Update apartment |
| 11 | DELETE | `/api/apartments/{id}` | LANDLORD/ADMIN | ApartmentController | Delete apartment |
| 12 | GET | `/api/listings` | — | ListingController | All listings |
| 13 | GET | `/api/listings/{id}` | — | ListingController | Listing by ID |
| 14 | POST | `/api/conversations` | Bearer | ConversationController | Create/get conversation |
| 15 | GET | `/api/conversations` | Bearer | ConversationController | My conversations (paged) |
| 16 | GET | `/api/conversations/{id}` | Bearer | ConversationController | Conversation details |
| 17 | GET | `/api/conversations/{id}/messages` | Bearer | ConversationController | Messages in conv (paged) |
| 18 | POST | `/api/conversations/{id}/messages` | Bearer | ConversationController | Send message |
| 19 | PATCH | `/api/conversations/messages/{id}` | Bearer | ConversationController | Edit message (24h) |
| 20 | DELETE | `/api/conversations/messages/{id}` | Bearer | ConversationController | Soft-delete message |
| 21 | PATCH | `/api/conversations/{id}/read` | Bearer | ConversationController | Mark conv read |
| 22 | GET | `/api/conversations/unread/count` | Bearer | ConversationController | Unread msg count |
| 23 | POST | `/api/favorites/{apartmentId}` | Bearer | FavoriteController | Favorite apartment |
| 24 | DELETE | `/api/favorites/{apartmentId}` | Bearer | FavoriteController | Unfavorite apartment |
| 25 | GET | `/api/favorites` | Bearer | FavoriteController | My favorites (paged) |
| 26 | GET | `/api/favorites/{apartmentId}/check` | Bearer | FavoriteController | Is favorited? |
| 27 | GET | `/api/favorites/count` | Bearer | FavoriteController | Favorites count |
| 28 | GET | `/api/reviews/apartment/{id}` | — | ReviewController | Apartment reviews (public) |
| 29 | GET | `/api/reviews/apartment/{id}/stats` | — | ReviewController | Review statistics |
| 30 | POST | `/api/reviews/apartment/{id}` | Bearer | ReviewController | Submit review |
| 31 | PUT/PATCH | `/api/reviews/{reviewId}` | Bearer | ReviewController | Update my review |
| 32 | DELETE | `/api/reviews/{reviewId}` | Bearer | ReviewController | Delete my review |
| 33 | GET | `/api/reviews/my` | Bearer | ReviewController | My reviews |
| 34 | GET | `/api/reviews/pending` | ADMIN | ReviewController | Pending reviews |
| 35 | POST | `/api/reviews/{reviewId}/moderate` | ADMIN | ReviewController | Approve/reject review |
| 36 | POST | `/api/viewing-requests` | TENANT | ViewingRequestController | Request viewing |
| 37 | GET | `/api/viewing-requests/{id}` | Bearer | ViewingRequestController | Viewing details |
| 38 | GET | `/api/viewing-requests/my` | Bearer | ViewingRequestController | My viewings (list) |
| 39 | GET | `/api/viewing-requests/my/paged` | TENANT | ViewingRequestController | My viewings (paged) |
| 40 | GET | `/api/viewing-requests/apartment/{id}` | LANDLORD/ADMIN | ViewingRequestController | Viewings per apartment |
| 41 | GET | `/api/viewing-requests/apartment/{id}/paged` | LANDLORD/ADMIN | ViewingRequestController | Viewings per apt (paged) |
| 42 | PUT | `/api/viewing-requests/{id}/confirm` | LANDLORD/ADMIN | ViewingRequestController | Confirm viewing |
| 43 | PUT | `/api/viewing-requests/{id}/decline` | LANDLORD/ADMIN | ViewingRequestController | Decline viewing |
| 44 | PUT | `/api/viewing-requests/{id}/cancel` | TENANT | ViewingRequestController | Cancel viewing |
| 45 | GET | `/api/viewing-requests/{id}/history` | Bearer | ViewingRequestController | Transition history |
| 46 | GET | `/api/notifications` | Bearer | NotificationController | All notifications (paged) |
| 47 | GET | `/api/notifications/unread` | Bearer | NotificationController | Unread notifications |
| 48 | GET | `/api/notifications/unread/count` | Bearer | NotificationController | Unread count |
| 49 | PATCH | `/api/notifications/{id}/read` | Bearer | NotificationController | Mark one read |
| 50 | PATCH | `/api/notifications/read-all` | Bearer | NotificationController | Mark all read |
| 51 | POST | `/api/saved-searches` | Bearer | SavedSearchController | Create saved search |
| 52 | GET | `/api/saved-searches` | Bearer | SavedSearchController | My saved searches |
| 53 | GET | `/api/saved-searches/{id}` | Bearer | SavedSearchController | Saved search by ID |
| 54 | PUT | `/api/saved-searches/{id}/toggle` | Bearer | SavedSearchController | Toggle active/inactive |
| 55 | DELETE | `/api/saved-searches/{id}` | Bearer | SavedSearchController | Delete saved search |
| 56 | GET | `/api/admin/dashboard` | ADMIN | AdminController | Dashboard stats |
| 57 | GET | `/api/admin/users` | ADMIN | AdminController | List all users |
| 58 | PATCH | `/api/admin/users/{id}/role` | ADMIN | AdminController | Change user role |
| 59 | PATCH | `/api/admin/users/{id}/status` | ADMIN | AdminController | Activate/suspend user |
| 60 | GET | `/api/admin/reviews/pending` | ADMIN | AdminController | Pending reviews |
| 61 | POST | `/api/admin/reviews/{id}/moderate` | ADMIN | AdminController | Moderate review |
| 62 | POST | `/api/saved-searches/{id}/execute` | Bearer | SavedSearchController | Execute saved search |
| 63 | POST | `/api/auth/forgot-password` | — | UserController | Request password reset |
| 64 | POST | `/api/auth/reset-password` | — | UserController | Reset password with token |
| 65 | PUT | `/api/viewing-requests/{id}/complete` | Bearer | ViewingRequestController | Mark viewing completed |
| 66 | GET | `/api/viewing-requests/statistics` | Bearer | ViewingRequestController | Viewing request statistics |
| 67 | POST | `/api/auth/verify-email` | — | UserController | Verify email with token |
| 68 | POST | `/api/auth/resend-verification` | — | UserController | Resend verification email |
| 69 | DELETE | `/api/notifications/{id}` | Bearer | NotificationController | Delete notification |
| 70 | GET | `/api/health` | — | HealthController | Application health check |

**Total: 70 endpoints across 12 controllers.**

---

## Workplace Use Cases (mapped to seed data)

### Use Case 1 — Student searches for an apartment and favorites it

> **📊 Diagram:** [`diagrams/erd_sichrplace.png`](diagrams/erd_sichrplace.png) — follow the `apartments → users` and `user_favorites` relationships.

> **Roles involved:** TENANT (Charlie, Diana, Erik)
> **Seed data used:** Apartments #1–#4, Users #4–#6

**Flow:**

```
1. Login as student         → POST /api/auth/login
2. Browse apartments        → GET  /api/apartments
3. Filter by city/price     → GET  /api/apartments?city=Aachen&maxPrice=500
4. View apartment details   → GET  /api/apartments/1
5. Favorite it              → POST /api/favorites/1
6. Check favorites list     → GET  /api/favorites
7. Check if favorited       → GET  /api/favorites/1/check
```

**Example — Login as Charlie:**

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}'
```

Response:
```json
{
  "id": 4,
  "email": "charlie.student@rwth-aachen.de",
  "firstName": "Charlie",
  "lastName": "Weber",
  "role": "TENANT",
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "expiresIn": 86400000
}
```

**Example — List apartments filtered by price:**

```bash
TOKEN="<accessToken from login>"
curl http://localhost:8080/api/apartments?city=Aachen&maxPrice=500 \
  -H "Authorization: Bearer $TOKEN"
```

**Example — Favorite an apartment:**

```bash
curl -X POST http://localhost:8080/api/favorites/3 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Use Case 2 — Tutor–student messaging (Conversation)

> **📊 Diagram:** [`diagrams/sequence_send_message.png`](diagrams/sequence_send_message.png) — see how a message flows from Controller → Service → Repository → MSSQL.

> **Roles involved:** TENANT (Charlie) ↔ LANDLORD (Alice)
> **Seed data used:** Conversation #1 (Charlie ↔ Alice, Apartment #1 Ponttor), 5 messages

**Flow:**

```
1. Login as Charlie (TENANT)      → POST /api/auth/login
2. List my conversations          → GET  /api/conversations
3. Open conversation #1           → GET  /api/conversations/1
4. Read messages in conversation  → GET  /api/conversations/1/messages
5. Send a new message             → POST /api/conversations/1/messages
6. Check unread count             → GET  /api/conversations/unread/count
7. Mark conversation as read      → PATCH /api/conversations/1/read
```

**Example — List conversations:**

```bash
curl http://localhost:8080/api/conversations \
  -H "Authorization: Bearer $TOKEN"
```

**Example — Send a message:**

```bash
curl -X POST http://localhost:8080/api/conversations/1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Brauche ich einen Schufa-Auszug?","messageType":"TEXT"}'
```

**Example — Edit a message (within 24h):**

```bash
curl -X PATCH http://localhost:8080/api/conversations/messages/13 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Brauche ich einen Schufa-Auszug oder genügt eine Mietschuldenfreiheitsbescheinigung?"}'
```

---

### Use Case 3 — Viewing request lifecycle

> **📊 Diagram:** [`diagrams/state_message_lifecycle.png`](diagrams/state_message_lifecycle.png) — state chart Section 2 shows PENDING → CONFIRMED / DECLINED / CANCELLED transitions.

> **Roles involved:** TENANT (Diana) requests → LANDLORD (Bob) confirms/declines
> **Seed data used:** Viewing Request #2 (Diana → WG-Zimmer, PENDING)

**Flow (tenant side):**

```
1. Login as Diana (TENANT)         → POST /api/auth/login
2. Request a viewing               → POST /api/viewing-requests
3. Check my requests               → GET  /api/viewing-requests/my
4. Cancel if needed                → PUT  /api/viewing-requests/2/cancel
```

**Flow (landlord side):**

```
1. Login as Bob (LANDLORD)         → POST /api/auth/login
2. See requests for WG-Zimmer      → GET  /api/viewing-requests/apartment/3
3. Confirm viewing #2              → PUT  /api/viewing-requests/2/confirm
   OR decline with reason          → PUT  /api/viewing-requests/2/decline
```

**Example — Create a viewing request (as Diana):**

```bash
curl -X POST http://localhost:8080/api/viewing-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_DIANA" \
  -d '{
    "apartmentId": 3,
    "proposedDateTime": "2026-03-05T15:00:00",
    "message": "Ich möchte die WG gerne besichtigen."
  }'
```

**Example — Confirm viewing (as Bob):**

```bash
curl -X PUT http://localhost:8080/api/viewing-requests/2/confirm \
  -H "Authorization: Bearer $TOKEN_BOB"
```

**Example — Decline viewing with reason:**

```bash
curl -X PUT http://localhost:8080/api/viewing-requests/2/decline \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BOB" \
  -d '{"reason":"Das Zimmer ist leider schon vergeben."}'
```

**Example — Complete a viewing (as tenant or landlord, after CONFIRMED):**

```bash
curl -X PUT http://localhost:8080/api/viewing-requests/2/complete \
  -H "Authorization: Bearer $TOKEN_DIANA"
```

**Example — Get viewing request statistics:**

```bash
curl http://localhost:8080/api/viewing-requests/statistics \
  -H "Authorization: Bearer $TOKEN_DIANA"
```

Response:
```json
{
  "totalRequests": 5,
  "pendingCount": 1,
  "confirmedCount": 2,
  "declinedCount": 1,
  "completedCount": 1,
  "cancelledCount": 0,
  "averageResponseTimeHours": 4.2
}
```

**State machine (extended):**

```
PENDING ──confirm──→ CONFIRMED
PENDING ──decline──→ DECLINED
PENDING ──cancel───→ CANCELLED
CONFIRMED ──cancel──→ CANCELLED
CONFIRMED ──complete→ COMPLETED
```

---

### Use Case 4 — Apartment reviews and moderation

> **📊 Diagram:** [`diagrams/state_message_lifecycle.png`](diagrams/state_message_lifecycle.png) — state chart Section 3 shows PENDING → APPROVED / REJECTED review lifecycle.

> **Roles involved:** TENANT (Charlie, Diana) write reviews → ADMIN approves
> **Seed data used:** Reviews #1–#3 (2 approved, 1 pending), Admin user #1

**Flow (reviewer):**

```
1. Login as Charlie (TENANT)       → POST /api/auth/login
2. Submit review for apartment #1  → POST /api/reviews/apartment/1
3. View my reviews                 → GET  /api/reviews/my
4. Update my review (resets to PENDING) → PUT /api/reviews/3
5. Delete my review                → DELETE /api/reviews/3
```

**Flow (admin moderation):**

```
1. Login as Admin                  → POST /api/auth/login
2. View pending reviews            → GET  /api/reviews/pending
3. Approve or reject               → POST /api/reviews/3/moderate
```

**Example — Submit a review:**

```bash
curl -X POST http://localhost:8080/api/reviews/apartment/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CHARLIE" \
  -d '{
    "rating": 4,
    "title": "Nettes Studio mit schönem Blick",
    "comment": "Klein aber fein. Perfekt für eine Person.",
    "pros": "Möbliert, Aussicht",
    "cons": "Kein Balkon",
    "wouldRecommend": true,
    "landlordRating": 5,
    "locationRating": 4,
    "valueRating": 4
  }'
```

**Example — Moderate a review (admin):**

```bash
curl -X POST http://localhost:8080/api/reviews/3/moderate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d '{"action":"APPROVED","notes":"Genuine review, approved."}'
```

**Review statuses:**

```
PENDING  ──approve──→ APPROVED
PENDING  ──reject───→ REJECTED
APPROVED ──edit─────→ PENDING  (resets on update)
```

---

### Use Case 5 — Admin dashboard and user management

> **📊 Diagram:** [`diagrams/arch_request_flow.png`](diagrams/arch_request_flow.png) — notice how `AdminController` sits alongside other controllers with ADMIN-only `@PreAuthorize`.

> **Roles involved:** ADMIN (user #1)
> **Seed data used:** All 6 users

**Flow:**

```
1. Login as Admin                  → POST /api/auth/login
2. View dashboard stats            → GET  /api/admin/dashboard
3. List all users                  → GET  /api/admin/users
4. Change user role                → PATCH /api/admin/users/6/role
5. Suspend a user                  → PATCH /api/admin/users/6/status
6. View pending reviews            → GET  /api/admin/reviews/pending
7. Moderate a review               → POST /api/admin/reviews/3/moderate
```

**Example — Change Erik's role to LANDLORD:**

```bash
curl -X PATCH http://localhost:8080/api/admin/users/6/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d '{"role":"LANDLORD"}'
```

**Example — Suspend Erik:**

```bash
curl -X PATCH http://localhost:8080/api/admin/users/6/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -d '{"active":false}'
```

---

### Use Case 6 — Execute a saved search (v1.2.0 showcase)

> **Feature type:** Core product value — demonstrates JPA Specifications, dynamic query composition, and the `saved_searches` table.

> **Roles involved:** Any authenticated user (TENANT, LANDLORD, ADMIN)
> **Tables involved:** `saved_searches`, `apartments`

**Flow:**

```
1. Login as Charlie (TENANT)       → POST /api/auth/login
2. Create a saved search           → POST /api/saved-searches
3. Execute the saved search        → POST /api/saved-searches/1/execute
4. Results: matching apartments    → Page<ApartmentDto>
```

**Example — Create a saved search:**

```bash
curl -X POST http://localhost:8080/api/saved-searches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Aachen 2BR under 600",
    "filterJson": "{\"city\":\"Aachen\",\"minBedrooms\":2,\"maxPrice\":600}"
  }'
```

**Example — Execute the saved search:**

```bash
curl -X POST http://localhost:8080/api/saved-searches/1/execute?page=0&size=20 \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "content": [
    {
      "id": 1,
      "title": "Gemütliche 2-Zimmer-Wohnung am Ponttor",
      "city": "Aachen",
      "monthlyRent": 450.00,
      "numberOfBedrooms": 2,
      "status": "AVAILABLE"
    }
  ],
  "totalElements": 1,
  "totalPages": 1
}
```

> **Technical note:** The `filterJson` is deserialized into a `SearchFilterDto` and converted to a JPA `Specification<Apartment>` at runtime — no hardcoded SQL, fully composable filters.

---

### Use Case 7 — Password reset (v1.2.0 showcase)

> **Feature type:** Infrastructure / professionalism — demonstrates secure token generation, SHA-256 hashing, time-limited tokens.

> **Roles involved:** Public (no auth required)
> **Tables involved:** `password_reset_tokens`, `users`

**Flow:**

```
1. Request password reset          → POST /api/auth/forgot-password
2. Receive token (via email/API)   → response contains "token" (dev mode)
3. Reset password with token       → POST /api/auth/reset-password
4. Login with new password         → POST /api/auth/login
```

**Example — Request password reset:**

```bash
curl -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de"}'
```

Response:
```json
{
  "message": "If the email exists, a reset link has been sent.",
  "token": "dGhpcyBpcyBhIHRva2VuIGV4YW1wbGU..."
}
```

**Example — Reset password with token:**

```bash
curl -X POST http://localhost:8080/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "dGhpcyBpcyBhIHRva2VuIGV4YW1wbGU...",
    "newPassword": "myNewSecureP@ss"
  }'
```

Response:
```json
{
  "message": "Password reset successful"
}
```

> **Security design:** Tokens are stored as SHA-256 hashes (not plaintext), expire after 1 hour, and are single-use. The `forgotPassword` endpoint always returns success to prevent email enumeration.

---

### Use Case 8 — Email verification (v1.3.0)

> **Feature type:** Security / onboarding — proves the user owns their email address via a SHA-256 hashed, time-limited verification token.

> **Roles involved:** Public (no auth required)
> **Tables involved:** `email_verification_tokens`, `users`

**Flow:**

```
1. Register new user               → POST /api/auth/register
   (automatically issues a verification token and "sends" email via EmailServiceStub)
2. Verify email with token          → POST /api/auth/verify-email?token=<raw-token>
3. Resend verification (optional)   → POST /api/auth/resend-verification?email=<email>
```

**Example — Verify email:**

```bash
curl -X POST "http://localhost:8080/api/auth/verify-email?token=abc123..."
```

Response:
```json
{
  "message": "Email verified successfully"
}
```

**Example — Resend verification:**

```bash
curl -X POST "http://localhost:8080/api/auth/resend-verification?email=charlie.student@rwth-aachen.de"
```

Response:
```json
{
  "message": "If the email exists and is not yet verified, a new verification link has been sent."
}
```

> **Security design:** Tokens are stored as SHA-256 hashes, expire after 24 hours, and are single-use. The resend endpoint always returns the same success message to prevent email enumeration. `EmailServiceStub` logs the token to the console (swap for SMTP in production).

---

### Use Case 9 — Delete notification (v1.3.0)

> **Feature type:** Phase 1 gap closure — allows users to permanently remove a notification.

> **Roles involved:** Authenticated user (owner of the notification)
> **Tables involved:** `notifications`

**Flow:**

```
1. Get all notifications           → GET   /api/notifications
2. Delete a specific notification  → DELETE /api/notifications/{id}
```

**Example:**

```bash
curl -X DELETE http://localhost:8080/api/notifications/3 \
  -H "Authorization: Bearer <jwt>"
```

Response: `204 No Content`

> **Ownership enforcement:** Only the notification's owner (`userId`) can delete it. Attempting to delete another user's notification returns `403 Forbidden`.

---

### Use Case 10 — Health check (v1.3.0)

> **Feature type:** Operational readiness — provides a liveness probe for load balancers, monitoring, and deployment pipelines.

> **Roles involved:** Public (no auth required)
> **Tables involved:** None (application-level metadata only)

**Example:**

```bash
curl http://localhost:8080/api/health
```

Response:
```json
{
  "status": "UP",
  "application": "SichrPlace Backend",
  "timestamp": "2026-02-21T14:30:00Z",
  "uptime": "PT2H15M30S"
}
```

> **Integration note:** Use this endpoint for Docker `HEALTHCHECK`, Kubernetes liveness probes, or Caddy load-balancer health checks.

---

## Notifications (cross-cutting)

Notifications are created as side-effects by other actions (viewing confirmations, new messages, etc.). The seed contains 5 notifications across Charlie, Alice, Diana, and Admin.

**Flow:**

```
1. Get all notifications           → GET   /api/notifications
2. Get unread only                 → GET   /api/notifications/unread
3. Get unread count (for badge)    → GET   /api/notifications/unread/count
4. Mark one as read                → PATCH /api/notifications/1/read
5. Mark all as read                → PATCH /api/notifications/read-all
```

---

## Filter & Pagination Summary

All paginated endpoints use Spring Data's `Pageable`:

```
?page=0&size=20&sort=createdAt,desc
```

Apartment search filters:

| Param | Type | Example |
|-------|------|---------|
| `city` | String | `Aachen` |
| `minPrice` | BigDecimal | `300` |
| `maxPrice` | BigDecimal | `600` |
| `minBedrooms` | Integer | `1` |
| `minSize` | Double | `25.0` |
| `furnished` | Boolean | `true` |
| `petFriendly` | Boolean | `true` |

---

## Seed User Credentials (for testing)

| Email | Role | Password |
|-------|------|----------|
| `admin@sichrplace.com` | ADMIN | `password123` |
| `alice.tutor@rwth-aachen.de` | LANDLORD | `password123` |
| `bob.landlord@gmail.com` | LANDLORD | `password123` |
| `charlie.student@rwth-aachen.de` | TENANT | `password123` |
| `diana.student@rwth-aachen.de` | TENANT | `password123` |
| `erik.student@rwth-aachen.de` | TENANT | `password123` |

---

## MSSQL Compatibility Notes

- All queries use JPQL / Spring Data JPA — no raw PostgreSQL syntax.
- Hibernate auto-detects `SQLServerDialect` from the JDBC URL.
- `ddl-auto=update` creates tables automatically (dev profiles only).
- `TEXT` columns map to `VARCHAR(MAX)` in MSSQL.
- `BigDecimal(10,2)` maps to `DECIMAL(10,2)`.
- `@Enumerated(EnumType.STRING)` stores enums as `VARCHAR`.
