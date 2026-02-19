# SichrPlace – Workplace Seed Data (MSSQL)

> **Last updated:** February 2026  
> **Target database:** MSSQL 2025 Developer Edition  
> **Script:** [`db/mssql-seed-workplace.sql`](../db/mssql-seed-workplace.sql)

---

## What is this?

The seed script populates a realistic but **fully synthetic** "workplace" inside
the SichrPlace database.  It is intended for:

| Audience    | Use case                                             |
|-------------|------------------------------------------------------|
| **Students** | Explore the data model, write JPA queries, test REST endpoints |
| **Tutors**   | Demonstrate SE concepts (CRUD, auth, messaging) in live labs |
| **Developers** | Quickly bootstrap a local or beta environment with meaningful data |

---

## Seed Data Overview

### Users (6)

| ID | Email                           | Role       | Name             | Description                          |
|----|--------------------------------|------------|------------------|--------------------------------------|
| 1  | `admin@sichrplace.com`         | **ADMIN**  | Admin SichrPlace | Platform administrator               |
| 2  | `alice.tutor@rwth-aachen.de`   | **LANDLORD** | Alice Schmidt  | SE tutor, rents 2 apartments         |
| 3  | `bob.landlord@gmail.com`       | **LANDLORD** | Bob Mueller    | Private landlord in city centre      |
| 4  | `charlie.student@rwth-aachen.de` | **TENANT** | Charlie Weber  | MSc Informatik student               |
| 5  | `diana.student@rwth-aachen.de` | **TENANT**  | Diana Fischer  | BSc SE student, thesis phase         |
| 6  | `erik.student@rwth-aachen.de`  | **TENANT**  | Erik Braun     | Erasmus exchange student (Sweden)    |

> **Password for ALL accounts:** `password123`  
> (BCrypt hash with cost 10 stored in the database)

### Apartments (4)

| ID | Title                                     | Owner | District | Rent   | Status    |
|----|-------------------------------------------|-------|----------|--------|-----------|
| 1  | Gemütliche 2-Zimmer-Wohnung am Ponttor    | Alice | Ponttor  | €620   | AVAILABLE |
| 2  | Helles Studio am Lousberg                 | Alice | Lousberg | €450   | AVAILABLE |
| 3  | WG-Zimmer nahe RWTH Informatikzentrum     | Bob   | Hörn     | €380   | AVAILABLE |
| 4  | Moderne 1-Zimmer-Wohnung Aachen Mitte     | Bob   | Mitte    | €720   | PENDING   |

### Conversations & Messages (3 conversations, 12 messages)

| Conv | Participants       | Apartment    | Messages | Topic                          |
|------|--------------------|-------------|----------|--------------------------------|
| 1    | Charlie ↔ Alice    | #1 Ponttor  | 5        | Inquiring about availability, scheduling viewing |
| 2    | Diana ↔ Bob        | #3 WG-Zimmer | 4       | Asking about WG atmosphere      |
| 3    | Erik ↔ Alice       | #2 Lousberg | 3        | Erasmus student, 2-semester lease |

### Viewing Requests (3)

| ID | Tenant  | Apartment    | Status      | Notes                    |
|----|---------|-------------|-------------|--------------------------|
| 1  | Charlie | #1 Ponttor  | **CONFIRMED** | Sat 16 Nov, 14:00       |
| 2  | Diana   | #3 WG-Zimmer | PENDING     | Wed afternoon requested  |
| 3  | Erik    | #2 Lousberg | PENDING      | Weekend preferred        |

### Reviews (3)

| ID | Apartment   | Reviewer | Rating | Status     |
|----|-------------|----------|--------|------------|
| 1  | #1 Ponttor  | Charlie  | ★★★★★  | APPROVED   |
| 2  | #1 Ponttor  | Diana    | ★★★★   | APPROVED   |
| 3  | #3 WG-Zimmer | Charlie | ★★★★   | PENDING    |

### Favorites (5)

| User    | Apartments saved         |
|---------|--------------------------|
| Charlie | #1 Ponttor, #3 WG-Zimmer |
| Diana   | #3 WG-Zimmer, #4 Mitte   |
| Erik    | #2 Lousberg              |

### Notifications (5)

| ID | User    | Type                         | Read? |
|----|---------|------------------------------|-------|
| 1  | Charlie | Viewing confirmed (Ponttor)  | ✓     |
| 2  | Alice   | New viewing request          | ✓     |
| 3  | Alice   | New message from Erik        | ✗     |
| 4  | Admin   | System announcement (beta)   | ✗     |
| 5  | Diana   | Favorite apartment updated   | ✗     |

---

## How to Run the Seed Script

### Option A – On the Droplet (beta-mssql)

```bash
# SCP the script into the MSSQL container
docker cp /opt/sichrplace/db/mssql-seed-workplace.sql \
  sichrplace-mssql:/opt/sichrplace/seed.sql

# Execute
docker exec sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sichrplace_user -P "$MSSQL_APP_PASSWORD" \
  -d sichrplace -C -i /opt/sichrplace/seed.sql
```

### Option B – Local Docker (local-mssql)

```bash
# Start your local MSSQL stack first
docker compose -f docker-compose.local-mssql.yml up -d

# Copy and execute
docker cp db/mssql-seed-workplace.sql sichrplace-mssql-local:/tmp/seed.sql
docker exec sichrplace-mssql-local /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sichrplace_user -P "$LOCAL_DB_PASS" \
  -d sichrplace -C -i /tmp/seed.sql
```

### Option C – Native Windows MSSQL (SSMS)

1. Open SQL Server Management Studio.
2. Connect to `localhost\SQLEXPRESS` (or your instance).
3. Open `db/mssql-seed-workplace.sql`.
4. Execute (F5).

---

## Verifying the Seed Data

After running the script, verify with:

```sql
SELECT 'users' AS tbl, COUNT(*) AS cnt FROM users
UNION ALL SELECT 'apartments', COUNT(*) FROM apartments
UNION ALL SELECT 'listings', COUNT(*) FROM listings
UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL SELECT 'messages', COUNT(*) FROM messages
UNION ALL SELECT 'viewing_requests', COUNT(*) FROM viewing_requests
UNION ALL SELECT 'apartment_reviews', COUNT(*) FROM apartment_reviews
UNION ALL SELECT 'user_favorites', COUNT(*) FROM user_favorites
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
```

Expected output:

| Table             | Count |
|-------------------|-------|
| users             | 6     |
| apartments        | 4     |
| listings          | 2     |
| conversations     | 3     |
| messages          | 12    |
| viewing_requests  | 3     |
| apartment_reviews | 3     |
| user_favorites    | 5     |
| notifications     | 5     |

---

## Testing Endpoints with Seed Data

### 1. Login as a seed user

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"charlie.student@rwth-aachen.de","password":"password123"}'
```

### 2. Get apartments

```bash
curl http://localhost:8080/api/apartments \
  -H "Authorization: Bearer <token>"
```

### 3. View conversations

```bash
curl http://localhost:8080/api/conversations \
  -H "Authorization: Bearer <token>"
```

---

## Idempotency

The script checks for the existence of `admin@sichrplace.com` before inserting.
Re-running on an already-seeded database prints a skip message and does nothing.

To **reset** and re-seed:

```sql
-- ⚠ Deletes ALL data — use only in dev/beta
DELETE FROM notifications;
DELETE FROM user_favorites;
DELETE FROM apartment_reviews;
DELETE FROM messages;
DELETE FROM viewing_requests;
DELETE FROM conversations;
DELETE FROM listings;
DELETE FROM apartments;
DELETE FROM users;
```

Then re-run the seed script.

---

## Teaching Notes

- **Entity relationships:** Follow the FK arrows from `messages → conversations → users`
  and from `apartments → users` to understand the domain model.
- **Enum mapping:** Notice how `UserRole`, `ApartmentStatus`, `MessageType` etc. are stored
  as `varchar` strings using JPA's `@Enumerated(EnumType.STRING)`.
- **Audit columns:** `created_at` and `updated_at` are managed by Spring Data's
  `@CreatedDate` / `@LastModifiedDate` annotations with `AuditingEntityListener`.
- **BCrypt:** Passwords are never stored in plain text.  The hash in the seed script
  was generated with cost factor 10, matching `BCryptPasswordEncoder` in `SecurityConfig`.

---

## Schema Evolution on MSSQL

When you need to add new tables, columns, or constraints to the database, follow
this process to keep **local** and **beta** environments in sync.

### 1. Update the JPA entity

Add the new field to the corresponding Java entity class in `src/main/java/com/sichrplace/backend/model/`.

```java
// Example: add lease dates to Apartment.java
@Column(name = "lease_start_date")
private LocalDate leaseStartDate;

@Column(name = "lease_end_date")
private LocalDate leaseEndDate;
```

Hibernate `ddl-auto=update` will add the columns automatically when Spring Boot
starts.  This works identically on MSSQL and PostgreSQL.

### 2. Write an idempotent migration script

Even though Hibernate handles the DDL, create an explicit migration script so
that DBAs, tutors, or CI pipelines can apply it independently.

Save it in `db/migrations/` with a version prefix:

```sql
-- db/migrations/V002__add_lease_dates.sql
-- Idempotent: safe to run multiple times.
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'apartments' AND COLUMN_NAME = 'lease_start_date'
)
BEGIN
    ALTER TABLE apartments ADD lease_start_date DATE NULL;
    ALTER TABLE apartments ADD lease_end_date DATE NULL;
    PRINT 'Added lease date columns to apartments.';
END
ELSE
    PRINT 'Lease date columns already exist — skipping.';
GO
```

**MSSQL-specific types to use:**

| Java type | MSSQL type | Notes |
|-----------|-----------|-------|
| `String` | `VARCHAR(255)` / `VARCHAR(MAX)` | MAX for `@Lob` / `TEXT` |
| `BigDecimal` | `DECIMAL(10,2)` | Match `@Column(precision, scale)` |
| `LocalDate` | `DATE` | |
| `LocalDateTime` | `DATETIME2` | |
| `Instant` | `DATETIME2` | UTC timestamps |
| `Boolean` | `BIT` | |
| `Long` | `BIGINT` | |
| `Integer` | `INT` | |
| `Double` | `FLOAT` | |

### 3. Update the seed data

If the new columns need seed values, update **both**:
- `DataSeeder.java` — set the new fields on the builder
- `db/mssql-seed-workplace.sql` — add `INSERT` values for the new columns

### 4. Update the ERD

Edit `docs/diagrams/erd_sichrplace.md` and add the new columns to the
appropriate entity block.  Regenerate the PNG if you maintain one.

### 5. Apply to both environments

```bash
# Local: restart Spring Boot (Hibernate adds columns automatically)
./gradlew bootRun --args='--spring.profiles.active=local-mssql'

# Beta (droplet): apply migration script explicitly
docker cp db/migrations/V002__add_lease_dates.sql \
  sichrplace-mssql:/tmp/migration.sql
docker exec sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sichrplace_user -P "$MSSQL_APP_PASSWORD" \
  -d sichrplace -C -i /tmp/migration.sql
```

### 6. Verify both environments match

```sql
-- Run on both local and beta to compare
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo'
ORDER BY TABLE_NAME, ORDINAL_POSITION;
```

The output should be identical (same tables, same columns, same types).

### Migration checklist

- [ ] JPA entity updated with new fields
- [ ] Idempotent SQL migration script created in `db/migrations/`
- [ ] Seed data updated (DataSeeder.java + mssql-seed-workplace.sql)
- [ ] ERD updated
- [ ] Local MSSQL tested (Hibernate applies DDL)
- [ ] Beta MSSQL tested (migration script applied)
- [ ] Column inventory verified identical on both environments
