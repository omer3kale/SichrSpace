# Component-by-Component Migration Map

```mermaid
graph LR
    subgraph "OLD STACK (Removed)"
        style OLD fill:#ffcdd2
        O1[Supabase Auth]
        O2[Supabase PostgreSQL]
        O3[Supabase Realtime]
        O4[Supabase Storage]
        O5[Supabase RLS Policies]
        O6[Netlify Hosting]
        O7[Netlify Functions]
        O8[Netlify Edge Functions]
        O9[Express.js Server]
        O10[Helmet + Lusca]
        O11[Supabase JS SDK]
        O12[Nodemailer]
        O13[bcryptjs Node]
        O14[express-rate-limit]
        O15[Morgan Logger]
        O16[Swagger Express]
        O17[PostgreSQL Types]
    end

    subgraph "NEW STACK (Self-Hosted)"
        style NEW fill:#c8e6c9
        N1[Spring Security + JWT]
        N2[MSSQL 2022]
        N3[STOMP/SockJS WebSocket]
        N4[MinIO Object Storage]
        N5[Spring Security @PreAuthorize]
        N6[GitHub Pages]
        N7[Spring Boot Controllers]
        N8[Spring Boot Controllers]
        N9[Spring Boot 3.4.2]
        N10[Spring Security + CSP]
        N11[api-client.js fetch]
        N12[Spring Mail]
        N13[Spring BCryptPasswordEncoder]
        N14[Nginx rate_limit + Bucket4j]
        N15[SLF4J + Logback]
        N16[SpringDoc OpenAPI]
        N17[MSSQL Types UNIQUEIDENTIFIER etc]
    end

    O1 -->|replaced by| N1
    O2 -->|replaced by| N2
    O3 -->|replaced by| N3
    O4 -->|replaced by| N4
    O5 -->|replaced by| N5
    O6 -->|replaced by| N6
    O7 -->|replaced by| N7
    O8 -->|replaced by| N8
    O9 -->|replaced by| N9
    O10 -->|replaced by| N10
    O11 -->|replaced by| N11
    O12 -->|replaced by| N12
    O13 -->|replaced by| N13
    O14 -->|replaced by| N14
    O15 -->|replaced by| N15
    O16 -->|replaced by| N16
    O17 -->|replaced by| N17
```

## Data Type Migration

| PostgreSQL (Supabase) | MSSQL 2022 |
|----------------------|------------|
| `UUID` / `gen_random_uuid()` | `UNIQUEIDENTIFIER` / `NEWID()` |
| `TEXT` | `NVARCHAR(MAX)` |
| `TIMESTAMP WITH TIME ZONE` | `DATETIMEOFFSET` |
| `BOOLEAN` | `BIT` |
| `JSONB` | `NVARCHAR(MAX)` |
| `SERIAL` | `IDENTITY(1,1)` |
| `VARCHAR(n)` | `NVARCHAR(n)` |
| `DECIMAL(10,2)` | `DECIMAL(10,2)` |
| `DOUBLE PRECISION` | `FLOAT` |
| `BIGINT` | `BIGINT` |
