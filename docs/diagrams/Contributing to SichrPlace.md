# Contributing to SichrPlace

Welcome! This guide covers how to contribute to the SichrPlace backend —
a Spring Boot REST API for a secure apartment-rental platform.

---

## Prerequisites

- Java 17+ (`java -version`)
- Gradle (wrapper included: `./gradlew`)
- SQL Server — Developer Edition (native) or Docker
- Git
- (Optional) IntelliJ IDEA or VS Code with Java extensions

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/omer3kale/sichrplace-backend.git
cd sichrplace-backend

# 2. Start MSSQL (Docker option)
docker compose -f docker-compose.local-mssql.yml up -d

# 3. Set credentials
cp .env.example .env.local
# Edit .env.local with your LOCAL_DB_USER and LOCAL_DB_PASS

# 4. Load env vars (PowerShell)
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), 'Process')
    }
}

# 5. Run the backend
./gradlew bootRun --args='--spring.profiles.active=local-mssql'

# 6. Test it
curl http://localhost:8080/api/health
```

## Project Structure

```
src/main/java/com/sichrplace/backend/
  controller/     REST controllers — HTTP routing (@RestController)
  service/        Business logic interfaces
  service/impl/   Service implementations (@Service)
  repository/     Spring Data JPA interfaces (@Repository)
  model/          JPA entities — @Entity, maps to MSSQL tables
  dto/            Request/Response DTOs — never expose entities directly
  config/         CORS, bean configuration
  security/       JWT filter, SecurityConfig

src/main/resources/
  application.yml              Base config
  application-local-mssql.yml  Local MSSQL profile (recommended)
  application-beta-mssql.yml   Beta MSSQL (droplet)
  application-prod.yml         Production PostgreSQL

docs/diagrams/                 ERD, state charts, architecture PNGs
db/                            SQL init scripts
```

## Development Workflow

1. Create a feature branch from `main`
2. Make changes, following the coding standards below
3. Test locally with `local-mssql` profile
4. Commit using conventional commit format
5. Push and open a pull request
6. CI (GitHub Actions) builds and tests automatically

### Branch Naming

```
feature/add-room-endpoint
bugfix/fix-jwt-expiry
docs/update-erd
```

### Conventional Commits

```
feat(controller): add GET /api/rooms/{id}/messages endpoint
fix(service): handle null apartment in review creation
docs(erd): add Room entity to ERD diagram
refactor(security): extract JWT validation to utility class
```

## Coding Standards

### Java Guidelines

- Java 17+ features (records, sealed classes, pattern matching OK)
- Follow Spring Boot conventions:
  - `@RestController` for HTTP endpoints
  - `@Service` for business logic (with interface + impl)
  - `@Repository` for data access
  - `@Entity` for database tables
- Use DTOs for request/response — never return JPA entities
- Validate inputs with `@Valid`, `@NotBlank`, `@Size`, etc.
- Handle errors with `@ExceptionHandler` or `@ControllerAdvice`

### File Naming

| Layer | Convention | Example |
|-------|-----------|---------|
| Entity | Singular noun | `Apartment.java` |
| Repository | Entity + Repository | `ApartmentRepository.java` |
| Service (interface) | Entity + Service | `ApartmentService.java` |
| Service (impl) | Entity + ServiceImpl | `ApartmentServiceImpl.java` |
| Controller | Entity + Controller | `ApartmentController.java` |
| DTO (request) | Action + Request | `CreateApartmentRequest.java` |
| DTO (response) | Entity + Response | `ApartmentResponse.java` |

## Database

- **Local:** MSSQL 2025 Developer (Docker or native Windows install)
- **Beta:** MSSQL 2025 Developer on DigitalOcean droplet
- **Production:** PostgreSQL 16

All environments use the **same JPA entities**. Hibernate auto-generates
the schema (`ddl-auto=update`). See [`docs/diagrams/erd_sichrplace.png`](docs/diagrams/erd_sichrplace.png)
for the current ERD.

> If you add a new entity, update the ERD diagram too.

## Security Rules

**Never commit:**
- Database credentials or passwords
- JWT secrets
- API keys or tokens
- `.env` or `.env.local` files

**Always use:**
- Environment variables for secrets
- Spring profiles to separate environments
- `.env.example` as a template (no real values)

## Areas for Contribution

### High Priority
- New entity endpoints (e.g., Room, Attachment)
- Input validation and error handling improvements
- API documentation (Swagger/OpenAPI)
- Unit and integration tests

### Medium Priority
- Performance: query optimization, pagination
- Monitoring: structured logging, metrics
- CI improvements: test stage, code coverage

### Low Priority
- Email notification service
- File upload endpoints
- WebSocket for real-time messaging

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/omer3kale/sichrplace-backend/issues)
- **Maintainer:** [@omer3kale](https://github.com/omer3kale)
- **Docs:** See `docs/ENV_SETUP_GUIDE.MD` for full environment setup

---

Thank you for contributing to SichrPlace!
