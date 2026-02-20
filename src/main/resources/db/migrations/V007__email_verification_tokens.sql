-- =============================================================================
-- V007__email_verification_tokens.sql
-- SichrPlace — Email verification token storage
--
-- Generated: February 2026
-- Depends:   V001 (users)
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'email_verification_tokens')
BEGIN
    CREATE TABLE email_verification_tokens (
        id              BIGINT          IDENTITY(1,1)   NOT NULL,
        user_id         BIGINT          NOT NULL,
        token_hash      NVARCHAR(64)    NOT NULL,
        expires_at      DATETIME2       NOT NULL,
        used_at         DATETIME2       NULL,
        created_at      DATETIME2       NOT NULL,

        CONSTRAINT pk_email_verification_tokens PRIMARY KEY (id),
        CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id)
    );

    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'idx_evt_token' AND object_id = OBJECT_ID('email_verification_tokens'))
        CREATE UNIQUE INDEX idx_evt_token ON email_verification_tokens (token_hash);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'idx_evt_user' AND object_id = OBJECT_ID('email_verification_tokens'))
        CREATE INDEX idx_evt_user ON email_verification_tokens (user_id);

    IF NOT EXISTS (SELECT 1 FROM sys.indexes
                   WHERE name = 'idx_evt_expires' AND object_id = OBJECT_ID('email_verification_tokens'))
        CREATE INDEX idx_evt_expires ON email_verification_tokens (expires_at);

    PRINT 'Created table: email_verification_tokens';
END
ELSE
    PRINT 'Table email_verification_tokens already exists — skipping.';
GO
