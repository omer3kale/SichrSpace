# SichrPlace Architecture Documentation

Visual diagrams documenting the migration from Supabase/Netlify/Express to a fully self-hosted Spring Boot stack.

> **Tip:** These diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively on GitHub.

| # | Diagram | Description |
|---|---------|-------------|
| 1 | [Before Architecture](01-before-architecture.md) | Original Supabase + Netlify + Express stack |
| 2 | [After Architecture](02-after-architecture.md) | New self-hosted Spring Boot + MSSQL stack |
| 3 | [Database Schema](03-database-schema.md) | MSSQL ER diagram — all 12 tables |
| 4 | [Migration Plan](04-migration-plan.md) | Day execution plan with time estimates |
| 5 | [API Sequence Flows](05-api-sequence-flows.md) | Auth, Search, Chat, Upload, Payment flows |
| 6 | [Component Migration Map](06-component-migration-map.md) | Old → New mapping for every component |
| 7 | [Docker Topology](07-docker-topology.md) | Container network layout |
| 8 | [Security Architecture](08-security-architecture.md) | Defense-in-depth layers |
| 9 | [Deliverable Map](09-deliverable-map.md) | Complete files delivered in the migration |
