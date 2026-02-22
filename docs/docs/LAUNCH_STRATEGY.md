# SichrPlace — Backend Launch Strategy

> **Version:** 1.0.0  
> **Authored:** 2026-02-21  
> **Scope:** Deploying the Spring Boot backend to a production-like environment (DigitalOcean droplet running MSSQL 2025 in Docker).  
> **Profile:** `prod-mssql` (all examples below assume `SPRING_PROFILES_ACTIVE=prod-mssql`)

---

## Table of Contents

1. [Required Environment Variables](#1-required-environment-variables)
2. [Pre-Deploy Checklist](#2-pre-deploy-checklist)
3. [Database Migration](#3-database-migration)
4. [Startup Verification](#4-startup-verification)
5. [Rollback Strategy](#5-rollback-strategy)
6. [Health Monitoring](#6-health-monitoring)
7. [Rate Limiting Guidance](#7-rate-limiting-guidance)
8. [JWT Key Rotation](#8-jwt-key-rotation)

---

## 1. Required Environment Variables

Set these in `/opt/sichrplace/.env` on the droplet (or inject via docker-compose):

### Database

| Variable | Example | Required |
|----------|---------|----------|
| `PROD_DB_HOST` | `db.internal` | ✅ |
| `PROD_DB_PORT` | `1433` | (default: `1433`) |
| `PROD_DB_NAME` | `sichrplace` | (default: `sichrplace`) |
| `PROD_DB_USER` | `sichrplace_user` | ✅ |
| `PROD_DB_PASS` | _(generated)_ | ✅ |
| `PROD_DB_ENCRYPT` | `true` | (default: `true`) |
| `PROD_DB_TRUST_SERVER_CERTIFICATE` | `false` | (default: `false`) |

### JWT / Auth

| Variable | Example | Required |
|----------|---------|----------|
| `JWT_SECRET` | _(min 32-char random)_ | ✅ |
| `JWT_SECRET_PREVIOUS` | _(old secret during rotation)_ | only during rotation |
| `JWT_EXPIRATION` | `900000` (15 min) | (default: `86400000` = 24 h) |
| `JWT_REFRESH_EXPIRATION` | `1209600000` (14 days) | (default: `604800000` = 7 days) |
| `REFRESH_TOKEN_EXPIRATION_DAYS` | `14` | (default: `14`) |

**Generating a strong `JWT_SECRET` (PowerShell):**
```powershell
[System.Convert]::ToBase64String((1..48 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

### Email (SMTP)

| Variable | Example | Required |
|----------|---------|----------|
| `SMTP_HOST` | `smtp.sendgrid.net` | ✅ |
| `SMTP_PORT` | `587` | (default: `587`) |
| `SMTP_USER` | `apikey` | ✅ |
| `SMTP_PASS` | _(SendGrid API key)_ | ✅ |
| `EMAIL_FROM` | `noreply@sichrplace.de` | (default provided) |
| `EMAIL_PROVIDER` | `smtp` | (default: `smtp`) |

### CORS

| Variable | Example | Required |
|----------|---------|----------|
| `CORS_ALLOWED_ORIGINS` | `https://sichrplace.com,https://www.sichrplace.com` | ✅ |

### Rate Limiting

| Variable | Default (prod) | Notes |
|----------|---------------|-------|
| `RATE_LIMIT_CAPACITY` | `20` | Token-bucket capacity per client IP |
| `RATE_LIMIT_REFILL_TOKENS` | `20` | Tokens added per refill period |
| `RATE_LIMIT_REFILL_SECONDS` | `60` | Refill period in seconds |

Tune these based on observed traffic.  The rate limiter is in-memory; for multi-instance
deployments, replace the `ConcurrentHashMap` with a Redis-backed Bucket4j store.

### Server

| Variable | Default |
|----------|---------|
| `PORT` | `8080` |
| `LOGIN_MAX_FAILED_ATTEMPTS` | `5` |
| `LOGIN_LOCKOUT_MINUTES` | `30` |

---

## 2. Pre-Deploy Checklist

```
[ ] .env file populated with all ✅ required variables above
[ ] MSSQL container is running and accepting connections on PROD_DB_HOST:PROD_DB_PORT
[ ] Database `sichrplace` created and Flyway migration user has ALTER TABLE rights
[ ] `JWT_SECRET` is at least 32 characters; NOT the development default
[ ] SMTP credentials verified (send a test email before deploying)
[ ] CORS_ALLOWED_ORIGINS includes all frontend domains (no trailing slashes)
[ ] Firewall: port 8080 (or PORT) reachable from load balancer / Nginx only
[ ] TLS termination in front of the JAR (Nginx → HTTP internally)
[ ] Backup of current database taken before first Flyway run
```

---

## 3. Database Migration

### How it works

Flyway runs **automatically on startup** — no manual `flyway migrate` command needed.

On first boot:
1. Spring Boot loads `application-prod-mssql.yml`.
2. Flyway scans `classpath:db/migration` for scripts `V001__*.sql` through `V007__*.sql`.
3. Flyway executes any un-applied scripts in order.
4. Hibernate validates the schema against the entity model (`ddl-auto: validate`).
   If there is a mismatch, startup fails with a clear error.

### Migration scripts (V001–V007)

| Script | Table(s) created |
|--------|-----------------|
| V001 | `roles` |
| V002 | `users` |
| V003 | `apartments` |
| V004 | `reviews`, `conversations`, `messages` |
| V005 | `saved_searches` |
| V006 | `refresh_tokens` |
| V007 | Account lockout columns (`failed_login_count`, `locked_until`) on `users` |

### First-boot sequence

```bash
# 1. Start the MSSQL container
docker compose -f docker-compose.mssql.yml up -d database

# 2. Wait for MSSQL to be ready (~30 s)
sleep 30

# 3. Start the Spring Boot JAR — Flyway runs automatically
SPRING_PROFILES_ACTIVE=prod-mssql java -jar sichrplace-backend.jar
```

### Schema validation failures

If the startup log contains `Schema-validation: missing table` or `missing column`,
the Flyway history table is out of sync with the entity model.  Resolution:

1. Check `flyway_schema_history` table — identify which migrations applied.
2. If a migration script was edited after being applied, Flyway will refuse to run
   (`Checksum mismatch`).  **Never edit applied migration scripts.**  Write a new
   migration instead.
3. In a dev/breaking-change scenario only: `DROP DATABASE sichrplace; CREATE DATABASE sichrplace;`
   and let Flyway re-run from scratch.

---

## 4. Startup Verification

After the JAR is running, confirm health before switching traffic:

```bash
# Liveness probe (always returns 200 if JVM is up)
curl https://sichrplace.com/api/health
# Expected: { "status": "UP", "timestamp": "...", "uptime": ... }

# Readiness probe (confirms DB connectivity)
curl https://sichrplace.com/api/health/db-readiness
# Expected: { "status": "UP", "database": "reachable", ... }
```

Both endpoints are **unauthenticated** (`/api/health/**` is `permitAll` in `SecurityConfig`).

**Fail-fast:** if `/api/health/db-readiness` returns anything other than `200`, the
database connection is broken.  Do **not** route production traffic to this instance.

---

## 5. Rollback Strategy

### Application rollback

The backend is a single self-contained JAR.  Rolling back is:

```bash
# 1. Stop the running process
systemctl stop sichrplace-backend   # or kill the process

# 2. Restore the previous JAR (keep two versions on disk)
cp /opt/sichrplace/releases/sichrplace-backend-PREV.jar \
   /opt/sichrplace/sichrplace-backend.jar

# 3. Restart
systemctl start sichrplace-backend
```

Keep the last two JAR releases in `/opt/sichrplace/releases/` at all times.

### Database rollback

**Flyway migrations are intentionally forward-only.**  There is no `flyway undo` in
the free tier.  The rollback strategy for database changes is:

1. **Before shipping any migration:** take a DB snapshot (MSSQL `BACKUP DATABASE`).
2. If a migration causes a live incident:
   a. Roll back the JAR to the previous version (steps above).
   b. Restore the database from the pre-migration backup.
3. Fix the migration script in a new file (`V008__fix_...sql`) — never edit a
   committed migration.

**Additive-only policy:** All schema changes in Phase 0–1 are additive (new tables,
new nullable columns).  Rolling back the JAR without restoring the DB is therefore
safe — the old code ignores the new columns.

---

## 6. Health Monitoring

### Endpoints

| Endpoint | Purpose | Expected response |
|----------|---------|------------------|
| `GET /api/health` | Liveness: JVM is up | `200 { status: "UP" }` |
| `GET /api/health/db-readiness` | Readiness: DB reachable | `200 { status: "UP", database: "reachable" }` |

### Recommended external checks

Configure an uptime monitor (e.g., UptimeRobot / Betterstack) to:

- Poll `GET /api/health` every 60 s — alert if not `200`.
- Poll `GET /api/health/db-readiness` every 60 s — alert if not `200`.

### Spring Boot log levels (prod-mssql profile)

```
root:              WARN
com.sichrplace:   INFO
com.zaxxer.hikari: INFO
```

Rate-limit warnings are logged at WARN:
```
WARN  RateLimitingFilter - Rate limit exceeded — ip=1.2.3.4 path=/api/auth/login
```

---

## 7. Rate Limiting Guidance

The `RateLimitingFilter` protects these POST endpoints:

- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/forgot-password`
- `/api/auth/refresh`

**Default prod limits:** 20 tokens, refilled 20/60 s per IP.  Under normal usage
a single user will never hit this.  Brute-force or credential-stuffing bots will
receive `429 Too Many Requests` with `Retry-After: 60`.

**Scaling note:** The bucket store is in-memory (`ConcurrentHashMap`).  If multiple
instances of the JAR are deployed behind a load balancer, each instance has its own
independent buckets.  For distributed rate limiting, replace the map with a
Redis-backed Bucket4j `ProxyManager`.

---

## 8. JWT Key Rotation

To rotate the JWT secret with zero downtime:

### Step 1 — Expand (add previous secret)

1. Set `JWT_SECRET_PREVIOUS` = current `JWT_SECRET` value.
2. Set `JWT_SECRET` = new secret.
3. Redeploy.

During the overlap period, `JwtTokenProvider` validates tokens signed with **either**
secret.  Existing sessions remain valid.

### Step 2 — Contract (remove previous secret, after access tokens expire)

Access tokens expire in 15 minutes (default) or `JWT_EXPIRATION` ms.  Once all
tokens signed with the old secret have expired:

1. Unset / clear `JWT_SECRET_PREVIOUS`.
2. Redeploy.

After this step, only tokens signed with the current `JWT_SECRET` are accepted.
