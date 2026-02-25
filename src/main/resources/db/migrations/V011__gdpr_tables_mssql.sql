-- =============================================================================
-- V011__gdpr_tables_mssql.sql
-- SichrPlace — GDPR compliance tables
--
-- Purpose:   Creates two tables to support EU GDPR requirements:
--              gdpr_export_jobs  — tracks user data export requests (Art. 15/20)
--              gdpr_consent_log  — immutable audit trail of consent decisions (Art. 7)
--
-- Notes:
--   - ip_hash stores SHA-256(IP); we never store the raw IP address.
--   - gdpr_export_jobs.status: QUEUED → PROCESSING → READY → EXPIRED | FAILED
--   - gdpr_consent_log is insert-only; consent changes result in new rows.
-- =============================================================================

SET ANSI_NULLS ON; GO
SET QUOTED_IDENTIFIER ON; GO
SET NOCOUNT ON; GO

-- ── gdpr_export_jobs ─────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'gdpr_export_jobs')
BEGIN
    CREATE TABLE gdpr_export_jobs (
        id               BIGINT          IDENTITY(1,1) NOT NULL,
        user_id          BIGINT          NOT NULL,
        status           VARCHAR(20)     NOT NULL
            CONSTRAINT DF_gdpr_export_jobs_status DEFAULT 'QUEUED',
        download_token   VARCHAR(100)    NULL,         -- set when READY
        expires_at       DATETIME2       NULL,         -- set when READY (e.g. 48h)
        completed_at     DATETIME2       NULL,
        requested_at     DATETIME2       NOT NULL
            CONSTRAINT DF_gdpr_export_jobs_requested_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_gdpr_export_jobs PRIMARY KEY (id),
        CONSTRAINT CK_gdpr_export_jobs_status
            CHECK (status IN ('QUEUED','PROCESSING','READY','EXPIRED','FAILED')),
        CONSTRAINT FK_gdpr_export_jobs_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE CASCADE ON UPDATE NO ACTION
    );

    CREATE INDEX IX_gdpr_export_jobs_user     ON gdpr_export_jobs (user_id);
    CREATE INDEX IX_gdpr_export_jobs_status   ON gdpr_export_jobs (status);

    PRINT 'Created table: gdpr_export_jobs';
END
ELSE
    PRINT 'Table gdpr_export_jobs already exists — skipping.';
GO

-- ── gdpr_consent_log ────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'gdpr_consent_log')
BEGIN
    CREATE TABLE gdpr_consent_log (
        id               BIGINT          IDENTITY(1,1) NOT NULL,
        user_id          BIGINT          NULL,         -- NULL for pre-login consent
        anon_session_id  VARCHAR(64)     NULL,         -- hashed session id for pre-login
        consent_type     VARCHAR(50)     NOT NULL,     -- COOKIES_ANALYTICS, MARKETING, DATA_SHARING
        granted          BIT             NOT NULL,
        ip_hash          VARCHAR(64)     NULL,         -- SHA-256(raw_ip)
        user_agent_hash  VARCHAR(64)     NULL,         -- SHA-256(user_agent)
        recorded_at      DATETIME2       NOT NULL
            CONSTRAINT DF_gdpr_consent_log_recorded_at DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_gdpr_consent_log PRIMARY KEY (id),
        CONSTRAINT FK_gdpr_consent_log_user
            FOREIGN KEY (user_id) REFERENCES users(id)
            ON DELETE NO ACTION ON UPDATE NO ACTION
    );

    CREATE INDEX IX_gdpr_consent_log_user   ON gdpr_consent_log (user_id);
    CREATE INDEX IX_gdpr_consent_log_type   ON gdpr_consent_log (consent_type);
    CREATE INDEX IX_gdpr_consent_log_date   ON gdpr_consent_log (recorded_at);

    PRINT 'Created table: gdpr_consent_log';
END
ELSE
    PRINT 'Table gdpr_consent_log already exists — skipping.';
GO

PRINT '═══════ V011 complete — gdpr_export_jobs + gdpr_consent_log ═══════';
GO
