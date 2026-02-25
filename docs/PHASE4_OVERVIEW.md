# Phase 4 Overview — Frontend + QA + Deployment

> **Created:** 2026-02-23  
> **Backend baseline:** 643 tests, 0 failures, 86.3 % COCO (all gates green)  
> **Backend doc bundle:** BACKEND_PHASE1_3_SUMMARY.md

---

## Phase 4.1 Primary Focus: Frontend Feature Wiring

**Rationale:** The backend is stable and fully tested. The highest-value next
step is wiring the frontend to consume the 85 endpoints — particularly the
Phase 3 payment flow, booking-status transitions, and conversation features that
have no frontend UI yet. This unblocks end-to-end demos and QA.

### Streams (in priority order)

| Stream | Phase | Description | Tracking Doc |
|--------|-------|-------------|--------------|
| **A — Frontend feature wiring** | 4.1 | Payments UI, booking badges, conversations extras | `PHASE4_FRONTEND_TASKS.md` |
| **H — Backend hardening** | 4.H | Auth error codes, viewing guardrails, search alignment, feature flags, webhook idempotency | `ROADMAP.md` §No-Regrets Hardening |
| B — QA / E2E test automation | 4.2 | Playwright/Cypress scenarios for critical paths | TBD |
| C — Deployment hardening | 4.3 | Observability, alerts, webhook signature verification | TBD |

> **Note (2026-02-23):** Stream H runs in parallel with Stream A. It hardens the
> **existing** ViewingRequest + payments + filters + auth system. BookingRequest
> (a new domain entity) is explicitly **Phase 5 future work** — not in scope until
> the current experience is solid and the frontend is fully wired.

---

## Phase 4 Scope (derived from existing docs)

### Frontend gaps (FRONTEND_INTEGRATION_PLAN.md §4, F-1 through F-8)

1. Payment buttons (Stripe + PayPal) on viewing detail page.
2. Payment + booking status badges with colour coding.
3. "Retry payment" UX when status is `FAILED`.
4. Post-redirect polling until terminal payment state.
5. `/payments/success` and `/payments/cancel` landing pages.
6. Provider selection UI (radio / tabs).
7. WebSocket subscription for real-time booking updates.
8. Mobile-responsive payment flow.

### QA flows (DEPLOYMENT_CHECKLIST.md §4.2/4.3, QA-HANDOVER.md)

1. Full Stripe smoke test (session → checkout → webhook → auto-confirm → refund → auto-cancel).
2. Full PayPal smoke test (session → approval → webhook → auto-confirm).
3. Conversation with attachments, reactions, reports end-to-end.
4. Viewing lifecycle (request → confirm → complete / decline / cancel).
5. Auth lifecycle (register → verify email → login → forgot → reset password).
6. DB failure contract verification (409 / 503 error codes).

### Deployment/ops (DEPLOYMENT_CHECKLIST.md §6)

1. PayPal webhook signature verification (B-6).
2. Idempotency keys on payment session creation (B-7).
3. Rate limiting on webhook endpoints.
4. Centralized logging / alerting for payment + webhook flows.
5. Secrets in vault (Azure Key Vault / AWS Secrets Manager).
6. IP allow-listing for PayPal webhooks.

---

## Entry criteria for Phase 4

- [x] Backend Phases 1–3 complete (643 tests, 0 failures)
- [x] All COCO gates green (86.3 % overall)
- [x] BACKEND_PHASE1_3_SUMMARY.md created and verified
- [x] Sanity build green (`gradlew clean testWithCoverage checkCoco`)

---

## Cross-references

| Doc | Content |
|-----|---------|
| `BACKEND_PHASE1_3_SUMMARY.md` | Backend capabilities recap |
| `FRONTEND_INTEGRATION_PLAN.md` | Payment flow contract + frontend task checklist |
| `FRONTEND_INTEGRATION_OVERVIEW.md` | Framework-agnostic integration guide |
| `DEPLOYMENT_CHECKLIST.md` | Env vars, webhook setup, smoke tests |
| `QA-HANDOVER.md` | Error contracts, DB failure playbook |
| `FEATURE_ROADMAP.md` | Full 24-category gap analysis |
| `PHASE3_DUAL_PAYMENTS_TASKS.md` | Phase 3 stories + post-Phase 3 backlog |
