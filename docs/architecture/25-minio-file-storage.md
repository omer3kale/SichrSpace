# MinIO File Storage Pipeline

> Upload, access via presigned URLs, bucket layout, and lifecycle.

## Bucket Structure

```mermaid
graph TD
    subgraph "MinIO Object Storage (S3-compatible)"
        subgraph "Bucket: apartments"
            A1["apartment-images/{aptId}/{uuid}-photo.jpg"]
            A2["apartment-images/{aptId}/{uuid}-floorplan.pdf"]
        end

        subgraph "Bucket: videos"
            V1["secure-videos/{videoId}/{uuid}-tour.mp4"]
        end

        subgraph "Bucket: profiles"
            PR1["avatars/{userId}/{uuid}-avatar.jpg"]
        end
    end

    subgraph "Auto-Created on Startup"
        MC["MinioConfig.init()<br/>@PostConstruct<br/>Creates buckets if not exist"]
    end

    MC -->|"makeBucket()"| A1 & V1 & PR1

    style MC fill:#6DB33F,color:white
```

## Upload Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant API as api-client.js
    participant CTRL as ApartmentController
    participant SVC as FileStorageService
    participant MINIO as MinIO Container

    B->>B: User selects file<br/><input type="file">
    B->>API: Apartments.uploadImage(aptId, file)
    API->>API: Build FormData<br/>append('file', file)
    API->>CTRL: POST /api/apartments/{id}/images<br/>Content-Type: multipart/form-data<br/>Authorization: Bearer JWT

    CTRL->>CTRL: Verify user owns apartment
    
    alt Not owner
        CTRL-->>API: 404 Not Found
    end

    CTRL->>SVC: uploadFile(file, "apartment-images", aptId)

    SVC->>SVC: Generate filename:<br/>{folder}/{UUID}-{originalName}
    SVC->>MINIO: MinioClient.putObject()<br/>bucket: "apartments"<br/>object: filename<br/>stream: file.getInputStream()<br/>contentType: file.getContentType()

    MINIO-->>SVC: Object stored
    SVC->>SVC: Build URL:<br/>minioEndpoint/apartments/filename
    SVC-->>CTRL: URL string
    CTRL-->>API: 200 {success, imageUrl}
    API-->>B: Display uploaded image
```

## Presigned URL Access (Secure Downloads)

```mermaid
sequenceDiagram
    participant B as Browser
    participant SPRING as Spring Boot
    participant SVC as FileStorageService
    participant MINIO as MinIO

    B->>SPRING: GET /api/videos/{id}/access

    SPRING->>SVC: getPresignedUrl("videos", objectName, 30)
    SVC->>MINIO: getPresignedObjectUrl()<br/>method: GET<br/>bucket: "videos"<br/>expiry: 30 minutes

    MINIO-->>SVC: https://minio:9000/videos/...?X-Amz-Signature=...
    SVC-->>SPRING: Presigned URL
    SPRING-->>B: {url: "https://...?signature=..."}

    Note over B,MINIO: URL valid for 30 minutes only
    B->>MINIO: GET presigned URL (direct)
    MINIO->>MINIO: Verify signature + expiry
    MINIO-->>B: Stream file content

    Note over B: No auth header needed!<br/>Signature embedded in URL
```

## Storage Operations Available

```mermaid
graph LR
    subgraph "FileStorageService Methods"
        UP["uploadFile(file, bucket, folder)<br/>→ Public URL string"]
        PS["getPresignedUrl(bucket, obj, mins)<br/>→ Signed temp URL"]
        DL["downloadFile(bucket, obj)<br/>→ InputStream"]
        DEL["deleteFile(bucket, obj)<br/>→ void"]
    end

    subgraph "Used By"
        C1["ApartmentController.uploadImage()"] --> UP
        C2["SecureVideoController (future)"] --> PS
        C3["GdprController (future export)"] --> DL
        C4["ApartmentController.delete()"] --> DEL
    end

    style UP fill:#2e7d32,color:white
    style PS fill:#FF9800,color:white
    style DEL fill:#c62828,color:white
```

## MinIO Docker Configuration

```
Container: sichrplace-minio
Image:     minio/minio:latest
Ports:     9000 (API) / 9001 (Console UI)
Volume:    minio_data:/data (persistent)
Creds:     MINIO_ROOT_USER / MINIO_ROOT_PASSWORD
Console:   http://localhost:9001 (admin UI)
```
