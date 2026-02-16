# New Feature Automation Workflow

> How to add a new feature end-to-end with zero manual intervention.

```mermaid
flowchart TD
    subgraph "Step 1: Database (if needed)"
        S1A["Create V{N}__add_feature.sql"]
        S1B["Place in src/main/resources/db/migration/"]
        S1C["Flyway auto-applies on next startup"]
    end

    subgraph "Step 2: Backend"
        S2A["Create Entity class<br/>@Entity + @Table"]
        S2B["Create Repository interface<br/>extends JpaRepository"]
        S2C["Create Service class<br/>@Service + business logic"]
        S2D["Create Controller<br/>@RestController + endpoints"]
        S2E["Add @PreAuthorize if admin-only"]
    end

    subgraph "Step 3: Frontend"
        S3A["Add methods to api-client.js<br/>SichrPlaceAPI.NewFeature.list()"]
        S3B["Create HTML page in frontend/"]
        S3C["Wire up event handlers"]
    end

    subgraph "Step 4: Test & Deploy"
        S4A["mvnw test"]
        S4B["git add -A && git commit"]
        S4C["git push origin main"]
        S4D["GitHub Actions auto-builds"]
        S4E["Backend: Docker image rebuilt"]
        S4F["Frontend: GitHub Pages redeployed"]
        S4G["Flyway: Schema auto-migrated"]
    end

    S1A --> S1B --> S1C
    S1C --> S2A --> S2B --> S2C --> S2D --> S2E
    S2E --> S3A --> S3B --> S3C
    S3C --> S4A --> S4B --> S4C --> S4D
    S4D --> S4E & S4F
    S4E --> S4G

    style S4D fill:#24292e,color:white
    style S4E fill:#6DB33F,color:white
    style S4F fill:#24292e,color:white
    style S4G fill:#0078D4,color:white
```

## Example: Adding a "Booking" Feature

```mermaid
graph TB
    subgraph "Files to Create"
        F1["db/migration/V2__add_bookings.sql"]
        F2["entity/Booking.java"]
        F3["repository/BookingRepository.java"]
        F4["service/BookingService.java"]
        F5["controller/BookingController.java"]
        F6["js/api-client.js → add Bookings methods"]
        F7["frontend/bookings.html"]
    end

    subgraph "Auto-Generated"
        A1["Swagger docs at /swagger-ui/"]
        A2["JPA DDL validation"]
        A3["Spring Security integration"]
    end

    F1 --> F2 --> F3 --> F4 --> F5
    F5 --> A1 & A2 & A3
    F5 --> F6 --> F7

    style F1 fill:#0078D4,color:white
    style F2 fill:#6DB33F,color:white
    style F7 fill:#9C27B0,color:white
```

## API Client Extension Pattern

```javascript
// Just add to js/api-client.js:
const Bookings = {
    list()          { return get('/api/bookings'); },
    getById(id)     { return get(`/api/bookings/${id}`); },
    create(data)    { return post('/api/bookings', data); },
    cancel(id)      { return del(`/api/bookings/${id}`); },
    confirm(id)     { return put(`/api/bookings/${id}/confirm`); },
};

// Then expose in the return block:
return { ...existing, Bookings };
```
