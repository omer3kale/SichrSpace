-- =============================================================================
-- V009__refresh_tokens_mssql.sql
-- SichrPlace — Refresh token persistence for rotation + revocation
--
-- Purpose:   Stores opaque refresh tokens (SHA-256 hashed) so they can be
--            revoked individually or family-wide (logout-all).
--            Enables short-lived access tokens (15 min) + long-lived
--            refresh tokens (14 days) with single-use rotation.
--
-- Auth note: The token_hash column stores SHA-256(rawToken).
--            The raw token is never persisted.
-- =============================================================================

SET ANSI_NULLS ON; GO
SET QUOTED_IDENTIFIER ON; GO
SET NOCOUNT ON; GO

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'refresh_tokens')
BEGIN
    CREATE TABLE refresh_tokens (
        id           BIGINT          IDENTITY(1,1) NOT NULL,
        user_id      BIGINT          NOT NULL,
        token_hash   VARCHAR(64)     NOT NULL,         -- SHA-256 hex (32 bytes → 64 hex chars)
        expires_at   DATETIME2       NOT NULL,
        revoked_at   DATETIME2       NULL,
        device_info  NVARCHAR(500)   NULL,             -- optional: User-Agent snippet
        created_at   DATETIME2       NOT NULL
            CONSTRAINT DF_refresh_tokens_created_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_refresh_tokens PRIMARY KEY (id),
        CONSTRAINT UQ_refresh_token_hash UNIQUE (token_hash),
        CONSTRAINT FK_refresh_tokens_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE ON UPDATE NO ACTION
    );

    CREATE INDEX IX_refresh_tokens_user_id   ON refresh_tokens (user_id);
    CREATE INDEX IX_refresh_tokens_expires   ON refresh_tokens (expires_at);

    PRINT 'Created table: refresh_tokens';
END
ELSE
    PRINT 'Table refresh_tokens already exists — skipping.';
GO

PRINT '═══════ V009 complete — refresh_tokens ═══════';
GO
