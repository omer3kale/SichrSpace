# Database Migration Automation (Flyway)

```mermaid
flowchart TD
    subgraph "Spring Boot Startup"
        A[Application starts]
        B[Flyway auto-configuration activates]
        C[Connect to MSSQL]
        D{flyway_schema_history<br/>table exists?}
    end

    subgraph "First Run (Fresh DB)"
        E[Create flyway_schema_history table]
        F["Run V1__init_schema.sql"]
        G["Create 12 tables"]
        H["Create 30+ indexes"]
        I["Create 5 triggers"]
        J["Insert seed data<br/>(admin + test user)"]
    end

    subgraph "Subsequent Runs"
        K[Read flyway_schema_history]
        L{New migration<br/>files found?}
        M["Run V2__xxx.sql, V3__xxx.sql..."]
        N[Record in flyway_schema_history]
        O[Skip - already up to date]
    end

    subgraph "Adding New Migrations"
        P["Developer creates:<br/>V2__add_payment_table.sql"]
        Q["Place in:<br/>src/main/resources/db/migration/"]
        R[Commit & push]
        S[CI/CD rebuilds JAR]
        T[Next startup auto-applies]
    end

    A --> B --> C --> D
    D -->|No| E --> F --> G --> H --> I --> J
    D -->|Yes| K --> L
    L -->|Yes| M --> N
    L -->|No| O

    P --> Q --> R --> S --> T

    style A fill:#6DB33F,color:white
    style G fill:#0078D4,color:white
    style J fill:#0078D4,color:white
    style M fill:#FF9800,color:white

```

## Migration File Naming Convention

```
V{version}__{description}.sql

Examples:
  V1__init_schema.sql          ← Initial schema (already created)
  V2__add_payment_table.sql    ← Add payment tracking
  V3__add_audit_log.sql        ← Add audit logging
  V4__add_fulltext_search.sql  ← Add search indexes
```

## How To Add a New Table

```sql
-- File: V2__add_payments.sql
CREATE TABLE payments (
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL REFERENCES users(id),
    apartment_id UNIQUEIDENTIFIER NOT NULL REFERENCES apartments(id),
    amount DECIMAL(10,2) NOT NULL,
    currency NVARCHAR(3) DEFAULT 'EUR',
    paypal_order_id NVARCHAR(255),
    status NVARCHAR(20) DEFAULT 'pending',
    created_at DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
```

Then just restart the Spring Boot container — Flyway handles the rest automatically.
