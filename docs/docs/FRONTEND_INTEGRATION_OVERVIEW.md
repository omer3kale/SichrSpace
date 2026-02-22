# Frontend Integration Overview

> **SichrPlace Backend — v1.2.0-thesis-showcase**
>
> This document explains how the Spring Boot backend exposes its 66 REST
> endpoints in a **frontend-framework-agnostic** way. Whether you build
> the UI with a custom responsive design system (AppleMontiCore), plain
> HTML/CSS/JS, Web Components, or any SPA framework, the integration
> surface is the same: **HTTP + JSON + JWT**.

> **Authoritative implementation references (living spec):**
> - Password Reset: `UserController`, `UserServiceImpl`,
>   `UserServicePasswordResetTest`, `UserControllerPasswordResetTest`
> - Execute Saved Search: `SavedSearchController`, `SavedSearchServiceImpl`,
>   `SavedSearchServiceTest`, `SavedSearchControllerExecuteTest`
> - Viewing Stats + Complete: `ViewingRequestController`, `ViewingRequestServiceImpl`,
>   `ViewingRequestServiceExtendedTest`, `ViewingRequestControllerShowcaseTest`
> - Email Verification: `UserController`, `UserServiceImpl`,
>   `UserServiceEmailVerificationTest`, `UserControllerEmailVerificationTest`

---

## 1  No-Framework Lock-In

The SichrPlace backend operates as a **stateless REST API**. It does not
generate HTML, does not bundle client-side JavaScript, and does not
prescribe a component model. Every endpoint:

- Accepts and returns **JSON** (`application/json`).
- Authenticates via a **Bearer JWT** in the `Authorization` header
  (public endpoints like login and registration are exceptions).
- Documents itself via **Swagger / OpenAPI 3.0** at
  `/swagger-ui/index.html` when running locally.

This means the backend is **equally consumable** by:

| Frontend stack | Integration method |
|----------------|--------------------|
| Custom HTML/CSS/JS (AppleMontiCore-style) | `fetch()` / `XMLHttpRequest` |
| Web Components | `fetch()` inside `connectedCallback()` |
| Vanilla multi-page app (current SichrPlace frontend) | `fetch()` via `config.js` base-URL |
| Any SPA framework | Framework's HTTP client wrapping `fetch()` |
| Mobile (Swift / Kotlin) | `URLSession` / `OkHttp` |
| CLI / scripting | `curl` / `httpie` / PowerShell `Invoke-RestMethod` |

**No single framework is privileged.** The generated integration specs
(see §2) deliberately avoid naming any framework and express all
patterns in plain `fetch()` pseudocode.

---

## 2  Integration Workflow

```
┌─────────────────────────────┐
│  1. Pick a backend feature  │   e.g. "Execute Saved Search"
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  2. Fill YAML descriptor    │   descriptors/frontend/<feature>.yml
│     (endpoints, fields,     │   — one file per feature
│      UX hints, a11y notes)  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  3. Render via FTL template │   docs/templates/frontend_integration.ftl
│     (FreeMarker)            │   → docs/generated/frontend_integration/<feature>.md
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  4. Use in your frontend    │   Read the rendered spec;
│     (any stack)             │   implement fetch calls;
│                             │   style with your design system
└─────────────────────────────┘
```

### Directory layout

```
docs/
  templates/
    frontend_integration.ftl          ← FreeMarker template (6 sections)
  generated/
    frontend_integration/
      saved_search_execute.md         ← rendered spec
      auth_password_reset.md          ← rendered spec
      viewing_requests_stats.md       ← rendered spec
  FRONTEND_INTEGRATION_OVERVIEW.md    ← this file

descriptors/
  frontend/
    saved_search_execute_frontend.yml ← YAML descriptor
    auth_password_reset_frontend.yml  ← YAML descriptor
    viewing_requests_stats_frontend.yml ← YAML descriptor
```

### Rendering (manual)

FreeMarker is bundled with Spring Boot but the integration specs are
**pre-rendered** as Markdown in this repo. If you add a new feature:

1. Copy an existing YAML descriptor.
2. Fill in the endpoint details from Swagger or the controller source.
3. Render via a FreeMarker CLI or inside a test harness.
4. Commit both the YAML and the rendered `.md`.

---

## 3  Mapping to AppleMontiCore Approach

The author's own design system
([`AppleMontiCore`](https://github.com/omer3kale/AppleMontiCore)) uses
custom responsive components built with HTML, CSS, and vanilla JavaScript.
The integration specs map cleanly to this approach:

| Integration spec section | AppleMontiCore mapping |
|--------------------------|------------------------|
| **Backend Contract** (§2) | Direct `fetch()` / `XMLHttpRequest` calls from component JS |
| **State Shape** (§3) | Plain JS object stored per-component or in a shared module |
| **Render Hints** (§3) | Drives conditional class toggling (`classList.add/remove`) |
| **Breakpoints** (§4) | CSS media queries + `matchMedia` listeners |
| **Accessibility** (§4) | ARIA attributes set in component `render()` methods |
| **Testing Hooks** (§5) | Manual test checklist executed against `localhost:8080` |

### Guarantees from the backend

The backend provides three guarantees that make framework-free
integration safe:

1. **Stable endpoint paths** — versioned at `/api/*`, no breaking
   changes within a minor version.
2. **Consistent JSON schemas** — every endpoint returns the same DTO
   shape regardless of caller; validated by unit tests.
3. **Clear error responses** — HTTP status codes + JSON body with
   `message` field; the frontend can pattern-match on status alone.

---

## 4  Authentication Pattern

All authenticated endpoints expect:

```
Authorization: Bearer <jwt-token>
```

Token lifecycle:

1. `POST /api/auth/login` — returns `{ "token": "eyJ..." }`.
2. Store the token in memory or `localStorage`.  
   ⚠ **Do not store the JWT in a cookie.** The backend's CSRF protection is
   provided by the Bearer-header-only architecture (`csrf().disable()`
   in `SecurityConfig`). Storing the JWT in a cookie re-opens the CSRF attack
   surface and would require `CookieCsrfTokenRepository` to be re-enabled.
3. Attach it to every subsequent request's `Authorization` header.
4. On `401 Unauthorized`, redirect the user to login.

Tokens expire after the server-configured duration (see
`application.yml` → `jwt.expiration`). The frontend should handle
expiry gracefully.

---

## 5  WebSocket Realtime

All three realtime event channels are delivered over STOMP-over-WebSocket (SockJS fallback available).

### Endpoint

```
ws://<host>/ws          ← native WebSocket
http://<host>/ws        ← SockJS HTTP fallback
```

### Authentication

Send a `CONNECT` frame with a `Authorization: Bearer <jwt>` native header:

```js
const client = new Client({
  brokerURL: 'ws://localhost:8080/ws',
  connectHeaders: { Authorization: `Bearer ${jwt}` },
});
```

SockJS clients that cannot set custom HTTP headers may use a plain `token` header instead.

### Subscriptions (server → client only)

| Destination | Payload type | When sent |
|-------------|-------------|----------|
| `/topic/conversations.{conversationId}` | `MessageDto` JSON | A new message is created in that conversation |
| `/user/queue/notifications` | `NotificationDto` JSON | A notification is created for the authenticated user |
| `/user/queue/viewing-requests` | `ViewingRequestDto` JSON | A viewing-request is confirmed or declined for the authenticated user |

The `/user/…` prefix routes to the currently authenticated principal — use the
STOMP `SUBSCRIBE` destination without the `/user` prefix; Spring resolves it
using the STOMP session principal set during `CONNECT`.

### No `@MessageMapping` (yet)

All write operations (send message, create notifications, request/confirm/decline viewings)
are still performed via HTTP POST.  WebSocket is **server → client push only** at this stage.
Phase 11 may add `@MessageMapping` endpoints when the frontend consumer is live.

---

## 6  Related Documents

| Document | Purpose |
|----------|---------|
| [`docs/SHOWCASE_FEATURES.md`](SHOWCASE_FEATURES.md) | The 3 thesis showcase features whose integration specs are generated |
| [`docs/FULLSTACK_GOLDEN_PATH.md`](FULLSTACK_GOLDEN_PATH.md) | Traces one action end-to-end from browser to database |
| [`docs/PHASE2_FRONTEND_INTEGRATION.md`](PHASE2_FRONTEND_INTEGRATION.md) | Phase 2 integration planning notes |
| [`docs/FRONTEND_INTEGRATION_PLAN.md`](FRONTEND_INTEGRATION_PLAN.md) | Phase 3 payment + booking flow frontend tasks |
| [`docs/DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md) | Phase 3 deployment / webhook configuration checklist |
| [`docs/BACKEND_10OF10_CRITERIA.md`](BACKEND_10OF10_CRITERIA.md) | Defines what 10/10 means for the backend — confirms the API surface is stable and complete for thesis scope |
| [`docs/BACKEND_DB_STATUS.md`](BACKEND_DB_STATUS.md) | Full backend audit: 13 entities, 70 endpoints, 82 tests, all Phase 1 features complete |
| [`THESIS_OVERVIEW_BACKEND.md`](../THESIS_OVERVIEW_BACKEND.md) | Full thesis overview (§10 covers frontend integration) |
| [`docs/TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md) | Student lab exercises including integration spec exercise |
