# Frontend Integration Plan — Payments + Booking Flow

> **Created:** 2026-02-22 (Post-Phase 3 Consolidation)  
> **Backend baseline:** 643 tests, 0 failures, all COCO gates green  
> **Endpoints used:** 85 across 14 controllers  
> **Related docs:** [API_ENDPOINTS_BACKEND.md](API_ENDPOINTS_BACKEND.md), [FRONTEND_INTEGRATION_OVERVIEW.md](FRONTEND_INTEGRATION_OVERVIEW.md)

---

## 1  Payment Initiation Flow

### 1.1  Endpoint

```
POST /api/viewing-requests/{id}/payments/session
Authorization: Bearer <jwt>
Content-Type: application/json
```

### 1.2  Request body

```json
{ "provider": "STRIPE" }
```

or

```json
{ "provider": "PAYPAL" }
```

The `provider` field is **case-insensitive** — `"stripe"`, `"Stripe"`, `"STRIPE"` are all valid.
The backend resolves the correct provider client via `PaymentProviderRouter`.

### 1.3  Response (201 Created)

```json
{
  "transactionId": 42,
  "provider": "stripe",
  "status": "PENDING",
  "redirectUrl": "https://checkout.stripe.com/pay/cs_test_..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `transactionId` | `Long` | Server-side payment transaction ID |
| `provider` | `String` | Provider name (`"stripe"` or `"paypal"`) |
| `status` | `String` | Initial status — always `"PENDING"` on creation |
| `redirectUrl` | `String` | Provider-hosted checkout URL — redirect the browser here |

### 1.4  UI behaviour

1. User clicks a **"Pay with Stripe"** or **"Pay with PayPal"** button on the viewing detail page.
2. Frontend POSTs to the session endpoint with the chosen provider.
3. On **201** → read `redirectUrl` from `PaymentSessionDto` and `window.location.href = redirectUrl`.
4. The provider (Stripe Checkout / PayPal approval page) handles payment.
5. On success → provider redirects to `SUCCESS_URL` (configured server-side).
6. On cancel → provider redirects to `CANCEL_URL`.

### 1.5  Error responses

| HTTP Status | Cause | Frontend action |
|-------------|-------|-----------------|
| 400 | Invalid provider name | Show "Unsupported provider" error |
| 401 | Missing / expired JWT | Redirect to login |
| 403 | Not the viewing request tenant | Show "Not authorised" error |
| 404 | Viewing request not found | Show "Viewing not found" |
| 409 | Viewing request not in payable state / already paid | Show "Payment already initiated" or relevant message |

---

## 2  Payment Status Display

### 2.1  Endpoint

```
GET /api/viewing-requests/{id}/payments/status
Authorization: Bearer <jwt>
```

### 2.2  Response (200 OK)

```json
{ "status": "COMPLETED" }
```

If no payment transaction exists: `{ "status": "NONE" }`.

### 2.3  Status values and UI mapping

| `status` | Badge colour | Label | User action |
|----------|-------------|-------|-------------|
| `NONE` | Grey | No payment | Show "Pay now" button |
| `CREATED` | Grey | Payment created | Show "Complete payment" link |
| `PENDING` | Yellow | Payment pending | Show spinner / "Waiting for confirmation" |
| `COMPLETED` | Green | Paid | Show "Payment successful" ✓ |
| `FAILED` | Red | Payment failed | Show **"Retry payment"** button |
| `REFUNDED` | Orange | Refunded | Show "Payment refunded" |

### 2.4  Polling strategy

- Poll `GET .../payments/status` every **3–5 seconds** after returning from the provider redirect.
- Stop polling once status is `COMPLETED`, `FAILED`, or `REFUNDED` (terminal states).
- Alternatively, listen on the WebSocket channel `/user/queue/viewing-requests` for a `ViewingRequestDto` push when `PaymentDomainListener` transitions the booking status.

---

## 3  Booking Status Transitions (driven by PaymentDomainListener)

The backend **automatically** transitions the `ViewingRequest.status` when payment events arrive:

| Payment Event | Viewing Status Before | Viewing Status After |
|---|---|---|
| `COMPLETED` | `PENDING` | `CONFIRMED` |
| `REFUNDED` | `CONFIRMED` | `CANCELLED` |

The frontend should reflect both the payment status **and** the booking status:

| Booking Status | Badge | Description |
|---|---|---|
| `PENDING` | Yellow | Awaiting confirmation (or payment) |
| `CONFIRMED` | Green | Viewing confirmed (payment completed) |
| `DECLINED` | Red | Landlord declined |
| `CANCELLED` | Grey | Cancelled (or payment refunded) |
| `COMPLETED` | Blue | Viewing took place |

---

## 4  Frontend Task Checklist

| # | Task | Priority | Status |
|---|------|----------|--------|
| F-1 | **Implement payment button per provider** — "Pay with Stripe" and "Pay with PayPal" buttons on viewing detail page, calling `POST .../payments/session` with the chosen provider | High | ☐ Not started |
| F-2 | **Show payment + booking status badges on viewing detail** — render `PaymentTransactionStatus` and `ViewingRequest.status` as colour-coded badges (see §2.3, §3) | High | ☐ Not started |
| F-3 | **Handle FAILED → "Retry payment" UX** — when status is `FAILED`, show a retry button that re-calls the session endpoint (backend creates a new transaction) | High | ☐ Not started |
| F-4 | **Post-redirect status polling** — after returning from Stripe/PayPal, poll the status endpoint until a terminal state is reached | Medium | ☐ Not started |
| F-5 | **Success / cancel landing pages** — create `/payments/success` and `/payments/cancel` routes that display appropriate messages and link back to the viewing | Medium | ☐ Not started |
| F-6 | **Provider selection UI** — radio buttons or tabs letting the user choose between Stripe and PayPal before initiating payment | Medium | ☐ Not started |
| F-7 | **WebSocket integration for real-time status** — subscribe to `/user/queue/viewing-requests` for instant booking status updates instead of polling | Low | ☐ Not started |
| F-8 | **Mobile-responsive payment flow** — ensure payment buttons / badges render correctly at all breakpoints | Low | ☐ Not started |

---

## 5  Sequence Diagram — Full Payment Flow

```
┌────────────┐       ┌──────────┐       ┌────────────────┐       ┌────────────┐
│  Frontend   │       │  Backend  │       │  Stripe/PayPal  │       │  Webhook    │
└─────┬──────┘       └────┬─────┘       └───────┬────────┘       └─────┬──────┘
      │                    │                     │                      │
      │ 1. POST /payments/session               │                      │
      │    { "provider": "stripe" }             │                      │
      │───────────────────►│                     │                      │
      │                    │ 2. Create tx (PENDING)                    │
      │                    │    Call provider SDK │                      │
      │                    │────────────────────►│                      │
      │                    │◄────────────────────│                      │
      │                    │ 3. Return redirectUrl                      │
      │◄───────────────────│                     │                      │
      │                    │                     │                      │
      │ 4. Redirect to provider checkout         │                      │
      │───────────────────────────────────────►│                      │
      │                    │                     │                      │
      │                    │  5. User pays        │                      │
      │◄──────────────────────────────────────│                      │
      │  6. Redirect to SUCCESS_URL             │                      │
      │                    │                     │                      │
      │ 7. Poll GET /payments/status            │ 8. Webhook POST      │
      │───────────────────►│◄─────────────────────────────────────────│
      │                    │ 9. Mark COMPLETED    │                      │
      │                    │ 10. Auto PENDING→CONFIRMED                │
      │◄───────────────────│                     │                      │
      │ 11. Show "Confirmed" badge              │                      │
```

---

## 6  Environment Requirements for Frontend

The frontend needs the following configuration values (from backend env):

| Variable | Used by | Purpose |
|----------|---------|---------|
| `STRIPE_SUCCESS_URL` | Stripe SDK | Where to redirect after successful payment |
| `STRIPE_CANCEL_URL` | Stripe SDK | Where to redirect if user cancels |
| `PAYPAL_SUCCESS_URL` | PayPal SDK | Where to redirect after successful PayPal payment |
| `PAYPAL_CANCEL_URL` | PayPal SDK | Where to redirect if user cancels PayPal |

These are **backend-configured** — the frontend does not set them directly. The frontend
only needs to serve pages at the configured success/cancel URL paths (e.g. `/payments/success`,
`/payments/cancel`).
