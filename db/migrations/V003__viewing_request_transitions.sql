-- =============================================================================
-- V003__viewing_request_transitions.sql
-- SichrPlace — Append-only audit log for viewing-request state changes
--
-- Purpose:   Records every status transition on a viewing request:
--            who changed it, when, from which status, to which status,
--            and optionally why.
--
-- Generated: February 2026
-- Depends:   V001 (viewing_requests, users)
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES
               WHERE TABLE_NAME = 'viewing_request_transitions')
BEGIN
    CREATE TABLE viewing_request_transitions (
        id                  BIGINT          IDENTITY(1,1)   NOT NULL,
        viewing_request_id  BIGINT          NOT NULL,
        from_status         VARCHAR(20)     NULL,
        to_status           VARCHAR(20)     NOT NULL,
        changed_by          BIGINT          NOT NULL,
        changed_at          DATETIME2       NOT NULL,
        reason              VARCHAR(500)    NULL,

        CONSTRAINT pk_vr_transitions PRIMARY KEY (id),
        CONSTRAINT fk_vrt_request FOREIGN KEY (viewing_request_id)
            REFERENCES viewing_requests(id),
        CONSTRAINT fk_vrt_user FOREIGN KEY (changed_by)
            REFERENCES users(id)
    );

    CREATE INDEX idx_vrt_request    ON viewing_request_transitions (viewing_request_id);
    CREATE INDEX idx_vrt_changed_at ON viewing_request_transitions (changed_at);

    PRINT 'Created table: viewing_request_transitions';
END
ELSE
    PRINT 'Table viewing_request_transitions already exists — skipping.';
GO
