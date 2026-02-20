# SichrPlace — Exam & Defense Checklist (Backend)

> **Purpose:** Low-stress preparation guide for thesis defense, oral exam,
> or live reviewer session.
>
> **Last updated:** February 2026

---

## Before the Exam

Complete every item **the evening before**. Don't leave infrastructure
checks for the morning.

### Code & Tags

- [ ] **Pull latest `main`:**
  ```bash
  cd sichrplace-backend
  git pull origin main
  ```
- [ ] **Tag is reachable:**
  ```bash
  git tag --list 'v1.*'
  # Must show: v1.0.0-mssql-workplace, v1.1.0-quality-baseline, v1.2.0-thesis-showcase
  git log --oneline v1.2.0-thesis-showcase -1
  ```
- [ ] **Smoke tests green:**
  ```bash
  ./gradlew clean test
  # Expected: BUILD SUCCESSFUL, 29 tests passed (8 smoke + 21 feature)
  ```

### Droplet (Beta MSSQL Stack)

- [ ] **Droplet is up:**
  ```bash
  ssh deploy@206.189.53.163 uptime
  ```
- [ ] **All 3 containers running:**
  ```bash
  ssh deploy@206.189.53.163 \
    "docker ps --format 'table {{.Names}}\t{{.Status}}'"
  # Expect: sichrplace-api-1, sichrplace-database-1, sichrplace-caddy-1
  ```
- [ ] **Seed data verified** (users=6, apartments=4, conversations=3, messages=12):
  ```bash
  ssh deploy@206.189.53.163 "docker exec sichrplace-database-1 \
    /opt/mssql-tools18/bin/sqlcmd -S localhost -U sichrplace_user \
    -P \"\$DB_PASSWORD\" -C \
    -Q \"SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
    UNION ALL SELECT 'apartments', COUNT(*) FROM apartments
    UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
    UNION ALL SELECT 'messages', COUNT(*) FROM messages\""
  ```
- [ ] **Login test passes:**
  ```bash
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST https://sichrplace.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}'
  # Expect: 200
  ```
- [ ] **UFW configured** (22/80/443 open, 1433 closed externally):
  ```bash
  ssh deploy@206.189.53.163 "sudo ufw status | head -10"
  ```

### Local Environment

- [ ] **JDK 21 installed:** `java -version` → OpenJDK 21.x
- [ ] **Docker running:** `docker info | head -5`
- [ ] **Local MSSQL up:** `docker compose -f docker-compose.local-mssql.yml up -d`
- [ ] **Spring Boot starts on local-mssql:**
  ```bash
  ./gradlew bootRun --args='--spring.profiles.active=local-mssql'
  # Watch for StartupInfoLogger output confirming MSSQL connection
  ```
- [ ] **`.env.local` exists** with `LOCAL_DB_HOST`, `LOCAL_DB_PASS`, `JWT_SECRET`

### Presenter Setup

- [ ] Terminal open with **large font** (≥16pt)
- [ ] Browser with DevTools Network tab ready
- [ ] Diagrams accessible in file explorer (`docs/diagrams/`)
- [ ] `DEMO_SCRIPT_BACKEND.md` and this checklist open (not shown to audience)
- [ ] VS Code open with `THESIS_OVERVIEW_BACKEND.md`

---

## During the Exam

### Must-show items (5–8 minutes)

These are the **non-negotiable** demonstrations. If you show nothing else,
show these.

#### 1. Architecture diagram + ERD (2 min)

Open [`docs/diagrams/arch_request_flow.png`](docs/diagrams/arch_request_flow.png)
and [`docs/diagrams/erd_sichrplace.png`](docs/diagrams/erd_sichrplace.png).

> *"9 controllers, 66 endpoints, Spring Boot 3.2.2. Same JAR runs on
> PostgreSQL and MSSQL 2025 — zero code changes between databases."*

Point at: `User` → roles (ADMIN/LANDLORD/TENANT), `Conversation` → `Message`,
`ViewingRequest` → state machine.

#### 2. Sequence diagram (1 min)

Open [`docs/diagrams/sequence_send_message.png`](docs/diagrams/sequence_send_message.png).

> *"Controller → Service → Repository → MSSQL. The JPA layer makes
> the database interchangeable."*

#### 3. One API flow via curl — login + favorite (3 min)

```bash
# Login as Charlie (TENANT)
TOKEN=$(curl -s -X POST https://sichrplace.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")
echo "Token: ${TOKEN:0:30}..."

# Favorite apartment #3
curl -s -X POST https://sichrplace.com/api/favorites/3 \
  -H "Authorization: Bearer $TOKEN"

# Role-based access: Charlie (TENANT) → admin endpoint → 403
curl -s -o /dev/null -w "%{http_code}" \
  https://sichrplace.com/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
# → 403
```

#### 4. One DB verification query (1 min)

```bash
ssh deploy@206.189.53.163 "docker exec sichrplace-database-1 \
  /opt/mssql-tools18/bin/sqlcmd -S localhost -U sichrplace_user \
  -P \"\$DB_PASSWORD\" -C \
  -Q \"SELECT u.email, a.title, uf.created_at
  FROM user_favorites uf
  JOIN users u ON u.id = uf.user_id
  JOIN apartments a ON a.id = uf.apartment_id
  WHERE u.email = 'charlie.student@rwth-aachen.de'\""
```

> *"The row we just created via the API is now visible in MSSQL.
> Browser → REST API → JPA → MSSQL row."*

#### 5. Showcase feature: password reset or saved search execution (2 min)

Pick **one** of the v1.2.0 showcase features:

**Option A — Password reset flow:**

```bash
# Request reset
RESET=$(curl -s -X POST https://sichrplace.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de"}')
echo $RESET | python3 -m json.tool

# Reset the password
RESET_TOKEN=$(echo $RESET | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
curl -s -X POST https://sichrplace.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$RESET_TOKEN\",\"newPassword\":\"examDemoP@ss1\"}" \
  | python3 -m json.tool
```

> *"Tokens are SHA-256 hashed, single-use, time-limited. The endpoint
> returns the same message for known and unknown emails — preventing
> email enumeration."*

**Option B — Execute saved search:**

```bash
# Create and execute a saved search
curl -s -X POST https://sichrplace.com/api/saved-searches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Exam Demo","filterJson":"{\"city\":\"Aachen\",\"maxPrice\":600}"}' \
  | python3 -m json.tool

curl -s -X POST "https://sichrplace.com/api/saved-searches/1/execute?page=0&size=10" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool | head -20
```

> *"JPA Specifications compose filter predicates dynamically from JSON.
> No hardcoded SQL — the same query builder works on PostgreSQL and MSSQL."*

### Nice-to-show items (if time allows)

#### 6. Smoke tests (1 min)

```bash
./gradlew test
# 29 tests green — runs against H2 in-memory, no MSSQL needed for CI
```

> *"CI pipeline runs these on every push. No external DB required."*

#### 7. Startup logs (30 sec)

Show `StartupInfoLogger` output from the terminal:

> *"Active profile, database URL (password masked), connection pool name,
> dialect — all printed at boot."*

#### 8. Migration structure (30 sec)

Open `db/migrations/` and show `V001__initial_schema_mssql.sql`, `V002__seed_workplace_mssql.sql`.

> *"Versioned, idempotent migration scripts — reproducible on any machine."*

#### 9. Full-stack demo (2 min, optional)

If a browser is available, open `localhost:3000/login.html`, log in as Charlie,
favorite an apartment. Show the Network tab → backend logs → MSSQL row.

See [`DEMO_SCRIPT_BACKEND.md` → "Full Stack Demo"](DEMO_SCRIPT_BACKEND.md)
for the complete walkthrough.

---

## Anticipated Questions & Answers

| Question | Key points |
|----------|-----------|
| *Why MSSQL instead of PostgreSQL for teaching?* | RWTH curriculum uses MS SQL Server; JPA abstraction proves database portability; students learn enterprise-grade RDBMS |
| *How do you ensure schema parity between PG and MSSQL?* | JPA/Hibernate generates DDL from the same entity classes; verified 123 columns, 41 indexes, 26 constraints on both |
| *What happens if a student breaks the seed data?* | `DataSeeder` is idempotent — restart the app and it re-seeds if `users` table is empty; or run `V002` migration manually |
| *Can this scale horizontally?* | Not currently — single JAR, single DB instance. Scaling would require session externalization (Redis), DB read replicas |
| *How is security handled?* | JWT auth via `JwtTokenProvider`, role checks via `@PreAuthorize`, BCrypt password hashing, CORS configured per profile |
| *What would you do with more time?* | WebSocket messaging, Flyway migrations, Testcontainers integration tests, geo-search, frontend framework migration (see §11 Future Work) |
| *How does the frontend talk to the backend?* | `config.js` resolves API base URL by hostname — `localhost:8080` in dev, `api.sichrplace.com` in prod. Same REST contract for both |

---

## After the Exam

### Shut down droplet services safely

```bash
# Stop the stack (preserves data volumes)
ssh deploy@206.189.53.163 \
  "cd /opt/sichrplace && docker compose -f docker-compose.mssql.yml down"

# Verify containers stopped
ssh deploy@206.189.53.163 "docker ps"
# Should show no sichrplace containers
```

> **Do not** run `docker compose down -v` unless you want to **destroy**
> the MSSQL data volume. Omit `-v` to keep data intact.

### If you need to restart later

```bash
ssh deploy@206.189.53.163 \
  "cd /opt/sichrplace && docker compose -f docker-compose.mssql.yml \
   --env-file .env up -d"
# Wait ~30s for MSSQL to start + API to seed
```

### Share repos with examiners

Provide these two links:

| Repo | URL | Tag / Branch |
|------|-----|-------------|
| **Backend** | `https://github.com/omer3kale/sichrplace-backend` | `v1.2.0-thesis-showcase` (tag) / `main` |
| **Frontend** | `https://github.com/omer3kale/sichrplace` | `main` |

If the repos are private, add examiners as collaborators:
1. GitHub → Settings → Collaborators → Add people.
2. Share the tag directly: `git clone --branch v1.0.0-mssql-workplace https://github.com/omer3kale/sichrplace-backend.git`

### Key documents to point examiners to

| Document | Purpose |
|----------|---------|
| `THESIS_OVERVIEW_BACKEND.md` | Full thesis-level architecture overview |
| `EXAM_CHECKLIST_BACKEND.md` | This file — reproducible demo steps |
| `docs/FULLSTACK_GOLDEN_PATH.md` | Browser → API → MSSQL trace |
| `DEMO_SCRIPT_BACKEND.md` | 10–15 min live demo script |
| `docs/API_ENDPOINTS_BACKEND.md` | All 66 endpoints with curl examples |
