# SQL Lab — MSSQL Basics (SichrPlace)

> **Audience:** SE tutorium students at RWTH Aachen
> **Database:** SQL Server 2025 Developer, SichrPlace schema (9 tables, 43 seed rows)
> **Duration:** 45–60 minutes
> **Prerequisites:** Backend running with `local-mssql` profile and seed data loaded

---

## What You're Working With

The SichrPlace database models a student-housing platform in Aachen.
The schema has **9 tables** connected by foreign keys:

```
users ──< apartments ──< apartment_reviews
  │              │
  │              ├──< conversations ──< messages
  │              │
  │              ├──< viewing_requests
  │              │
  │              └──< user_favorites
  │
  └──< notifications
  └──< listings (standalone, owner by ID only)
```

> **📊 Full ERD:** [`diagrams/erd_sichrplace.md`](diagrams/erd_sichrplace.md)

---

## Connecting to MSSQL

### Option A — SSMS (SQL Server Management Studio)

1. Open SSMS.
2. Server name: `localhost,1433`
3. Authentication: SQL Server Authentication
4. Login: `sichrplace_user` / Password: `SichrDev2025!`
   (or whatever you set in `.env.local`)
5. Expand **Databases → sichrplace → Tables** to see all 9 tables.

### Option B — Azure Data Studio

1. New Connection → Server: `localhost,1433`
2. Authentication type: SQL Login
3. User name: `sichrplace_user`, Password: `SichrDev2025!`
4. Database: `sichrplace`
5. Trust server certificate: ✅

### Option C — sqlcmd in Docker

```bash
docker exec -it sichrplace-database-1 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sichrplace_user -P 'SichrDev2025!' -d sichrplace -C
```

### Option D — Droplet MSSQL (if accessible via VPN)

Same as Option A/B but use `206.189.53.163,1433` as the server address
with the beta credentials from your `.env` file.

---

## Part 1 — Discover the Data

These exercises use `SELECT`, `WHERE`, `ORDER BY`, and `LIKE` to explore
what the seed data looks like.

---

### Exercise 1 — See all users

> **Task:** List every user's id, email, role, and city.

```sql
SELECT id, email, role, city
FROM users
ORDER BY id;
```

> **Expected:** 6 rows. Two ADMIN, two LANDLORD, two TENANT users.

---

### Exercise 2 — Filter by role

> **Task:** Show only TENANT users, sorted alphabetically by last name.

```sql
SELECT id, first_name, last_name, email
FROM users
WHERE role = 'TENANT'
ORDER BY last_name;
```

> **Hint:** Look at the ERD — the `role` column stores an enum as a string
> (`ADMIN`, `LANDLORD`, `TENANT`).

---

### Exercise 3 — Apartments under a budget

> **Task:** Find all apartments with monthly rent below 900 €, showing
> title, city, district, and monthly rent.

```sql
SELECT title, city, district, monthly_rent
FROM apartments
WHERE monthly_rent < 900
ORDER BY monthly_rent ASC;
```

> **Question:** How many apartments match? Check if the seed data has any
> under this threshold.

---

### Exercise 4 — Search by keyword

> **Task:** Find apartments whose title or description contains the word
> "Ponttor" (a neighbourhood in Aachen).

```sql
SELECT id, title, district, monthly_rent
FROM apartments
WHERE title LIKE '%Ponttor%'
   OR description LIKE '%Ponttor%';
```

---

### Exercise 5 — Recent messages

> **Task:** List the 5 most recent messages with their content preview
> (first 80 characters) and creation time.

```sql
SELECT TOP 5
    id,
    LEFT(content, 80) AS content_preview,
    message_type,
    created_at
FROM messages
ORDER BY created_at DESC;
```

> **Note:** `TOP` is MSSQL-specific. In PostgreSQL you'd write `LIMIT 5`.
> The Spring Boot backend uses JPA pagination that abstracts this difference.

---

## Part 2 — Join the Domain

These exercises practice `INNER JOIN` and `LEFT JOIN` across related tables.

---

### Exercise 6 — Messages with sender names

> **Task:** For conversation 1, list each message's content, the sender's
> first name and email, and the send time.

```sql
SELECT
    m.content,
    u.first_name AS sender_name,
    u.email      AS sender_email,
    m.created_at
FROM messages m
INNER JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = 1
ORDER BY m.created_at;
```

> **ERD hint:** `messages.sender_id` → `users.id` (FK).
> `messages.conversation_id` → `conversations.id` (FK).

---

### Exercise 7 — Apartments with their owners

> **Task:** List every apartment with its owner's name and email.

```sql
SELECT
    a.id          AS apartment_id,
    a.title,
    a.city,
    a.monthly_rent,
    u.first_name + ' ' + u.last_name AS owner_name,
    u.email       AS owner_email
FROM apartments a
INNER JOIN users u ON a.user_id = u.id
ORDER BY a.id;
```

---

### Exercise 8 — Conversations with apartment context

> **Task:** For each conversation, show the apartment title and both
> participants' names.

```sql
SELECT
    c.id           AS conv_id,
    a.title        AS apartment_title,
    p1.first_name  AS participant_1,
    p2.first_name  AS participant_2,
    c.last_message_at
FROM conversations c
INNER JOIN apartments a  ON c.apartment_id       = a.id
INNER JOIN users      p1 ON c.participant_1_id   = p1.id
INNER JOIN users      p2 ON c.participant_2_id   = p2.id
ORDER BY c.last_message_at DESC;
```

> **Note:** This is a 3-way join (conversations → apartments, conversations → users × 2).

---

### Exercise 9 — Reviews with reviewer and apartment info

> **Task:** Show all approved reviews: the apartment title, reviewer name,
> rating, and the review title.

```sql
SELECT
    a.title        AS apartment_title,
    u.first_name   AS reviewer,
    r.rating,
    r.title        AS review_title,
    r.status
FROM apartment_reviews r
INNER JOIN apartments a ON r.apartment_id = a.id
INNER JOIN users      u ON r.reviewer_id  = u.id
WHERE r.status = 'APPROVED'
ORDER BY r.rating DESC;
```

---

### Exercise 10 — Users and their favorites (LEFT JOIN)

> **Task:** List all users and how many favorites they have. Include users
> with zero favorites.

```sql
SELECT
    u.id,
    u.first_name,
    u.role,
    COUNT(f.id) AS favorite_count
FROM users u
LEFT JOIN user_favorites f ON u.id = f.user_id
GROUP BY u.id, u.first_name, u.role
ORDER BY favorite_count DESC;
```

> **Why LEFT JOIN?** An `INNER JOIN` would exclude users with no favorites.
> `LEFT JOIN` keeps every user row even if there's no matching row in
> `user_favorites`.

---

## Part 3 — Aggregate the Workplace

These exercises use `COUNT`, `SUM`, `AVG`, `GROUP BY`, and `HAVING`.

---

### Exercise 11 — Messages per conversation

> **Task:** Count messages in each conversation and show the total.

```sql
SELECT
    c.id           AS conv_id,
    a.title        AS apartment_title,
    COUNT(m.id)    AS message_count
FROM conversations c
INNER JOIN apartments a ON c.apartment_id = a.id
LEFT  JOIN messages   m ON c.id = m.conversation_id
GROUP BY c.id, a.title
ORDER BY message_count DESC;
```

---

### Exercise 12 — Average rent by city

> **Task:** Compute the average monthly rent per city.

```sql
SELECT
    city,
    COUNT(*)                     AS apartment_count,
    CAST(AVG(monthly_rent) AS DECIMAL(10,2)) AS avg_rent,
    MIN(monthly_rent)           AS min_rent,
    MAX(monthly_rent)           AS max_rent
FROM apartments
GROUP BY city
ORDER BY avg_rent DESC;
```

---

### Exercise 13 — Viewing requests by status

> **Task:** Count viewing requests grouped by status.

```sql
SELECT
    status,
    COUNT(*) AS request_count
FROM viewing_requests
GROUP BY status
ORDER BY request_count DESC;
```

---

### Exercise 14 — Users with unread notifications (HAVING)

> **Task:** Find users who have more than 1 unread notification.

```sql
SELECT
    u.first_name,
    u.email,
    COUNT(n.id) AS unread_count
FROM users u
INNER JOIN notifications n ON u.id = n.user_id
WHERE n.read_at IS NULL
GROUP BY u.first_name, u.email
HAVING COUNT(n.id) > 1
ORDER BY unread_count DESC;
```

> **Key difference:** `WHERE` filters rows before grouping.
> `HAVING` filters groups after aggregation.

---

### Exercise 15 — Landlords ranked by apartment count

> **Task:** Show each landlord's name and how many apartments they own,
> but only include landlords with 2+ apartments.

```sql
SELECT
    u.first_name + ' ' + u.last_name AS landlord_name,
    u.email,
    COUNT(a.id) AS apartment_count
FROM users u
INNER JOIN apartments a ON u.id = a.user_id
WHERE u.role = 'LANDLORD'
GROUP BY u.first_name, u.last_name, u.email
HAVING COUNT(a.id) >= 2
ORDER BY apartment_count DESC;
```

---

## Quick Reference

| SQL concept | Exercise(s) |
|-------------|------------|
| `SELECT … WHERE` | 1–4 |
| `TOP` / `ORDER BY` | 5 |
| `INNER JOIN` | 6–9 |
| `LEFT JOIN` | 10 |
| `COUNT / GROUP BY` | 11–13 |
| `AVG / MIN / MAX` | 12 |
| `HAVING` | 14–15 |

---

## Next Steps

- **Intermediate SQL lab:** [`SQL_LAB_MSSQL_INTERMEDIATE.md`](SQL_LAB_MSSQL_INTERMEDIATE.md)
  — normalization, indexes, performance-aware queries, parameterised thinking
- **MSSQL features showcase:** [`SQL_MSSQL_FEATURES_SHOWCASE.md`](SQL_MSSQL_FEATURES_SHOWCASE.md)
  — `TRY_CONVERT`, `OFFSET-FETCH`, views, and more
- **Back to tutorium labs:** [`TUTORIUM_LAB_WORKPLACE.md`](TUTORIUM_LAB_WORKPLACE.md)
