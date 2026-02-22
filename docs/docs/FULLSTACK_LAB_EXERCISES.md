# SichrPlace — Full-Stack Lab Exercises

> **Purpose:** Guided exercises that trace user actions from the browser
> (Vanilla JS / HTML frontend) through the Spring Boot REST API down to
> MSSQL 2025. Designed for tutorium sessions or self-study.
>
> **Prerequisites:**
> - Backend running on `local-mssql` profile (see [`docs/ENV_SETUP_GUIDE.MD`](ENV_SETUP_GUIDE.MD))
> - Frontend served at `http://localhost:3000` (see [`docs/FULLSTACK_GOLDEN_PATH.md`](FULLSTACK_GOLDEN_PATH.md) §0)
> - SSMS or `sqlcmd` available for database inspection
>
> **Estimated time:** 45–60 minutes per exercise.
>
> **Last updated:** February 2026

---

## Exercise 1 — Trace "Favorite an Apartment" End-to-End

**Goal:** Follow a single user action from browser click to MSSQL row,
identifying every layer of the stack.

### Part A — Find the frontend view and API call (15 min)

1. Open `http://localhost:3000/apartments-listing.html` in Chrome.
2. Open **DevTools → Network** tab (F12).
3. Log in as Charlie (`charlie.student@rwth-aachen.de` / `password123`).
4. Click the favorite/heart icon on any apartment.
5. In the Network tab, find the request:
   - **Method:** `POST`
   - **URL:** `http://localhost:8080/api/favorites/{apartmentId}`
   - **Headers:** `Authorization: Bearer <JWT>`
   - **Response:** `200 OK` with the favorite object

**Questions to answer:**

| # | Question | Where to look |
|---|----------|---------------|
| 1 | What JS file triggers the `fetch()` call? | DevTools → Sources or search `apartments-listing.html` for "favorites" |
| 2 | How does the frontend know the API base URL? | [`frontend/js/config.js`](../../sichrplace/frontend/js/config.js) — `API_BASE_URL` getter |
| 3 | Where is the JWT stored after login? | `localStorage.getItem('token')` — check Application tab |
| 4 | What HTTP status would you get without the `Authorization` header? | Try it: `curl -X POST http://localhost:8080/api/favorites/3` → `401` |

### Part B — Find the backend controller, service, repository (15 min)

Open the backend code in your IDE (VS Code / IntelliJ) and trace the request:

1. **Controller:** Open [`FavoriteController.java`](../src/main/java/com/sichrplace/backend/controller/FavoriteController.java).
   - Find the method annotated with `@PostMapping("/api/favorites/{apartmentId}")`.
   - What does `@PreAuthorize` check? *(role-based access)*

2. **Service:** Open [`FavoriteServiceImpl.java`](../src/main/java/com/sichrplace/backend/service/FavoriteServiceImpl.java).
   - What happens if this user already favorited this apartment? *(duplicate check)*
   - What repositories does the service use?

3. **Repository:** Open [`FavoriteRepository.java`](../src/main/java/com/sichrplace/backend/repository/FavoriteRepository.java).
   - What Spring Data query method checks for an existing favorite?
   - What does `save()` translate to in SQL? *(INSERT INTO user_favorites …)*

**Draw the call chain:**

```
POST /api/favorites/3
  → FavoriteController.addFavorite(apartmentId=3, principal)
    → FavoriteService.addFavorite(userId, apartmentId)
      → UserRepository.findById(userId)           -- SELECT from users
      → ApartmentRepository.findById(3)            -- SELECT from apartments
      → FavoriteRepository.existsByUserAndApartment -- SELECT count from user_favorites
      → FavoriteRepository.save(newFavorite)        -- INSERT into user_favorites
    ← FavoriteDTO
  ← ResponseEntity<FavoriteDTO> (200 OK)
```

### Part C — Verify in MSSQL (10 min)

1. Open SSMS and connect to `localhost,1433` (user: `sichrplace_user`).
2. Run these queries:

```sql
-- 1. See all favorites
SELECT * FROM user_favorites;

-- 2. See Charlie's favorites with apartment titles
SELECT uf.id, u.email, a.title, a.monthly_rent, uf.created_at
FROM   user_favorites uf
JOIN   users u ON u.id = uf.user_id
JOIN   apartments a ON a.id = uf.apartment_id
WHERE  u.email = 'charlie.student@rwth-aachen.de'
ORDER BY uf.created_at DESC;

-- 3. Count favorites per apartment
SELECT a.title, COUNT(uf.id) AS favorite_count
FROM   apartments a
LEFT JOIN user_favorites uf ON uf.apartment_id = a.id
GROUP BY a.title;
```

3. Compare the query results with the API response from Step A.5.

### Part D — Diagram reference (5 min)

Open these diagrams and identify the components involved in this flow:

- [**ERD**](diagrams/erd_sichrplace.png) — Find `users`, `user_favorites`, and `apartments`.
  The `user_favorites` table is the many-to-many join between users and apartments.
- [**Architecture flow**](diagrams/arch_request_flow.png) — Trace the HTTP request through
  Controller → Service → Repository → DB.

**Deliverable:** Write a 3-sentence summary of how the favorite action flows
from browser to database, referencing the ERD and architecture diagram.

---

## Exercise 2 — Trace "Send a Message" End-to-End

**Goal:** Trace the messaging flow — more complex because it involves
conversations, messages, and read/unread state.

### Part A — Frontend (15 min)

1. Open `http://localhost:3000/chat.html` (or `chat-new.html`).
2. Open DevTools → Network.
3. Log in as Charlie.
4. Open an existing conversation (seed data has 3 conversations).
5. Type and send a message.
6. In the Network tab, find:
   - `GET /api/conversations` — lists conversations
   - `GET /api/conversations/{id}/messages` — loads message history
   - `POST /api/conversations/{id}/messages` — sends the new message

**Questions:**

| # | Question | Expected answer |
|---|----------|----------------|
| 1 | What fields does the POST body contain? | `{ "content": "…" }` at minimum |
| 2 | What does the response include? | Message object with `id`, `sender`, `content`, `createdAt` |
| 3 | How does the frontend handle pagination? | Check for `page` and `size` query params |

### Part B — Backend (15 min)

Trace through the backend:

1. **Controller:** [`ConversationController.java`](../src/main/java/com/sichrplace/backend/controller/ConversationController.java)
   - Find `@PostMapping("/api/conversations/{id}/messages")`
   - What DTO does it accept?

2. **Service:** [`ConversationServiceImpl.java`](../src/main/java/com/sichrplace/backend/service/ConversationServiceImpl.java)
   - How does the service verify that the sender belongs to this conversation?
   - What side effects occur? *(hint: `lastMessageAt` update, possibly notification)*

3. **Repository:** [`MessageRepository.java`](../src/main/java/com/sichrplace/backend/repository/MessageRepository.java)
   - How are messages ordered? *(by `createdAt`)*
   - Where is the `Conversation.lastMessageAt` field updated?

### Part C — Verify in MSSQL (10 min)

```sql
-- See messages in a specific conversation
SELECT m.id, u.first_name AS sender, m.content,
       m.message_type, m.read_by_recipient, m.created_at
FROM   messages m
JOIN   users u ON u.id = m.sender_id
WHERE  m.conversation_id = 1
ORDER BY m.created_at ASC;

-- See conversation metadata
SELECT c.id, u1.email AS participant1, u2.email AS participant2,
       a.title AS apartment, c.last_message_at
FROM   conversations c
JOIN   users u1 ON u1.id = c.participant1_id
JOIN   users u2 ON u2.id = c.participant2_id
JOIN   apartments a ON a.id = c.apartment_id;
```

### Part D — Sequence diagram (5 min)

Open [`docs/diagrams/sequence_send_message.png`](diagrams/sequence_send_message.png)
and verify that the layers you traced in Part B match the diagram:

```
Browser → Controller → Service → MessageRepository → MSSQL
                                → ConversationRepository (update lastMessageAt)
```

---

## Exercise 3 (Extension) — Modify the Backend Response

**Goal:** Add an extra field to the backend API response and display it
in the frontend. This bridges "reading code" to "writing code."

### Step 1 — Add a field to the backend DTO

Choose one:
- **Option A:** Add `favoriteCount` to the apartment response.
- **Option B:** Add `messageCount` to the conversation list response.

**Example (Option A):**

1. Open [`ApartmentDTO.java`](../src/main/java/com/sichrplace/backend/dto/) (or the relevant DTO).
2. Add a new field:
   ```java
   private Long favoriteCount;
   ```
3. In `ApartmentServiceImpl.java`, populate it:
   ```java
   dto.setFavoriteCount(favoriteRepository.countByApartmentId(apartment.getId()));
   ```
4. Add the repository method in `FavoriteRepository.java`:
   ```java
   Long countByApartmentId(Long apartmentId);
   ```

### Step 2 — Verify via curl

```bash
curl -s http://localhost:8080/api/apartments/3 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

You should see `"favoriteCount": 2` (or whatever the current count is).

### Step 3 — Display in the frontend

1. Open `frontend/apartments-listing.html`.
2. Find where apartment cards are rendered.
3. Add a line to display the new field:
   ```javascript
   <span class="favorite-count">${apartment.favoriteCount} favorites</span>
   ```
4. Refresh the page and verify the count appears.

### Step 4 — Verify the full round trip

1. Favorite/unfavorite an apartment via the UI.
2. Refresh the listing page.
3. Confirm the count incremented/decremented.
4. Run the SQL query to verify:
   ```sql
   SELECT a.title, COUNT(uf.id) AS fav_count
   FROM apartments a
   LEFT JOIN user_favorites uf ON uf.apartment_id = a.id
   GROUP BY a.title;
   ```

---

## Submission Checklist

For each exercise, students should submit:

- [ ] Screenshot of the Network tab showing the API request/response
- [ ] The call chain (Controller → Service → Repository) with class names
- [ ] SQL query results from MSSQL showing the affected rows
- [ ] 3-sentence summary referencing at least one diagram (ERD or sequence)
- [ ] *(Extension only)* Git diff of the code changes + screenshot of the UI

---

## Reference Diagrams

| Diagram | Path | Relevant exercise |
|---------|------|-------------------|
| Entity-Relationship Diagram | [`docs/diagrams/erd_sichrplace.png`](diagrams/erd_sichrplace.png) | Ex 1, 2, 3 |
| Architecture Request Flow | [`docs/diagrams/arch_request_flow.png`](diagrams/arch_request_flow.png) | Ex 1, 2 |
| Sequence: Send Message | [`docs/diagrams/sequence_send_message.png`](diagrams/sequence_send_message.png) | Ex 2 |
| State: ViewingRequest | [`docs/diagrams/state_message_lifecycle.png`](diagrams/state_message_lifecycle.png) | *(bonus: trace a viewing request)* |

---

## See Also

- [`FULLSTACK_GOLDEN_PATH.md`](FULLSTACK_GOLDEN_PATH.md) — Complete guided walkthrough of the favorite action
- [`TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md) — Backend-only labs (3 sessions, 9 exercises)
- [`STUDENT_EXTENSION_TRACKS.md`](STUDENT_EXTENSION_TRACKS.md) — Advanced extension projects (analytics, soft-delete, search)
- [`API_ENDPOINTS_BACKEND.md`](API_ENDPOINTS_BACKEND.md) — All 55 endpoints with curl examples
