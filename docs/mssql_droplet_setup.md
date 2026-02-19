# SichrPlace — MSSQL on DigitalOcean Droplet

> Step-by-step guide to running SQL Server on your existing SichrPlace VPS.
> For the shared beta / thesis demo environment.

---

## Prerequisites

| Requirement | Current SichrPlace droplet | Notes |
|-------------|---------------------------|-------|
| OS | Ubuntu 22.04 LTS | Already provisioned |
| RAM | **Minimum 2 GB** | MSSQL requires >= 2 GB; resize from 1 GB if needed |
| Docker | 29.2.1 + Compose v5 | Already installed |
| SSH user | `deploy` | Already configured with key auth |
| Firewall | UFW enabled | Ports 22, 80, 443 open |

> **Important:** Your current droplet is 1 GB RAM. SQL Server will OOM-kill
> on 1 GB. Resize to the $12/mo (2 GB) or $24/mo (4 GB) plan first:
> DigitalOcean Console -> Droplet -> Resize -> select 2 GB or higher.

---

## 1. Resize the Droplet (if needed)

```bash
# Check current RAM
ssh deploy@206.189.53.163 "free -h"
```

If total is 1 GB, resize via DigitalOcean dashboard:
1. Power off the droplet
2. Resize -> CPU and RAM -> select 2 GB ($12/mo) or 4 GB ($24/mo)
3. Power on

---

## 2. Deploy MSSQL Stack

The `docker-compose.mssql.yml` file in the repo defines three services:
- `database`: MSSQL 2025 Developer (memory-capped at 1.5 GB)
- `api`: Spring Boot API (using `beta-mssql` profile)
- `caddy`: Reverse proxy with auto TLS

### Upload files to droplet

```bash
# From your local machine (project root)
scp docker-compose.mssql.yml deploy@206.189.53.163:/opt/sichrplace/
scp db/droplet-mssql-init.sql deploy@206.189.53.163:/opt/sichrplace/db/
scp Caddyfile deploy@206.189.53.163:/opt/sichrplace/
```

### Create .env on droplet

```bash
ssh deploy@206.189.53.163
cd /opt/sichrplace

cat > .env << 'EOF'
# SichrPlace Beta — MSSQL on Droplet
SA_PASSWORD=$(openssl rand -base64 24)!1
MSSQL_APP_USER=sichrplace_user
MSSQL_APP_PASSWORD=$(openssl rand -base64 24)!1
MSSQL_PID=Developer
BETA_DB_HOST=database
BETA_DB_USER=sichrplace_user
BETA_DB_PASS=<copy MSSQL_APP_PASSWORD value here>
JWT_SECRET=$(openssl rand -base64 48)
CORS_ALLOWED_ORIGINS=https://sichrplace.com,https://www.sichrplace.com
GHCR_OWNER=omer3kale
IMAGE_TAG=latest
EOF

# Review and fix any values that need manual editing
nano .env
```

### Start the stack

```bash
cd /opt/sichrplace

# Pull latest images
docker compose -f docker-compose.mssql.yml pull

# Start all services
docker compose -f docker-compose.mssql.yml --env-file .env up -d

# Check health
docker compose -f docker-compose.mssql.yml ps
```

Wait ~40 seconds for MSSQL to be healthy (check with `docker logs sichrplace-mssql`).

---

## 3. Initialize the Database

The init script is mounted at `/opt/sichrplace/init.sql` inside the container.
Run it manually the first time:

```bash
docker exec -it sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U SA -P "$(grep SA_PASSWORD .env | cut -d= -f2)" \
  -C -i /opt/sichrplace/init.sql
```

Then set the app user's password to match your `.env`:

```bash
docker exec -it sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U SA -P "$(grep SA_PASSWORD .env | cut -d= -f2)" \
  -C -Q "ALTER LOGIN sichrplace_user WITH PASSWORD = '$(grep MSSQL_APP_PASSWORD .env | cut -d= -f2)';"
```

### Verify

```bash
# Connect as app user
docker exec -it sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sichrplace_user \
  -P "$(grep MSSQL_APP_PASSWORD .env | cut -d= -f2)" \
  -C -Q "SELECT name FROM sys.databases WHERE name = 'sichrplace';"
```

Expected output:
```
name
----------
sichrplace
```

---

## 4. Firewall — Lock Down Port 1433

MSSQL should **not** be exposed to the internet. Only the API container
(on the same Docker network) needs access.

```bash
# Verify 1433 is NOT in UFW allow list
sudo ufw status

# It should NOT show 1433. If it does:
sudo ufw delete allow 1433
```

The `docker-compose.mssql.yml` does **not** publish port 1433 to the host —
only `expose` is used internally on the `backend` Docker network.

For teaching demos where students connect from their laptops via SSMS:

```bash
# Temporarily allow from university network only
sudo ufw allow from 137.226.0.0/16 to any port 1433 comment "RWTH Aachen"

# Remove after the lab session
sudo ufw delete allow from 137.226.0.0/16 to any port 1433
```

---

## 5. Switching Between PostgreSQL and MSSQL

Your droplet can run either stack. They share the same Caddy + API setup.

| To run | Command | Spring profile |
|--------|---------|---------------|
| PostgreSQL (current prod) | `docker compose --env-file .env up -d` | `prod` |
| MSSQL (beta for thesis) | `docker compose -f docker-compose.mssql.yml --env-file .env up -d` | `beta-mssql` |

**Switching:**

```bash
# Stop current stack
docker compose down        # or docker compose -f docker-compose.mssql.yml down

# Start the other
docker compose -f docker-compose.mssql.yml --env-file .env up -d
```

> **Teaching point:** The same Spring Boot Docker image works with both
> databases. Only the environment variables in `.env` and the compose
> file determine which DB is used. This is the power of JPA abstraction.

---

## 6. Monitoring and Logs

```bash
# All service logs
docker compose -f docker-compose.mssql.yml logs -f

# MSSQL only
docker logs -f sichrplace-mssql

# API only
docker compose -f docker-compose.mssql.yml logs -f api

# Check memory usage (MSSQL is memory-hungry)
docker stats --no-stream
```

---

## 7. Backup and Restore

```bash
# Backup sichrplace database to a .bak file
docker exec sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U SA -P "$(grep SA_PASSWORD .env | cut -d= -f2)" \
  -C -Q "BACKUP DATABASE sichrplace TO DISK = '/var/opt/mssql/backup/sichrplace.bak';"

# Copy backup to host
docker cp sichrplace-mssql:/var/opt/mssql/backup/sichrplace.bak ./sichrplace_backup.bak

# Restore (on a fresh container)
docker cp sichrplace_backup.bak sichrplace-mssql:/var/opt/mssql/backup/
docker exec sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U SA -P "$(grep SA_PASSWORD .env | cut -d= -f2)" \
  -C -Q "RESTORE DATABASE sichrplace FROM DISK = '/var/opt/mssql/backup/sichrplace.bak' WITH REPLACE;"
```

---

## Teaching Checkpoints

Students should be able to:

1. SSH into the droplet and check `docker ps` shows 3 running containers
2. Run `sqlcmd` inside the MSSQL container and query `SELECT name FROM sys.databases`
3. Compare the droplet's tables with their local SSMS — same 9 tables, same columns
4. Temporarily switch the API from MSSQL to PostgreSQL and show the same endpoints work
5. Explain why port 1433 is NOT exposed to the internet and how the Docker network isolates it

> **Reflection:** How would a student verify that their local and droplet
> databases share the same schema, purely from the ERD and Spring entities,
> without seeing the physical servers?
