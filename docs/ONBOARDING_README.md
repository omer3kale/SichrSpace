# SichrPlace — Student Onboarding

> **If you only read one document, read this.**
>
> This gets you from zero to a running SichrPlace system in 10 minutes.
> After that, you'll know where everything lives and which docs to
> read next.

---

## What is SichrPlace? (2 min read)

SichrPlace is a **student housing platform for Aachen** — think WG-Gesucht
but with built-in messaging, viewing-request scheduling, and review
moderation.

The backend is a **Spring Boot 3.2.2** REST API (Java 21) with:

- **61 endpoints** across 11 controllers (users, apartments, conversations,
  messages, favorites, viewing requests, reviews, notifications, admin,
  saved searches, viewing-request transitions)
- **JWT authentication** with three roles: ADMIN, LANDLORD, TENANT
- **JPA/Hibernate** — the same code runs on PostgreSQL and MSSQL with
  zero changes
- **49 rows of seed data** — 6 users, 4 apartments, 3 conversations,
  12 messages, and more

You'll use the **MSSQL 2025 Developer** profile, running in Docker.

---

## 10-Minute Setup

### Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| JDK | 21+ | `java -version` |
| Docker | Any recent | `docker --version` |
| Git | Any | `git --version` |
| Terminal | PowerShell, Bash, or Zsh | — |

### Step 1 — Clone the backend

```bash
git clone --branch v1.0.0-mssql-workplace \
  https://github.com/omer3kale/sichrplace-backend.git
cd sichrplace-backend
```

### Step 2 — Start MSSQL in Docker

```bash
docker compose -f docker-compose.local-mssql.yml up -d
```

Wait ~15 seconds for MSSQL to initialize.

### Step 3 — Create your local env file

```bash
cat > .env.local <<EOF
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=1433
LOCAL_DB_NAME=sichrplace
LOCAL_DB_USER=sichrplace_user
LOCAL_DB_PASS=YourPassword123!
JWT_SECRET=my-local-jwt-secret-at-least-32-characters
EOF
```

> **Windows PowerShell?** Create `.env.local` manually in a text editor
> with the same key=value pairs.

### Step 4 — Run the backend

```bash
./gradlew bootRun --args='--spring.profiles.active=local-mssql'
```

You should see the `StartupInfoLogger` output:

```
═══════════════════════════════════════════════════════
  SichrPlace Backend — Startup Info
───────────────────────────────────────────────────────
  Profiles:    [local-mssql]
  Database:    jdbc:sqlserver://localhost:1433;databaseName=sichrplace;…
  Pool:        SichrPlace-MSSQL-Local
═══════════════════════════════════════════════════════
  MSSQL profile active — DataSeeder will run if database is empty.
```

### Step 5 — Verify it works

```bash
# Login as Charlie (a seeded TENANT user)
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}'
```

**Expected:** A JSON response with `accessToken` and user details.

### Step 6 — Check the database

Open SSMS or use `sqlcmd` in Docker:

```bash
docker exec -it sichrplace-database-1 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sichrplace_user -P 'YourPassword123!' -C \
  -Q "SELECT COUNT(*) AS user_count FROM users"
```

**Expected:** `user_count = 6`.

You now have a running SichrPlace backend with seed data.

---

## Seed Users (all passwords are `password123`)

| Email | Role | Who they are |
|-------|------|-------------|
| `charlie.student@rwth-aachen.de` | TENANT | MSc Informatik student looking for housing |
| `diana.student@rwth-aachen.de` | TENANT | MSc student, active in messaging |
| `alice.landlord@sichrplace.com` | LANDLORD | Owns apartments in Aachen |
| `bob.vermieter@sichrplace.com` | LANDLORD | Second landlord |
| `admin@sichrplace.com` | ADMIN | Platform administrator |
| `eva.admin@sichrplace.com` | ADMIN | Second admin |

---

## Where to Go Next

Now that the system is running, pick your path:

### Path A: Guided Labs (recommended for coursework)

Follow the **3-session tutorium** with 9 structured exercises:

[`docs/TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md)

- **Lab 1:** MSSQL setup, API exploration, ERD mapping
- **Lab 2:** Conversations, viewing requests, review moderation
- **Lab 3:** Build a new endpoint, add seed data, evolve the schema

### Path B: Full-Stack Tracing

Trace a user action from browser click to MSSQL row:

[`docs/FULLSTACK_GOLDEN_PATH.md`](FULLSTACK_GOLDEN_PATH.md)

Login → favorite an apartment → see the row in MSSQL. Covers frontend
HTML/JS, Spring Boot controller/service/repository, and SQL verification.

### Path C: Extension Projects (for advanced students)

Pick one of 3 self-contained tracks:

[`docs/STUDENT_EXTENSION_TRACKS.md`](STUDENT_EXTENSION_TRACKS.md)

- **Track A:** Analytics dashboard (aggregate queries, new endpoint)
- **Track B:** Soft-delete pattern (`deletedAt`/`deletedBy` columns)
- **Track C:** Advanced apartment search (filters, sorting, pagination)

### Path E: SQL Practice (database-first)

Explore the SichrPlace data directly in SQL Server — no Java required:

[`docs/SQL_LAB_MSSQL_BASICS.md`](SQL_LAB_MSSQL_BASICS.md)

- **Part 1:** Discover the data (`SELECT`, `WHERE`, `ORDER BY`) — 5 exercises
- **Part 2:** Join the domain (multi-table joins) — 5 exercises
- **Part 3:** Aggregate the workplace (`COUNT`, `GROUP BY`, `HAVING`) — 5 exercises

Then continue with the intermediate lab (constraints, indexing, CTEs) and the
MSSQL features showcase:

- [`SQL_LAB_MSSQL_INTERMEDIATE.md`](SQL_LAB_MSSQL_INTERMEDIATE.md)
- [`SQL_MSSQL_FEATURES_SHOWCASE.md`](SQL_MSSQL_FEATURES_SHOWCASE.md)

### Path D: Explore the API

Browse all 61 endpoints with curl examples and seed data mappings:

[`docs/API_ENDPOINTS_BACKEND.md`](API_ENDPOINTS_BACKEND.md)

---

## Quality & Security

Before contributing code, read these three documents:

| Document | What it covers |
|----------|---------------|
| [`TEST_STRATEGY.md`](TEST_STRATEGY.md) | Test layers (unit / slice / integration / E2E), naming rules, how to run tests |
| [`COCO_RULES.md`](COCO_RULES.md) | Per-package code-coverage objectives — every PR must meet these thresholds |
| [`SECURITY_AND_SECRETS.md`](SECURITY_AND_SECRETS.md) | What counts as a secret, where to store credentials, scanning config |

**Key commands:**

```bash
./gradlew test                  # Run all tests
./gradlew testWithCoverage      # Tests + JaCoCo report + global 85% check
./gradlew checkCoco             # Per-package coverage objectives
./gradlew secretsCheck          # Scan for hardcoded secrets
```

> **Rule:** Never commit real passwords, API keys, or JWT secrets.
> Use `${ENV_VAR:placeholder}` in `application-*.yml` files.
> See [`SECURITY_AND_SECRETS.md`](SECURITY_AND_SECRETS.md) for details.

---

## Common Problems

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Connection refused` on port 1433 | MSSQL container not running | `docker compose -f docker-compose.local-mssql.yml up -d` |
| `Login failed for user` | Wrong password in `.env.local` | Check `LOCAL_DB_PASS` matches Docker Compose MSSQL password |
| `BUILD SUCCESSFUL` but no seed data | App ran before MSSQL was ready | Restart: `Ctrl+C` then re-run `bootRun` |
| `java: command not found` | JDK not installed or not on PATH | Install JDK 21+ and add to PATH |
| Port 8080 already in use | Another app is using the port | Kill the other process or change `server.port` in `application.yml` |

---

## Project Structure (what's where)

```
sichrplace-backend/
├── src/main/java/com/sichrplace/backend/
│   ├── controller/      ← 11 REST controllers (61 endpoints)
│   ├── service/          ← Business logic (11 service impls)
│   ├── repository/       ← JPA repositories (11 interfaces)
│   ├── model/            ← JPA entities (11 entities → 11 tables)
│   ├── dto/              ← Request/response DTOs
│   ├── security/         ← JWT provider, auth filter, security config
│   └── config/           ← DataSeeder, CORS, Swagger, StartupInfoLogger
├── src/main/resources/
│   ├── application.yml             ← Base config
│   ├── application-local-mssql.yml ← Local MSSQL profile
│   └── application-beta-mssql.yml  ← Beta (droplet) MSSQL profile
├── src/test/                       ← 8 smoke tests (H2 in-memory)
├── docs/                           ← All documentation
│   ├── API_ENDPOINTS_BACKEND.md
│   ├── TUTORIUM_LAB_WORKPLACE.md
│   ├── STUDENT_EXTENSION_TRACKS.md
│   ├── FULLSTACK_GOLDEN_PATH.md
│   ├── FULLSTACK_LAB_EXERCISES.md
│   ├── ENV_SETUP_GUIDE.MD
│   ├── SEED_WORKPLACE_MSSQL.md
│   ├── SQL_LAB_MSSQL_BASICS.md         ← 15 SQL exercises (basics)
│   ├── SQL_LAB_MSSQL_INTERMEDIATE.md   ← 8 SQL exercises (constraints, perf)
│   ├── SQL_MSSQL_FEATURES_SHOWCASE.md  ← MSSQL-specific features
│   ├── SQL_EXAM_QUESTIONS.md           ← 3 exam-style SQL questions
│   └── diagrams/                   ← ERD, state charts, sequence, architecture
├── db/migrations/                  ← V001 (schema), V002 (seed)
├── THESIS_OVERVIEW_BACKEND.md      ← Thesis-level architecture overview
├── DEMO_SCRIPT_BACKEND.md          ← Live demo guide (10-15 min)
├── EXAM_CHECKLIST_BACKEND.md       ← Defense preparation checklist
└── ONBOARDING_README.md            ← This file (you are here)
```

---

## Need Help?

- **Full thesis overview:** [`THESIS_OVERVIEW_BACKEND.md`](../THESIS_OVERVIEW_BACKEND.md)
- **All 61 endpoints:** [`docs/API_ENDPOINTS_BACKEND.md`](API_ENDPOINTS_BACKEND.md)
- **Seed data details:** [`docs/SEED_WORKPLACE_MSSQL.md`](SEED_WORKPLACE_MSSQL.md)
- **Environment profiles:** [`docs/ENV_SETUP_GUIDE.MD`](ENV_SETUP_GUIDE.MD)
- **Demo script:** [`DEMO_SCRIPT_BACKEND.md`](../DEMO_SCRIPT_BACKEND.md)
