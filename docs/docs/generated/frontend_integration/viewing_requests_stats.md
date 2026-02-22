# Frontend Integration Spec — Viewing Request Statistics & Completion

> **Legacy Notice (2026-02-20):** Implementation is now authoritative.
> Source of truth is Java code + tests:
> `ViewingRequestController#getStatistics`, `ViewingRequestController#completeViewingRequest`,
> `ViewingRequestServiceImpl#getStatistics`, `ViewingRequestServiceImpl#completeViewingRequest`,
> `ViewingRequestServiceExtendedTest`, `ViewingRequestControllerShowcaseTest`.
> This document is retained for transition/teaching and may be removed after final verification.

| Meta | Value |
|------|-------|
| **Backend tag** | `v1.2.0-thesis-showcase` |
| **Integration level** | Full (Read stats + State transition) |
| **Generated** | 2025-06-16 |

---

## 1  Domain & UX Intent

**User story**

> As a landlord or tenant, I want to see an overview of my viewing request
> statistics (pending, confirmed, declined, completed, cancelled) and be
> able to mark a confirmed viewing as completed, so that I can track my
> rental activity at a glance.

| Aspect | Detail |
|--------|--------|
| **Primary user role** | LANDLORD (stats for own apartments) or TENANT (stats for own requests) |
| **Screen context** | Dashboard / viewing-requests management page |

---

## 2  Backend Contract

### 1. `GET /api/viewing-requests/statistics`

| Property | Value |
|----------|-------|
| **Auth required** | Yes — Bearer JWT |
| **Rate-limit notes** | Low-frequency endpoint; no special rate limiting needed |

#### Response fields

| Field | Type | Notes |
|-------|------|-------|
| `totalRequests` | `long` | Total viewing requests for the authenticated user |
| `pendingCount` | `long` | Requests awaiting landlord response |
| `confirmedCount` | `long` | Requests confirmed by landlord |
| `declinedCount` | `long` | Requests declined by landlord |
| `completedCount` | `long` | Viewings that took place |
| `cancelledCount` | `long` | Requests cancelled by tenant |
| `averageResponseTimeHours` | `Double (nullable)` | Average hours from PENDING to CONFIRMED/DECLINED; null if no transitions yet |

#### Error codes

| HTTP Status | Meaning | Suggested UX |
|-------------|---------|--------------|
| `401` | Not authenticated | Redirect to login page |

#### Validation hints

- Landlords see statistics for viewing requests against their apartments.
- Tenants see statistics for their own viewing requests.
- averageResponseTimeHours may be null if no requests have been responded to yet — display 'N/A' in that case.

### 2. `PUT /api/viewing-requests/{id}/complete`

| Property | Value |
|----------|-------|
| **Auth required** | Yes — Bearer JWT |
| **Rate-limit notes** | Idempotent on success; safe to retry |

#### Request fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `Long (path variable)` | Yes | Must be a viewing request ID in CONFIRMED status |

#### Response fields

| Field | Type | Notes |
|-------|------|-------|
| `id` | `Long` | Viewing request ID |
| `status` | `String` | Updated status — will be 'COMPLETED' |
| `apartmentId` | `Long` | Associated apartment ID |
| `tenantId` | `Long` | Tenant who requested the viewing |
| `landlordId` | `Long` | Landlord who owns the apartment |
| `requestedDate` | `LocalDate` | Date the viewing was requested for |
| `message` | `String` | Optional message from the tenant |
| `createdAt` | `LocalDateTime` | When the request was created |
| `updatedAt` | `LocalDateTime` | When the status was last changed |

#### Error codes

| HTTP Status | Meaning | Suggested UX |
|-------------|---------|--------------|
| `401` | Not authenticated | Redirect to login page |
| `403` | User is not the landlord or tenant for this viewing request | Show 'Access denied' toast |
| `404` | Viewing request not found | Show 'Viewing request not found' message |
| `409` | Invalid state transition (e.g. trying to complete a PENDING or DECLINED request) | Show 'This viewing must be confirmed before it can be completed' message |

#### Validation hints

- Only CONFIRMED viewing requests can be completed — the backend enforces a state machine: PENDING → CONFIRMED → COMPLETED.
- PENDING and DECLINED requests cannot be completed (409 Conflict).
- Both the landlord and tenant can mark a viewing as completed.

---

## 3  Frontend Consumption Pattern

> **No framework lock-in** — the patterns below are expressed in plain
> JavaScript (`fetch` / `XMLHttpRequest`). Adapt to your own component
> model (AppleMontiCore, Web Components, etc.) as needed.

### Data-fetch pattern

```js
const token = localStorage.getItem('jwt');

// Fetch statistics
const statsRes = await fetch(`${BASE_URL}/api/viewing-requests/statistics`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const stats = await statsRes.json();

// Complete a viewing request
const completeRes = await fetch(
  `${BASE_URL}/api/viewing-requests/${requestId}/complete`,
  {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
if (completeRes.status === 409) { /* show state-machine error */ }
const updated = await completeRes.json();
```

### State shape (plain object)

```json
{
  "stats": {
    "totalRequests": 0,
    "pendingCount": 0,
    "confirmedCount": 0,
    "declinedCount": 0,
    "completedCount": 0,
    "cancelledCount": 0,
    "averageResponseTimeHours": null
  },
  "isLoadingStats": false,
  "selectedRequestId": null,
  "isCompleting": false,
  "error": null
}
```

### Render hints

- Display statistics as a dashboard with count cards or a summary bar.
- Use colour coding: pending=amber, confirmed=green, declined=red, completed=blue, cancelled=grey.
- Show averageResponseTimeHours formatted as 'X.X hours' or 'N/A' if null.
- The 'Complete' button should only appear on CONFIRMED viewing requests.
- After completing, refresh the statistics to show updated counts.
- Consider a donut/pie chart for visual distribution of statuses (optional).

---

## 4  Responsive & Accessibility Notes

### Breakpoints

| Breakpoint | Layout guidance |
|------------|----------------|
| ≤ 480px (mobile) | Stack stat cards vertically (one per row); full-width 'Complete' button. |
| 481–768px (tablet) | 2×3 grid of stat cards; viewing requests as compact list. |
| 769–1024px (small desktop) | 3×2 grid of stat cards with optional chart; viewing requests as table. |
| ≥ 1025px (desktop) | Stats row across top; table of viewing requests below with inline 'Complete' action. |

### Priority content

- Total count and status breakdown are always visible.
- The 'Complete' action must be easily discoverable on confirmed requests.
- Average response time is secondary — can be hidden on smallest screens.

### Accessibility (a11y)

- Stat cards should use aria-label (e.g. 'Pending viewing requests: 3').
- Colour coding must be supplemented with text labels (do not rely on colour alone).
- The 'Complete' button should have `aria-label="Mark viewing request as completed"`.
- Status change confirmation should use `role="status"` for live-region announcement.
- If using a chart, provide a text-based alternative (e.g. a summary sentence).

---

## 5  Testing Hooks

### Mock data source

```
Seed data includes viewing requests in various states for landlord
bob@example.com and tenant diana@example.com. Login as either user
and call GET /api/viewing-requests/statistics to see real counts.
To test completion, create a request as Diana, confirm as Bob,
then complete as either party.
```

### Manual test checklist

- [ ] Login as a landlord — verify statistics reflect viewing requests for their apartments.
- [ ] Login as a tenant — verify statistics reflect their own requests.
- [ ] Verify averageResponseTimeHours displays correctly (or 'N/A' if null).
- [ ] Complete a CONFIRMED viewing request — verify status changes to COMPLETED.
- [ ] Try to complete a PENDING request — verify 409 error and appropriate message.
- [ ] Try to complete a DECLINED request — verify 409 error.
- [ ] After completing, refresh statistics — verify completedCount incremented.
- [ ] Resize from desktop to mobile — verify stat cards stack responsively.
- [ ] Use keyboard to navigate stat cards and 'Complete' button — verify focus management.
