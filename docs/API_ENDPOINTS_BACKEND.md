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
| 45 | GET | `/api/notifications` | Bearer | NotificationController | All notifications (paged) |
| 46 | GET | `/api/notifications/unread` | Bearer | NotificationController | Unread notifications |
| 47 | GET | `/api/notifications/unread/count` | Bearer | NotificationController | Unread count |
| 48 | PATCH | `/api/notifications/{id}/read` | Bearer | NotificationController | Mark one read |
| 49 | PATCH | `/api/notifications/read-all` | Bearer | NotificationController | Mark all read |
| 50 | GET | `/api/admin/dashboard` | ADMIN | AdminController | Dashboard stats |
| 51 | GET | `/api/admin/users` | ADMIN | AdminController | List all users |
| 52 | PATCH | `/api/admin/users/{id}/role` | ADMIN | AdminController | Change user role |
| 53 | PATCH | `/api/admin/users/{id}/status` | ADMIN | AdminController | Activate/suspend user |
| 54 | GET | `/api/admin/reviews/pending` | ADMIN | AdminController | Pending reviews |
| 55 | POST | `/api/admin/reviews/{id}/moderate` | ADMIN | AdminController | Moderate review |

**Total: 55 endpoints across 9 controllers.**

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

**State machine:**

```
PENDING ──confirm──→ CONFIRMED
PENDING ──decline──→ DECLINED
PENDING ──cancel───→ CANCELLED
CONFIRMED ──cancel─→ CANCELLED
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
