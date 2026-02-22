# SichrPlace — Full-Stack Golden Path

> **From browser to MSSQL row in one guided flow.**
>
> This document walks you through a single end-to-end user action —
> logging in as Charlie, favoriting an apartment — and traces every
> layer of the stack: frontend HTML/JS → Spring Boot REST API → JPA →
> MSSQL 2025.
>
> **Time to complete:** ~20 minutes (including setup).
>
> **Last updated:** February 2026

---

## 0  Prerequisites

Before you begin, both repos must be cloned and running.

### Clone both repositories

```bash
# Backend (Spring Boot + MSSQL)
git clone --branch v1.0.0-mssql-workplace https://github.com/omer3kale/sichrplace-backend.git
cd sichrplace-backend

# Frontend (Vanilla JS)
git clone https://github.com/omer3kale/sichrplace.git
cd sichrplace
```

### Start the backend (local-mssql)

Follow [`docs/ENV_SETUP_GUIDE.MD`](ENV_SETUP_GUIDE.MD) in the backend repo.
The short version:

```bash
# 1. Start MSSQL in Docker
docker compose -f docker-compose.local-mssql.yml up -d

# 2. Create .env.local with your DB credentials
cat > .env.local <<EOF
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=1433
LOCAL_DB_NAME=sichrplace
LOCAL_DB_USER=sichrplace_user
LOCAL_DB_PASS=YourPassword123!
JWT_SECRET=my-local-jwt-secret-min-32-chars-long
EOF

# 3. Run Spring Boot with local-mssql profile
./gradlew bootRun --args='--spring.profiles.active=local-mssql'
```

The `StartupInfoLogger` will confirm:
```
  Profiles:    [local-mssql]
  Database:    jdbc:sqlserver://localhost:1433;databaseName=sichrplace;encrypt=false
  Pool:        SichrPlace-MSSQL-Local
  MSSQL profile active — DataSeeder will run if database is empty.
```

**Seed data:** 6 users, 4 apartments, 5 favorites, 3 conversations, 12 messages
(43 rows total). See [`SEED_WORKPLACE_MSSQL.md`](SEED_WORKPLACE_MSSQL.md).

### Start the frontend

```bash
cd sichrplace/frontend

# Option A: Python simple server
python3 -m http.server 3000

# Option B: Node http-server (install once: npm i -g http-server)
http-server -p 3000

# Option C: VS Code Live Server extension — right-click index.html → "Open with Live Server"
```

Open `http://localhost:3000` in your browser.

### Configure the frontend to point at the backend

The frontend auto-detects the environment via `config.js`:

| Hostname | Resolved `API_BASE_URL` |
|----------|------------------------|
| `localhost` | `http://localhost:8080` (local Spring Boot) |
| `*.sichrplace.com` | `https://api.sichrplace.com` (DigitalOcean beta/prod) |

For **local-mssql** development, no config change is needed — the frontend
at `localhost:3000` will call `localhost:8080` automatically.

For **beta-mssql** (droplet), use the `.env.development.mssql` file described
in [§3 below](#3--frontend-env-variants).

---

## 1  The Golden Path: Favorite an Apartment

This is the single action we trace end-to-end.

### Step 1 — Open the frontend and log in

1. Navigate to `http://localhost:3000/login.html`.
2. Enter credentials:
   - **Email:** `charlie.student@rwth-aachen.de`
   - **Password:** `password123`
3. Click **Log In**.

**What happens under the hood:**

```
Browser                    Spring Boot                         MSSQL
───────                    ───────────                         ─────
login.html                 
  └─ POST /api/auth/login  
     { email, password }   UserController.login()
                             └─ UserService.authenticate()
                                  └─ UserRepository
                                       .findByEmail(email)     → SELECT * FROM users
                                                                  WHERE email = ?
                                  └─ BCrypt.matches(password)
                                  └─ JwtTokenProvider
                                       .generateToken(user)
                           ← 200 { accessToken, user }
  └─ localStorage
       .setItem("token", …)
```

**Frontend code path:**
- [`frontend/login.html`](../../sichrplace/frontend/login.html) — form UI
- [`frontend/js/config.js`](../../sichrplace/frontend/js/config.js) — resolves `API_BASE_URL`
- Login JS calls `fetch(CONFIG.API_BASE_URL + '/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })`

**Backend code path:**
- [`UserController.java`](../src/main/java/com/sichrplace/backend/controller/UserController.java) — `@PostMapping("/api/auth/login")`
- [`UserServiceImpl.java`](../src/main/java/com/sichrplace/backend/service/UserServiceImpl.java) — password check + JWT
- [`UserRepository.java`](../src/main/java/com/sichrplace/backend/repository/UserRepository.java) — `findByEmail()`

**MSSQL table:** `users` — Charlie's row:

| Column | Value |
|--------|-------|
| `email` | `charlie.student@rwth-aachen.de` |
| `first_name` | `Charlie` |
| `last_name` | `Student` |
| `role` | `TENANT` |

### Step 2 — Browse apartments

1. Navigate to `http://localhost:3000/apartments-listing.html`.
2. You should see 4 seeded apartments.

**API call:** `GET /api/apartments` with `Authorization: Bearer <token>`.

**Backend path:** `ApartmentController.getAllApartments()` → `ApartmentService` → `ApartmentRepository.findAll()`.

**MSSQL table:** `apartments` (4 rows).

### Step 3 — Favorite an apartment

1. On the apartment listing page, click the favorite/heart icon on **Apartment #3**
   (*"WG-Zimmer nahe Informatikzentrum"*).

**What happens under the hood:**

```
Browser                        Spring Boot                         MSSQL
───────                        ───────────                         ─────
apartments-listing.html        
  └─ POST /api/favorites/3     
     Authorization: Bearer …   FavoriteController.addFavorite()
                                 └─ FavoriteService.addFavorite()
                                      └─ userRepository
                                           .findById(userId)       → SELECT … FROM users
                                      └─ apartmentRepository
                                           .findById(3)            → SELECT … FROM apartments
                                      └─ favoriteRepository
                                           .save(new UserFavorite) → INSERT INTO user_favorites
                                                                       (user_id, apartment_id, …)
                                ← 200 { id, userId, apartmentId }
  └─ UI updates heart icon
     to filled/red
```

**Frontend code path:**
- [`frontend/apartments-listing.html`](../../sichrplace/frontend/apartments-listing.html) — listing UI
- JS calls `fetch(CONFIG.API_BASE_URL + '/api/favorites/3', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } })`

**Backend code path:**
- [`FavoriteController.java`](../src/main/java/com/sichrplace/backend/controller/FavoriteController.java) — `@PostMapping("/api/favorites/{apartmentId}")`
- [`FavoriteServiceImpl.java`](../src/main/java/com/sichrplace/backend/service/FavoriteServiceImpl.java) — duplicate check + save
- [`FavoriteRepository.java`](../src/main/java/com/sichrplace/backend/repository/FavoriteRepository.java) — `save()`

**MSSQL table:** `user_favorites`

### Step 4 — Verify the row in MSSQL

Open SSMS (SQL Server Management Studio) or use `sqlcmd`:

```sql
SELECT uf.id, u.email, a.title, uf.created_at
FROM   user_favorites uf
JOIN   users u ON u.id = uf.user_id
JOIN   apartments a ON a.id = uf.apartment_id
WHERE  u.email = 'charlie.student@rwth-aachen.de';
```

Expected output:

| id | email | title | created_at |
|----|-------|-------|------------|
| … | charlie.student@rwth-aachen.de | WG-Zimmer nahe Informatikzentrum | *(just now)* |

### Step 5 — Verify via API

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# List Charlie's favorites
curl -s http://localhost:8080/api/favorites \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

---

## 2  Diagram References

The golden path touches these diagrams from the thesis:

| Diagram | What it shows for this flow |
|---------|----------------------------|
| [ERD](diagrams/erd_sichrplace.png) | `users` ← `user_favorites` → `apartments` (many-to-many via join entity) |
| [Architecture flow](diagrams/arch_request_flow.png) | HTTP → Caddy → Controller → Service → Repository → MSSQL |
| [Sequence: Send Message](diagrams/sequence_send_message.png) | Same layered pattern — substitute "favorite" for "message" |
| [State chart: ViewingRequest](diagrams/state_message_lifecycle.png) | Shows how stateful entities transition — favorites are simpler (add/remove only) |

---

## 3  Frontend Env Variants

The frontend's [`config.js`](../../sichrplace/frontend/js/config.js) auto-detects
the environment by hostname. For explicit control, create one of these env
files in the frontend repo root:

### `.env.development.mssql` — Point at local Spring Boot + MSSQL

```env
# SichrPlace Frontend — Local MSSQL Backend
# Usage: load these vars before starting the frontend dev server

VITE_API_BASE_URL=http://localhost:8080
VITE_ENVIRONMENT=development

# Seed user credentials (for testing)
VITE_TEST_EMAIL=charlie.student@rwth-aachen.de
VITE_TEST_PASSWORD=password123
```

> **Note:** The vanilla JS frontend reads `config.js` directly, not `.env`
> files. These env files serve as **documentation** of the expected values
> and can be consumed by build tools if the frontend is migrated to Vite/Webpack.

### `.env.beta.mssql` — Point at DigitalOcean droplet

```env
# SichrPlace Frontend — Beta MSSQL Backend (DigitalOcean)
# The Caddy reverse proxy on 206.189.53.163 serves HTTPS at api.sichrplace.com

VITE_API_BASE_URL=https://api.sichrplace.com
VITE_ENVIRONMENT=production

# Same seed users as local — identical DataSeeder
VITE_TEST_EMAIL=charlie.student@rwth-aachen.de
VITE_TEST_PASSWORD=password123
```

### How to override `config.js` for beta

If serving the frontend locally but pointing at the droplet backend, add this
before `config.js` loads:

```html
<script>
  // Override: point at beta-mssql backend instead of localhost
  window.__SICHRPLACE_API_OVERRIDE__ = 'https://api.sichrplace.com';
</script>
```

Then modify `config.js`'s getter:

```javascript
get API_BASE_URL() {
    if (window.__SICHRPLACE_API_OVERRIDE__) return window.__SICHRPLACE_API_OVERRIDE__;
    return this.ENVIRONMENT === 'production' ? this.PRODUCTION_API_URL : this.DEVELOPMENT_API_URL;
}
```

### Backend variants summary

| Variant | Backend URL | Profile | Database |
|---------|------------|---------|----------|
| **Local MSSQL** | `http://localhost:8080` | `local-mssql` | Docker MSSQL on `localhost:1433` |
| **Beta MSSQL** (droplet) | `https://api.sichrplace.com` | `beta-mssql` | Docker MSSQL on `206.189.53.163:1433` |
| **Local PostgreSQL** | `http://localhost:8080` | `local` | Docker PostgreSQL on `localhost:5432` |

---

## 4  End-to-End Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  BROWSER  (http://localhost:3000)                                           │
│                                                                              │
│  login.html ─── POST /api/auth/login ──────────────────────────┐             │
│  apartments-listing.html ─── GET /api/apartments ──────────────┤             │
│  apartments-listing.html ─── POST /api/favorites/3 ────────────┤             │
│                                                                 │             │
└─────────────────────────────────────────────────────────────────┼─────────────┘
                                                                  │
                                                          HTTP (localhost:8080)
                                                                  │
┌─────────────────────────────────────────────────────────────────▼─────────────┐
│  SPRING BOOT 3.2.2                                                           │
│                                                                              │
│  UserController ──── UserService ──── UserRepository ─────┐                  │
│  ApartmentController ── ApartmentService ── ApartmentRepo ┤                  │
│  FavoriteController ─── FavoriteService ── FavoriteRepo ───┤                  │
│                                                            │                  │
│  JwtAuthenticationFilter  (validates Bearer token)         │                  │
│  SecurityConfig           (@PreAuthorize role checks)      │                  │
│                                                            │                  │
└────────────────────────────────────────────────────────────┼──────────────────┘
                                                             │
                                                         JDBC (port 1433)
                                                             │
┌────────────────────────────────────────────────────────────▼──────────────────┐
│  MSSQL 2025 Developer                                                        │
│                                                                              │
│  users  ◄──────── user_favorites ────────►  apartments                       │
│  (id, email,       (id, user_id,             (id, title,                     │
│   password,         apartment_id,             monthly_rent,                  │
│   role, …)          created_at)               city, …)                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5  Related Documentation

| Document | Repo | What it covers |
|----------|------|---------------|
| [`docs/ENV_SETUP_GUIDE.MD`](ENV_SETUP_GUIDE.MD) | Backend | MSSQL Docker setup, `.env.local`, Spring profiles |
| [`docs/API_ENDPOINTS_BACKEND.md`](API_ENDPOINTS_BACKEND.md) | Backend | All 55 endpoints with curl examples |
| [`docs/SEED_WORKPLACE_MSSQL.md`](SEED_WORKPLACE_MSSQL.md) | Backend | 43-row seed data breakdown |
| [`docs/TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md) | Backend | 3 lab sessions, 9 exercises |
| [`docs/FULLSTACK_LAB_EXERCISES.md`](FULLSTACK_LAB_EXERCISES.md) | Backend | Full-stack tracing exercise |
| [`THESIS_OVERVIEW_BACKEND.md`](../THESIS_OVERVIEW_BACKEND.md) | Backend | Thesis-level architecture overview |
| [`DEMO_SCRIPT_BACKEND.md`](../DEMO_SCRIPT_BACKEND.md) | Backend | Live demo guide (API + frontend) |
| [`ENV_SETUP_GUIDE.md`](../../sichrplace/ENV_SETUP_GUIDE.md) | Frontend | Supabase/Gmail/PayPal credentials |
| [`FRONTEND_DESIGN_GUIDE.md`](../../sichrplace/FRONTEND_DESIGN_GUIDE.md) | Frontend | CSS system, responsive breakpoints |
| [`README.md`](../../sichrplace/README.md) | Frontend | Full frontend overview |
