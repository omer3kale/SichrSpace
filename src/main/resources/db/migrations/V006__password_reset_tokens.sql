-- =============================================================================
-- V006__password_reset_tokens.sql
-- SichrPlace — Password reset token storage
--
-- Purpose:   Stores SHA-256 hashed password-reset tokens.  Each token is
--            single-use and time-limited (1 hour).  The plain-text token
--            is only ever shown to the user once (in the API response or
--            email body) — only the hash is stored in the database.
--
-- Generated: February 2026
-- Depends:   V001 (users)
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'password_reset_tokens')
BEGIN
    CREATE TABLE password_reset_tokens (
        id              BIGINT          IDENTITY(1,1)   NOT NULL,
        user_id         BIGINT          NOT NULL,
        token_hash      NVARCHAR(64)    NOT NULL,
        expires_at      DATETIME2       NOT NULL,
        used_at         DATETIME2       NULL,
        created_at      DATETIME2       NOT NULL,

        CONSTRAINT pk_password_reset_tokens PRIMARY KEY (id),
        CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Unique index on token_hash  (lookup by hash is the primary query path)
    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'idx_prt_token' AND object_id = OBJECT_ID('password_reset_tokens'))
        CREATE UNIQUE INDEX idx_prt_token ON password_reset_tokens (token_hash);

    -- Index on user_id  (invalidate-all-for-user query)
    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'idx_prt_user' AND object_id = OBJECT_ID('password_reset_tokens'))
        CREATE INDEX idx_prt_user ON password_reset_tokens (user_id);

    -- Index on expires_at  (optional: future cleanup job)
    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'idx_prt_expires' AND object_id = OBJECT_ID('password_reset_tokens'))
        CREATE INDEX idx_prt_expires ON password_reset_tokens (expires_at);

    PRINT 'Created table: password_reset_tokens';
END
ELSE
    PRINT 'Table password_reset_tokens already exists — skipping.';
GO
