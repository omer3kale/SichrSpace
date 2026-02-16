# Frontend Module Architecture

> api-client.js (10 modules), SichrPlaceChat class, event bus, and page mappings.

## Module Dependency Graph

```mermaid
flowchart TD
    subgraph "Global API Client (IIFE)"
        CONFIG["CONFIG<br/>BASE_URL, WS_URL,<br/>TOKEN_KEY, USER_KEY"]
        HTTP["HTTP Helpers<br/>request(), get(), post(),<br/>put(), del(), upload()"]

        subgraph "10 API Modules"
            AUTH["Auth<br/>login, register, me,<br/>getUser, getToken,<br/>isAuthenticated, logout"]
            APTS["Apartments<br/>search, getById,<br/>create, update,<br/>remove, uploadImage"]
            MSGS["Messages<br/>getConversations,<br/>getMessages, send,<br/>markAsRead, unreadCount,<br/>startConversation"]
            VR["ViewingRequests<br/>create, getMine,<br/>updateStatus"]
            FAV["Favorites<br/>list, add, remove, check"]
            SS["SavedSearches<br/>list, save, remove"]
            REV["Reviews<br/>getForApartment, create"]
            NOTIF["Notifications<br/>list, markAllRead"]
            GDPR["Gdpr<br/>exportData, requestDeletion,<br/>getConsent, updateConsent"]
            ADMIN["Admin<br/>dashboard, getUsers,<br/>toggleUserActive,<br/>getPendingReviews,<br/>moderateReview"]
        end

        HEALTH["Health.check()"]
    end

    subgraph "WebSocket Client (Class)"
        CHAT["SichrPlaceChat<br/>connect, disconnect,<br/>joinConversation,<br/>leaveConversation,<br/>sendMessage, sendTyping,<br/>markAsRead"]
    end

    subgraph "Browser Storage"
        LS_TOKEN["localStorage<br/>sichrplace_token"]
        LS_USER["localStorage<br/>sichrplace_user"]
    end

    subgraph "Event Bus (CustomEvent)"
        EVT1["sichrplace:login"]
        EVT2["sichrplace:logout"]
        EVT3["sichrplace:unauthorized"]
        EVT4["sichrplace:notification"]
        EVT5["sichrplace:ws-status"]
    end

    CONFIG --> HTTP
    HTTP --> AUTH & APTS & MSGS & VR & FAV & SS & REV & NOTIF & GDPR & ADMIN & HEALTH

    AUTH -->|"store/clear"| LS_TOKEN & LS_USER
    AUTH -->|"dispatch"| EVT1 & EVT2
    HTTP -->|"401 response"| EVT3

    CHAT -->|"reads token from"| AUTH
    CHAT -->|"REST fallback for markAsRead"| MSGS
    CHAT -->|"dispatch"| EVT4 & EVT5

    style CONFIG fill:#37474f,color:white
    style HTTP fill:#37474f,color:white
    style AUTH fill:#1565c0,color:white
    style CHAT fill:#FF9800,color:white
    style EVT1 fill:#9C27B0,color:white
```

## Frontend Pages → API Module Mapping

```mermaid
graph LR
    subgraph "HTML Pages"
        P01["login.html"]
        P02["create-account.html"]
        P03["apartments-listing.html"]
        P04["advanced-search.html"]
        P05["chat.html / chat-new.html"]
        P06["viewing-request.html"]
        P07["viewing-requests-dashboard.html"]
        P08["landlord-dashboard.html"]
        P09["applicant-dashboard.html"]
        P10["admin-dashboard.html"]
        P11["privacy-settings.html"]
        P12["advanced-gdpr-dashboard.html"]
        P13["paypal-checkout.html"]
        P14["property-map.html"]
        P15["analytics-dashboard.html"]
    end

    subgraph "API Modules Used"
        M_AUTH["Auth"]
        M_APT["Apartments"]
        M_MSG["Messages"]
        M_CHAT["SichrPlaceChat"]
        M_VR["ViewingRequests"]
        M_FAV["Favorites"]
        M_SS["SavedSearches"]
        M_REV["Reviews"]
        M_NOTIF["Notifications"]
        M_ADM["Admin"]
        M_GDPR["Gdpr"]
    end

    P01 --> M_AUTH
    P02 --> M_AUTH
    P03 --> M_APT & M_FAV & M_SS
    P04 --> M_APT & M_SS
    P05 --> M_MSG & M_CHAT
    P06 --> M_VR
    P07 --> M_VR
    P08 --> M_APT & M_VR & M_REV
    P09 --> M_APT & M_FAV & M_VR
    P10 --> M_ADM
    P11 --> M_GDPR
    P12 --> M_GDPR
    P13 --> M_APT
    P14 --> M_APT
    P15 --> M_ADM

    style M_AUTH fill:#1565c0,color:white
    style M_CHAT fill:#FF9800,color:white
    style M_ADM fill:#c62828,color:white
```

## Utility JS Files

```mermaid
graph TB
    subgraph "Self-Hosted (keep)"
        K1["api-client.js — REST client"]
        K2["stomp-chat.js — WebSocket client"]
    end

    subgraph "Reusable Utilities (keep)"
        U1["language-switcher.js — DE/EN/TR"]
        U2["cookie-consent.js — GDPR banner"]
        U3["pwa-init.js — Service Worker"]
        U4["paypal-integration.js — Payment"]
        U5["translations.json — i18n strings"]
        U6["location-services.js — Geocoding"]
    end

    subgraph "Legacy / Needs Replacement"
        L1["realtime-chat.js — ❌ Supabase Realtime<br/>→ Replaced by stomp-chat.js"]
        L2["clarity-config*.js — ❌ MS Clarity<br/>→ Self-hosted analytics"]
        L3["google-analytics-config.js — ❌ GA<br/>→ Optional/self-hosted"]
    end

    style K1 fill:#2e7d32,color:white
    style K2 fill:#2e7d32,color:white
    style L1 fill:#c62828,color:white
    style L2 fill:#c62828,color:white
```
