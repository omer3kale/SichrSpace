# SichrPlace — Backend Demo Script

> **Purpose:** Step-by-step guide for giving a live backend demo in front of
> students, thesis reviewers, or examiners.
>
> **Duration:** 10–15 minutes
>
> **Last updated:** February 2026

---

## Pre-Demo Checklist

Run through this before every demo session. All items should be ✅ before
you open the presentation.

### Infrastructure

- [ ] **Droplet is up:** `ssh deploy@206.189.53.163 uptime`
- [ ] **MSSQL beta stack running:**
  ```bash
  ssh deploy@206.189.53.163 "docker ps --format 'table {{.Names}}\t{{.Status}}'"
  ```
  Expect: `sichrplace-api-1`, `sichrplace-database-1`, `sichrplace-caddy-1` — all `Up`.
- [ ] **UFW configured:** ports 22/80/443 open, **1433 closed** externally.
  ```bash
  ssh deploy@206.189.53.163 "sudo ufw status | head -15"
  ```

### Seed Data

- [ ] **Row counts match expected:**
  ```bash
  ssh deploy@206.189.53.163 "docker exec sichrplace-database-1 \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sichrplace_user -P '\$DB_PASSWORD' \
    -C -Q \"SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
    UNION ALL SELECT 'apartments', COUNT(*) FROM apartments
    UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
    UNION ALL SELECT 'messages', COUNT(*) FROM messages\""
  ```
  Expected: users=6, apartments=4, conversations=3, messages=12.

- [ ] **Login works:**
  ```bash
  curl -s -X POST https://sichrplace.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}' \
    | python3 -m json.tool | head -5
  ```
  Expect: HTTP 200 with `accessToken` in response.

### Presenter Setup

- [ ] Terminal open with large font (≥16pt).
- [ ] Diagrams ready in a file explorer or image viewer (`docs/diagrams/`).
- [ ] `THESIS_OVERVIEW_BACKEND.md` open in VS Code or browser.
- [ ] This file (`DEMO_SCRIPT_BACKEND.md`) open as reference — not shown to audience.

---

## Live Demo Flow (10–15 minutes)

### Phase 1 — Architecture Overview (2–3 min)

1. **Show the architecture diagram:**
   Open [`docs/diagrams/arch_request_flow.png`](docs/diagrams/arch_request_flow.png).

   > *"This is the request flow: HTTPS comes in through Caddy,
   > hits the Spring Boot REST layer — 9 controllers, 55 endpoints —
   > which delegates to services, then JPA repositories talk to the
   > database. The same JAR runs against PostgreSQL in production
   > and MSSQL 2025 in our teaching environment."*

2. **Show the ERD:**
   Open [`docs/diagrams/erd_sichrplace.png`](docs/diagrams/erd_sichrplace.png).

   Point at the four core entities:
   - **User** — central (roles: ADMIN, LANDLORD, TENANT)
   - **Apartment** — owned by User, has reviews and favorites
   - **Conversation → Message** — tenant ↔ landlord messaging
   - **ViewingRequest** — state machine: PENDING → CONFIRMED/DECLINED/CANCELLED

3. **Show the environments table:**
   Open `THESIS_OVERVIEW_BACKEND.md` → Section 3 (Environments).

   > *"We have four profiles. The key insight is that the SAME Spring Boot
   > JAR runs everywhere — only the Spring profile changes. No code
   > differences between local-mssql and beta-mssql."*

---

### Phase 2 — Live API Demo (5–7 min)

Run these commands in a terminal. Use the **beta** (droplet) or **local** instance.

#### Step 1: Login as Charlie (student)

```bash
TOKEN=$(curl -s -X POST https://sichrplace.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

echo "Token: ${TOKEN:0:30}..."
```

> *"Charlie is a TENANT — an MSc Informatik student looking for an apartment.
> The JWT contains his role, so the backend knows what he can and can't do."*

#### Step 2: Browse apartments

```bash
curl -s https://sichrplace.com/api/apartments \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
```

> *"4 apartments in the seed data — all in Aachen, near RWTH.
> Notice the `monthlyRent`, `district`, `status` fields."*

#### Step 3: Favorite an apartment

```bash
curl -s -X POST https://sichrplace.com/api/favorites/3 \
  -H "Authorization: Bearer $TOKEN"
```

> *"Charlie just favorited the WG-Zimmer near the Informatikzentrum."*

#### Step 4: Check unread messages

```bash
curl -s https://sichrplace.com/api/conversations/unread/count \
  -H "Authorization: Bearer $TOKEN"
```

> *"The messaging system tracks read/unread state per conversation."*

#### Step 5: Show role-based access (optional)

```bash
# Try an admin endpoint as Charlie (TENANT) — should get 403
curl -s -o /dev/null -w "%{http_code}" \
  https://sichrplace.com/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
# → 403

# Login as admin and try again — should get 200
ADMIN_TOKEN=$(curl -s -X POST https://sichrplace.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sichrplace.com","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

curl -s -o /dev/null -w "%{http_code}" \
  https://sichrplace.com/api/admin/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# → 200
```

> *"Spring Security uses `@PreAuthorize` with role checks.
> The JWT carries the role — TENANT can't access admin endpoints."*

---

### Phase 3 — Tie to Diagrams (2–3 min)

1. **Show the state chart:**
   Open [`docs/diagrams/state_message_lifecycle.png`](docs/diagrams/state_message_lifecycle.png).

   > *"The ViewingRequest follows this state machine — PENDING can
   > transition to CONFIRMED, DECLINED, or CANCELLED. The service
   > layer enforces valid transitions; invalid ones return HTTP 409."*

2. **Show the sequence diagram:**
   Open [`docs/diagrams/sequence_send_message.png`](docs/diagrams/sequence_send_message.png).

   > *"This is what happens when Charlie sends a message. The Controller
   > delegates to the Service, which persists via the Repository, and
   > the same JPQL works identically on PostgreSQL and MSSQL."*

---

### Phase 4 — Wrap-up (1–2 min)

> *"To summarize: 55 endpoints, 9 JPA entities, fully seeded with 43
> test rows, running on MSSQL 2025 in Docker. The same code runs on
> PostgreSQL in production. Students use this in 3 lab sessions with
> 9 exercises. Three extension tracks let advanced students add analytics,
> soft-delete, or advanced search."*

Show the references:
- `docs/TUTORIUM_LAB_WORKPLACE.md` — lab guide
- `docs/STUDENT_EXTENSION_TRACKS.md` — extension projects
- `THESIS_OVERVIEW_BACKEND.md` — thesis-facing overview

---

## Troubleshooting

### Login fails (401 or connection refused)

| Symptom | Check | Fix |
|---------|-------|-----|
| `Connection refused` | Is the API container running? | `docker compose -f docker-compose.mssql.yml up -d api` |
| `401 Unauthorized` | Is the password correct? | All seed accounts use `password123` |
| `500 Internal Server Error` | Is MSSQL reachable from the API? | Check `docker logs sichrplace-api-1 --tail 50` |
| `401` after password confirmed correct | Is the seed data present? | Run the count query from the pre-demo checklist |

### API container logs

```bash
# Live logs (follow mode)
ssh deploy@206.189.53.163 "docker logs -f sichrplace-api-1 --tail 100"

# Search for errors
ssh deploy@206.189.53.163 "docker logs sichrplace-api-1 2>&1 | grep -i error | tail -20"
```

### Endpoint returns 500

| Cause | Log pattern | Fix |
|-------|------------|-----|
| MSSQL connection lost | `SQLServerException: Connection reset` | Restart: `docker compose restart database api` |
| JPA mapping error | `MappingException` or `PropertyReferenceException` | Check entity annotations match DB schema |
| Missing seed data | `EntityNotFoundException` | Reset and re-seed (see lab doc reset instructions) |
| JWT expired | `ExpiredJwtException` | Re-login to get a fresh token |

### Hibernate SQL logging (for debugging)

To see the actual SQL queries being executed, temporarily set in `application-local-mssql.yml`:

```yaml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true

logging:
  level:
    org.hibernate.SQL: DEBUG
    org.hibernate.type.descriptor.sql.BasicBinder: TRACE
```

This shows parameterized queries with bound values — useful for debugging
JPA queries during teaching sessions.

---

## Quick Recovery

If anything goes wrong during a demo, here's how to recover in under 60 seconds:

```bash
# Full stack restart on droplet
ssh deploy@206.189.53.163 "cd /opt/sichrplace && docker compose -f docker-compose.mssql.yml --env-file .env down && docker compose -f docker-compose.mssql.yml --env-file .env up -d"

# Wait ~30s for MSSQL to start + API to seed, then verify
sleep 35
curl -s -X POST https://sichrplace.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}' \
  | python3 -m json.tool | head -3
```

---

## Presenter Notes

- **Don't rush the ERD.** Students need 30 seconds to absorb the entity relationships.
- **Use German for apartment data** — the seed data uses realistic German addresses and messages. This resonates with Aachen-based students.
- **State machines are the "aha" moment.** The transition from PENDING → CONFIRMED → CANCELLED is intuitive and demonstrates real-world workflow modeling.
- **JPA abstraction is the thesis point.** The fact that the same JAR runs on both databases is the key technical contribution — emphasize it.
