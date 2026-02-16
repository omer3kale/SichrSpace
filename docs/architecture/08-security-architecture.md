# Security Architecture (Defense in Depth)

```mermaid
graph TB
    subgraph "Layer 1 - Network Security"
        style L1 fill:#1a237e,color:white
        TLS[TLS 1.3 Only]
        HSTS[HSTS Preload<br/>max-age=31536000]
        RATE_L[Rate Limiting<br/>API: 100/min<br/>Auth: 10/min]
        IP_FILTER[Nginx IP Filtering]
    end

    subgraph "Layer 2 - Application Security"
        style L2 fill:#0d47a1,color:white
        JWT_AUTH[JWT Authentication<br/>HMAC-SHA512<br/>24h Expiry]
        RBAC[Role-Based Access<br/>USER / ADMIN<br/>@PreAuthorize]
        CSP[Content Security Policy<br/>X-Frame-Options: DENY<br/>X-Content-Type-Options: nosniff]
        CORS_CFG[CORS Whitelist<br/>GitHub Pages Origin Only]
        INPUT_VAL[Bean Validation<br/>@NotBlank @Email @Size<br/>SQL Injection Prevention via JPA]
    end

    subgraph "Layer 3 - Data Security"
        style L3 fill:#1565c0,color:white
        BCRYPT[BCrypt Password Hashing<br/>Strength: 12 rounds]
        LOCKOUT[Account Lockout<br/>5 failed attempts → blocked]
        PRESIGNED[MinIO Presigned URLs<br/>1-hour expiry]
        GDPR_COMP[GDPR Compliance<br/>Data Export<br/>Deletion Requests<br/>Consent Management]
    end

    subgraph "Layer 4 - Infrastructure Security"
        style L4 fill:#1976d2,color:white
        DOCKER_ISO[Docker Network Isolation<br/>Internal Bridge Network]
        NON_ROOT[Non-Root Containers<br/>appuser:appgroup]
        SECRETS[Environment Variables<br/>No Hardcoded Secrets]
        HEALTH[Health Checks<br/>Auto-restart on failure]
        MIN_IMAGE[Minimal Images<br/>Alpine-based<br/>JRE-only runtime]
    end

    TLS --> JWT_AUTH
    HSTS --> CSP
    RATE_L --> INPUT_VAL
    JWT_AUTH --> BCRYPT
    RBAC --> LOCKOUT
    CORS_CFG --> PRESIGNED
    BCRYPT --> DOCKER_ISO
    LOCKOUT --> NON_ROOT
    GDPR_COMP --> SECRETS
```

## Security Checklist

| Control | Implementation | Status |
|---------|---------------|--------|
| HTTPS/TLS | Nginx TLS 1.2/1.3, HSTS preload | ✅ |
| Authentication | JWT (HMAC-SHA512, 24h expiry) | ✅ |
| Password Hashing | BCrypt strength 12 | ✅ |
| Account Lockout | Block after 5 failed logins | ✅ |
| RBAC | `@PreAuthorize("hasRole('ADMIN')")` | ✅ |
| CORS | Whitelist GitHub Pages origin | ✅ |
| CSP | Strict Content-Security-Policy header | ✅ |
| Rate Limiting | Nginx zones: 100/min API, 10/min auth | ✅ |
| Input Validation | Jakarta Bean Validation on all DTOs | ✅ |
| SQL Injection | JPA parameterized queries | ✅ |
| XSS | X-XSS-Protection, X-Content-Type-Options | ✅ |
| Clickjacking | X-Frame-Options: DENY | ✅ |
| File Upload | Type validation, size limits | ✅ |
| Presigned URLs | MinIO 1-hour expiry | ✅ |
| Secrets | Environment variables, never in code | ✅ |
| Container Security | Non-root user, Alpine minimal images | ✅ |
| GDPR | Export, deletion, consent management | ✅ |
| Health Monitoring | Docker health checks, auto-restart | ✅ |
