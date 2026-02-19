# SichrPlace — MSSQL Migration Scripts

Place idempotent migration scripts here with version prefixes:

```
V001__initial_seed.sql          ← (see ../mssql-seed-workplace.sql)
V002__add_lease_dates.sql       ← example future migration
V003__add_student_groups.sql    ← example future migration
```

Each script must:
1. Use `IF NOT EXISTS` guards so it can run multiple times safely.
2. Use MSSQL-compatible types (`DATETIME2`, `VARCHAR(MAX)`, `BIT`, etc.).
3. Print a status message (`PRINT '...'`) for confirmation.
4. End with `GO` after each batch.

See `docs/SEED_WORKPLACE_MSSQL.md` → "Schema Evolution" for the full process.
