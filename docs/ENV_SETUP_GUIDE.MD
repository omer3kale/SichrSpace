# SichrPlace — Environment Setup Guide

> For SE tutorium students and contributors.
> Last updated: February 2026.

---

## Pre-Flight Checklist

Before you start, confirm:

- [ ] Java 17+ installed (`java -version`)
- [ ] SQL Server installed (Developer Edition or Docker)
- [ ] SSMS installed (optional but recommended on Windows)
- [ ] `sichrplace` database created with `sichrplace_user` login
- [ ] Environment variables set (see Section 3)
- [ ] Correct Spring profile selected (see Section 1)

---

## 1. Spring Profile Map

SichrPlace uses Spring profiles to switch between database environments.
The **Java code never changes** — only the active profile does.

| Profile | Activate with | DB Host | DB Engine | Credentials from | Use case |
|---------|--------------|---------|-----------|-----------------|----------|
| `local` | `--spring.profiles.active=local` | `localhost:1433` | MSSQL (native Windows) | Hardcoded dev values | Quick local dev |
| `local-mssql` | `--spring.profiles.active=local-mssql` | `localhost:1433` | MSSQL (Docker or native) | `LOCAL_DB_USER`, `LOCAL_DB_PASS` | **Recommended for students** |
| `beta-mssql` | `--spring.profiles.active=beta-mssql` | `${BETA_DB_HOST}:1433` | MSSQL (Docker on droplet) | `BETA_DB_USER`, `BETA_DB_PASS` | Shared beta / thesis demo |
| `beta` | `--spring.profiles.active=beta` | `${DATABASE_URL}` | MSSQL or PostgreSQL | `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Generic beta (any DB) |
| `prod` | `--spring.profiles.active=prod` | `database:5432` | PostgreSQL (Docker on VPS) | `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Production |

**Key files:**

```
src/main/resources/
  application.yml              <- base config (no secrets)
  application-local.yml        <- native Windows MSSQL, dev defaults
  application-local-mssql.yml  <- Docker MSSQL, env var credentials
  application-beta-mssql.yml   <- droplet MSSQL, env var credentials
  application-beta.yml         <- generic beta, any DB via env vars
  application-prod.yml         <- PostgreSQL production
```

> **Teaching question:** How does separating environments by Spring profiles
> help avoid leaking real secrets into the public GitHub repo?

---

## 2. Desktop Setup — MSSQL on Windows

### Option A: SQL Server Developer Edition (native install)

1. **Download** SQL Server 2022/2025 Developer Edition from
   [Microsoft Downloads](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. **Run installer** -> choose **Developer** edition -> **Basic** installation type
3. During setup:
   - Authentication mode: **Mixed** (Windows + SQL auth)
   - Set a strong `sa` password
4. **Install SSMS** from [aka.ms/ssms](https://aka.ms/ssms)

### Option B: Docker Desktop (recommended for students)

```powershell
# Start MSSQL 2025 Developer container
docker compose -f docker-compose.local-mssql.yml up -d
```

Or manually:

```powershell
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=SichrDev2025!" `
  -e "MSSQL_PID=Developer" -p 1433:1433 --name sichrplace-mssql `
  -d mcr.microsoft.com/mssql/server:2025-latest
```

### Create Database + User (both options)

Connect via SSMS or `sqlcmd` and run the provided init script:

```sql
-- Quick command block: paste into SSMS query window
CREATE DATABASE sichrplace;
GO

CREATE LOGIN sichrplace_user WITH PASSWORD = 'SichrDev2025!';
GO

USE sichrplace;
GO

CREATE USER sichrplace_user FOR LOGIN sichrplace_user;
GO

ALTER ROLE db_datareader ADD MEMBER sichrplace_user;
ALTER ROLE db_datawriter ADD MEMBER sichrplace_user;
ALTER ROLE db_ddladmin   ADD MEMBER sichrplace_user;
GO
```

The full script is in [`db/local-mssql-init.sql`](../db/local-mssql-init.sql).

> Hibernate `ddl-auto=update` will create all 9 tables automatically
> from the JPA entity classes when Spring Boot starts.

---

## 3. Environment Variables

### Local development (`.env.local` — git-ignored)

Create a file called `.env.local` in the project root:

```dotenv
# SichrPlace Local Dev
LOCAL_DB_USER=sichrplace_user
LOCAL_DB_PASS=SichrDev2025!
JWT_SECRET=local-dev-secret-not-for-production-at-least-32-chars
```

Load it before running:

```powershell
# PowerShell: load .env.local variables into current session
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
}

# Then start Spring Boot
./gradlew bootRun --args='--spring.profiles.active=local-mssql'
```

### Beta / droplet (set in `/opt/sichrplace/.env` on the VPS)

```dotenv
# SichrPlace Beta (Droplet)
SA_PASSWORD=<strong SA password>
BETA_DB_HOST=database
BETA_DB_USER=sichrplace_user
BETA_DB_PASS=<strong app password>
JWT_SECRET=<openssl rand -base64 48>
CORS_ALLOWED_ORIGINS=https://sichrplace.com,https://www.sichrplace.com
GHCR_OWNER=omer3kale
IMAGE_TAG=latest
```

> **Rule:** `.env`, `.env.local`, and `*.env.*` are in `.gitignore`.
> If someone accidentally commits one, the repo has no real secrets anyway —
> only placeholder/dev values exist in the YAML files.

> **Teaching question:** Why is `.env.local` in `.gitignore`, and what
> happens if someone accidentally commits it?

---

## 4. Run and Verify

### Start the backend

```powershell
./gradlew bootRun --args='--spring.profiles.active=local-mssql'
```

You should see in the console:

```
Started SichrPlaceBackendApplication in ~15s
Hibernate: create table users ...
Hibernate: create table apartments ...
```

### Verify it works

```powershell
# Health check
curl http://localhost:8080/api/health

# Or test registration
curl -X POST http://localhost:8080/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"firstName\":\"Test\",\"lastName\":\"Student\",\"email\":\"test@rwth.de\",\"password\":\"Test1234!\",\"role\":\"TENANT\"}'
```

### Check the database

In SSMS, expand `sichrplace` -> Tables. You should see 9 tables:
`users`, `apartments`, `apartment_reviews`, `conversations`, `messages`,
`notifications`, `user_favorites`, `viewing_requests`, `listings`.

### Seed data (automatic)

When running with `local-mssql` or `beta-mssql`, the `DataSeeder` component
automatically populates the database with synthetic workplace data on first
startup — **only if the `users` table is empty**.  This gives you:

- 6 users (admin, 2 landlords, 3 students)
- 4 apartments in Aachen
- 3 conversations with 12 messages
- 3 viewing requests, 3 reviews, 5 favorites, 5 notifications

> **Login:** `charlie.student@rwth-aachen.de` / `password123`

See [`docs/SEED_WORKPLACE_MSSQL.md`](SEED_WORKPLACE_MSSQL.md) for the full
list of seed accounts and what each record represents.

### Seed data (manual SQL)

If you prefer to seed manually or need to reset:

```powershell
# Docker (local-mssql)
docker cp db/mssql-seed-workplace.sql sichrplace-mssql-local:/tmp/seed.sql
docker exec sichrplace-mssql-local /opt/mssql-tools18/bin/sqlcmd `
  -S localhost -U sichrplace_user -P "$env:LOCAL_DB_PASS" `
  -d sichrplace -C -i /tmp/seed.sql

# Native Windows (SSMS)
# Open db/mssql-seed-workplace.sql in SSMS and press F5.
```

---

## 5. Database Backends — Summary

| Environment | DB Engine | Where it runs | Profile | Compose file |
|-------------|-----------|--------------|---------|-------------|
| **Local dev** | MSSQL 2025 Developer | Student laptop (native or Docker) | `local-mssql` | `docker-compose.local-mssql.yml` |
| **Beta** | MSSQL 2025 Developer | DigitalOcean droplet (Docker) | `beta-mssql` | `docker-compose.mssql.yml` |
| **Production** | PostgreSQL 16 | DigitalOcean droplet (Docker) | `prod` | `docker-compose.yml` |

All three share the **same ERD** (see [`docs/diagrams/erd_sichrplace.png`](diagrams/erd_sichrplace.png))
and the same JPA entity classes. Only the JDBC URL, driver, and Hibernate
dialect change — configured entirely via Spring profiles.

> **Teaching question:** For your thesis beta environment, how will you
> explain to students the trade-offs between using MSSQL locally and the
> same MSSQL on the droplet, while keeping the codebase identical?

---

## 6. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| `Login failed for user 'sichrplace_user'` | Wrong password or user not created | Re-run `db/local-mssql-init.sql` in SSMS |
| `Cannot open database "sichrplace"` | Database doesn't exist yet | Create it: `CREATE DATABASE sichrplace;` |
| `Connection refused localhost:1433` | SQL Server not running | Start the service or Docker container |
| `HikariPool - Connection is not available` | Wrong JDBC URL or firewall | Check `encrypt=false` in URL, TCP/IP enabled |
| `Table 'users' already exists` | Normal with `ddl-auto=update` | Hibernate skips existing tables — this is fine |
| `JWT_SECRET not set` | Missing env var in beta profile | Set it in `.env` — beta has no defaults on purpose |

---

## 7. Diagram Cross-References

All diagrams are **MSSQL-compatible** and reflect the same schema used in local and beta:

| Diagram | File | Shows |
|---------|------|-------|
| ERD | [`erd_sichrplace.png`](diagrams/erd_sichrplace.png) | All 9 tables, PKs, FKs, types |
| State chart | [`state_message_lifecycle.png`](diagrams/state_message_lifecycle.png) | Message lifecycle states |
| Architecture | [`arch_request_flow.png`](diagrams/arch_request_flow.png) | HTTP -> Controller -> Service -> Repo -> MSSQL |
| Sequence | [`sequence_send_message.png`](diagrams/sequence_send_message.png) | Send message request-response flow |

> These diagrams are versioned in Git alongside the code.
> If a student adds a new entity, they should update the ERD too.

## 7b. Related Documentation

| Document | File | Purpose |
|----------|------|---------|
| API Endpoints | [`API_ENDPOINTS_BACKEND.md`](API_ENDPOINTS_BACKEND.md) | All 55 endpoints, use cases, curl examples |
| Seed Data | [`SEED_WORKPLACE_MSSQL.md`](SEED_WORKPLACE_MSSQL.md) | Seed records, verification, schema evolution |
| Tutorium Lab | [`TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md) | 3-session lab with exercises and solutions |

---

## 8. Student Pathway (Step-by-Step)

1. Install SQL Server + SSMS on your laptop (Section 2)
2. Run provided SQL script to create DB and user
3. Set environment variables in `.env.local` (Section 3)
4. Run Spring Boot with `local-mssql` — `DataSeeder` auto-populates the DB (Section 4)
5. Login as `charlie.student@rwth-aachen.de` / `password123` and explore the API
6. Open SSMS, inspect the 9 tables, compare row counts with the docs
7. Try the REST endpoints: `POST /api/auth/login`, `GET /api/apartments`, `GET /api/conversations`
8. (Advanced) SSH into droplet, inspect MSSQL Docker container, compare schemas

> **Reflection question:** How would you verify that your local and droplet
> databases share the same schema and data model, purely from the ERD and
> Spring entities, without seeing the physical servers?
