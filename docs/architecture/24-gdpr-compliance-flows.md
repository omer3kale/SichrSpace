# GDPR Compliance Flows

> Data export, 30-day deletion, consent management — EU DSGVO Article 15/17/7 compliance.

## GDPR Operations Overview

```mermaid
flowchart TD
    subgraph "GDPR Rights Implemented"
        R15["Art. 15 — Right of Access<br/>GET /api/gdpr/my-data"]
        R20["Art. 20 — Data Portability<br/>POST /api/gdpr/data-export"]
        R17["Art. 17 — Right to Erasure<br/>POST /api/gdpr/data-deletion"]
        R7["Art. 7 — Consent Management<br/>POST /api/gdpr/consent"]
    end

    subgraph "Data Subject (User)"
        USER["Authenticated User"]
    end

    subgraph "Backend Processing"
        CTRL["GdprController"]
        REPO["GdprRequestRepository"]
        DB["MSSQL gdpr_requests table"]
    end

    USER --> R15 & R20 & R17 & R7
    R15 & R20 & R17 & R7 --> CTRL --> REPO --> DB

    style R15 fill:#1565c0,color:white
    style R20 fill:#2e7d32,color:white
    style R17 fill:#c62828,color:white
    style R7 fill:#FF9800,color:white
```

## Data Export Flow (Art. 20)

```mermaid
sequenceDiagram
    participant U as User Browser
    participant API as api-client.js
    participant CTRL as GdprController
    participant OBJ as ObjectMapper
    participant DB as MSSQL

    U->>API: Gdpr.exportData()
    API->>CTRL: POST /api/gdpr/data-export<br/>Authorization: Bearer JWT

    CTRL->>CTRL: Create GdprRequest<br/>type = "data_export"<br/>status = "processing"

    CTRL->>OBJ: objectMapper.writeValueAsString(user)
    
    alt Serialization succeeds
        OBJ-->>CTRL: JSON string of all user data
        CTRL->>CTRL: request.responseData = JSON
        CTRL->>CTRL: request.status = "completed"
        CTRL->>CTRL: request.completedAt = now()
    else Serialization fails
        OBJ-->>CTRL: Exception
        CTRL->>CTRL: request.status = "failed"
        CTRL->>CTRL: log.error(...)
    end

    CTRL->>DB: gdprRequestRepository.save(request)
    CTRL->>CTRL: log "GDPR data export requested"
    CTRL-->>API: 200 {success, requestId}
    API-->>U: Show download link / JSON
```

## Data Deletion Flow (Art. 17)

```mermaid
sequenceDiagram
    participant U as User
    participant CTRL as GdprController
    participant DB as MSSQL
    participant ADM as Admin

    U->>CTRL: POST /api/gdpr/data-deletion
    
    CTRL->>DB: Save GdprRequest<br/>type = "data_deletion"<br/>status = "pending"
    
    CTRL-->>U: 200 "Will be processed<br/>within 30 days per GDPR"

    Note over ADM,DB: Admin reviews within 30 days
    ADM->>DB: Query pending deletion requests
    ADM->>DB: DELETE user data (cascade)
    ADM->>DB: Update request status = "completed"
    
    Note over U: Per DSGVO Art. 17(1):<br/>30-day maximum response time
```

## Consent State Machine

```mermaid
stateDiagram-v2
    [*] --> NoConsent: User registers with<br/>gdprConsent = false

    NoConsent --> ConsentGiven: POST /api/gdpr/consent<br/>{consent: true}
    ConsentGiven --> ConsentRevoked: POST /api/gdpr/consent<br/>{consent: false}
    ConsentRevoked --> ConsentGiven: POST /api/gdpr/consent<br/>{consent: true}

    ConsentGiven --> DataExported: POST /data-export
    ConsentGiven --> DeletionRequested: POST /data-deletion

    DataExported --> ConsentGiven: Can export again
    DeletionRequested --> AccountDeleted: Admin processes (≤30 days)
    AccountDeleted --> [*]

    note right of NoConsent
        Registration works without consent
        but some features may be limited
    end note

    note right of DeletionRequested
        DSGVO Art. 17:
        Must complete within 30 days
        Status stored in gdpr_requests table
    end note
```

## GdprRequest Database States

```mermaid
graph LR
    subgraph "request_type values"
        T1["data_export"]
        T2["data_deletion"]
    end

    subgraph "status values"
        S1["pending"] --> S2["processing"] --> S3["completed"]
        S2 --> S4["failed"]
    end

    T1 -->|"instant"| S2
    T2 -->|"requires admin"| S1

    style S3 fill:#2e7d32,color:white
    style S4 fill:#c62828,color:white
    style S1 fill:#FF9800,color:white
```
