# Dissolving Video — Feature Design

> **Date:** 2026-02-24
> **Status:** Design
> **Replaces:** Legacy `secure-videos.js` (in-memory metadata, local filesystem, 7-day email links)
> **Core concept:** Non-downloadable viewing videos sent via link, auto-expire and self-destruct after 48 hours

---

## Table of Contents

1. [Product Concept](#1-product-concept)
2. [How It Works — User Flow](#2-how-it-works--user-flow)
3. [Architecture Overview](#3-architecture-overview)
4. [Backend Design — Spring Boot](#4-backend-design--spring-boot)
5. [Frontend Design — Next.js](#5-frontend-design--nextjs)
6. [Security Model](#6-security-model)
7. [Legacy vs New Comparison](#7-legacy-vs-new-comparison)
8. [Implementation Plan](#8-implementation-plan)
9. [API Contract](#9-api-contract)
10. [Database Schema](#10-database-schema)

---

## 1. Product Concept

### What Is a Dissolving Video?

After a property viewing is completed, the landlord (or SichrPlace admin) uploads a walkthrough video of the apartment. The system generates a **secure, time-limited link** and emails it to the tenant. The tenant can watch the video in a protected player — but **cannot download it**. After **48 hours**, the link expires, the video becomes inaccessible, and it is eventually purged from storage.

### Why "Dissolving"?

| Property | Behavior |
|----------|----------|
| **Non-downloadable** | Video streams through the server — no direct file URL is ever exposed |
| **Time-limited** | Link contains an HMAC-signed expiry timestamp — 48 hours from generation |
| **One-viewer** | Link is bound to the tenant's email — cannot be forwarded meaningfully |
| **Self-destructing** | After all links to a video expire, a cleanup job deletes the file from storage |
| **Audit-trailed** | Every view is logged: who watched, when, how long, from which IP |

### Why 48 Hours?

- **Long enough** for the tenant to rewatch the property 2–3 times before deciding
- **Short enough** to create urgency — "watch it now" drives faster booking decisions
- **Privacy-compliant** — minimal data retention period for video of someone's property
- **Cost-efficient** — video storage is expensive; 48h keeps the bill low

---

## 2. How It Works — User Flow

### Flow A: Admin/Landlord Uploads a Video

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ Viewing is       │────▶│ Admin opens       │────▶│ Upload video file     │
│ COMPLETED        │     │ viewing detail    │     │ (drag & drop, ≤500MB) │
└─────────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                            │
                                                            ▼
                                                 ┌──────────────────────┐
                                                 │ System saves video    │
                                                 │ + creates metadata    │
                                                 │ + links to viewing    │
                                                 └──────────┬───────────┘
                                                            │
                                                            ▼
                                                 ┌──────────────────────┐
                                                 │ Click "Send to        │
                                                 │ Tenant" button        │
                                                 └──────────┬───────────┘
                                                            │
                                                            ▼
                                                 ┌──────────────────────┐
                                                 │ System generates      │
                                                 │ 48h HMAC link +      │
                                                 │ sends email           │
                                                 └──────────────────────┘
```

### Flow B: Tenant Watches the Video

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│ Tenant receives   │────▶│ Clicks "Watch     │────▶│ Secure player loads   │
│ email             │     │ Your Video"       │     │ /watch/{token}        │
└──────────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                             │
                                                             ▼
                                              ┌──────────────────────────┐
                                              │ Token validated:          │
                                              │ • HMAC signature ✓       │
                                              │ • Not expired ✓          │
                                              │ • Video exists ✓         │
                                              └──────────┬───────────────┘
                                                         │
                                  ┌──────────────────────┬┴──────────────────────┐
                                  │ Valid                 │ Invalid/Expired        │
                                  ▼                      ▼                        │
                         ┌────────────────┐    ┌─────────────────────┐            │
                         │ Video streams   │    │ "This video has      │            │
                         │ in protected    │    │  dissolved" error    │            │
                         │ player          │    │  page                │            │
                         └────────────────┘    └─────────────────────┘            │
```

### Flow C: Auto-Cleanup

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│ Scheduled job runs    │────▶│ Find videos where     │────▶│ Delete file from  │
│ every 6 hours         │     │ ALL links expired     │     │ storage + soft-   │
│                       │     │ > 24h ago             │     │ delete metadata   │
└──────────────────────┘     └──────────────────────┘     └──────────────────┘
```

---

## 3. Architecture Overview

```
                        ┌────────────────────────────────┐
                        │         Next.js Frontend        │
                        │                                 │
                        │  /watch/{token}  ← Public page  │
                        │  /admin/videos   ← Admin upload │
                        │  /viewings/:id   ← Send link    │
                        └────────────┬───────────────────┘
                                     │ HTTPS
                                     ▼
                        ┌────────────────────────────────┐
                        │       Spring Boot Backend       │
                        │                                 │
                        │  POST /api/videos/upload        │
                        │  GET  /api/videos/{id}/stream   │
                        │  POST /api/videos/{id}/send     │
                        │  GET  /api/videos/{id}          │
                        │  DELETE /api/videos/{id}        │
                        └──────┬─────────┬───────────────┘
                               │         │
                    ┌──────────┘         └──────────┐
                    ▼                               ▼
           ┌────────────────┐            ┌───────────────────┐
           │  File Storage   │            │   MSSQL Database   │
           │                 │            │                    │
           │  Option A:      │            │  viewing_videos    │
           │   Local disk    │            │  video_access_logs │
           │  Option B:      │            │  video_links       │
           │   S3 / MinIO    │            └───────────────────┘
           │  Option C:      │
           │   Azure Blob    │
           └────────────────┘
```

### Storage Decision

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Local disk** | Simplest, no cost, legacy parity | Not scalable, lost on redeploy | ✅ **Start here** — swap later |
| **S3 / MinIO** | Scalable, MinIO is self-hosted S3 | Extra infra | Good for production |
| **Azure Blob** | If using Azure | Azure lock-in | Only if already on Azure |

**Strategy:** Build a `FileStorageService` interface. Start with `LocalFileStorageService`. Swap to S3/MinIO later without changing any business logic.

---

## 4. Backend Design — Spring Boot

### 4.1 New Entities

#### `ViewingVideo` — Video metadata (replaces legacy in-memory array)

```java
@Entity
@Table(name = "viewing_videos")
public class ViewingVideo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Link to the completed viewing
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "viewing_request_id")
    private ViewingRequest viewingRequest;

    // Link to the apartment (denormalized for queries)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "apartment_id", nullable = false)
    private Apartment apartment;

    // Who uploaded it (landlord or admin)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    // File storage
    private String storagePath;        // internal path (never exposed)
    private String originalFilename;   // "apartment-tour.mp4"
    private String contentType;        // "video/mp4"
    private Long fileSizeBytes;        // file size for validation

    // Metadata
    private String title;              // "Viewing: Friedrichstr. 42, Berlin"
    private String notes;              // optional notes for the tenant
    private Long durationSeconds;      // video duration (extracted on upload)

    // Lifecycle
    @Enumerated(EnumType.STRING)
    private VideoStatus status;        // ACTIVE, EXPIRED, DELETED

    private Integer accessCount = 0;   // total stream hits across all links
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;   // soft delete timestamp
}
```

```java
public enum VideoStatus {
    ACTIVE,      // video available, at least one active link
    EXPIRED,     // all links expired, file still on disk (grace period)
    DELETED      // file purged from storage
}
```

#### `VideoAccessLink` — The dissolving link

```java
@Entity
@Table(name = "video_access_links")
public class VideoAccessLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private ViewingVideo video;

    // Who this link is for
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    private String recipientEmail;     // denormalized for email sending

    // The HMAC token (hashed — we only store the hash, like refresh tokens)
    private String tokenHash;

    // Lifecycle
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;   // createdAt + 48 hours
    private boolean revoked;           // manually revoked by admin

    // Analytics
    private Integer viewCount = 0;
    private LocalDateTime firstViewedAt;
    private LocalDateTime lastViewedAt;
    private Long totalWatchTimeSeconds;
}
```

#### `VideoAccessLog` — Audit trail

```java
@Entity
@Table(name = "video_access_logs")
public class VideoAccessLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "link_id", nullable = false)
    private VideoAccessLink link;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "video_id", nullable = false)
    private ViewingVideo video;

    private String ipAddress;         // hashed for GDPR
    private String userAgent;
    private LocalDateTime accessedAt;
    private Long watchDurationSeconds; // sent by frontend beacon on page close
}
```

### 4.2 New Services

#### `FileStorageService` — Abstraction for file storage

```java
public interface FileStorageService {
    String store(MultipartFile file, String directory);  // returns storagePath
    Resource load(String storagePath);                    // returns file resource
    void delete(String storagePath);                      // removes from storage
    boolean exists(String storagePath);
}
```

Default implementation: `LocalFileStorageService` — stores in `{app.storage.path}/videos/{uuid}.{ext}`

#### `VideoTokenService` — HMAC token generation & validation

```java
public interface VideoTokenService {
    /**
     * Generates a dissolving link token.
     * Token format: {videoId}.{linkId}.{expiryTimestamp}.{hmacSignature}
     * HMAC = SHA256(videoId:linkId:expiryTimestamp, secret)
     */
    String generateToken(Long videoId, Long linkId, Duration validity);

    /**
     * Validates token: checks HMAC integrity + expiry + link not revoked.
     * Returns the parsed token data or throws InvalidTokenException.
     */
    VideoTokenData validateToken(String token);
}
```

#### `ViewingVideoService` — Business logic

```java
public interface ViewingVideoService {
    // Upload
    ViewingVideoDto upload(MultipartFile file, Long viewingRequestId,
                           String title, String notes, Long uploadedByUserId);

    // Generate dissolving link + send email
    VideoAccessLinkDto sendToTenant(Long videoId, Long tenantId);

    // Stream (called by controller, validates token first)
    StreamingResponseBody stream(String token, HttpServletRequest request);

    // Admin operations
    ViewingVideoDto getById(Long videoId);
    Page<ViewingVideoDto> listAll(Pageable pageable);
    Page<ViewingVideoDto> listByApartment(Long apartmentId, Pageable pageable);
    void delete(Long videoId);
    void revokeLink(Long linkId);

    // Analytics
    void recordAccess(String token, String ipAddress, String userAgent);
    void recordWatchTime(String token, long watchDurationSeconds);

    // Scheduled cleanup
    void cleanupExpiredVideos();
}
```

### 4.3 New Controller

#### `ViewingVideoController`

```java
@RestController
@RequestMapping("/api/videos")
public class ViewingVideoController {

    // ─── Upload ───────────────────────────────────────────────────────
    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    // Multipart: file + viewingRequestId + title + notes
    // Returns: ViewingVideoDto with id, title, status, createdAt
    // Max size: 500MB (configured in application.yml)

    // ─── Send dissolving link to tenant ───────────────────────────────
    @PostMapping("/{videoId}/send")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    // Body: { tenantId } or { tenantEmail }
    // Creates VideoAccessLink (48h), sends HTML email with watch link
    // Returns: VideoAccessLinkDto with expiresAt

    // ─── Stream video (PUBLIC — token-protected) ─────────────────────
    @GetMapping("/watch")
    // Query param: ?token={hmacToken}
    // No @PreAuthorize — token IS the auth
    // Returns: streaming video with range request support
    // Headers: Content-Type, Content-Length, Accept-Ranges, Content-Range
    //          Content-Disposition: inline (never attachment)
    //          Cache-Control: no-store
    //          X-Content-Type-Options: nosniff
    //          X-Frame-Options: SAMEORIGIN

    // ─── Get video metadata (admin/landlord) ─────────────────────────
    @GetMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    // Returns: ViewingVideoDto with access stats

    // ─── List videos ─────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    // Returns: Page<ViewingVideoDto>

    // ─── List videos by apartment ────────────────────────────────────
    @GetMapping("/apartment/{apartmentId}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    // Returns: Page<ViewingVideoDto>

    // ─── Delete video ────────────────────────────────────────────────
    @DeleteMapping("/{videoId}")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    // Soft-deletes metadata, deletes file from storage

    // ─── Revoke a specific link ──────────────────────────────────────
    @PostMapping("/links/{linkId}/revoke")
    @PreAuthorize("hasAnyRole('LANDLORD', 'ADMIN')")
    // Immediately invalidates a dissolving link

    // ─── Record watch analytics (beacon) ─────────────────────────────
    @PostMapping("/analytics")
    // Body: { token, watchDurationSeconds }
    // Called by frontend navigator.sendBeacon on page close
    // No auth — token validates identity
}
```

### 4.4 New DTOs

```java
// Response
public record ViewingVideoDto(
    Long id,
    Long viewingRequestId,
    Long apartmentId,
    String apartmentTitle,
    String title,
    String notes,
    String originalFilename,
    Long fileSizeBytes,
    Long durationSeconds,
    String status,          // ACTIVE, EXPIRED, DELETED
    Integer accessCount,
    Integer activeLinkCount,
    String uploadedByName,
    LocalDateTime createdAt,
    List<VideoAccessLinkDto> links
) {}

public record VideoAccessLinkDto(
    Long id,
    String recipientEmail,
    String recipientName,
    LocalDateTime createdAt,
    LocalDateTime expiresAt,
    boolean revoked,
    boolean expired,        // computed: now > expiresAt
    Integer viewCount,
    LocalDateTime firstViewedAt,
    LocalDateTime lastViewedAt,
    Long totalWatchTimeSeconds
) {}

// Requests
public record VideoUploadRequest(
    Long viewingRequestId,  // optional — can upload without tying to a viewing
    String title,           // required
    String notes            // optional
) {}

public record VideoSendRequest(
    Long tenantId           // required — who to send the dissolving link to
) {}

public record VideoAnalyticsRequest(
    String token,
    Long watchDurationSeconds
) {}
```

### 4.5 Changes to Existing Code

#### Add `videoId` to `ViewingRequest` entity

```java
// In ViewingRequest.java — add field:
@OneToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "video_id")
private ViewingVideo video;
```

#### Add `videoUrl` to `ViewingRequestDto`

```java
// In ViewingRequestDto — add field:
private Long videoId;
private boolean hasVideo;
```

### 4.6 Configuration

```yaml
# application.yml — new section
app:
  video:
    enabled: true
    storage-path: ./data/videos          # local storage directory
    max-file-size: 500MB                 # max upload size
    allowed-types: video/mp4,video/quicktime,video/x-msvideo
    link-validity: 48h                   # dissolving link duration
    cleanup-grace-period: 24h            # delete file 24h after last link expires
    cleanup-cron: "0 0 */6 * * *"        # run cleanup every 6 hours
    hmac-secret: ${VIDEO_HMAC_SECRET}    # MUST be set in production

# Spring multipart config
spring:
  servlet:
    multipart:
      max-file-size: 500MB
      max-request-size: 510MB
```

### 4.7 Scheduled Cleanup Job

```java
@Component
public class VideoCleanupJob {

    @Scheduled(cron = "${app.video.cleanup-cron}")
    public void cleanupExpiredVideos() {
        // 1. Find all ViewingVideos where status = ACTIVE
        //    AND no VideoAccessLinks exist with expiresAt > now
        //    (all links are expired)
        //
        // 2. For each:
        //    a. Set status = EXPIRED
        //    b. If createdAt < now - gracePeriod:
        //       - Delete file from FileStorageService
        //       - Set status = DELETED, deletedAt = now
        //
        // 3. Log: "Cleaned up {n} expired videos, freed {x}MB"
    }
}
```

---

## 5. Frontend Design — Next.js

### 5.1 The Watch Page — `/watch/[token]`

This is the **most important page** — it's what the tenant sees when they click the email link.

#### Layout

```
┌──────────────────────────────────────────────────────────────┐
│                    SichrPlace Logo                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │                                                      │    │
│  │              VIDEO PLAYER (16:9)                      │    │
│  │              controlsList="nodownload"                │    │
│  │              oncontextmenu disabled                   │    │
│  │              transparent overlay on top               │    │
│  │                                                      │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│   Title: "Apartment Viewing: Friedrichstr. 42, Berlin"       │
│   Notes: "The living room gets great afternoon light..."     │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │  ⏳ This video dissolves in: 23h 42m 18s             │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │  🔒 This video is secure and cannot be downloaded.   │   │
│   │     It was shared exclusively with you.              │   │
│   └──────────────────────────────────────────────────────┘   │
│                                                              │
│   [ Book This Apartment ]  [ Request Another Viewing ]       │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                     © SichrPlace                              │
└──────────────────────────────────────────────────────────────┘
```

#### Expired State

```
┌──────────────────────────────────────────────────────────────┐
│                    SichrPlace Logo                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│            ┌─────────────────────────────────┐               │
│            │                                 │               │
│            │         💨                      │               │
│            │                                 │               │
│            │   This video has dissolved      │               │
│            │                                 │               │
│            │   The viewing video for         │               │
│            │   Friedrichstr. 42, Berlin      │               │
│            │   is no longer available.       │               │
│            │                                 │               │
│            │   Videos are available for      │               │
│            │   48 hours after sharing.       │               │
│            │                                 │               │
│            │   [ Contact Landlord ]          │               │
│            │   [ Browse Apartments ]         │               │
│            │                                 │               │
│            └─────────────────────────────────┘               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Security Measures (JavaScript)

```typescript
// Anti-download protection layer
function useVideoSecurity(videoRef: RefObject<HTMLVideoElement>) {
  useEffect(() => {
    // 1. Disable right-click on entire page
    const blockContextMenu = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', blockContextMenu);

    // 2. Disable text selection
    document.body.style.userSelect = 'none';

    // 3. Block devtools shortcuts
    const blockDevTools = (e: KeyboardEvent) => {
      if (e.key === 'F12') e.preventDefault();
      if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) e.preventDefault();
      if (e.ctrlKey && e.key === 'u') e.preventDefault();  // view source
      if (e.ctrlKey && e.key === 's') e.preventDefault();  // save page
    };
    document.addEventListener('keydown', blockDevTools);

    // 4. Disable drag
    document.addEventListener('dragstart', (e) => e.preventDefault());

    // 5. Add transparent overlay (prevents direct video element interaction for download)
    // Implemented via CSS: absolute-positioned div over the video

    // Cleanup
    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockDevTools);
    };
  }, []);
}
```

#### Watch Analytics Beacon

```typescript
// Send watch time on page close
useEffect(() => {
  const sendAnalytics = () => {
    const data = {
      token,
      watchDurationSeconds: Math.floor(videoRef.current?.currentTime ?? 0)
    };
    navigator.sendBeacon('/api/videos/analytics', JSON.stringify(data));
  };

  window.addEventListener('beforeunload', sendAnalytics);
  return () => window.removeEventListener('beforeunload', sendAnalytics);
}, [token]);
```

### 5.2 Admin Video Management — `/admin/videos`

#### Features
- **Upload panel:** Drag-and-drop video uploader, link to a viewing request, set title + notes
- **Video library:** Table with columns: Apartment | Title | Tenant | Status | Views | Uploaded | Actions
- **Actions per video:** Preview (plays in modal), Send Link, View Analytics, Revoke Links, Delete
- **Send link dialog:** Select tenant from viewing request participants, confirm → generates 48h link + sends email

### 5.3 Viewing Detail — Landlord View

On the `/viewings/:id` page for landlords, add a "Video" section:

```
┌─────────────────────────────────────────────────┐
│ 🎬 Viewing Video                                │
│                                                 │
│  No video uploaded yet                          │
│  [ Upload Video ]                               │
│                                                 │
│  ─── OR (if video exists) ───                   │
│                                                 │
│  📹 apartment-tour.mp4   (142 MB, 8:32)         │
│  Uploaded: Feb 24, 2026 at 14:30               │
│  Status: Active • 2 views                       │
│                                                 │
│  Links:                                         │
│  • tenant@email.com — Expires in 23h 42m        │
│    [ Revoke ]                                   │
│                                                 │
│  [ Send to Tenant ]  [ Preview ]  [ Delete ]    │
└─────────────────────────────────────────────────┘
```

---

## 6. Security Model

### 6.1 Token Design

```
Token format:  {videoId}.{linkId}.{expiryEpochSeconds}.{hmacSignature}
                  │         │              │                    │
                  │         │              │                    └── HMAC-SHA256(
                  │         │              │                          data = "videoId:linkId:expiry",
                  │         │              │                          key  = VIDEO_HMAC_SECRET
                  │         │              │                        )
                  │         │              │
                  │         │              └── Unix timestamp when link dissolves
                  │         │
                  │         └── Database ID of the VideoAccessLink row
                  │
                  └── Database ID of the ViewingVideo row
```

### 6.2 Validation Steps (on every stream request)

```
1. Parse token → extract videoId, linkId, expiry, signature
2. Recompute HMAC → compare with provided signature
   └── Fail → 403 "Invalid token"
3. Check expiry > now
   └── Fail → 410 "This video has dissolved"
4. Load VideoAccessLink from DB → check exists + not revoked
   └── Fail → 410 "This video has dissolved"
5. Load ViewingVideo from DB → check exists + status = ACTIVE
   └── Fail → 404 "Video not found"
6. Load file from storage → check exists
   └── Fail → 500 "Storage error"
7. ✅ Stream video → update access counts + log
```

### 6.3 Multi-Layer Protection

| Layer | What It Prevents | How |
|-------|-----------------|-----|
| **HMAC token** | URL guessing / brute force | Cryptographic signature — can't forge |
| **48h expiry** | Prolonged access | Server checks timestamp on every request |
| **Server-side streaming** | Direct file download | File URL never exposed; streamed through controller |
| **`nodownload` control** | Browser download button | HTML5 `controlsList` attribute |
| **Context menu block** | Right-click → Save Video As | JavaScript `preventDefault()` |
| **DevTools block** | F12 / Ctrl+Shift+I | Keyboard event suppression |
| **Transparent overlay** | Drag video to desktop | CSS overlay prevents direct element interaction |
| **`Content-Disposition: inline`** | Browser treating response as download | Forces inline rendering |
| **`Cache-Control: no-store`** | Browser caching the video | Prevents persistent caching |
| **`X-Frame-Options: SAMEORIGIN`** | Embedding in iframe on other sites | Blocks cross-origin framing |
| **IP hash logging** | Abuse tracking | GDPR-compliant audit trail |
| **Revoke link** | Admin kill switch | Instantly invalidates a specific link |

### 6.4 What This Does NOT Prevent

> **Reality check:** No web-based DRM-free solution can prevent screen recording (OBS, native screen capture). These protections make casual downloading impossible and deliberate recording inconvenient. For absolute protection, you'd need Widevine/FairPlay DRM — which adds significant complexity and cost. The current design is the right trade-off for a property viewing platform.

| Attack | Possible? | Mitigation |
|--------|-----------|------------|
| Screen recording (OBS) | Yes | Invisible watermark (future: overlay tenant's email faintly on video) |
| Browser DevTools network tab → copy stream URL | Partially | Token is single-use* + short-lived; stream requires valid token each chunk |
| Share the link with someone | Yes | Link expires in 48h; audit log shows if accessed from multiple IPs |
| Browser extensions that capture video | Yes | Same mitigation as screen recording — watermark |

*Future enhancement: make tokens single-session (bind to a session cookie on first use).

---

## 7. Legacy vs New Comparison

| Aspect | Legacy Node.js | New Spring Boot |
|--------|---------------|-----------------|
| **Storage** | Local filesystem | Local filesystem → S3/MinIO (swappable) |
| **Metadata** | In-memory JS array (LOST on restart!) | MSSQL database (persistent) |
| **Token format** | `timestamp.hmac` (no link ID) | `videoId.linkId.expiry.hmac` (richer) |
| **Expiry** | 24h (preview), 7d (email) | **48h** (single model — the dissolving link) |
| **Token storage** | Not stored | Hashed in DB (like refresh tokens) |
| **Link tracking** | accessCount only | Full audit trail: who/when/how long/from where |
| **Revocation** | Not possible | Per-link revoke + admin kill switch |
| **Multi-tenant links** | Not possible (one preview URL) | Multiple links per video (one per tenant) |
| **Video ↔ Viewing link** | Admin manually types email/address | FK to ViewingRequest + Apartment |
| **Cleanup** | Never (accumulates forever) | Scheduled every 6h with grace period |
| **Email** | Nodemailer with inline HTML | JavaMailSender + Thymeleaf template |
| **Player security** | `nodownload` + overlay | Same + CSP headers + `no-store` cache |
| **Watch analytics** | Beacon → in-memory | Beacon → database (persistent) |
| **Max file size** | 500MB | 500MB (configurable) |
| **Admin UI** | Inline in admin.html | Dedicated `/admin/videos` page |

---

## 8. Implementation Plan

### Backend Implementation (Spring Boot)

| # | Task | Effort | Depends On |
|---|------|--------|-----------|
| DV-B1 | `FileStorageService` interface + `LocalFileStorageService` | 2h | — |
| DV-B2 | `ViewingVideo` entity + Flyway migration | 1h | — |
| DV-B3 | `VideoAccessLink` entity + Flyway migration | 1h | DV-B2 |
| DV-B4 | `VideoAccessLog` entity + Flyway migration | 30m | DV-B3 |
| DV-B5 | `ViewingVideoRepository` + `VideoAccessLinkRepository` | 1h | DV-B2, DV-B3 |
| DV-B6 | `VideoTokenService` (HMAC generation + validation) | 2h | — |
| DV-B7 | `ViewingVideoService` implementation | 4h | DV-B1–B6 |
| DV-B8 | `ViewingVideoController` (upload + stream + send + CRUD) | 3h | DV-B7 |
| DV-B9 | `VideoCleanupJob` scheduled task | 1h | DV-B7 |
| DV-B10 | Email template for dissolving link (Thymeleaf) | 1h | DV-B7 |
| DV-B11 | Add `video` FK to `ViewingRequest` entity + migration | 30m | DV-B2 |
| DV-B12 | Update `ViewingRequestDto` with `videoId` + `hasVideo` | 30m | DV-B11 |
| DV-B13 | Security config: permit `/api/videos/watch`, `/api/videos/analytics` | 30m | DV-B8 |
| DV-B14 | Tests (unit + integration) | 4h | DV-B1–B13 |
| DV-B15 | Multipart config in `application.yml` (500MB limit) | 15m | — |

**Total backend: ~22 hours (≈3 days)**

### Frontend Implementation (Next.js)

| # | Task | Effort | Depends On |
|---|------|--------|-----------|
| DV-F1 | `/watch/[token]` page — video player + security | 4h | DV-B8 |
| DV-F2 | Dissolving countdown timer component | 1h | — |
| DV-F3 | "Video dissolved" expired state page | 1h | — |
| DV-F4 | Watch analytics beacon (beforeunload) | 1h | DV-F1 |
| DV-F5 | Admin video upload panel | 3h | DV-B8 |
| DV-F6 | Admin video library table | 2h | DV-B8 |
| DV-F7 | "Send to Tenant" dialog + email trigger | 2h | DV-B8 |
| DV-F8 | Viewing detail — video section (landlord view) | 2h | DV-B8, DV-F5 |
| DV-F9 | Video preview modal (admin) | 1h | DV-F6 |
| DV-F10 | i18n: EN/DE/TR strings for all video UI | 1h | DV-F1–F9 |

**Total frontend: ~18 hours (≈2.5 days)**

**Combined total: ~40 hours (≈5.5 days)**

---

## 9. API Contract

### Endpoints Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/videos/upload` | LANDLORD, ADMIN | Upload video (multipart) |
| `GET` | `/api/videos` | ADMIN | List all videos (paginated) |
| `GET` | `/api/videos/{videoId}` | LANDLORD, ADMIN | Get video metadata + links |
| `GET` | `/api/videos/apartment/{apartmentId}` | LANDLORD, ADMIN | Videos for an apartment |
| `POST` | `/api/videos/{videoId}/send` | LANDLORD, ADMIN | Generate 48h link + email tenant |
| `GET` | `/api/videos/watch?token={token}` | PUBLIC (token-protected) | Stream video |
| `DELETE` | `/api/videos/{videoId}` | LANDLORD, ADMIN | Delete video + file |
| `POST` | `/api/videos/links/{linkId}/revoke` | LANDLORD, ADMIN | Revoke a dissolving link |
| `POST` | `/api/videos/analytics` | PUBLIC (token in body) | Record watch time (beacon) |

### Example: Upload

```http
POST /api/videos/upload
Authorization: Bearer {jwt}
Content-Type: multipart/form-data

------boundary
Content-Disposition: form-data; name="file"; filename="apartment-tour.mp4"
Content-Type: video/mp4
{binary video data}
------boundary
Content-Disposition: form-data; name="viewingRequestId"
42
------boundary
Content-Disposition: form-data; name="title"
Friedrichstr. 42 Berlin Viewing
------boundary
Content-Disposition: form-data; name="notes"
The living room gets great afternoon sunlight. Notice the built-in wardrobes.
------boundary--
```

**Response: 201 Created**
```json
{
  "id": 7,
  "viewingRequestId": 42,
  "apartmentId": 15,
  "apartmentTitle": "Spacious 2BR in Friedrichshain",
  "title": "Friedrichstr. 42 Berlin Viewing",
  "notes": "The living room gets great afternoon sunlight.",
  "originalFilename": "apartment-tour.mp4",
  "fileSizeBytes": 148897234,
  "durationSeconds": null,
  "status": "ACTIVE",
  "accessCount": 0,
  "activeLinkCount": 0,
  "uploadedByName": "Hans Müller",
  "createdAt": "2026-02-24T14:30:00",
  "links": []
}
```

### Example: Send Dissolving Link

```http
POST /api/videos/7/send
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "tenantId": 23
}
```

**Response: 201 Created**
```json
{
  "id": 12,
  "recipientEmail": "tenant@example.com",
  "recipientName": "Maria Schmidt",
  "createdAt": "2026-02-24T15:00:00",
  "expiresAt": "2026-02-26T15:00:00",
  "revoked": false,
  "expired": false,
  "viewCount": 0,
  "firstViewedAt": null,
  "lastViewedAt": null,
  "totalWatchTimeSeconds": 0
}
```

The tenant receives an email with a button linking to:
```
https://sichrplace.com/watch/7.12.1740585600.a3f8c2d1e5b7...
```

### Example: Stream (Token-Protected)

```http
GET /api/videos/watch?token=7.12.1740585600.a3f8c2d1e5b7...
Range: bytes=0-1048575

→ 206 Partial Content
Content-Type: video/mp4
Content-Range: bytes 0-1048575/148897234
Content-Disposition: inline
Cache-Control: no-store
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

### Example: Expired Token

```http
GET /api/videos/watch?token=7.12.1740412800.expired...

→ 410 Gone
{
  "error": "VIDEO_DISSOLVED",
  "message": "This video has dissolved and is no longer available.",
  "apartmentTitle": "Spacious 2BR in Friedrichshain",
  "expiredAt": "2026-02-23T15:00:00"
}
```

---

## 10. Database Schema

### Flyway Migration

```sql
-- V__add_viewing_videos.sql

CREATE TABLE viewing_videos (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    viewing_request_id  BIGINT NULL REFERENCES viewing_requests(id),
    apartment_id        BIGINT NOT NULL REFERENCES apartments(id),
    uploaded_by         BIGINT NOT NULL REFERENCES users(id),
    storage_path        NVARCHAR(500) NOT NULL,
    original_filename   NVARCHAR(255) NOT NULL,
    content_type        NVARCHAR(50) NOT NULL DEFAULT 'video/mp4',
    file_size_bytes     BIGINT NOT NULL,
    title               NVARCHAR(255) NOT NULL,
    notes               NVARCHAR(MAX) NULL,
    duration_seconds    BIGINT NULL,
    status              NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    access_count        INT NOT NULL DEFAULT 0,
    created_at          DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME2 NOT NULL DEFAULT GETDATE(),
    deleted_at          DATETIME2 NULL,

    CONSTRAINT chk_video_status CHECK (status IN ('ACTIVE', 'EXPIRED', 'DELETED'))
);

CREATE TABLE video_access_links (
    id                      BIGINT IDENTITY(1,1) PRIMARY KEY,
    video_id                BIGINT NOT NULL REFERENCES viewing_videos(id),
    recipient_id            BIGINT NOT NULL REFERENCES users(id),
    recipient_email         NVARCHAR(255) NOT NULL,
    token_hash              NVARCHAR(128) NOT NULL,
    created_at              DATETIME2 NOT NULL DEFAULT GETDATE(),
    expires_at              DATETIME2 NOT NULL,
    revoked                 BIT NOT NULL DEFAULT 0,
    view_count              INT NOT NULL DEFAULT 0,
    first_viewed_at         DATETIME2 NULL,
    last_viewed_at          DATETIME2 NULL,
    total_watch_time_seconds BIGINT NOT NULL DEFAULT 0,

    INDEX ix_val_video_id (video_id),
    INDEX ix_val_token_hash (token_hash),
    INDEX ix_val_expires_at (expires_at)
);

CREATE TABLE video_access_logs (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    link_id         BIGINT NOT NULL REFERENCES video_access_links(id),
    video_id        BIGINT NOT NULL REFERENCES viewing_videos(id),
    ip_address_hash NVARCHAR(128) NULL,
    user_agent      NVARCHAR(500) NULL,
    accessed_at     DATETIME2 NOT NULL DEFAULT GETDATE(),
    watch_duration_seconds BIGINT NULL
);

-- Add video FK to viewing_requests
ALTER TABLE viewing_requests ADD video_id BIGINT NULL REFERENCES viewing_videos(id);
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                  DISSOLVING VIDEO — TL;DR                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WHAT:  Secure apartment viewing videos                     │
│  WHO:   Landlord uploads → system emails tenant             │
│  HOW:   HMAC-signed token in URL, server-side streaming     │
│  WHEN:  48 hours from link generation, then it dissolves    │
│  WHY:   Privacy + urgency + cost savings                    │
│                                                             │
│  Entities:  ViewingVideo, VideoAccessLink, VideoAccessLog   │
│  Endpoints: 9 new (POST upload, GET stream, POST send, ...) │
│  Frontend:  /watch/[token] (public), /admin/videos (admin)  │
│  Effort:    ~5.5 days (3 backend + 2.5 frontend)            │
│                                                             │
│  NOT prevented: Screen recording (OBS)                      │
│  Future:        Invisible watermarks, DRM, single-session   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
