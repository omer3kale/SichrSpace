-- =============================================================================
-- V010__user_lockout_mssql.sql
-- SichrPlace — Account lockout columns on the users table
--
-- Purpose:   Adds failed_login_count and locked_until to support brute-force
--            protection.  After 5 failed logins within 10 minutes the account
--            is locked for 30 minutes.  On successful login both columns reset.
-- =============================================================================

SET ANSI_NULLS ON; GO
SET QUOTED_IDENTIFIER ON; GO
SET NOCOUNT ON; GO

-- Add failed_login_count if not present
IF COL_LENGTH('dbo.users', 'failed_login_count') IS NULL
BEGIN
    ALTER TABLE dbo.users
        ADD failed_login_count INT NOT NULL
            CONSTRAINT DF_users_failed_login_count DEFAULT 0;
    PRINT 'Added column: users.failed_login_count';
END
ELSE
    PRINT 'Column users.failed_login_count already exists — skipping.';
GO

-- Add locked_until if not present
IF COL_LENGTH('dbo.users', 'locked_until') IS NULL
BEGIN
    ALTER TABLE dbo.users ADD locked_until DATETIME2 NULL;
    PRINT 'Added column: users.locked_until';
END
ELSE
    PRINT 'Column users.locked_until already exists — skipping.';
GO

PRINT '═══════ V010 complete — user_lockout columns ═══════';
GO
