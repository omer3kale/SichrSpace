# SQL Exam Questions — SichrPlace (MSSQL)

> **Purpose:** 2 easier + 1 complex exam-style SQL questions on the
> SichrPlace schema. Tasks only — no model solutions in this document.
> **Schema reference:** [`diagrams/erd_sichrplace.md`](diagrams/erd_sichrplace.md)
> **Difficulty:** ★ = basic, ★★ = intermediate, ★★★ = advanced

---

## Schema Reminder

```
users (id, email, password, first_name, last_name, role, city, …)
apartments (id, user_id→users, title, city, district, monthly_rent, status, …)
conversations (id, apartment_id→apartments, participant_1_id→users, participant_2_id→users, …)
messages (id, conversation_id→conversations, sender_id→users, content, message_type, created_at, …)
apartment_reviews (id, apartment_id→apartments, reviewer_id→users, rating, title, comment, status, …)
viewing_requests (id, apartment_id→apartments, tenant_id→users, status, proposed_date_time, …)
user_favorites (id, user_id→users, apartment_id→apartments, created_at)
notifications (id, user_id→users, type, title, read_at, priority, …)
listings (id, title, city, monthly_rent, owner_id, …)
```

---

## Question 1 — ★ Single-join, simple filter

### Task

> Write a SQL query that lists all **viewing requests** for apartments
> located in the city **Aachen**.
>
> For each request, show:
> - The viewing request ID
> - The apartment title
> - The proposed date/time
> - The request status
>
> Sort the results by proposed date/time in ascending order.

### Hints

- You need to join `viewing_requests` with `apartments`.
- Filter on `apartments.city`.
- The FK is `viewing_requests.apartment_id → apartments.id`.

### Expected columns

| vr_id | apartment_title | proposed_date_time | status |
|-------|----------------|-------------------|--------|

---

## Question 2 — ★ Single-join, aggregate

### Task

> Write a SQL query that counts the **number of unread notifications**
> per user.
>
> Show:
> - The user's first name and email
> - The count of unread notifications
>
> Only include users who have **at least 1** unread notification.
> A notification is unread when `read_at IS NULL`.
> Sort by unread count descending.

### Hints

- Join `notifications` with `users`.
- Filter with `WHERE n.read_at IS NULL`.
- Use `GROUP BY` and `HAVING`.

### Expected columns

| first_name | email | unread_count |
|------------|-------|-------------|

---

## Question 3 — ★★★ Multi-join + aggregate + date filter

### Task

> Write a SQL query that lists apartments which have received **at least 3
> messages** across all their conversations within the **last 30 days**.
>
> For each qualifying apartment, show:
> - The apartment ID and title
> - The city and district
> - The owner's full name (first + last)
> - The total message count in the last 30 days
>
> Sort by message count descending, then by apartment title ascending.

### Hints

- You need to trace: `messages` → `conversations` → `apartments` → `users` (owner).
- Date filter on `messages.created_at`: use `DATEADD(DAY, -30, GETDATE())`.
- The aggregate is `COUNT(messages.id)` grouped by apartment.
- The `HAVING` clause enforces the "at least 3" threshold.
- The owner join is `apartments.user_id → users.id`.

### Expected columns

| apartment_id | title | city | district | owner_name | message_count_30d |
|-------------|-------|------|----------|------------|------------------|

### Evaluation criteria

| Criterion | Points |
|-----------|--------|
| Correct 4-table `JOIN` chain | 3 |
| Correct `WHERE` date filter using `DATEADD` | 2 |
| Correct `GROUP BY` (all non-aggregated columns) | 2 |
| `HAVING COUNT(...) >= 3` | 1 |
| Correct `ORDER BY` (message count DESC, title ASC) | 1 |
| Clean column aliases | 1 |
| **Total** | **10** |

---

## How to Use These Questions

### For self-practice

1. Open SSMS / Azure Data Studio connected to SichrPlace MSSQL.
2. Write your query.
3. Run it against the seed data and check if the results make sense.
4. For Question 3: if the seed data doesn't have 3 messages in 30 days,
   adjust the date window (e.g. `DATEADD(DAY, -365, GETDATE())`) or
   insert test messages first.

### For exam/assessment

- Questions 1 and 2 are "must-answer" (fundamentals).
- Question 3 tests multi-join, aggregation, and MSSQL date functions.
- The evaluation criteria table for Question 3 provides a clear rubric.

---

## Further Practice

- **15 more queries:** [`SQL_LAB_MSSQL_BASICS.md`](SQL_LAB_MSSQL_BASICS.md)
- **Constraints, indexing, CTEs:** [`SQL_LAB_MSSQL_INTERMEDIATE.md`](SQL_LAB_MSSQL_INTERMEDIATE.md)
- **MSSQL-specific features:** [`SQL_MSSQL_FEATURES_SHOWCASE.md`](SQL_MSSQL_FEATURES_SHOWCASE.md)
