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

## Automation & Operations Diagrams

| # | Diagram | Description |
|---|---------|-------------|
| 10 | [CI/CD Pipeline](10-cicd-pipeline.md) | Full automation from `git push` to live deployment |
| 11 | [Infrastructure Provisioning](11-infrastructure-provisioning.md) | One-click stack startup sequence |
| 12 | [Database Migration Automation](12-database-migration-automation.md) | Flyway auto-migration lifecycle |
| 13 | [Docker Build & Deploy](13-docker-build-deploy.md) | Multi-stage build, layer caching, zero-downtime deploy |
| 14 | [Environment Config Flow](14-environment-config-flow.md) | How `.env` flows through Docker into Spring Boot |
| 15 | [Monitoring & Auto-Recovery](15-monitoring-auto-recovery.md) | Health checks, restart policies, logging |
| 16 | [New Feature Workflow](16-new-feature-workflow.md) | End-to-end guide for adding features automatically |
| 17 | [Request Lifecycle](17-request-lifecycle.md) | Full HTTP path: browser → Nginx → Spring → MSSQL → back |
| 18 | [Backup & Disaster Recovery](18-backup-disaster-recovery.md) | Automated backups, rotation, and recovery runbooks |
