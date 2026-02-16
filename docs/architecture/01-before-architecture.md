# Current Architecture (BEFORE Migration)

```mermaid
graph TB
    subgraph "Frontend - Netlify Hosted"
        UI[index.html + 43 HTML Pages]
        PWA[PWA Service Worker]
        JS[JavaScript Modules]
        CSS[CSS Stylesheets]
    end

    subgraph "Frontend JS Dependencies"
        SUP_JS[Supabase JS SDK v2]
        RT_JS[Supabase Realtime Client]
        PP_JS[PayPal SDK]
        GM_JS[Google Maps API]
    end

    subgraph "Netlify Platform"
        NF_HOST[Netlify Hosting / CDN]
        NF_FN[Netlify Serverless Functions]
        NF_EDGE[Edge Functions]
        NF_REDIR[_redirects / netlify.toml]
    end

    subgraph "Backend - Express.js"
        EXP[Express Server :3000]
        HELM[Helmet Security]
        RATE[Rate Limiter]
        LUSCA[CSRF - Lusca]
        MORG[Morgan Logger]
        SWAG[Swagger API Docs]
    end

    subgraph "Express Routes & APIs"
        R_AUTH[/api/auth]
        R_APT[/api/apartments]
        R_MSG[/api/messages]
        R_VR[/api/viewing-requests]
        R_ADMIN[/api/admin]
        R_GDPR[/api/gdpr]
        R_FAV[/api/favorites]
        R_REV[/api/reviews]
        R_SRCH[/api/saved-searches]
        R_FEED[/api/feedback]
        R_VID[/api/secure-videos]
        R_PUSH[/api/push-notifications]
        R_PAY[/api/paypal]
        R_MAPS[/api/maps]
    end

    subgraph "Supabase Platform"
        style Supabase fill:#f44,color:white
        SUP_AUTH[Supabase Auth]
        SUP_DB[(PostgreSQL 15)]
        SUP_RT[Supabase Realtime]
        SUP_STOR[Supabase Storage]
        SUP_RLS[Row Level Security]
        SUP_EDGE[Edge Functions - Deno]
    end

    subgraph "External Services"
        REDIS[(Redis 7 Cache)]
        PAYPAL[PayPal API]
        GMAIL[Gmail SMTP]
        GMAP[Google Maps API]
    end

    UI --> SUP_JS
    UI --> PP_JS
    UI --> GM_JS
    SUP_JS --> SUP_AUTH
    RT_JS --> SUP_RT
    NF_HOST --> UI
    NF_FN --> EXP
    EXP --> R_AUTH & R_APT & R_MSG & R_VR & R_ADMIN
    EXP --> R_GDPR & R_FAV & R_REV & R_SRCH
    R_AUTH --> SUP_AUTH
    R_APT --> SUP_DB
    R_MSG --> SUP_DB
    R_MSG --> SUP_RT
    R_VR --> SUP_DB
    R_FAV --> SUP_DB
    R_VID --> SUP_STOR
    R_PAY --> PAYPAL
    EXP --> REDIS
    EXP --> GMAIL

    style NF_HOST fill:#f44,color:white
    style NF_FN fill:#f44,color:white
    style SUP_AUTH fill:#f44,color:white
    style SUP_DB fill:#f44,color:white
    style SUP_RT fill:#f44,color:white
    style SUP_STOR fill:#f44,color:white
    style SUP_RLS fill:#f44,color:white
```

> Red = components being replaced in the migration.
