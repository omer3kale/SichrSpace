-- =============================================================================
-- V012__viewing_videos_mssql.sql
-- SichrPlace — Dissolving Video feature tables
--
-- Purpose:   Creates three tables for the secure, expiring viewing video system:
--              viewing_videos       — metadata for uploaded viewing recordings
--              video_access_links   — dissolving 48h links tied to recipients
--              video_access_logs    — immutable audit trail of every watch session
--
-- Notes:
--   - video files are stored externally (local disk or S3); only storage_path
--     is persisted here — never exposed to clients.
--   - ip_address_hash stores SHA-256(IP); we never store the raw IP.
--   - token_hash stores SHA-256(HMAC token); the raw token lives only in the
--     URL sent to the tenant.
--   - video_access_links.expires_at is set to created_at + 48 hours by the
--     application; the DB does NOT enforce expiry — the backend does.
-- =============================================================================

SET ANSI_NULLS ON; GO
SET QUOTED_IDENTIFIER ON; GO
SET NOCOUNT ON; GO

-- ── viewing_videos ───────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'viewing_videos')
BEGIN
    CREATE TABLE viewing_videos (
        id                  BIGINT          IDENTITY(1,1) NOT NULL,
        viewing_request_id  BIGINT          NULL,
        apartment_id        BIGINT          NOT NULL,
        uploaded_by         BIGINT          NOT NULL,
        storage_path        NVARCHAR(500)   NOT NULL,
        original_filename   NVARCHAR(255)   NOT NULL,
        content_type        NVARCHAR(100)   NOT NULL
            CONSTRAINT DF_viewing_videos_content_type DEFAULT 'video/mp4',
        file_size_bytes     BIGINT          NOT NULL,
        title               NVARCHAR(255)   NOT NULL,
        notes               NVARCHAR(MAX)   NULL,
        duration_seconds    BIGINT          NULL,
        status              VARCHAR(20)     NOT NULL
            CONSTRAINT DF_viewing_videos_status DEFAULT 'ACTIVE',
        access_count        INT             NOT NULL
            CONSTRAINT DF_viewing_videos_access_count DEFAULT 0,
        created_at          DATETIME2       NOT NULL
            CONSTRAINT DF_viewing_videos_created DEFAULT GETDATE(),
        updated_at          DATETIME2       NOT NULL
            CONSTRAINT DF_viewing_videos_updated DEFAULT GETDATE(),
        deleted_at          DATETIME2       NULL,

        CONSTRAINT PK_viewing_videos PRIMARY KEY (id),
        CONSTRAINT CK_viewing_videos_status CHECK (status IN ('ACTIVE', 'DELETED')),
        CONSTRAINT FK_viewing_videos_viewing FOREIGN KEY (viewing_request_id)
            REFERENCES viewing_requests(id) ON DELETE SET NULL,
        CONSTRAINT FK_viewing_videos_apartment FOREIGN KEY (apartment_id)
            REFERENCES apartments(id) ON DELETE CASCADE,
        CONSTRAINT FK_viewing_videos_uploader FOREIGN KEY (uploaded_by)
            REFERENCES users(id)
    );

    CREATE INDEX IX_viewing_videos_apartment ON viewing_videos (apartment_id);
    CREATE INDEX IX_viewing_videos_viewing   ON viewing_videos (viewing_request_id);
    CREATE INDEX IX_viewing_videos_uploader  ON viewing_videos (uploaded_by);
    CREATE INDEX IX_viewing_videos_status    ON viewing_videos (status);
END
GO

-- ── video_access_links ───────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'video_access_links')
BEGIN
    CREATE TABLE video_access_links (
        id                       BIGINT          IDENTITY(1,1) NOT NULL,
        video_id                 BIGINT          NOT NULL,
        recipient_id             BIGINT          NOT NULL,
        recipient_email          NVARCHAR(255)   NOT NULL,
        token_hash               NVARCHAR(128)   NOT NULL,
        created_at               DATETIME2       NOT NULL
            CONSTRAINT DF_video_links_created DEFAULT GETDATE(),
        expires_at               DATETIME2       NOT NULL,
        revoked                  BIT             NOT NULL
            CONSTRAINT DF_video_links_revoked DEFAULT 0,
        view_count               INT             NOT NULL
            CONSTRAINT DF_video_links_view_count DEFAULT 0,
        first_viewed_at          DATETIME2       NULL,
        last_viewed_at           DATETIME2       NULL,
        total_watch_time_seconds BIGINT          NOT NULL
            CONSTRAINT DF_video_links_watch_time DEFAULT 0,

        CONSTRAINT PK_video_access_links PRIMARY KEY (id),
        CONSTRAINT FK_video_links_video FOREIGN KEY (video_id)
            REFERENCES viewing_videos(id) ON DELETE CASCADE,
        CONSTRAINT FK_video_links_recipient FOREIGN KEY (recipient_id)
            REFERENCES users(id)
    );

    CREATE INDEX IX_video_links_video      ON video_access_links (video_id);
    CREATE INDEX IX_video_links_token_hash ON video_access_links (token_hash);
    CREATE INDEX IX_video_links_expires    ON video_access_links (expires_at);
    CREATE INDEX IX_video_links_recipient  ON video_access_links (recipient_id);
END
GO

-- ── video_access_logs ────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'video_access_logs')
BEGIN
    CREATE TABLE video_access_logs (
        id                      BIGINT          IDENTITY(1,1) NOT NULL,
        link_id                 BIGINT          NOT NULL,
        video_id                BIGINT          NOT NULL,
        ip_address_hash         NVARCHAR(128)   NULL,
        user_agent              NVARCHAR(500)   NULL,
        accessed_at             DATETIME2       NOT NULL
            CONSTRAINT DF_video_logs_accessed DEFAULT GETDATE(),
        watch_duration_seconds  BIGINT          NULL,

        CONSTRAINT PK_video_access_logs PRIMARY KEY (id),
        CONSTRAINT FK_video_logs_link FOREIGN KEY (link_id)
            REFERENCES video_access_links(id) ON DELETE CASCADE,
        CONSTRAINT FK_video_logs_video FOREIGN KEY (video_id)
            REFERENCES viewing_videos(id)
    );

    CREATE INDEX IX_video_logs_link  ON video_access_logs (link_id);
    CREATE INDEX IX_video_logs_video ON video_access_logs (video_id);
END
GO

-- ── Add video FK to viewing_requests ─────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'viewing_requests' AND COLUMN_NAME = 'video_id'
)
BEGIN
    ALTER TABLE viewing_requests ADD video_id BIGINT NULL;
    ALTER TABLE viewing_requests ADD CONSTRAINT FK_viewing_requests_video
        FOREIGN KEY (video_id) REFERENCES viewing_videos(id) ON DELETE SET NULL;
END
GO
