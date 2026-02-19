-- =============================================================================
-- V004__saved_searches.sql
-- SichrPlace — User-saved apartment search filters
--
-- Purpose:   Stores a user's saved filter combination (city, price range,
--            bedrooms, etc.) as a JSON string. Enables "alert me when a
--            new apartment matches my criteria."
--
-- Generated: February 2026
-- Depends:   V001 (users)
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'saved_searches')
BEGIN
    CREATE TABLE saved_searches (
        id              BIGINT          IDENTITY(1,1)   NOT NULL,
        user_id         BIGINT          NOT NULL,
        name            VARCHAR(255)    NOT NULL,
        filter_json     VARCHAR(MAX)    NOT NULL,
        is_active       BIT             NOT NULL        DEFAULT 1,
        last_matched_at DATETIME2       NULL,
        match_count     INT             NOT NULL        DEFAULT 0,
        created_at      DATETIME2       NULL,
        updated_at      DATETIME2       NULL,

        CONSTRAINT pk_saved_searches PRIMARY KEY (id),
        CONSTRAINT fk_ss_user FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT uq_ss_user_name UNIQUE (user_id, name)
    );

    CREATE INDEX idx_ss_user   ON saved_searches (user_id);
    CREATE INDEX idx_ss_active ON saved_searches (is_active);

    PRINT 'Created table: saved_searches';
END
ELSE
    PRINT 'Table saved_searches already exists — skipping.';
GO
