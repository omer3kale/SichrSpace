# SichrPlace — Architecture & Request Flow Diagrams

> How HTTP requests travel through the Spring Boot layers to reach the database.

---

## 1. Layered Architecture (AST-Style Class Tree)

```mermaid
graph TD
    subgraph "HTTP Layer"
        CLIENT["🌐 Browser / SichrSpace Frontend<br/>GitHub Pages"]
    end

    subgraph "Reverse Proxy"
        CADDY["Caddy 2<br/>:80/:443 → :8080<br/>TLS termination"]
    end

    subgraph "Spring Boot Application"
        subgraph "Security Filter Chain"
            CORS["CORS Filter<br/>SecurityConfig.java"]
            JWT_FILTER["JwtAuthenticationFilter<br/>Extract & validate JWT"]
        end

        subgraph "Controller Layer (9 controllers)"
            AUTH_C["UserController<br/>/api/auth/*"]
            APT_C["ApartmentController<br/>/api/apartments/*"]
            CONV_C["ConversationController<br/>/api/conversations/*"]
            FAV_C["FavoriteController<br/>/api/favorites/*"]
            LIST_C["ListingController<br/>/api/listings/*"]
            NOTIF_C["NotificationController<br/>/api/notifications/*"]
            REV_C["ReviewController<br/>/api/reviews/*"]
            VIEW_C["ViewingRequestController<br/>/api/viewing-requests/*"]
            ADMIN_C["AdminController<br/>/api/admin/*"]
        end

        subgraph "Service Layer (9 interfaces + 9 impls)"
            AUTH_S["UserServiceImpl"]
            APT_S["ApartmentServiceImpl"]
            CONV_S["ConversationServiceImpl"]
            FAV_S["FavoriteServiceImpl"]
            LIST_S["ListingServiceImpl"]
            NOTIF_S["NotificationServiceImpl"]
            REV_S["ReviewServiceImpl"]
            VIEW_S["ViewingRequestServiceImpl"]
            ADMIN_S["AdminServiceImpl"]
        end

        subgraph "Repository Layer (9 JPA repositories)"
            USER_R["UserRepository"]
            APT_R["ApartmentRepository"]
            CONV_R["ConversationRepository"]
            MSG_R["MessageRepository"]
            FAV_R["UserFavoriteRepository"]
            LIST_R["ListingRepository"]
            NOTIF_R["NotificationRepository"]
            REV_R["ApartmentReviewRepository"]
            VIEW_R["ViewingRequestRepository"]
        end

        subgraph "JPA / Hibernate"
            ORM["Hibernate ORM<br/>Entity ↔ Table mapping<br/>SQL generation"]
        end
    end

    subgraph "Database"
        DB["MSSQL / PostgreSQL<br/>9 tables"]
    end

    CLIENT -->|HTTPS| CADDY
    CADDY -->|HTTP :8080| CORS
    CORS --> JWT_FILTER

    JWT_FILTER --> AUTH_C
    JWT_FILTER --> APT_C
    JWT_FILTER --> CONV_C
    JWT_FILTER --> FAV_C
    JWT_FILTER --> LIST_C
    JWT_FILTER --> NOTIF_C
    JWT_FILTER --> REV_C
    JWT_FILTER --> VIEW_C
    JWT_FILTER --> ADMIN_C

    AUTH_C --> AUTH_S
    APT_C --> APT_S
    CONV_C --> CONV_S
    FAV_C --> FAV_S
    LIST_C --> LIST_S
    NOTIF_C --> NOTIF_S
    REV_C --> REV_S
    VIEW_C --> VIEW_S
    ADMIN_C --> ADMIN_S

    AUTH_S --> USER_R
    APT_S --> APT_R
    APT_S --> USER_R
    CONV_S --> CONV_R
    CONV_S --> MSG_R
    CONV_S --> USER_R
    FAV_S --> FAV_R
    FAV_S --> USER_R
    FAV_S --> APT_R
    LIST_S --> LIST_R
    NOTIF_S --> NOTIF_R
    REV_S --> REV_R
    REV_S --> APT_R
    VIEW_S --> VIEW_R
    VIEW_S --> APT_R
    VIEW_S --> USER_R
    ADMIN_S --> USER_R
    ADMIN_S --> APT_R
    ADMIN_S --> REV_R
    ADMIN_S --> VIEW_R
    ADMIN_S --> CONV_R

    USER_R --> ORM
    APT_R --> ORM
    CONV_R --> ORM
    MSG_R --> ORM
    FAV_R --> ORM
    LIST_R --> ORM
    NOTIF_R --> ORM
    REV_R --> ORM
    VIEW_R --> ORM

    ORM -->|JDBC| DB
```

---

## 2. Service → Repository Dependency Map

```mermaid
graph LR
    subgraph "Services"
        US[UserServiceImpl]
        AS[ApartmentServiceImpl]
        CS[ConversationServiceImpl]
        FS[FavoriteServiceImpl]
        LS[ListingServiceImpl]
        NS[NotificationServiceImpl]
        RS[ReviewServiceImpl]
        VS[ViewingRequestServiceImpl]
        DS[AdminServiceImpl]
    end

    subgraph "Repositories"
        UR[UserRepository]
        AR[ApartmentRepository]
        CR[ConversationRepository]
        MR[MessageRepository]
        FR[UserFavoriteRepository]
        LR[ListingRepository]
        NR[NotificationRepository]
        RR[ApartmentReviewRepository]
        VR[ViewingRequestRepository]
    end

    US --> UR
    AS --> AR
    AS --> UR
    CS --> CR
    CS --> MR
    CS --> UR
    CS --> AR
    FS --> FR
    FS --> UR
    FS --> AR
    LS --> LR
    NS --> NR
    NS --> UR
    RS --> RR
    RS --> AR
    RS --> UR
    VS --> VR
    VS --> AR
    VS --> UR
    DS --> UR
    DS --> AR
    DS --> RR
    DS --> VR
    DS --> CR

    %% Cross-service dependencies
    CS -.->|NotificationService| NS
    RS -.->|NotificationService| NS
    DS -.->|NotificationService| NS
```

---

## 3. Security & Auth Flow (JWT Pipeline)

```mermaid
graph TD
    REQ["HTTP Request"] --> CHECK{"Has Authorization<br/>header?"}

    CHECK -->|No| PUBLIC{"Is public<br/>endpoint?"}
    CHECK -->|Yes| EXTRACT["JwtAuthenticationFilter<br/>Extract Bearer token"]

    PUBLIC -->|"Yes<br/>/api/auth/login<br/>/api/auth/register<br/>GET /api/apartments/**<br/>GET /api/reviews/apartment/**"| CONTROLLER["Controller"]
    PUBLIC -->|No| DENY_401["401 Unauthorized"]

    EXTRACT --> VALIDATE{"JwtTokenProvider<br/>validateToken()"}
    VALIDATE -->|Invalid/Expired| DENY_401
    VALIDATE -->|Valid| PARSE["Parse claims:<br/>userId, email, role"]

    PARSE --> CONTEXT["Set SecurityContext<br/>Authentication"]
    CONTEXT --> ROLE_CHECK{"@PreAuthorize<br/>role check?"}

    ROLE_CHECK -->|"hasRole('ADMIN')"| ADMIN_CHECK{"User has<br/>ROLE_ADMIN?"}
    ROLE_CHECK -->|"No role restriction"| CONTROLLER
    ROLE_CHECK -->|"hasAnyRole<br/>('LANDLORD','ADMIN')"| LANDLORD_CHECK{"User has<br/>LANDLORD or ADMIN?"}

    ADMIN_CHECK -->|Yes| CONTROLLER
    ADMIN_CHECK -->|No| DENY_403["403 Forbidden"]
    LANDLORD_CHECK -->|Yes| CONTROLLER
    LANDLORD_CHECK -->|No| DENY_403

    CONTROLLER --> RESPONSE["HTTP Response"]
```

---

## 4. Platform Deployment Topology

```mermaid
graph TB
    subgraph "GitHub"
        REPO["omer3kale/sichrplace-backend<br/>Public repo (Java source)"]
        GHCR["GitHub Container Registry<br/>ghcr.io/omer3kale/sichrplace-api"]
        ACTIONS["GitHub Actions<br/>Build → Push → Deploy"]
        SECRETS["Encrypted Secrets<br/>VPS_HOST, VPS_SSH_KEY"]
        PAGES["GitHub Pages<br/>SichrSpace frontend (beta)"]
    end

    subgraph "DigitalOcean Droplet"
        direction TB
        CADDY2["Caddy 2 Container<br/>:80/:443 → api:8080<br/>Auto TLS"]
        API["Spring Boot Container<br/>sichrplace-api:latest<br/>:8080"]
        MSSQL["MSSQL 2022 Container<br/>:1433<br/>Developer Edition"]
        ENV[".env file<br/>DB_PASS, JWT_SECRET<br/>NEVER in git"]
    end

    subgraph "Student Local Dev"
        LOCAL_MSSQL["Docker MSSQL<br/>localhost:1433"]
        BOOT["./gradlew bootRun<br/>--spring.profiles.active=local-mssql"]
        BROWSER["Browser<br/>http://localhost:8080"]
    end

    REPO -->|"git push main"| ACTIONS
    ACTIONS -->|"docker push"| GHCR
    ACTIONS -->|"SSH deploy"| API
    GHCR -->|"docker pull"| API
    SECRETS -->|"injected at runtime"| ACTIONS

    CADDY2 -->|"proxy"| API
    API -->|"JDBC"| MSSQL
    ENV -->|"docker compose<br/>reads .env"| API
    ENV -->|"docker compose<br/>reads .env"| MSSQL

    PAGES -.->|"HTTPS API calls<br/>api.sichrplace.com"| CADDY2

    BOOT -->|"JDBC"| LOCAL_MSSQL
    BROWSER -->|"http://localhost:8080"| BOOT
```

---

## 5. Database-Agnostic Strategy

```mermaid
graph LR
    subgraph "Java Code (same for all DBs)"
        ENTITY["@Entity classes<br/>columnDefinition = TEXT"]
        REPO2["JpaRepository interfaces"]
        HIBERNATE["Hibernate ORM"]
    end

    subgraph "Profile: local-mssql"
        MSSQL_CONF["application-local-mssql.yml<br/>SQLServerDriver<br/>localhost:1433"]
        MSSQL_DB["SQL Server 2022<br/>(Docker)"]
    end

    subgraph "Profile: local (current)"
        LOCAL_CONF["application-local.yml<br/>SQLServerDriver<br/>localhost:1433"]
        LOCAL_DB["SQL Server<br/>(native install)"]
    end

    subgraph "Profile: prod"
        PROD_CONF["application-prod.yml<br/>PostgreSQLDriver<br/>database:5432"]
        POSTGRES["PostgreSQL 16<br/>(Docker on VPS)"]
    end

    ENTITY --> REPO2
    REPO2 --> HIBERNATE

    HIBERNATE -->|"local-mssql profile"| MSSQL_CONF
    MSSQL_CONF -->|JDBC| MSSQL_DB

    HIBERNATE -->|"local profile"| LOCAL_CONF
    LOCAL_CONF -->|JDBC| LOCAL_DB

    HIBERNATE -->|"prod profile"| PROD_CONF
    PROD_CONF -->|JDBC| POSTGRES
```

> **Key teaching point:** The same 9 entity classes and 9 repository interfaces work
> across SQL Server and PostgreSQL. Only the YAML config and JDBC driver change.
> This is the power of JPA/Hibernate abstraction.
