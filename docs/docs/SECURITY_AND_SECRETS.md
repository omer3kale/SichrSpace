# SichrPlace — Security & Secrets Policy

> **Audience:** Every contributor and every student who clones this repo
> **Rule of thumb:** If it unlocks a door — database, JWT, API key — it
> must NEVER appear in source code.

---

## 1. What Counts as a Secret?

| Category | Examples | Where it belongs |
|----------|---------|-----------------|
| Database credentials | `sichrplace_user` / `SichrPlace_Dev2026!` | `.env.local` or OS env vars |
| JWT signing key | 256-bit+ random string | `.env.local` / CI secret store |
| API keys | PayPal, Google Maps, SendGrid | `.env.local` / CI secret store |
| Private keys | `*.pem`, `*.key`, `*.p12` | Never committed — load from mounted volume or vault |
| OAuth client secrets | Client ID + secret pairs | CI secret store, never in YAML |
| SSH keys | Deploy keys for VPS | GitHub Actions secrets only |

---

## 2. How Spring Boot Loads Secrets

### Environment-Variable Placeholders

```yaml
# application-local.yml  (committed — safe)
spring:
  datasource:
    username: ${LOCAL_DB_USER:sichrplace_user}
    password: ${LOCAL_DB_PASS:changeme}

app:
  jwtSecret: ${JWT_SECRET:dev-only-secret-key-at-least-32-characters-long!!}
```

**How it works:**

1. Spring resolves `${LOCAL_DB_USER:sichrplace_user}` at startup.
2. If the env var `LOCAL_DB_USER` is set → use its value.
3. If not → fall back to the default after the colon (`sichrplace_user`).
4. The default value is a **non-secret placeholder** safe to commit.

### Setting Env Vars Locally

**PowerShell (Windows):**

```powershell
# Option A: manually
$env:LOCAL_DB_USER = "sichrplace_user"
$env:LOCAL_DB_PASS = "SichrPlace_Dev2026!"
$env:JWT_SECRET    = "my-local-dev-jwt-secret-at-least-32-chars"

# Option B: load from .env.local file
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
}
```

**Bash / Zsh (macOS / Linux):**

```bash
export LOCAL_DB_USER=sichrplace_user
export LOCAL_DB_PASS="SichrPlace_Dev2026!"
export JWT_SECRET="my-local-dev-jwt-secret-at-least-32-chars"

# Or: source from file
set -a; source .env.local; set +a
```

### The `.env.local` File

Create it in the repo root (it is already in `.gitignore`):

```env
# .env.local — NEVER committed
LOCAL_DB_HOST=localhost
LOCAL_DB_PORT=1433
LOCAL_DB_NAME=sichrplace
LOCAL_DB_USER=sichrplace_user
LOCAL_DB_PASS=SichrPlace_Dev2026!
JWT_SECRET=my-local-dev-jwt-secret-at-least-32-chars-long!!
```

---

## 3. CI / CD Secrets (GitHub Actions)

Secrets are stored in **Settings → Secrets and variables → Actions** on
the GitHub repository.

| Secret name | Used in | Purpose |
|------------|---------|---------|
| `VPS_HOST` | deploy-backend.yml | DigitalOcean droplet IP |
| `VPS_USER` | deploy-backend.yml | SSH user on the VPS |
| `VPS_SSH_KEY` | deploy-backend.yml | Private SSH key for deployment |
| `GITHUB_TOKEN` | deploy-backend.yml | Auto-provided — GHCR login |
| `DB_PASSWORD` | (future) | Production database password |
| `JWT_SECRET` | (future) | Production JWT signing key |

> **Never echo secrets in CI logs.** GitHub Actions masks them, but
> avoid printing env vars in scripts.

---

## 4. `.gitignore` Hardening

The `.gitignore` blocks these patterns:

```gitignore
# ── Secrets ──
.env
*.env.local
*.pem
*.key
*.p12
*.jks
*.pfx
*.dump
*.bak
```

**Verify before every push:**

```bash
git diff --cached --name-only | grep -iE '\.(pem|key|p12|env)'
```

If this command outputs anything, **do not push** — unstage the file first.

---

## 5. Automated Secrets Scanning

### Gradle Task

```bash
./gradlew secretsCheck
```

This task scans `src/` and `docs/` for patterns like:

- `password = "actual-value"`
- `secret = "actual-value"`
- AWS access keys (`AKIA...`)
- PEM private key headers

It **allows** known-safe patterns:

- `${VAR:default}` (Spring env-var placeholders)
- `password123` (seed data test password)
- `changeme` (documented placeholder)
- `test-secret` (test profile)

If the task fails, replace the hardcoded value with an environment-variable
placeholder and move the real value to `.env.local`.

### CI Integration

The `deploy-backend.yml` workflow runs `secretsCheck` before building the
Docker image.  A failure blocks the deployment.

---

## 6. Spring Profile Security

| Profile | Secrets source | Acceptable defaults? |
|---------|---------------|---------------------|
| `test` | `application-test.yml` | Yes — `test-secret-key…` is fine for H2 tests |
| `local` / `local-mssql` | `.env.local` → env vars | Yes — dev defaults in YAML, real values in env |
| `beta-mssql` | `.env` on VPS | No defaults — env vars must be set |
| `prod` (future) | Vault / cloud secret manager | No defaults at all |

### Rules

1. **No real credentials in any `application-*.yml` file that is committed.**
2. **`application-test.yml`** may use fixed test secrets — they never touch
   a real database.
3. **Defaults in `application-local.yml`** must be clearly fake or documented
   (e.g., `changeme`, `dev-only-…`).

---

## 7. What to Do If a Secret Is Leaked

1. **Rotate the secret immediately** — change the password / regenerate the key.
2. **Remove from Git history** — use `git filter-branch` or `BFG Repo-Cleaner`.
3. **Force push** — coordinate with the team.
4. **Update `.env.local` and CI secrets** with the new value.
5. **Run `./gradlew secretsCheck`** to confirm no residual leaks.

> **GitHub will email you** if it detects a known secret pattern (e.g., AWS
> keys) via GitHub Secret Scanning.

---

## 8. Teaching Examples vs. Real Secrets

This repository is used for university teaching.  Some files contain
**deliberately fake credentials** — these are safe:

| Value | Where | Purpose |
|-------|-------|---------|
| `password123` | DataSeeder, test curls | Seed-user password for labs |
| `changeme` | `application-local.yml` default | Obviously-fake placeholder |
| `dev-only-secret-key-…` | `application-local.yml` JWT default | Clearly labelled non-production |
| `test-secret-key-…` | `application-test.yml` | H2 test-profile only |
| `YourPassword123!` | Documentation examples | Instructional placeholder |

**These are NOT real secrets.**  They exist so students can follow the labs
without setting up environment variables on first run.

For any **real deployment** (beta droplet, production), you MUST:

1. Generate strong random values (`openssl rand -base64 48`).
2. Store them in `.env.local` (local) or GitHub Actions secrets (CI).
3. Never commit real values — the `secretsCheck` task will catch them.

---

## 9. Quick-Reference Checklist

- [ ] All passwords in `application-*.yml` use `${ENV_VAR:placeholder}` syntax
- [ ] `.env.local` exists locally and is in `.gitignore`
- [ ] CI secrets are configured in GitHub Actions settings
- [ ] `./gradlew secretsCheck` passes
- [ ] No `*.pem`, `*.key`, `*.p12` files in the repository
- [ ] JWT secret is at least 256 bits (32+ characters) in all environments
- [ ] Test profile uses a separate, non-production secret

---

## 10. CSRF Posture (Why CSRF Tokens Are Not Used)

Classic CSRF attacks trick a browser into sending a state-changing request to a
site where the user is **already authenticated via a cookie**.  The browser
auto-attaches the cookie; the server cannot distinguish the real request from
the forged one.

**SichrPlace does not use cookies for authentication.**

| Property | Value |
|----------|-------|
| Session policy | `STATELESS` — no `HttpSession` is ever created |
| Auth mechanism | `Authorization: Bearer <JWT>` request header |
| Cookie usage | None for authentication |

Because there are no ambient credentials (no auth cookie), a forged cross-site
request arrives as unauthenticated — it does not carry the `Authorization`
header, so the server rejects it with `401`.  **CSRF protection is provided by
architectural design, not by tokens.**

This means:

- `csrf().disable()` in `SecurityConfig` is intentional and correct.
- There is no `GET /api/auth/csrf-token` endpoint, and none is needed.
- Frontend clients **must not** store the JWT in a cookie. Use memory or
  `localStorage`. If a cookie is used for the JWT, `csrf().disable()` must be
  reverted and `CookieCsrfTokenRepository` configured before going live.
- `SecurityConfigTest` verifies: no `403` on POST without CSRF token; no
  `Set-Cookie` on auth API responses.

**Future condition:** If a Spring MVC / Thymeleaf view layer is added that
handles `<form>` POST submissions, CSRF protection must be re-enabled for those
form endpoints before launch.  See ROADMAP Phase 1.2 for the decision record.

---

## 11. WebSocket Authentication (STOMP over WebSocket)

### How it works

The SichrPlace backend exposes a STOMP endpoint at `/ws` (SockJS-wrapped for browser
compatibility).  Every WebSocket connection requires a JWT — **not** in the HTTP
handshake but in the STOMP `CONNECT` native frame header:

```
Authorization: Bearer <jwt>
```

Fallback header for SockJS clients that strip the `Authorization` key:
```
token: <raw-jwt>
```

`JwtChannelInterceptor` (in the `security` package) runs before every inbound
STOMP frame.  On `CONNECT` frames it:
1. Resolves the JWT from the header.
2. Calls `JwtTokenProvider.validateToken(jwt)`.  Throws `MessageDeliveryException`
   (which is translated to a STOMP `ERROR` frame + connection close) on failure.
3. On success, extracts `userId` + `role` and attaches a
   `UsernamePasswordAuthenticationToken` to the STOMP session principal.
   All subsequent frames in the same session carry that principal automatically.

### Why not HTTP handshake headers?

- SockJS XHR / EventSource transports do not reliably forward custom HTTP headers.
- JWT in a query parameter would be logged by proxies and CDNs.
- STOMP CONNECT native headers are the idiomatic Spring WebSocket transport for JWTs.

### Spring Security interaction

`SecurityConfig` permits `/ws/**` at the HTTP layer (needed for the SockJS
HTTP-polling upgrade).  Actual authentication is **not** delegated to the HTTP
Security filter chain — it is enforced at the STOMP application layer by
`JwtChannelInterceptor`.  The two layers are complementary.

### Test coverage

- `security/JwtChannelInterceptorTest` — 5 Mockito unit tests: valid Bearer header,
  valid `token` fallback, missing header → exception, invalid JWT → exception,
  non-CONNECT frame passthrough.
- `config/WebSocketConfigTest` — 4 Spring context tests: bean presence, allowed-origins
  property load.

---

## Related Docs

- [`TEST_STRATEGY.md`](TEST_STRATEGY.md) — test layers and quality gates
- [`COCO_RULES.md`](COCO_RULES.md) — code coverage objectives
- [`ENV_SETUP_GUIDE.MD`](ENV_SETUP_GUIDE.MD) — environment profile configuration
