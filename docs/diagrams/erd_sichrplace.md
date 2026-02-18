# SichrPlace — Entity-Relationship Diagram

> Render this file on GitHub or any Mermaid-compatible viewer.
> Each box = one database table. Lines show foreign-key relationships.

```mermaid
erDiagram
    users {
        BIGINT id PK
        VARCHAR email UK "NOT NULL, UNIQUE"
        VARCHAR password "NOT NULL"
        VARCHAR first_name
        VARCHAR last_name
        TEXT bio
        VARCHAR phone
        VARCHAR role "ADMIN | LANDLORD | TENANT"
        BOOLEAN email_verified
        VARCHAR profile_image_url
        VARCHAR city
        VARCHAR country
        BOOLEAN is_active
        TIMESTAMP last_login_at
        BOOLEAN gdpr_consent
        TIMESTAMP gdpr_consent_date
        BOOLEAN marketing_consent
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    apartments {
        BIGINT id PK
        BIGINT user_id FK "NOT NULL → users.id"
        VARCHAR title "NOT NULL"
        TEXT description
        VARCHAR city "NOT NULL"
        VARCHAR district
        VARCHAR address
        DOUBLE latitude
        DOUBLE longitude
        DECIMAL monthly_rent "NOT NULL (10,2)"
        DECIMAL deposit_amount "(10,2)"
        DOUBLE size_square_meters
        INT number_of_bedrooms
        INT number_of_bathrooms
        BOOLEAN furnished
        BOOLEAN pet_friendly
        BOOLEAN has_parking
        BOOLEAN has_elevator
        BOOLEAN has_balcony
        TEXT amenities
        DATE available_from
        VARCHAR status "AVAILABLE | RENTED | ARCHIVED | PENDING"
        BIGINT number_of_views
        DOUBLE average_rating
        INT review_count
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    apartment_reviews {
        BIGINT id PK
        BIGINT apartment_id FK "NOT NULL → apartments.id"
        BIGINT reviewer_id FK "NOT NULL → users.id"
        INT rating "NOT NULL"
        VARCHAR title "NOT NULL"
        TEXT comment "NOT NULL"
        TEXT pros
        TEXT cons
        BOOLEAN would_recommend
        INT landlord_rating
        INT location_rating
        INT value_rating
        VARCHAR status "PENDING | APPROVED | REJECTED"
        BIGINT moderated_by FK "→ users.id"
        TIMESTAMP moderated_at
        TEXT moderation_notes
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    conversations {
        BIGINT id PK
        BIGINT apartment_id FK "→ apartments.id (nullable)"
        BIGINT participant_1_id FK "NOT NULL → users.id"
        BIGINT participant_2_id FK "NOT NULL → users.id"
        TIMESTAMP last_message_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    messages {
        BIGINT id PK
        BIGINT conversation_id FK "NOT NULL → conversations.id"
        BIGINT sender_id FK "NOT NULL → users.id"
        TEXT content "NOT NULL"
        VARCHAR message_type "TEXT | IMAGE | FILE | SYSTEM"
        BOOLEAN read_by_recipient
        TIMESTAMP read_at
        VARCHAR file_url
        VARCHAR file_name
        INT file_size
        BOOLEAN is_deleted
        TIMESTAMP edited_at
        TIMESTAMP created_at
    }

    notifications {
        BIGINT id PK
        BIGINT user_id FK "NOT NULL → users.id"
        VARCHAR type "17 notification types"
        VARCHAR title "NOT NULL"
        TEXT message
        VARCHAR related_entity_type
        BIGINT related_entity_id
        TIMESTAMP read_at
        VARCHAR action_url
        VARCHAR priority "LOW | NORMAL | HIGH | URGENT"
        TIMESTAMP created_at
        TIMESTAMP expires_at
    }

    user_favorites {
        BIGINT id PK
        BIGINT user_id FK "NOT NULL → users.id"
        BIGINT apartment_id FK "NOT NULL → apartments.id"
        TIMESTAMP created_at
    }

    viewing_requests {
        BIGINT id PK
        BIGINT apartment_id FK "NOT NULL → apartments.id"
        BIGINT tenant_id FK "NOT NULL → users.id"
        TIMESTAMP proposed_date_time "NOT NULL"
        TEXT message
        VARCHAR status "PENDING | CONFIRMED | DECLINED | COMPLETED | CANCELLED"
        TIMESTAMP responded_at
        TIMESTAMP confirmed_date_time
        VARCHAR decline_reason
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    listings {
        BIGINT id PK
        VARCHAR title "NOT NULL"
        TEXT description
        VARCHAR city "NOT NULL"
        VARCHAR district
        DECIMAL monthly_rent "NOT NULL (10,2)"
        DOUBLE size_square_meters
        BOOLEAN furnished
        DATE available_from
        TIMESTAMP created_at
        TIMESTAMP updated_at
        BIGINT owner_id "NOT NULL (raw FK)"
    }

    %% ── Relationships ──
    users ||--o{ apartments : "owns"
    users ||--o{ apartment_reviews : "writes"
    users ||--o{ conversations : "participant_1"
    users ||--o{ conversations : "participant_2"
    users ||--o{ messages : "sends"
    users ||--o{ notifications : "receives"
    users ||--o{ user_favorites : "saves"
    users ||--o{ viewing_requests : "requests"
    users ||--o{ apartment_reviews : "moderates"

    apartments ||--o{ apartment_reviews : "has"
    apartments ||--o{ conversations : "about"
    apartments ||--o{ user_favorites : "favorited"
    apartments ||--o{ viewing_requests : "scheduled"

    conversations ||--o{ messages : "contains"
```

## Legend

| Symbol | Meaning |
|--------|---------|
| `PK` | Primary Key (auto-generated IDENTITY) |
| `FK` | Foreign Key |
| `UK` | Unique constraint |
| `||--o{` | One-to-Many relationship |
| `NOT NULL` | Required field |

## Table Count: 9

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `users` | User accounts with roles | Referenced by all other tables |
| `apartments` | Apartment listings | Owned by a user |
| `apartment_reviews` | Ratings and reviews | Links apartment + reviewer + moderator |
| `conversations` | Chat threads | Between two users, optionally about an apartment |
| `messages` | Individual chat messages | Belongs to conversation, sent by user |
| `notifications` | In-app notifications | Sent to a user |
| `user_favorites` | Saved/bookmarked apartments | Links user + apartment (unique pair) |
| `viewing_requests` | Appointment scheduling | Tenant requests viewing of apartment |
| `listings` | Legacy simplified listings | Raw owner_id, no FK relationship |
