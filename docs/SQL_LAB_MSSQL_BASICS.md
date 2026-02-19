# SQL Lab — MSSQL Basics (SichrPlace)

> **Audience:** SE tutorium students at RWTH Aachen
> **Database:** SQL Server 2025 Developer, SichrPlace schema (9 tables, 43 seed rows)
> **Duration:** 45–60 minutes
> **Prerequisites:** Backend running with `local-mssql` profile and seed data loaded

---

## 1. Introduction

This workbook teaches basic SQL querying on a **Microsoft SQL Server 2025
Developer** database.  The schema is the SichrPlace student-housing platform
— 9 tables covering users, apartments, messaging, reviews, and more.

You should already have:

- The `local-mssql` environment running (Docker + Spring Boot).
- Seed data loaded (6 users, 4 apartments, 43 rows total).

> **📊 Schema reference:** [`diagrams/erd_sichrplace.md`](diagrams/erd_sichrplace.md)
> — open this alongside the exercises to see table names, columns, and FK
> relationships.

---

## 2. Connecting to the Database

### SSMS or Azure Data Studio (recommended)

| Setting | Value |
|---------|-------|
| Server | `localhost,1433` |
| Authentication | SQL Server Authentication |
| User | `sichrplace_user` |
| Password | `SichrDev2025!` (or your `.env.local` value) |
| Database | `sichrplace` |

In SSMS: expand **Databases → sichrplace → Tables** to browse all 9 tables.

### Droplet MSSQL (if your course uses VPN)

Same connection settings but use `206.189.53.163,1433` as the server
address with the beta credentials from your `.env` file.  Access is
**read-only** for students.

---

## 3. Part A — Discover the Data

These exercises use `SELECT`, `FROM`, `WHERE`, `ORDER BY`, and `TOP`.

---

### Exercise 1 — List all users

> **Task:** Write a query that shows every user's id, email, role, and city,
> ordered by id.

**Hint:** The `users` table has columns `id`, `email`, `role`, `city`.
Check the ERD for the full column list.

---

### Exercise 2 — Filter users by role

> **Task:** Show only users whose role is `TENANT`, sorted alphabetically
> by last name.  Include their first name, last name, and email.

**Hint:** The `role` column in `users` stores a string value — one of
`ADMIN`, `LANDLORD`, or `TENANT`.  Use a `WHERE` clause with string
comparison.

---

### Exercise 3 — Apartments under a budget

> **Task:** Find all apartments with a monthly rent below 900, showing the
> title, city, district, and monthly rent.  Order by rent ascending.

**Hint:** The `apartments` table has a `monthly_rent` column (DECIMAL).
Use `WHERE` with a numeric comparison and `ORDER BY`.

---

### Exercise 4 — Search by keyword

> **Task:** Find apartments whose title or description mentions "Ponttor"
> (a neighbourhood in Aachen).  Show the apartment id, title, district, and
> monthly rent.

**Hint:** Use the `LIKE` operator with `%` wildcards on both the `title`
and `description` columns.  You can combine conditions with `OR`.

---

### Exercise 5 — Most recent messages

> **Task:** Show the 5 most recent messages — include the message id, the
> first 80 characters of the content, the message type, and the creation
> timestamp.

**Hint:** Use `TOP 5` (an MSSQL-specific keyword) together with
`ORDER BY created_at DESC`.  The `LEFT()` function truncates a string
to a given length.  The relevant table is `messages`.

---

## 4. Part B — Join the Domain

These exercises use `INNER JOIN` and `LEFT JOIN` to connect related tables.

---

### Exercise 6 — Messages with sender names

> **Task:** For conversation 1, list each message's content, the sender's
> first name, the sender's email, and the send time — ordered
> chronologically.

**Hint:** You need two tables: `messages` and `users`.  The FK is
`messages.sender_id → users.id`.  Filter with
`WHERE m.conversation_id = 1`.

**Output columns:** content, sender first name, sender email, created_at.

---

### Exercise 7 — Apartments with their owners

> **Task:** List every apartment alongside its owner's full name (first +
> last) and email address.

**Hint:** Join `apartments` to `users` using `apartments.user_id → users.id`.
Concatenate first and last name with `+` in MSSQL (e.g.
`first_name + ' ' + last_name`).

**Output columns:** apartment id, title, city, monthly_rent, owner name, owner email.

---

### Exercise 8 — Conversations with apartment and participant context

> **Task:** For each conversation, show the apartment title and both
> participants' first names, ordered by most recent message.

**Hint:** This requires joining `conversations` to three other tables:
`apartments` (via `apartment_id`), `users` twice (via `participant_1_id`
and `participant_2_id`).  Use table aliases to distinguish the two user
joins.

**Output columns:** conversation id, apartment title, participant 1 name, participant 2 name, last_message_at.

---

### Exercise 9 — Approved reviews with apartment and reviewer info

> **Task:** Show all reviews that have status `APPROVED` — include the
> apartment title, reviewer's first name, the numeric rating, and the
> review title.  Order by rating descending.

**Hint:** Join `apartment_reviews` to both `apartments` (via `apartment_id`)
and `users` (via `reviewer_id`).  Filter with `WHERE status = 'APPROVED'`.

**Output columns:** apartment title, reviewer name, rating, review title.

---

### Exercise 10 — All users and their favorite count (LEFT JOIN)

> **Task:** List every user with their first name, role, and the number of
> apartments they have favorited.  Users with zero favorites must still
> appear in the results.

**Hint:** Use a `LEFT JOIN` from `users` to `user_favorites` on
`users.id = user_favorites.user_id`.  An `INNER JOIN` would drop users
who have no favorites.  You'll need `COUNT()` and `GROUP BY` here.

**Output columns:** user id, first name, role, favorite count.

---

## 5. Part C — Aggregate the Workplace

These exercises use `COUNT`, `AVG`, `MIN`, `MAX`, `GROUP BY`, and `HAVING`.

---

### Exercise 11 — Messages per conversation

> **Business question:** How many messages does each conversation have?
> Which conversation is the most active?

**Tables needed:** `conversations`, `apartments`, `messages`.
Join conversations to apartments (for the title) and to messages (to count).

**Output columns:** conversation id, apartment title, message count.

**Hint:** Use `COUNT(m.id)` with `GROUP BY` on conversation id and
apartment title.  Order by message count descending.

---

### Exercise 12 — Average rent by city

> **Business question:** What is the average, minimum, and maximum monthly
> rent in each city?

**Tables needed:** `apartments` only.

**Output columns:** city, apartment count, average rent, min rent, max rent.

**Hint:** Use `AVG(monthly_rent)`, `MIN(monthly_rent)`, `MAX(monthly_rent)`
with `GROUP BY city`.  You may need `CAST(... AS DECIMAL(10,2))` to round
the average.

---

### Exercise 13 — Viewing requests by status

> **Business question:** How many viewing requests exist for each status
> (PENDING, CONFIRMED, DECLINED, etc.)?

**Tables needed:** `viewing_requests` only.

**Output columns:** status, request count.

**Hint:** Use `COUNT(*)` with `GROUP BY status`.  Order by count descending.

---

### Exercise 14 — Users with many unread notifications

> **Business question:** Which users have more than 1 unread notification?

**Tables needed:** `users`, `notifications`.

**Output columns:** user first name, email, unread notification count.

**Hint:** A notification is unread when `read_at IS NULL`.  Use `WHERE`
to filter unread rows *before* grouping, then use `HAVING COUNT(...) > 1`
to keep only users above the threshold.

> **Key concept:** `WHERE` filters individual rows before aggregation.
> `HAVING` filters groups after aggregation.

---

### Exercise 15 — Landlords ranked by apartment count

> **Business question:** Which landlords own 2 or more apartments?

**Tables needed:** `users`, `apartments`.

**Output columns:** landlord full name, email, apartment count.

**Hint:** Filter `users` by `role = 'LANDLORD'`, join to `apartments`
on `users.id = apartments.user_id`, group by landlord, and use
`HAVING COUNT(...) >= 2`.

---

## 6. Wrap-Up

After completing this lab you should be able to:

- **Filter and sort** rows using `WHERE`, `ORDER BY`, `TOP`, and `LIKE`.
- **Join tables** with `INNER JOIN` and `LEFT JOIN`, following the FK
  relationships shown in the ERD.
- **Aggregate data** with `COUNT`, `AVG`, `MIN`, `MAX`, `GROUP BY`, and
  `HAVING` to answer business-level questions about the SichrPlace domain.
- **Read an ERD** and translate its relationships into SQL join conditions.

### Next step

Continue with the intermediate SQL lab — constraints, indexes,
parameterised queries, and CTEs:

[`SQL_LAB_MSSQL_INTERMEDIATE.md`](SQL_LAB_MSSQL_INTERMEDIATE.md)
