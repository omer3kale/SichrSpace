# SichrPlace — Integration Smoke Test Checklist

> Run these tests after deploying frontend (GitHub Pages) + backend (DO VPS).
> Each test expects **no CORS errors** in the browser console.

---

## Environment Mapping

| `.env` variable | `application-prod.yml` property | Used by |
|-----------------|---------------------------------|---------|
| `POSTGRES_DB` | compose → `DATABASE_URL` path segment | PostgreSQL container name + JDBC URL |
| `POSTGRES_USER` | `spring.datasource.username` (via `DATABASE_USERNAME`) | Spring DataSource |
| `POSTGRES_PASSWORD` | `spring.datasource.password` (via `DATABASE_PASSWORD`) | Spring DataSource |
| `JWT_SECRET` | `app.jwtSecret` | `JwtUtils` — token signing & verification |
| `CORS_ALLOWED_ORIGINS` | `app.cors.allowed-origins` | `SecurityConfig.corsConfigurationSource()` |
| `GHCR_OWNER` | compose `image:` prefix | Docker image pull |
| `IMAGE_TAG` | compose `image:` tag | Docker image version |

---

## Frontend → Backend Config Link

```
config.js                         Caddyfile
──────────                        ─────────
PRODUCTION_API_URL ─── must match ─── api.sichrplace.com
  ↓
API_BASE_URL getter
  ↓
getApiEndpoint(path) → https://api.sichrplace.com/api/<path>
```

---

## Smoke Tests

### A — Anonymous (no auth required)

| # | Test | Method | Endpoint / Action | Expected |
|---|------|--------|-------------------|----------|
| 1 | **Landing page loads** | Browser | Open `https://sichrplace.com` (GitHub Pages) | Page renders, no console errors |
| 2 | **Health check** | `curl` | `GET https://api.sichrplace.com/api/health` | `200 OK` — `{"status":"UP"}` |
| 3 | **List apartments** | Browser / `curl` | `GET https://api.sichrplace.com/api/apartments` | `200 OK` — JSON array (may be empty) |
| 4 | **CORS preflight** | Browser | Open DevTools → Network while loading apartments | No `Access-Control-Allow-Origin` errors; response header contains the frontend origin |

### B — Authentication

| # | Test | Method | Endpoint / Action | Expected |
|---|------|--------|-------------------|----------|
| 5 | **Register** | Frontend form / `curl` | `POST https://api.sichrplace.com/api/auth/register` with `{ "username", "email", "password" }` | `200 OK` or `201 Created` — user object returned |
| 6 | **Login** | Frontend form / `curl` | `POST https://api.sichrplace.com/api/auth/login` with `{ "usernameOrEmail", "password" }` | `200 OK` — body contains `accessToken` (JWT) |
| 7 | **Authenticated request** | `curl` with `Authorization: Bearer <token>` | `GET https://api.sichrplace.com/api/apartments` | `200 OK` — same result as anonymous but proves token is accepted |

### C — Phase 2 Features (require auth)

| # | Test | Method | Endpoint / Action | Expected |
|---|------|--------|-------------------|----------|
| 8 | **Get notifications** | `curl` + Bearer | `GET https://api.sichrplace.com/api/notifications` | `200 OK` — JSON array (may be empty) |
| 9 | **Mark notification read** | `curl` + Bearer | `PATCH https://api.sichrplace.com/api/notifications/{id}/read` | `200 OK` — notification with `read: true` |
| 10 | **Send message** | `curl` + Bearer | `POST https://api.sichrplace.com/api/conversations/{id}/messages` with `{ "content": "hello" }` | `200 OK` / `201 Created` — message object |
| 11 | **Edit message (≤ 24 h)** | `curl` + Bearer | `PUT https://api.sichrplace.com/api/conversations/{convId}/messages/{msgId}` with `{ "content": "edited" }` | `200 OK` — updated message |

---

## curl Quick-Reference

```bash
# 2 — Health
curl -s https://api.sichrplace.com/api/health | jq .

# 3 — Apartments
curl -s https://api.sichrplace.com/api/apartments | jq .

# 5 — Register
curl -s -X POST https://api.sichrplace.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"smoketest","email":"smoke@test.com","password":"Test1234!"}' | jq .

# 6 — Login (save token)
TOKEN=$(curl -s -X POST https://api.sichrplace.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrEmail":"smoketest","password":"Test1234!"}' | jq -r '.accessToken')
echo $TOKEN

# 8 — Notifications
curl -s https://api.sichrplace.com/api/notifications \
  -H "Authorization: Bearer $TOKEN" | jq .

# 10 — Send message (replace {convId})
curl -s -X POST https://api.sichrplace.com/api/conversations/1/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"hello from smoke test"}' | jq .
```

---

## Pass Criteria

All 11 tests return the expected HTTP status **and** produce no CORS errors when executed from the GitHub Pages origin.  
If any test fails, check in this order:

1. **DNS** — `dig api.sichrplace.com` resolves to droplet IP.
2. **Caddy** — `docker compose logs caddy` shows TLS certificate acquired.
3. **CORS** — `.env` `CORS_ALLOWED_ORIGINS` includes the requesting origin.
4. **Database** — `docker compose logs database` shows `ready to accept connections`.
5. **API** — `docker compose logs api` shows `Started SichrPlaceBackendApplication`.
