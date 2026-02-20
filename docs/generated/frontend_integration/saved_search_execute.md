# Frontend Integration Spec — Execute Saved Search

| Meta | Value |
|------|-------|
| **Backend tag** | `v1.2.0-thesis-showcase` |
| **Integration level** | Full (CRUD + Execute) |
| **Generated** | 2025-06-16 |

---

## 1  Domain & UX Intent

**User story**

> As a logged-in tenant, I want to execute a previously saved search so
> that I can see current apartments matching my stored filters without
> re-entering criteria every time.

| Aspect | Detail |
|--------|--------|
| **Primary user role** | TENANT (or any authenticated user) |
| **Screen context** | Saved-searches list page → results overlay / results page |

---

## 2  Backend Contract

### 1. `POST /api/saved-searches/{id}/execute`

| Property | Value |
|----------|-------|
| **Auth required** | Yes — Bearer JWT (any authenticated user) |
| **Rate-limit notes** | No explicit rate limit; consider debouncing on the frontend (300ms) |

#### Request fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `id` | `Long (path variable)` | Yes | Must be a saved search owned by the authenticated user |
| `page` | `int (query param)` | No | Default 0; zero-indexed |
| `size` | `int (query param)` | No | Default 20; max recommended 50 |
| `sort` | `String (query param)` | No | e.g. price,asc or createdAt,desc |

#### Response fields

| Field | Type | Notes |
|-------|------|-------|
| `content` | `ApartmentDto[]` | Array of matching apartments |
| `content[].id` | `Long` | Apartment ID |
| `content[].title` | `String` | Listing title |
| `content[].description` | `String` | Full description text |
| `content[].city` | `String` | City name |
| `content[].district` | `String` | District / neighbourhood |
| `content[].address` | `String` | Street address |
| `content[].price` | `BigDecimal` | Monthly rent |
| `content[].size` | `Double` | Size in m² |
| `content[].bedrooms` | `Integer` | Number of bedrooms |
| `content[].furnished` | `Boolean` | true if furnished |
| `content[].petFriendly` | `Boolean` | true if pets allowed |
| `content[].hasParking` | `Boolean` | true if parking available |
| `content[].hasElevator` | `Boolean` | true if building has elevator |
| `content[].hasBalcony` | `Boolean` | true if unit has balcony |
| `totalElements` | `long` | Total matching apartments across all pages |
| `totalPages` | `int` | Total number of pages |
| `number` | `int` | Current page number (zero-indexed) |
| `size` | `int` | Page size |

#### Error codes

| HTTP Status | Meaning | Suggested UX |
|-------------|---------|--------------|
| `401` | Not authenticated | Redirect to login page |
| `403` | Saved search belongs to another user | Show 'Access denied' toast |
| `404` | Saved search not found | Show 'Search not found — it may have been deleted' message |

#### Validation hints

- The saved search stores 13 filter fields (city, district, minPrice, maxPrice, minBedrooms, maxBedrooms, minSize, maxSize, furnished, petFriendly, hasParking, hasElevator, hasBalcony).
- Null filter fields are ignored (match all). Only non-null fields constrain results.
- Results are returned as a Spring Data Page — use totalElements and totalPages for pagination UI.

---

## 3  Frontend Consumption Pattern

> **No framework lock-in** — the patterns below are expressed in plain
> JavaScript (`fetch` / `XMLHttpRequest`). Adapt to your own component
> model (AppleMontiCore, Web Components, etc.) as needed.

### Data-fetch pattern

```js
const token = localStorage.getItem('jwt');
const res = await fetch(
  `${BASE_URL}/api/saved-searches/${searchId}/execute?page=${page}&size=20`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
if (!res.ok) { /* handle 401/403/404 */ }
const data = await res.json();
// data.content = ApartmentDto[], data.totalPages, data.number
```

### State shape (plain object)

```json
{
  "searchId": 42,
  "results": [],
  "currentPage": 0,
  "totalPages": 0,
  "totalElements": 0,
  "isLoading": false,
  "error": null
}
```

### Render hints

- Show a loading skeleton while isLoading is true.
- Render each apartment as a card with title, city, price, size, bedrooms.
- Show boolean amenities (furnished, petFriendly, parking, elevator, balcony) as icon badges.
- Display pagination controls using totalPages and currentPage.
- If results are empty, show a friendly 'No apartments match your saved filters' message with a link to edit the search.

---

## 4  Responsive & Accessibility Notes

### Breakpoints

| Breakpoint | Layout guidance |
|------------|----------------|
| ≤ 480px (mobile) | Single-column card list; stack price below title; hide description. |
| 481–768px (tablet) | Two-column card grid; show truncated description (2 lines). |
| 769–1024px (small desktop) | Three-column grid; show full amenity badge row. |
| ≥ 1025px (desktop) | Three or four-column grid with sidebar showing saved-search filters summary. |

### Priority content

- Apartment title and price are always visible (even on smallest screens).
- Pagination controls are always accessible — sticky footer or infinite scroll.
- Error messages appear inline above the results area.

### Accessibility (a11y)

- Each apartment card should be a focusable element (tabindex or semantic `<article>`).
- Pagination buttons need aria-label (e.g. 'Go to page 3 of 5').
- Loading state should set `aria-busy="true"` on the results container.
- Boolean amenity icons must have aria-label or sr-only text.

---

## 5  Testing Hooks

### Mock data source

```
Use Swagger UI at /swagger-ui/index.html to execute the endpoint
with a valid JWT. Alternatively, seed data includes saved searches
for user alice@example.com (TENANT) — login, list saved searches,
then execute any of them.
```

### Manual test checklist

- [ ] Login as a tenant and execute a saved search — verify results match the stored filters.
- [ ] Execute with page=0&size=5 and verify only 5 results per page.
- [ ] Execute a search that matches zero apartments — verify empty-state message.
- [ ] Try to execute another user's saved search — verify 403 response.
- [ ] Try to execute with an invalid search ID — verify 404 response.
- [ ] Resize the browser from desktop to mobile — verify responsive card layout.
- [ ] Tab through results with keyboard — verify all cards and pagination are focusable.
