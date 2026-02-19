# SichrPlace Tutorium Roadmap

## Enterprise Backend Architecture for Open-Source GitHub Hosting

> **Prepared for:** SichrPlace tutorium students
> **Last Updated:** February 2026
> **Repo:** `omer3kale/sichrplace-backend` (Spring Boot 3.2.2 / Java 21)

---

## 1. Platform Overview – "One Product, Many Services"

SichrPlace is a secure apartment-rental platform. The codebase is split across
multiple platforms, but they all serve the **same product**:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SichrPlace Product                           │
│                                                                     │
│  ┌─────────────┐   ┌─────────────────┐   ┌────────────────────┐    │
│  │  Frontend    │   │   Java Backend  │   │  Database (MSSQL)  │    │
│  │  (SichrPlace │   │  Spring Boot    │   │  on DigitalOcean   │    │
│  │   on GitHub  │   │  on VPS/Docker  │   │  Droplet (Docker)  │    │
│  │   Pages)     │   │                 │   │                    │    │
│  └──────┬───────┘   └────────┬────────┘   └────────┬───────────┘    │
│         │   HTTPS            │  JDBC               │               │
│         │   api.sichrplace   │  port 1433           │               │
│         │   .com             │                      │               │
│         └────────────────────┴──────────────────────┘               │
└──────────────────────────────────────────────────────────────────────┘
```

| Component        | Platform         | Repo / Location                        | Purpose                      |
|------------------|------------------|----------------------------------------|------------------------------|
| **Frontend**     | GitHub Pages     | `SichrPlace` org on GitHub (beta)      | HTML/JS/CSS SPA              |
| **Backend API**  | DigitalOcean VPS | `omer3kale/sichrplace-backend`         | Spring Boot REST API         |
| **Database**     | DigitalOcean VPS | Docker container on same droplet       | MSSQL Server (Linux Docker)  |
| **Reverse Proxy**| DigitalOcean VPS | Caddy 2 (Docker container)             | TLS termination, HTTPS       |
| **CI/CD**        | GitHub Actions   | `.github/workflows/deploy-backend.yml` | Build → GHCR → auto-deploy   |
| **Container Reg**| GHCR             | `ghcr.io/omer3kale/sichrplace-api`     | Docker image hosting         |

---

## 2. Java Backend Architecture – Layer-by-Layer

### 2.1 Project Structure (66 Java Files)

```
src/main/java/com/sichrplace/backend/
├── SichrPlaceBackendApplication.java      ← @SpringBootApplication entry point
│
├── controller/   (9 controllers)          ← REST endpoints, @RequestMapping
│   ├── AdminController.java               ← /api/admin/*
│   ├── ApartmentController.java           ← /api/apartments/*
│   ├── ConversationController.java        ← /api/conversations/*
│   ├── FavoriteController.java            ← /api/favorites/*
│   ├── ListingController.java             ← /api/listings/*
│   ├── NotificationController.java        ← /api/notifications/*
│   ├── ReviewController.java              ← /api/reviews/*
│   ├── UserController.java                ← /api/auth/*
│   └── ViewingRequestController.java      ← /api/viewing-requests/*
│
├── service/      (9 interfaces + 9 impls) ← Business logic
│   ├── ApartmentService.java              ← Interface
│   └── ApartmentServiceImpl.java          ← Implementation (injected via @Service)
│   └── ... (same pattern for all 9)
│
├── repository/   (9 repositories)         ← JPA data access
│   ├── ApartmentRepository.java           ← extends JpaRepository<Apartment, Long>
│   └── ... (one per entity)
│
├── model/        (9 JPA entities)         ← @Entity classes ↔ database tables
│   ├── Apartment.java                     ← @Table(name = "apartments")
│   ├── User.java                          ← @Table(name = "users")
│   └── ...
│
├── dto/          (24 DTOs)                ← Request/Response objects
│   ├── RegisterRequest.java               ← POST /api/auth/register body
│   ├── ApartmentDto.java                  ← GET /api/apartments response
│   └── ...
│
├── config/       (4 config classes)       ← Spring configuration
│   ├── SecurityConfig.java                ← CORS, JWT filter, auth rules
│   ├── GlobalExceptionHandler.java        ← @RestControllerAdvice
│   ├── JpaAuditingConfig.java             ← @CreatedDate/@LastModifiedDate support
│   └── OpenApiConfig.java                 ← Swagger UI configuration
│
└── security/     (2 security classes)     ← JWT authentication
    ├── JwtTokenProvider.java              ← Generate/validate/parse JWT tokens
    └── JwtAuthenticationFilter.java       ← OncePerRequestFilter in SecurityFilterChain
```

### 2.2 The Request Flow (How a Frontend Call Reaches the Database)

```
  Browser                  Caddy             Spring Boot                 MSSQL
  (SichrPlace)             (Reverse Proxy)   (Java Backend)              (Database)
     │                        │                   │                        │
     │ GET /api/apartments    │                   │                        │
     ├───────────────────────►│                   │                        │
     │                        │ proxy to :8080    │                        │
     │                        ├──────────────────►│                        │
     │                        │                   │                        │
     │                        │     ┌─────────────┼───────────────┐        │
     │                        │     │ SecurityFilterChain         │        │
     │                        │     │  1. JwtAuthenticationFilter │        │
     │                        │     │  2. CORS filter             │        │
     │                        │     └─────────────┼───────────────┘        │
     │                        │                   │                        │
     │                        │     ┌─────────────┼───────────────┐        │
     │                        │     │ ApartmentController         │        │
     │                        │     │  @GetMapping("/api/...")     │        │
     │                        │     └─────────────┼───────────────┘        │
     │                        │                   │                        │
     │                        │     ┌─────────────┼───────────────┐        │
     │                        │     │ ApartmentServiceImpl        │        │
     │                        │     │  Business logic + validation│        │
     │                        │     └─────────────┼───────────────┘        │
     │                        │                   │                        │
     │                        │     ┌─────────────┼───────────────┐        │
     │                        │     │ ApartmentRepository (JPA)   │        │
     │                        │     │  → Hibernate → JDBC         │        │
     │                        │     └─────────────┼───────────────┘        │
     │                        │                   │   SQL query            │
     │                        │                   ├───────────────────────►│
     │                        │                   │   ResultSet            │
     │                        │                   │◄───────────────────────┤
     │                        │   JSON response   │                        │
     │                        │◄──────────────────┤                        │
     │   JSON response        │                   │                        │
     │◄───────────────────────┤                   │                        │
```

---

## 3. Complete API Endpoint Map (47 Endpoints)

### Authentication (`/api/auth`) — PUBLIC + AUTHENTICATED

| Method   | Endpoint              | Auth      | Description                    |
|----------|-----------------------|-----------|--------------------------------|
| `POST`   | `/api/auth/register`  | Public    | Create new account             |
| `POST`   | `/api/auth/login`     | Public    | Login → JWT access + refresh   |
| `GET`    | `/api/auth/profile`   | JWT       | Get current user profile       |
| `PUT`    | `/api/auth/profile`   | JWT       | Update current user profile    |
| `GET`    | `/api/auth/users/{id}`| Public    | Get user by ID (public info)   |

### Apartments (`/api/apartments`) — PUBLIC + LANDLORD/ADMIN

| Method   | Endpoint                          | Auth           | Description            |
|----------|-----------------------------------|----------------|------------------------|
| `GET`    | `/api/apartments`                 | Public         | Search/filter listings |
| `GET`    | `/api/apartments/{id}`            | Public         | Get apartment details  |
| `POST`   | `/api/apartments`                 | LANDLORD/ADMIN | Create apartment       |
| `PUT`    | `/api/apartments/{id}`            | LANDLORD/ADMIN | Update apartment       |
| `DELETE` | `/api/apartments/{id}`            | LANDLORD/ADMIN | Delete apartment       |
| `GET`    | `/api/apartments/owner/listings`  | LANDLORD/ADMIN | My listings            |

### Reviews (`/api/reviews`) — PUBLIC + AUTHENTICATED + ADMIN

| Method   | Endpoint                               | Auth   | Description              |
|----------|----------------------------------------|--------|--------------------------|
| `GET`    | `/api/reviews/apartment/{id}`          | Public | List apartment reviews   |
| `GET`    | `/api/reviews/apartment/{id}/stats`    | Public | Rating statistics        |
| `POST`   | `/api/reviews/apartment/{id}`          | JWT    | Submit review            |
| `PUT`    | `/api/reviews/{reviewId}`              | JWT    | Edit own review          |
| `DELETE` | `/api/reviews/{reviewId}`              | JWT    | Delete own review        |
| `GET`    | `/api/reviews/my`                      | JWT    | My reviews               |
| `GET`    | `/api/reviews/pending`                 | ADMIN  | Pending moderation queue |
| `POST`   | `/api/reviews/{reviewId}/moderate`     | ADMIN  | Approve/reject review    |

### Conversations & Messages (`/api/conversations`) — AUTHENTICATED

| Method   | Endpoint                                   | Auth | Description            |
|----------|--------------------------------------------|------|------------------------|
| `POST`   | `/api/conversations`                       | JWT  | Start conversation     |
| `GET`    | `/api/conversations`                       | JWT  | My conversations       |
| `GET`    | `/api/conversations/{id}`                  | JWT  | Conversation detail    |
| `GET`    | `/api/conversations/{id}/messages`         | JWT  | Message history        |
| `POST`   | `/api/conversations/{id}/messages`         | JWT  | Send message           |
| `PATCH`  | `/api/conversations/messages/{msgId}`      | JWT  | Edit message           |
| `DELETE` | `/api/conversations/messages/{msgId}`      | JWT  | Delete message         |
| `PATCH`  | `/api/conversations/{id}/read`             | JWT  | Mark as read           |
| `GET`    | `/api/conversations/unread/count`          | JWT  | Unread count           |

### Favorites (`/api/favorites`) — AUTHENTICATED

| Method   | Endpoint                           | Auth | Description            |
|----------|------------------------------------|------|------------------------|
| `POST`   | `/api/favorites/{apartmentId}`     | JWT  | Add to favorites       |
| `DELETE` | `/api/favorites/{apartmentId}`     | JWT  | Remove from favorites  |
| `GET`    | `/api/favorites`                   | JWT  | My favorites list      |
| `GET`    | `/api/favorites/{apartmentId}/check`| JWT | Is favorited?          |
| `GET`    | `/api/favorites/count`             | JWT  | Total favorites count  |

### Viewing Requests (`/api/viewing-requests`) — TENANT + LANDLORD/ADMIN

| Method   | Endpoint                                              | Auth           | Description           |
|----------|-------------------------------------------------------|----------------|-----------------------|
| `POST`   | `/api/viewing-requests`                               | TENANT         | Request viewing       |
| `GET`    | `/api/viewing-requests/{id}`                          | JWT            | Get request detail    |
| `GET`    | `/api/viewing-requests/my`                            | JWT            | My requests           |
| `GET`    | `/api/viewing-requests/my/paged`                      | TENANT         | My requests (paged)   |
| `GET`    | `/api/viewing-requests/apartment/{id}`                | LANDLORD/ADMIN | Requests for listing  |
| `GET`    | `/api/viewing-requests/apartment/{id}/paged`          | LANDLORD/ADMIN | Requests (paged)      |
| `PUT`    | `/api/viewing-requests/{id}/confirm`                  | LANDLORD/ADMIN | Confirm request       |
| `PUT`    | `/api/viewing-requests/{id}/decline`                  | LANDLORD/ADMIN | Decline request       |
| `PUT`    | `/api/viewing-requests/{id}/cancel`                   | TENANT         | Cancel own request    |

### Notifications (`/api/notifications`) — AUTHENTICATED

| Method   | Endpoint                                | Auth | Description          |
|----------|-----------------------------------------|------|----------------------|
| `GET`    | `/api/notifications`                    | JWT  | All notifications    |
| `GET`    | `/api/notifications/unread`             | JWT  | Unread only          |
| `GET`    | `/api/notifications/unread/count`       | JWT  | Unread count         |
| `PATCH`  | `/api/notifications/{id}/read`          | JWT  | Mark one as read     |
| `PATCH`  | `/api/notifications/read-all`           | JWT  | Mark all as read     |

### Admin (`/api/admin`) — ADMIN ONLY

| Method   | Endpoint                               | Auth  | Description          |
|----------|----------------------------------------|-------|----------------------|
| `GET`    | `/api/admin/dashboard`                 | ADMIN | Dashboard stats      |
| `GET`    | `/api/admin/users`                     | ADMIN | List all users       |
| `PATCH`  | `/api/admin/users/{id}/role`           | ADMIN | Change user role     |
| `PATCH`  | `/api/admin/users/{id}/status`         | ADMIN | Activate/deactivate  |
| `GET`    | `/api/admin/reviews/pending`           | ADMIN | Pending reviews      |
| `POST`   | `/api/admin/reviews/{id}/moderate`     | ADMIN | Moderate review      |

---

## 4. Database Schema – 9 Tables

```
┌───────────────────────────────────────────────────────────────────────┐
│                     SichrPlace Database Schema                       │
│                                                                      │
│  ┌─────────┐         ┌──────────────┐       ┌────────────────────┐   │
│  │  users   │────────►│  apartments  │◄──────│  apartment_reviews │   │
│  │         ○│         │              │       │                    │   │
│  └────┬─────┘         └──────┬───────┘       └────────────────────┘   │
│       │                      │                                       │
│       │    ┌─────────────────┤                                       │
│       │    │                 │                                       │
│       ▼    ▼                 ▼                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐        │
│  │conversations │    │user_favorites│    │ viewing_requests  │        │
│  │              │    │              │    │                   │        │
│  └──────┬───────┘    └──────────────┘    └───────────────────┘        │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐        │
│  │  messages    │    │notifications │    │    listings       │        │
│  │              │    │              │    │   (legacy)        │        │
│  └──────────────┘    └──────────────┘    └──────────────────┘        │
└───────────────────────────────────────────────────────────────────────┘
```

### Entity-Table Mapping

| Java Entity        | SQL Table            | Primary Key | Key Relationships                                |
|--------------------|----------------------|-------------|--------------------------------------------------|
| `User`             | `users`              | `id BIGINT` | Referenced by all other entities                 |
| `Apartment`        | `apartments`         | `id BIGINT` | `user_id → users.id` (owner)                    |
| `ApartmentReview`  | `apartment_reviews`  | `id BIGINT` | `apartment_id`, `reviewer_id`, `moderated_by`    |
| `Conversation`     | `conversations`      | `id BIGINT` | `participant_1_id`, `participant_2_id`, `apartment_id` |
| `Message`          | `messages`           | `id BIGINT` | `conversation_id`, `sender_id`                   |
| `Notification`     | `notifications`      | `id BIGINT` | `user_id → users.id`                             |
| `UserFavorite`     | `user_favorites`     | `id BIGINT` | `user_id`, `apartment_id` (unique together)      |
| `ViewingRequest`   | `viewing_requests`   | `id BIGINT` | `apartment_id`, `tenant_id`                      |
| `Listing`          | `listings`           | `id BIGINT` | `owner_id` (no FK — legacy entity)               |

### User Roles

| Role       | Capabilities                                              |
|------------|-----------------------------------------------------------|
| `TENANT`   | Search, favorite, review, message, request viewings       |
| `LANDLORD` | All tenant + create/manage apartments, confirm viewings   |
| `ADMIN`    | All + user management, review moderation, dashboard       |

---

## 5. MSSQL Setup Roadmap (DigitalOcean Droplet + Docker)

### 5.1 Why MSSQL on a Linux Droplet?

- The backend was originally built against **SQL Server** (see `application-local.yml`)
- Production currently runs PostgreSQL for cost reasons
- For the tutorium: we standardize on **MSSQL via Docker** (Linux container)
  to match the enterprise SQL Server pattern students learn in lectures

### 5.2 Step-by-Step: MSSQL Docker on the VPS

```bash
# Step 1 — SSH to the droplet
ssh deploy@206.189.53.163

# Step 2 — Pull the official MSSQL 2022 Linux image
docker pull mcr.microsoft.com/mssql/server:2022-latest

# Step 3 — Run MSSQL container
#   SA_PASSWORD must meet complexity requirements:
#     8+ chars, upper + lower + digit + special
docker run -d \
  --name sichrplace-mssql \
  --restart unless-stopped \
  -e 'ACCEPT_EULA=Y' \
  -e 'MSSQL_SA_PASSWORD=<STRONG_PASSWORD_HERE>' \
  -e 'MSSQL_PID=Developer' \
  -p 1433:1433 \
  -v mssql_data:/var/opt/mssql \
  --network sichrplace_backend \
  mcr.microsoft.com/mssql/server:2022-latest

# Step 4 — Create the database and user
docker exec -it sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U SA -P '<SA_PASSWORD>' -C \
  -Q "CREATE DATABASE sichrplace;
      GO
      USE sichrplace;
      CREATE LOGIN sichrplace_user WITH PASSWORD = '<APP_PASSWORD>';
      CREATE USER sichrplace_user FOR LOGIN sichrplace_user;
      ALTER ROLE db_owner ADD MEMBER sichrplace_user;
      GO"

# Step 5 — Verify connection
docker exec -it sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sichrplace_user -P '<APP_PASSWORD>' -d sichrplace -C \
  -Q "SELECT @@VERSION;"
```

### 5.3 Spring Boot Configuration for MSSQL

**`application-prod.yml`** would be updated to:

```yaml
spring:
  datasource:
    url: ${DATABASE_URL:jdbc:sqlserver://sichrplace-mssql:1433;databaseName=sichrplace;encrypt=true;trustServerCertificate=true}
    username: ${DATABASE_USERNAME:sichrplace_user}
    password: ${DATABASE_PASSWORD:changeme}
    driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
```

### 5.4 Environment Variables (`.env` on VPS — NEVER committed)

```env
# Database
DATABASE_URL=jdbc:sqlserver://sichrplace-mssql:1433;databaseName=sichrplace;encrypt=true;trustServerCertificate=true
DATABASE_USERNAME=sichrplace_user
DATABASE_PASSWORD=<generated-strong-password>

# JWT
JWT_SECRET=<generated-with-openssl-rand-base64-48>

# CORS
CORS_ALLOWED_ORIGINS=https://sichrplace.com,https://www.sichrplace.com,https://omer3kale.github.io
```

> **SECURITY RULE:** The `.env` file lives ONLY on the VPS. The repo
> contains `.env.example` with **blank** secret fields. Real secrets
> go into GitHub Actions encrypted secrets or the VPS `.env` file.

---

## 6. Secret & Environment Management Rules

### What Goes Where

| Item                    | Location                        | Committed to Git? |
|-------------------------|---------------------------------|--------------------|
| Database password       | VPS `.env` file                 | **NEVER**          |
| JWT secret              | VPS `.env` file                 | **NEVER**          |
| SSH deploy key          | GitHub Actions Secrets          | **NEVER**          |
| VPS IP address          | GitHub Actions Secrets          | **NEVER**          |
| JDBC URL template       | `application-prod.yml` (env var ref) | Yes (no real values) |
| Placeholder defaults    | `application-prod.yml`          | Yes (`changeme`)   |
| `.env.example`          | Repo root                       | Yes (blank fields) |
| `.env`                  | `.gitignore`                    | **BLOCKED**        |
| Local dev passwords     | `application-local.yml`         | Yes (dev only)     |

### Security Chain

```
GitHub Repo (public)
  └── .env.example (template, blank secrets)
  └── application-prod.yml (${ENV_VAR:placeholder} — no real values)
  └── .gitignore blocks .env

GitHub Actions Secrets (encrypted)
  └── VPS_HOST, VPS_USER, VPS_SSH_KEY

VPS /opt/sichrplace/.env (never leaves the server)
  └── DATABASE_PASSWORD=<real>
  └── JWT_SECRET=<real>
  └── CORS_ALLOWED_ORIGINS=<real>

Docker Compose reads .env → injects into containers at runtime
```

---

## 7. Platform Architecture Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                     GITHUB (Code + CI/CD + Hosting)                   │
│                                                                       │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ omer3kale/           │  │ SichrPlace/       │  │ GitHub Actions  │  │
│  │ sichrplace-backend   │  │ (frontend repo)   │  │ CI/CD Pipeline  │  │
│  │                      │  │                   │  │                 │  │
│  │ Spring Boot 3.2.2    │  │ HTML/JS/CSS       │  │ Build → GHCR   │  │
│  │ Java 21              │  │ Hosted on         │  │ Deploy → VPS   │  │
│  │ 66 Java files        │  │ GitHub Pages      │  │                 │  │
│  └──────────┬───────────┘  └──────────┬────────┘  └────────┬────────┘  │
│             │                         │                     │          │
│             │  docker push            │ HTTPS               │ SSH      │
│             ▼                         │                     ▼          │
│  ┌──────────────────────┐             │          ┌─────────────────┐  │
│  │ GHCR (Container Reg) │             │          │ Encrypted       │  │
│  │ ghcr.io/omer3kale/   │             │          │ Secrets         │  │
│  │ sichrplace-api:latest│             │          │ VPS_HOST        │  │
│  └──────────┬───────────┘             │          │ VPS_SSH_KEY     │  │
│             │                         │          └─────────────────┘  │
└─────────────┼─────────────────────────┼──────────────────────────────┘
              │ docker pull             │
              ▼                         │
┌────────────────────────────────────┐  │
│  DIGITALOCEAN DROPLET (VPS)        │  │
│  206.189.53.163 / FRA1 / 1GB      │  │
│                                    │  │
│  ┌──────────┐  ┌──────────┐       │  │
│  │ Caddy 2  │  │ MSSQL    │       │  │
│  │ :80/:443 │  │ :1433    │       │  │
│  │ (TLS)    │  │ (Docker) │       │  │
│  └────┬─────┘  └────┬─────┘       │  │
│       │              │             │  │
│       │  proxy       │  JDBC       │  │
│       ▼              │             │  │
│  ┌──────────┐        │             │  │
│  │ Spring   │◄───────┘             │  │
│  │ Boot API │                      │  │
│  │ :8080    │                      │  │
│  └──────────┘                      │  │
│                                    │  │
│  .env (secrets — NOT in git)       │  │
└────────────────────────────────────┘  │
              ▲                         │
              │  API calls              │
              │  api.sichrplace.com     │
              └─────────────────────────┘
                  Browser ← GitHub Pages
```

---

## 8. Key Java Files Students Should Study

### Start Here (follow the request flow)

| Order | File                          | What to Learn                           |
|-------|-------------------------------|-----------------------------------------|
| 1     | `SecurityConfig.java`         | How CORS, JWT, and auth rules work      |
| 2     | `JwtTokenProvider.java`       | How JWT tokens are created and validated |
| 3     | `JwtAuthenticationFilter.java`| How every request is intercepted        |
| 4     | `UserController.java`         | Register/login flow (`/api/auth/*`)     |
| 5     | `UserServiceImpl.java`        | Password hashing, token generation      |
| 6     | `ApartmentController.java`    | CRUD with role-based access             |
| 7     | `ApartmentServiceImpl.java`   | Business logic + repository pattern     |
| 8     | `ApartmentRepository.java`    | JPA queries, Specification pattern      |
| 9     | `Apartment.java`              | JPA entity → SQL table mapping          |
| 10    | `GlobalExceptionHandler.java` | How errors become JSON responses        |

### Configuration Files

| File                      | Purpose                                    |
|---------------------------|--------------------------------------------|
| `build.gradle`            | Dependencies (Spring, JJWT, MSSQL driver)  |
| `application.yml`         | Base config, active profile selection       |
| `application-local.yml`   | Local dev: MSSQL on localhost:1433          |
| `application-prod.yml`    | Production: env vars, no hardcoded secrets  |
| `Dockerfile`              | Multi-stage build: JDK→JRE, non-root user  |
| `docker-compose.yml`      | 3-service stack: db + api + caddy           |

---

## 9. How to Run Locally (For Students)

### Prerequisites

- Java 21 (Eclipse Temurin recommended)
- SQL Server (local install or Docker)
- Git

### Option A: Local SQL Server (Windows)

```bash
# Clone the repo
git clone https://github.com/omer3kale/sichrplace-backend.git
cd sichrplace-backend

# The default profile is 'local' which connects to localhost:1433
# Make sure SQL Server is running with:
#   - Database: sichrplace
#   - User: sichrplace_user
#   - Password: SichrPlace_Dev2026!

# Run
./gradlew bootRun
```

### Option B: Docker SQL Server (any OS)

```bash
# Start MSSQL in Docker
docker run -d --name mssql-dev \
  -e 'ACCEPT_EULA=Y' \
  -e 'MSSQL_SA_PASSWORD=SichrPlace_Dev2026!' \
  -e 'MSSQL_PID=Developer' \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest

# Create database
docker exec -it mssql-dev /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U SA -P 'SichrPlace_Dev2026!' -C \
  -Q "CREATE DATABASE sichrplace; GO"

# Run the app
./gradlew bootRun
```

### Verify It Works

```bash
# Health check
curl http://localhost:8080/api/health

# Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"Test1234!","firstName":"Max","lastName":"Mustermann","role":"TENANT"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"Test1234!"}'
# → Returns JWT token

# Browse apartments (public)
curl http://localhost:8080/api/apartments
```

---

## 10. Glossary for Students

| Term               | Meaning                                                       |
|--------------------|---------------------------------------------------------------|
| **Spring Boot**    | Java framework for building web APIs with minimal config      |
| **JPA/Hibernate**  | ORM — maps Java classes to database tables automatically      |
| **JWT**            | JSON Web Token — stateless authentication token               |
| **CORS**           | Cross-Origin Resource Sharing — allows frontend ≠ backend URL |
| **GHCR**           | GitHub Container Registry — stores Docker images              |
| **Caddy**          | Reverse proxy with automatic HTTPS/TLS certificates           |
| **Docker Compose** | Tool to run multi-container applications from one YAML file   |
| **DTO**            | Data Transfer Object — separates API shape from DB schema     |
| **Repository**     | Spring Data JPA interface — auto-generates SQL queries        |
| **`@PreAuthorize`**| Annotation that restricts access by role (ADMIN, LANDLORD...) |
| **Profile**        | Spring config mode: `local` for dev, `prod` for production   |
| **Droplet**        | DigitalOcean's name for a Virtual Private Server (VPS)        |
