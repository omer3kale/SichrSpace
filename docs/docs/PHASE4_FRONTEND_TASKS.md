# Phase 4.1 — Frontend Feature Tasks

> **Stream:** A — Frontend feature wiring (payments + booking + conversations)  
> **Backend baseline:** 643 tests · 85 endpoints · 14 controllers  
> **Source:** FRONTEND_INTEGRATION_PLAN.md §4, FEATURE_ROADMAP.md §8

---

## Task F-1 — Payment Buttons (Stripe + PayPal)

### Backend endpoints

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/viewing-requests/{id}/payments/session` | Bearer JWT (tenant only) |

Request body: `{ "provider": "STRIPE" }` or `{ "provider": "PAYPAL" }` (case-insensitive).  
Response (201): `{ transactionId, provider, status, redirectUrl }`.

### UI component / page

**Page:** `viewing-request.html` (viewing detail)  
**Component:** Two buttons — "Pay with Stripe" and "Pay with PayPal" — visible only when:
- `ViewingRequest.status == PENDING`
- `ViewingRequest.paymentRequired == true`
- No existing payment in `PENDING` or `COMPLETED` state

On click: `POST` to session endpoint → read `redirectUrl` → `window.location.href = redirectUrl`.

### Acceptance criteria

- [ ] Stripe button calls session endpoint with `{ "provider": "STRIPE" }`.
- [ ] PayPal button calls session endpoint with `{ "provider": "PAYPAL" }`.
- [ ] On 201, browser redirects to provider checkout page.
- [ ] On 401, redirect to login.
- [ ] On 409 ("already paid" / "not in payable state"), show inline error message.
- [ ] Buttons are hidden when viewing is not in payable state.

---

## Task F-2 — Payment + Booking Status Badges

### Backend endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/viewing-requests/{id}/payments/status` | Bearer JWT |
| `GET` | `/api/viewing-requests/{id}` | Bearer JWT |

Payment status response: `{ "status": "COMPLETED" }` (or `NONE`, `CREATED`, `PENDING`, `FAILED`, `REFUNDED`).

### UI component / page

**Page:** `viewing-request.html` (detail) + `viewing-requests-dashboard.html` (list)  
**Component:** Two badges per viewing row/card:

| Payment Status | Badge Colour | Label |
|---|---|---|
| `NONE` | Grey | No payment |
| `CREATED` | Grey | Payment created |
| `PENDING` | Yellow | Payment pending |
| `COMPLETED` | Green | Paid ✓ |
| `FAILED` | Red | Payment failed |
| `REFUNDED` | Orange | Refunded |

| Booking Status | Badge Colour | Label |
|---|---|---|
| `PENDING` | Yellow | Awaiting confirmation |
| `CONFIRMED` | Green | Confirmed |
| `DECLINED` | Red | Declined |
| `CANCELLED` | Grey | Cancelled |
| `COMPLETED` | Blue | Completed |

### Acceptance criteria

- [ ] Both badges render on viewing detail and viewing list pages.
- [ ] Colours match the table above.
- [ ] Badge updates after payment completes (poll or WebSocket).
- [ ] Booking badge shows "Confirmed" after payment auto-confirms (PENDING → CONFIRMED).

---

## Task F-3 — Retry Payment UX (FAILED state)

### Backend endpoints

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/viewing-requests/{id}/payments/session` | Bearer JWT (tenant only) |
| `GET` | `/api/viewing-requests/{id}/payments/status` | Bearer JWT |

When payment status is `FAILED`, the tenant can call the session endpoint again — the backend creates a **new** `PaymentTransaction` and returns a fresh `redirectUrl`.

### UI component / page

**Page:** `viewing-request.html` (viewing detail)  
**Component:** "Retry Payment" button — shown **only** when payment status is `FAILED`.  
Behaviour: identical to F-1 (POST session → redirect).

### Acceptance criteria

- [ ] "Retry Payment" button visible only when `GET .../payments/status` returns `FAILED`.
- [ ] Button triggers `POST .../payments/session` with the same provider (or allows re-selection).
- [ ] On success, redirects to provider checkout.
- [ ] After retry succeeds, badge transitions from `FAILED` → `PENDING` → `COMPLETED`.
- [ ] If viewing was already cancelled, retry button is hidden (409 from backend).

---

## Task F-4 — Post-Redirect Status Polling + Landing Pages

### Backend endpoints

| Method | Path | Auth |
|--------|------|------|
| `GET` | `/api/viewing-requests/{id}/payments/status` | Bearer JWT |

### UI component / page

**Pages (new):** `/payments/success` and `/payments/cancel`  
These are landing pages the provider redirects to after checkout.

**Success page:**
1. Display "Processing payment…" spinner.
2. Poll `GET .../payments/status` every 3 seconds.
3. On `COMPLETED` → show "Payment successful ✓" + link back to viewing detail.
4. On `FAILED` → show "Payment failed" + "Retry" link.
5. Stop polling on any terminal state (`COMPLETED`, `FAILED`, `REFUNDED`).

**Cancel page:**
1. Display "Payment cancelled" message.
2. Link back to viewing detail page.

### Acceptance criteria

- [ ] `/payments/success` route exists and renders loading state.
- [ ] Polls status endpoint every 3–5 seconds.
- [ ] Stops polling on terminal state.
- [ ] Shows appropriate message per final status.
- [ ] `/payments/cancel` route exists with back-link to viewing.
- [ ] Both pages are mobile-responsive.

---

## Task F-5 — Conversations: Attachments, Reactions & Reports UI

### Backend endpoints

| Feature | Method | Path | Auth |
|---------|--------|------|------|
| List attachments | `GET` | `/api/conversations/{cid}/messages/{mid}/attachments` | Bearer JWT |
| Add attachment | `POST` | `/api/conversations/{cid}/messages/{mid}/attachments` | Bearer JWT |
| Add reaction | `POST` | `/api/conversations/{cid}/messages/{mid}/reactions` | Bearer JWT |
| Remove reaction | `DELETE` | `/api/conversations/{cid}/messages/{mid}/reactions/{rid}` | Bearer JWT |
| List reactions | `GET` | `/api/conversations/{cid}/messages/{mid}/reactions` | Bearer JWT |
| Report conversation | `POST` | `/api/conversations/{cid}/report` | Bearer JWT |
| Admin list reports | `GET` | `/api/admin/conversation-reports` | ROLE_ADMIN |
| Moderate report | `PUT` | `/api/admin/conversation-reports/{rid}` | ROLE_ADMIN |

### UI component / page

**Page:** `chat.html` / `chat-new.html` (conversation detail)  
**Components:**
- **Attachment indicator** on messages that have attachments (icon + count).
- **Reaction bar** under each message: click to add emoji reaction; show existing reaction counts.
- **Report button** in conversation header → calls `POST .../report` with reason.

**Page:** `admin-dashboard.html`  
**Component:** "Conversation Reports" tab — table of pending reports with moderate action (resolve / dismiss).

### Acceptance criteria

- [ ] Messages with attachments show an attachment icon.
- [ ] Clicking a message shows reaction options (emoji picker or predefined set).
- [ ] Existing reactions render as badges with counts below the message.
- [ ] "Report" button in conversation header opens a reason modal.
- [ ] Admin dashboard shows a list of unresolved conversation reports.
- [ ] Admin can click "Resolve" or "Dismiss" to moderate each report.
- [ ] WebSocket pushes reaction updates in real-time (if F-7 WebSocket is wired).

---

## Summary — Priority & Dependencies

| Task | Priority | Depends on | Est. effort |
|------|----------|------------|-------------|
| F-1 Payment buttons | High | — | 0.5 day |
| F-2 Status badges | High | — | 0.5 day |
| F-3 Retry payment UX | High | F-1, F-2 | 0.5 day |
| F-4 Polling + landing pages | Medium | F-1 | 0.5 day |
| F-5 Conversations extras | Medium | — | 1 day |

**Total estimated effort:** ~3 days

### Deferred to Phase 4.1b

| Task | Description |
|------|-------------|
| F-6 | Provider selection UI (radio / tabs) |
| F-7 | WebSocket real-time status subscription |
| F-8 | Mobile-responsive payment flow polish |

---

## Cross-references

| Doc | Relevance |
|-----|-----------|
| `FRONTEND_INTEGRATION_PLAN.md` | Full payment flow contract (endpoint details, sequence diagram) |
| `FRONTEND_INTEGRATION_OVERVIEW.md` | Framework-agnostic fetch() patterns |
| `API_ENDPOINTS_BACKEND.md` | Quick-reference of all 85 endpoints |
| `PHASE4_OVERVIEW.md` | Phase 4 stream selection and scope |
| `DEPLOYMENT_CHECKLIST.md` | Success/cancel URL config, webhook smoke tests |
