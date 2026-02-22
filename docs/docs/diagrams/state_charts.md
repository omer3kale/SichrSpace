# SichrPlace — State Charts

> UML state machines for core domain workflows.
> Each diagram shows states, transitions, and which REST endpoints trigger them.

---

## 1. Apartment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /api/apartments<br/>(Landlord creates listing)

    PENDING --> AVAILABLE : Admin approves<br/>or auto-publish
    PENDING --> ARCHIVED : Landlord withdraws

    AVAILABLE --> RENTED : Landlord marks rented
    AVAILABLE --> ARCHIVED : DELETE /api/apartments/{id}<br/>(Landlord archives)
    AVAILABLE --> AVAILABLE : PUT /api/apartments/{id}<br/>(Landlord updates details)

    RENTED --> AVAILABLE : Lease ends,<br/>re-list apartment
    RENTED --> ARCHIVED : Landlord removes

    ARCHIVED --> AVAILABLE : Landlord re-activates
    ARCHIVED --> [*] : Permanent delete
```

### Apartment States

| State | Enum Value | Description |
|-------|-----------|-------------|
| **PENDING** | `ApartmentStatus.PENDING` | Just created, awaiting approval/publication |
| **AVAILABLE** | `ApartmentStatus.AVAILABLE` | Listed and visible to tenants |
| **RENTED** | `ApartmentStatus.RENTED` | Currently occupied, not available |
| **ARCHIVED** | `ApartmentStatus.ARCHIVED` | Removed from public listing |

---

## 2. Viewing Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /api/viewing-requests<br/>(Tenant requests viewing)

    PENDING --> CONFIRMED : PUT /api/viewing-requests/{id}/confirm<br/>(Landlord accepts)
    PENDING --> DECLINED : PUT /api/viewing-requests/{id}/decline<br/>(Landlord rejects)
    PENDING --> CANCELLED : PUT /api/viewing-requests/{id}/cancel<br/>(Tenant withdraws)

    CONFIRMED --> COMPLETED : Viewing takes place<br/>(auto or manual)
    CONFIRMED --> CANCELLED : PUT /api/viewing-requests/{id}/cancel<br/>(Tenant cancels)

    DECLINED --> [*] : Terminal state
    CANCELLED --> [*] : Terminal state
    COMPLETED --> [*] : Terminal state
```

### Viewing Request States

| State | Enum Value | Triggered By | API Endpoint |
|-------|-----------|-------------|--------------|
| **PENDING** | `ViewingStatus.PENDING` | Tenant | `POST /api/viewing-requests` |
| **CONFIRMED** | `ViewingStatus.CONFIRMED` | Landlord | `PUT .../confirm` |
| **DECLINED** | `ViewingStatus.DECLINED` | Landlord | `PUT .../decline` |
| **CANCELLED** | `ViewingStatus.CANCELLED` | Tenant | `PUT .../cancel` |
| **COMPLETED** | `ViewingStatus.COMPLETED` | System/Landlord | After viewing date passes |

---

## 3. Review Moderation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /api/reviews/apartment/{id}<br/>(Tenant submits review)

    PENDING --> APPROVED : POST /api/admin/reviews/{id}/moderate<br/>(Admin approves)
    PENDING --> REJECTED : POST /api/admin/reviews/{id}/moderate<br/>(Admin rejects)

    APPROVED --> APPROVED : PUT /api/reviews/{id}<br/>(Author edits → stays approved)
    APPROVED --> [*] : DELETE /api/reviews/{id}

    REJECTED --> [*] : Terminal<br/>(Author can re-submit new review)
```

### Review States

| State | Enum Value | Who Acts | Visible to Public? |
|-------|-----------|----------|-------------------|
| **PENDING** | `ReviewStatus.PENDING` | Author submits | No |
| **APPROVED** | `ReviewStatus.APPROVED` | Admin moderates | Yes |
| **REJECTED** | `ReviewStatus.REJECTED` | Admin moderates | No |

---

## 4. Message Lifecycle

```mermaid
stateDiagram-v2
    [*] --> SENT : POST /api/conversations/{id}/messages<br/>(User sends message)

    SENT --> READ : PATCH /api/conversations/{id}/read<br/>(Recipient opens conversation)

    SENT --> EDITED : PATCH /api/conversations/messages/{id}<br/>(Sender edits)
    READ --> EDITED : PATCH /api/conversations/messages/{id}<br/>(Sender edits)

    SENT --> DELETED : DELETE /api/conversations/messages/{id}<br/>(Sender soft-deletes)
    READ --> DELETED : DELETE /api/conversations/messages/{id}
    EDITED --> DELETED : DELETE /api/conversations/messages/{id}

    DELETED --> [*] : Soft-deleted<br/>(is_deleted=true)
```

### Message States (derived from fields, not an enum)

| State | Determined By | Description |
|-------|--------------|-------------|
| **SENT** | `readByRecipient=false, isDeleted=false` | Delivered but unread |
| **READ** | `readByRecipient=true, isDeleted=false` | Opened by recipient |
| **EDITED** | `editedAt IS NOT NULL, isDeleted=false` | Content modified after send |
| **DELETED** | `isDeleted=true` | Soft-deleted, hidden from UI |

---

## 5. User Account Lifecycle

```mermaid
stateDiagram-v2
    [*] --> REGISTERED : POST /api/auth/register<br/>(User signs up)

    REGISTERED --> ACTIVE : Email verified<br/>or auto-active
    REGISTERED --> DEACTIVATED : Admin deactivates<br/>PATCH /api/admin/users/{id}/status

    ACTIVE --> ACTIVE : PUT /api/auth/profile<br/>(User updates profile)
    ACTIVE --> ACTIVE : PATCH /api/admin/users/{id}/role<br/>(Admin changes role)
    ACTIVE --> DEACTIVATED : PATCH /api/admin/users/{id}/status<br/>(Admin deactivates)

    DEACTIVATED --> ACTIVE : PATCH /api/admin/users/{id}/status<br/>(Admin reactivates)
    DEACTIVATED --> [*] : Account purge (GDPR)
```

### User States (derived from `isActive` field)

| State | `isActive` | `emailVerified` | Can Login? |
|-------|-----------|----------------|------------|
| **REGISTERED** | `true` | `false` | Yes (current impl) |
| **ACTIVE** | `true` | `true` | Yes |
| **DEACTIVATED** | `false` | any | No (403 Forbidden) |

---

## 6. Notification Priority & Read State

```mermaid
stateDiagram-v2
    [*] --> UNREAD : System creates notification<br/>(e.g. new message, viewing confirmed)

    UNREAD --> READ : PATCH /api/notifications/{id}/read<br/>(User reads one)
    UNREAD --> READ : PATCH /api/notifications/read-all<br/>(User marks all read)

    READ --> [*] : Notification stays in history

    state UNREAD {
        [*] --> LOW
        [*] --> NORMAL
        [*] --> HIGH
        [*] --> URGENT
    }
```

### Notification Types That Trigger Creation

| Event | NotificationType | Created By |
|-------|-----------------|------------|
| Tenant requests viewing | `VIEWING_REQUEST` | ViewingRequestService |
| Landlord confirms | `VIEWING_APPROVED` | ViewingRequestService |
| Landlord declines | `VIEWING_REJECTED` | ViewingRequestService |
| New message received | `NEW_MESSAGE` | ConversationService |
| Review submitted | `REVIEW_SUBMITTED` | ReviewService |
| Review moderated | `REVIEW_MODERATED` | AdminService |
| Favorite apartment updated | `FAVORITE_APARTMENT_UPDATED` | ApartmentService |
| System announcement | `SYSTEM_ANNOUNCEMENT` | AdminService |
