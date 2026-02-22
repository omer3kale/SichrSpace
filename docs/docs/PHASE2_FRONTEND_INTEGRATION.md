# Phase 2 — Frontend Integration Notes

> Generated alongside the Phase 2 Java backend implementation.
> All endpoints are JWT-protected unless marked **(public)**.

---

## 1. Favorites (`/api/favorites`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/favorites/{apartmentId}` | Bearer | Add to favorites |
| `DELETE` | `/api/favorites/{apartmentId}` | Bearer | Remove from favorites |
| `GET` | `/api/favorites?page=0&size=20` | Bearer | My favorites (paginated) |
| `GET` | `/api/favorites/{apartmentId}/check` | Bearer | Returns `{ "favorited": true/false }` |
| `GET` | `/api/favorites/count` | Bearer | Returns `{ "count": N }` |

**Frontend call pattern (existing Node.js → Java):**
- The old Netlify `/api/favorites` used query-param `apartmentId`. The new API uses path params.
- Toggle button: call `POST` to add, `DELETE` to remove. Use `GET .../check` to set initial state.
- `409 Conflict` is returned if the apartment is already favorited (use for idempotent UI).

---

## 2. Reviews (`/api/reviews`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/reviews/apartment/{id}` | **(public)** | Approved reviews for apartment |
| `GET` | `/api/reviews/apartment/{id}/stats` | **(public)** | Rating stats + star breakdown |
| `POST` | `/api/reviews/apartment/{id}` | Bearer | Submit review (pending moderation) |
| `PUT` | `/api/reviews/{id}` | Bearer | Edit review (resets to pending) |
| `DELETE` | `/api/reviews/{id}` | Bearer | Delete own review |
| `GET` | `/api/reviews/my` | Bearer | My reviews |
| `GET` | `/api/reviews/pending` | ADMIN | Pending moderation queue |
| `POST` | `/api/reviews/{id}/moderate` | ADMIN | Approve / reject |

**Request body for POST/PUT:**
```json
{
  "rating": 4,
  "title": "Great apartment",
  "comment": "Loved the location and view...",
  "landlordRating": 5,
  "locationRating": 4,
  "valueRating": 3
}
```

**Moderation body:**
```json
{
  "action": "APPROVED",
  "notes": "Looks good"
}
```

**Frontend notes:**
- Star ratings (1-5, required). Sub-ratings are optional.
- `GET .../stats` returns `averageRating`, `totalReviews`, per-star counts, average sub-ratings.
- One review per user per apartment — `409` on duplicate.
- Editing resets status to PENDING — inform user in UI.
- Public GET endpoints allow unauthenticated apartment detail pages to show reviews.

---

## 3. Notifications (`/api/notifications`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/notifications?page=0&size=20` | Bearer | All notifications (paginated, newest first) |
| `GET` | `/api/notifications/unread?page=0&size=20` | Bearer | Unread only |
| `GET` | `/api/notifications/unread/count` | Bearer | `{ "count": N }` |
| `PATCH` | `/api/notifications/{id}/read` | Bearer | Mark single notification as read |
| `PATCH` | `/api/notifications/read-all` | Bearer | Bulk mark all as read |

**Frontend notes:**
- Poll `GET /unread/count` for badge count (header bell icon).
- Use `PATCH /read-all` when user opens notifications panel.
- Notifications include `actionUrl` — navigate user on click.
- Types include: `VIEWING_REQUEST`, `NEW_MESSAGE`, `REVIEW_SUBMITTED`, `REVIEW_MODERATED`, `ACCOUNT_UPDATE`, `SYSTEM_ANNOUNCEMENT`, etc.
- Priority field (`LOW`/`NORMAL`/`HIGH`/`URGENT`) can drive visual styling.

---

## 4. Conversations & Messages (`/api/conversations`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/conversations` | Bearer | Create or get existing conversation |
| `GET` | `/api/conversations?page=0&size=20` | Bearer | My conversations (with unread counts) |
| `GET` | `/api/conversations/{id}` | Bearer | Conversation details |
| `GET` | `/api/conversations/{id}/messages?page=0&size=50` | Bearer | Messages (auto-marks as read) |
| `POST` | `/api/conversations/{id}/messages` | Bearer | Send message |
| `PATCH` | `/api/conversations/messages/{msgId}` | Bearer | Edit message (24h window) |
| `DELETE` | `/api/conversations/messages/{msgId}` | Bearer | Soft delete message |
| `PATCH` | `/api/conversations/{id}/read` | Bearer | Mark conversation messages as read |
| `GET` | `/api/conversations/unread/count` | Bearer | Total unread across all conversations |

**Create/get conversation body:**
```json
{
  "participantId": 42,
  "apartmentId": 7,
  "initialMessage": "Hi, is the apartment still available?"
}
```

**Send message body:**
```json
{
  "content": "Hello!",
  "messageType": "TEXT",
  "fileName": null,
  "fileUrl": null,
  "fileSize": null
}
```

**Frontend notes:**
- `POST /api/conversations` is **idempotent** — returns existing conversation if participants + apartment match.
- Use `apartmentId: null` for direct (non-apartment) conversations.
- Messages are returned oldest-first (ascending) for chat rendering.
- Opening a conversation's messages auto-marks them as read by the viewer.
- Deleted messages show `"[Message deleted]"` in the `content` field.
- Edited messages have `editedAt` set — can display "(edited)" badge.
- Poll `GET /unread/count` for inbox badge.
- `messageType` supports `TEXT`, `IMAGE`, `FILE`, `SYSTEM`.

---

## 5. Admin (`/api/admin`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/admin/dashboard` | ADMIN | Aggregate stats |
| `GET` | `/api/admin/users?page=0&size=20` | ADMIN | All users (paginated) |
| `PATCH` | `/api/admin/users/{id}/role` | ADMIN | Change user role |
| `PATCH` | `/api/admin/users/{id}/status` | ADMIN | Activate / suspend user |
| `GET` | `/api/admin/reviews/pending` | ADMIN | Pending reviews (also at `/api/reviews/pending`) |
| `POST` | `/api/admin/reviews/{id}/moderate` | ADMIN | Moderate review (also at `/api/reviews/{id}/moderate`) |

**Dashboard response shape:**
```json
{
  "totalUsers": 152,
  "totalApartments": 47,
  "totalViewingRequests": 89,
  "pendingReviews": 3,
  "totalConversations": 64
}
```

**Role update body:**
```json
{ "role": "LANDLORD" }
```

**Status update body:**
```json
{
  "status": "suspended",
  "reason": "Spam content"
}
```

**Frontend notes:**
- All admin endpoints are guarded by `ROLE_ADMIN` at both filter-chain and method level.
- Admins cannot change their own role or status (returns `409`).
- Suspending a user sets `isActive = false` and sends an `ACCOUNT_UPDATE` notification.
- The review moderation endpoints mirror those in `ReviewController` for convenience.

---

## General Integration Notes

### Authentication
All authenticated requests require `Authorization: Bearer <jwt>` header.

### Pagination
All paginated endpoints accept Spring's standard parameters:
- `page` (0-based, default 0)
- `size` (default 20)
- `sort` (e.g., `sort=createdAt,desc`)

Response shape is Spring's `Page<T>`:
```json
{
  "content": [...],
  "totalElements": 125,
  "totalPages": 7,
  "number": 0,
  "size": 20,
  "first": true,
  "last": false
}
```

### Error Responses
All errors follow the existing `ApiErrorResponse` shape:
```json
{
  "status": 409,
  "error": "Conflict",
  "message": "Apartment already in favorites",
  "path": "/api/favorites/7",
  "timestamp": "2026-03-15T10:30:00Z"
}
```

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Validation failure (missing/invalid fields) |
| 401 | Missing or invalid JWT |
| 403 | Insufficient role / not your resource |
| 404 | Entity not found (`"...not found"` in message) |
| 409 | Conflict (duplicate favorite, duplicate review, self-conversation, etc.) |

### CORS
`PATCH` method has been added to the CORS allowed methods list (required for notification and message edit endpoints).

### Swagger UI
All new endpoints are documented at `/swagger-ui.html` with proper tags: **Favorites**, **Reviews**, **Notifications**, **Conversations**, **Admin**.
