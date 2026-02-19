# SichrPlace — Student Extension Tracks

> **Purpose:** Structured mini-projects that build on the base tutorium labs.
> Complete one track (or more) to deepen your understanding of Spring Boot,
> JPA, and backend engineering.
>
> **Pre-requisite:** Complete Labs 1–3 in
> [`TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md) first.

---

## Overview

| Track | Theme | Difficulty | Estimated effort |
|-------|-------|-----------|-----------------|
| **A** | Analytics & Reporting | ★★☆ Intermediate | 4–6 hours |
| **B** | Soft-delete & State Transitions | ★★★ Advanced | 6–8 hours |
| **C** | Search & Filtering Enhancements | ★★☆ Intermediate | 4–6 hours |

Each track follows the same structure:
1. **Goal** — what you will build
2. **Requirements** — concrete deliverables
3. **Skeleton** — starter code to get you going
4. **Learning goals** — what SE concepts you practice
5. **Evaluation criteria** — how your work will be assessed

---

## Track A — Analytics & Reporting

### Goal

Add a `/api/admin/analytics` endpoint that returns platform usage statistics
over a configurable time window.

### Requirements

| # | Deliverable |
|---|------------|
| A1 | `AnalyticsDto` with fields: `totalUsers`, `newUsersLast30Days`, `totalApartments`, `activeListings`, `totalMessages`, `messagesLast7Days`, `averageReviewRating`, `pendingReviews` |
| A2 | `AnalyticsService` that queries repositories using derived queries or `@Query` (JPQL) |
| A3 | `GET /api/admin/analytics?days=30` endpoint in `AdminController`, restricted to `ADMIN` role |
| A4 | Unit test or integration test for `AnalyticsService` |

### Skeleton

**DTO:**

```java
public record AnalyticsDto(
    long totalUsers,
    long newUsersLast30Days,
    long totalApartments,
    long activeListings,
    long totalMessages,
    long messagesLast7Days,
    double averageReviewRating,
    long pendingReviews
) {}
```

**Repository query (example):**

```java
// In UserRepository.java
@Query("SELECT COUNT(u) FROM User u WHERE u.createdAt >= :since")
long countUsersCreatedSince(@Param("since") Instant since);
```

**Controller:**

```java
@GetMapping("/analytics")
@PreAuthorize("hasRole('ADMIN')")
@Operation(summary = "Platform analytics for the last N days")
public ResponseEntity<AnalyticsDto> getAnalytics(
        @RequestParam(defaultValue = "30") int days) {
    return ResponseEntity.ok(analyticsService.getAnalytics(days));
}
```

### Learning goals

- Writing JPQL aggregate queries (`COUNT`, `AVG`)
- Using `@Query` with named parameters
- DTO projection (record classes)
- Securing admin-only endpoints

### Evaluation criteria

| Criterion | Weight |
|-----------|--------|
| Correct JPQL queries (no raw SQL) | 30 % |
| DTO design and completeness | 20 % |
| Endpoint security (`@PreAuthorize`) | 15 % |
| Test coverage (at least 1 meaningful test) | 20 % |
| Code style and documentation | 15 % |

---

## Track B — Soft-delete & State Transitions

### Goal

Replace hard `DELETE` operations with soft-delete (logical deletion) and add
a formal state machine to the `ViewingRequest` entity with auditable
transition history.

### Requirements

| # | Deliverable |
|---|------------|
| B1 | Add `deletedAt` (`Instant`, nullable) and `deletedBy` (`Long`, nullable) columns to `Apartment` and `ApartmentReview` |
| B2 | Add `@Where(clause = "deleted_at IS NULL")` (Hibernate filter) to exclude soft-deleted records by default |
| B3 | Change `ApartmentService.deleteApartment()` and `ReviewService.deleteReview()` to set `deletedAt` + `deletedBy` instead of `repository.delete()` |
| B4 | Add `GET /api/admin/apartments/deleted` and `GET /api/admin/reviews/deleted` to list soft-deleted records (ADMIN only) |
| B5 | Create a `ViewingRequestTransition` entity that logs every state change with `fromStatus`, `toStatus`, `changedBy`, `changedAt`, `reason` |
| B6 | Modify `ViewingRequestService` to persist a `ViewingRequestTransition` row on every confirm/decline/cancel |
| B7 | Add `GET /api/viewing-requests/{id}/history` to retrieve the full transition log |
| B8 | Write a migration script `V003__soft_delete_and_transitions.sql` |

### Skeleton

**Soft-delete mixin (entity fields):**

```java
@Column(name = "deleted_at")
private Instant deletedAt;

@Column(name = "deleted_by")
private Long deletedBy;

public boolean isDeleted() {
    return deletedAt != null;
}

public void softDelete(Long userId) {
    this.deletedAt = Instant.now();
    this.deletedBy = userId;
}
```

**Transition entity:**

```java
@Entity
@Table(name = "viewing_request_transitions")
public class ViewingRequestTransition {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewing_request_id", nullable = false)
    private ViewingRequest viewingRequest;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 20)
    private ViewingRequest.Status fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 20)
    private ViewingRequest.Status toStatus;

    @Column(name = "changed_by", nullable = false)
    private Long changedBy;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;

    @Column(name = "reason")
    private String reason;
}
```

### Learning goals

- Soft-delete pattern (why it matters for auditing and GDPR)
- Hibernate `@Where` / `@SQLRestriction` filters
- Event sourcing light — recording state transitions
- Writing idempotent migration scripts for schema additions

> **📊 Diagram:** Update the state chart in
> [`diagrams/state_charts.md`](diagrams/state_charts.md) to include
> transition logging.

### Evaluation criteria

| Criterion | Weight |
|-----------|--------|
| Soft-delete works correctly (records hidden, admin can view) | 25 % |
| Transition history is complete and accurate | 25 % |
| Migration script is idempotent | 15 % |
| No regressions in existing endpoints | 15 % |
| ERD / state chart updated | 10 % |
| Code style and documentation | 10 % |

---

## Track C — Search & Filtering Enhancements

### Goal

Upgrade the apartment search from basic query parameters to a powerful
**Specification-based** search with full-text search, distance filtering, and
saved-search alerts.

### Requirements

| # | Deliverable |
|---|------------|
| C1 | Create `ApartmentSpecification` using Spring Data JPA `Specification<Apartment>` interface |
| C2 | Support combined filters: `city`, `minPrice`, `maxPrice`, `minBedrooms`, `maxBedrooms`, `minSize`, `maxSize`, `furnished`, `petFriendly`, `availableFrom`, `availableTo` |
| C3 | Add `GET /api/apartments/search` that accepts all filter params and returns paginated results |
| C4 | Add a `SavedSearch` entity: user can save a filter combination and get notified when new apartments match |
| C5 | `POST /api/saved-searches` — create a saved search |
| C6 | `GET /api/saved-searches` — list my saved searches |
| C7 | `DELETE /api/saved-searches/{id}` — remove a saved search |

### Skeleton

**Specification builder:**

```java
public class ApartmentSpecification {

    public static Specification<Apartment> withFilters(ApartmentSearchDto filters) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filters.city() != null) {
                predicates.add(cb.equal(
                    cb.lower(root.get("city")),
                    filters.city().toLowerCase()));
            }
            if (filters.minPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(
                    root.get("rentAmount"), filters.minPrice()));
            }
            if (filters.maxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(
                    root.get("rentAmount"), filters.maxPrice()));
            }
            // ... add more predicates

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
```

**SavedSearch entity:**

```java
@Entity
@Table(name = "saved_searches")
public class SavedSearch {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column(name = "filter_json", columnDefinition = "VARCHAR(MAX)")
    private String filterJson;   // serialized ApartmentSearchDto

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "last_matched_at")
    private Instant lastMatchedAt;
}
```

### Learning goals

- JPA Criteria API and `Specification` pattern
- Dynamic query building (vs. fixed `@Query` methods)
- JSON serialization of filter state
- Pagination with combined specifications

> **📊 Diagram:** After implementation, update the ERD in
> [`diagrams/erd_sichrplace.md`](diagrams/erd_sichrplace.md)
> to include the `saved_searches` table.

### Evaluation criteria

| Criterion | Weight |
|-----------|--------|
| Specification covers all listed filters | 25 % |
| Filters combine correctly (AND logic) | 20 % |
| SavedSearch CRUD endpoints work | 20 % |
| Pagination and sorting work with specifications | 15 % |
| Migration script is idempotent | 10 % |
| Code style and documentation | 10 % |

---

## Submission Guidelines

1. **Branch** — Create a feature branch: `track-a/analytics`,
   `track-b/soft-delete`, or `track-c/search`.
2. **Commit** — Make small, well-described commits.
3. **Migration** — Include any required `db/migrations/V0xx__*.sql` scripts.
4. **Test** — Demonstrate your endpoints work against the MSSQL seed data.
5. **Documentation** — Update the ERD and/or state charts if you added
   entities or state transitions.
6. **Pull Request** — Open a PR against `main` with a description of what
   you built and screenshots of the API responses.

---

## Cross-references

| Resource | Path |
|----------|------|
| Base tutorium labs | [`TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md) |
| API endpoint reference | [`API_ENDPOINTS_BACKEND.md`](API_ENDPOINTS_BACKEND.md) |
| Seed data documentation | [`SEED_WORKPLACE_MSSQL.md`](SEED_WORKPLACE_MSSQL.md) |
| Migration conventions | [`../db/migrations/README.md`](../db/migrations/README.md) |
| ERD diagram | [`diagrams/erd_sichrplace.png`](diagrams/erd_sichrplace.png) |
| State charts | [`diagrams/state_charts.md`](diagrams/state_charts.md) |
| Thesis overview | [`../THESIS_OVERVIEW_BACKEND.md`](../THESIS_OVERVIEW_BACKEND.md) |
