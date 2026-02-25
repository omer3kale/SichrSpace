# Dissolving Video — FTL Implementation Roadmap

> **Date:** 2026-02-24
> **Status:** Active — implementation in progress
> **Scope:** Upload once, send a signed expiring link, stream securely for 48 hours, log every watch, then auto-clean.

---

## 1. Product Scope and Contracts

**Tenant sees:** `/watch/{token}` page with a countdown ("This video expires in X hours"), secure player, and clear messaging about trust and privacy.

**Landlord/admin sees:** A management area showing uploaded videos, links, status (active/expired), and logs.

**Backend enforces:** HMAC-signed tokens, no file URLs exposed, HTTP range streaming only, and cleanup jobs.

---

## 2. Backend FTL — Entities, Services, and Endpoints

### 2.1 Entities

1. **`ViewingVideo`** — `id`, `viewingRequestId` (FK), `apartmentId` (FK), `uploadedBy` (FK), `storagePath`, `originalFilename`, `contentType`, `fileSizeBytes`, `title`, `notes`, `durationSeconds`, `status` (ACTIVE/DELETED), `accessCount`, `createdAt`, `updatedAt`, `deletedAt`.

2. **`VideoAccessLink`** — `id`, `videoId` (FK), `recipientId` (FK), `recipientEmail`, `tokenHash`, `createdAt`, `expiresAt`, `revoked`, `viewCount`, `firstViewedAt`, `lastViewedAt`, `totalWatchTimeSeconds`.

3. **`VideoAccessLog`** — `id`, `linkId` (FK), `videoId` (FK), `ipAddressHash`, `userAgent`, `accessedAt`, `watchDurationSeconds`.

### 2.2 Token and Security Design

Token format: `{videoId}.{linkId}.{expiresAtEpoch}.{hmacSignature}`

- HMAC = SHA256(`videoId:linkId:expiresAt`, server secret)
- Token string NOT persisted — only `hash(token)` stored for revocation checks
- Validation: check HMAC integrity → check expiry → check link not revoked → check video ACTIVE

### 2.3 File Storage and Streaming

- `FileStorageService` interface (store/load/delete/exists)
- `LocalFileStorageService` implementation (swappable to S3/MinIO later)
- Videos stored under `{app.video.storage-path}/videos/{uuid}.{ext}`
- HTTP range request support for seeking
- Security headers: `Content-Disposition: inline`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`

### 2.4 Controller Endpoints (9 actions)

| # | Method | Path | Auth | Purpose |
|---|--------|------|------|---------|
| 1 | POST | `/api/viewings/{viewingRequestId}/videos` | LANDLORD, ADMIN | Upload video for a viewing |
| 2 | GET | `/api/viewings/{viewingRequestId}/videos` | LANDLORD, ADMIN | List videos for a viewing |
| 3 | DELETE | `/api/viewings/videos/{videoId}` | LANDLORD, ADMIN | Soft-delete video |
| 4 | POST | `/api/viewings/videos/{videoId}/links` | LANDLORD, ADMIN | Create 48h dissolving link |
| 5 | GET | `/api/viewings/videos/{videoId}/links` | LANDLORD, ADMIN | List links for a video |
| 6 | POST | `/api/viewings/videos/links/{linkId}/revoke` | LANDLORD, ADMIN | Revoke a link |
| 7 | GET | `/api/viewings/videos/links/{linkId}/logs` | LANDLORD, ADMIN | View access logs |
| 8 | GET | `/api/videos/stream/{token}` | PUBLIC (token) | Stream video with range support |
| 9 | POST | `/api/videos/{token}/log` | PUBLIC (token) | Record watch analytics beacon |

### 2.5 Expiry and Cleanup

- **Job A (every 6h):** Mark expired links
- **Job B (daily):** Delete video files where all links expired >24h ago, set status=DELETED

### 2.6 Integration with Existing Flows

- Only allow upload for COMPLETED viewings
- After 48h window, review prompt emails mention video is no longer accessible
- Admin can see access logs via support ticket tools

---

## 3. Frontend FTL — Player Page and Management UI

### 3.1 `/watch/[token]` Player Page

- Validate token via HEAD/GET to streaming endpoint
- If valid: secure `<video>` player with countdown timer, watermark, anti-download protections
- If expired: "This video has dissolved" page with CTAs

### 3.2 Landlord/Admin Video UI

- Videos tab per viewing request in dashboard
- Upload, send link, preview, revoke, view logs
- Highlight expired links, offer "Create new link" button

---

## 4. Estimated Effort

| Phase | Effort |
|-------|--------|
| Backend core (entities + token + streaming + upload + cleanup) | ~3 days |
| Frontend player page + landlord UI | ~2.5 days |
| Email templates + polish + watermark | ~1 day |
| **Total** | **~6.5 days** |
