-- =============================================================================
-- MSSQL_SICHRPLACE_TEMPLATE.sql
-- SichrPlace on Microsoft SQL Server (auth + analytics core)
--
-- Purpose:
--   - Supabase-independent SQL Server baseline for auth + analytics.
--   - Uses T-SQL, UNIQUEIDENTIFIER, DATETIMEOFFSET, trigger/procedure patterns.
--   - Designed as an idempotent template for new migration streams.
-- =============================================================================

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
SET ANSI_PADDING ON;
GO
SET ANSI_WARNINGS ON;
GO
SET ARITHABORT ON;
GO
SET CONCAT_NULL_YIELDS_NULL ON;
GO
SET NUMERIC_ROUNDABORT OFF;
GO
SET NOCOUNT ON;
GO

-- -----------------------------------------------------------------------------
-- 1) users (enhanced auth)
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id                            UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_users PRIMARY KEY
            CONSTRAINT DF_users_id DEFAULT NEWID(),

        email                         NVARCHAR(255) NOT NULL,
        password_hash                 NVARCHAR(255) NOT NULL,
        role                          NVARCHAR(20)  NOT NULL,

        first_name                    NVARCHAR(100) NULL,
        last_name                     NVARCHAR(100) NULL,
        phone                         NVARCHAR(50)  NULL,
        profile_picture_url           NVARCHAR(500) NULL,

        email_verified                BIT NOT NULL
            CONSTRAINT DF_users_email_verified DEFAULT (0),
        email_verification_expires    DATETIMEOFFSET NULL,

        failed_login_attempts         INT NOT NULL
            CONSTRAINT DF_users_failed_login_attempts DEFAULT (0),
        locked_until                  DATETIMEOFFSET NULL,
        password_changed_at           DATETIMEOFFSET NOT NULL
            CONSTRAINT DF_users_password_changed_at DEFAULT SYSDATETIMEOFFSET(),

        created_at                    DATETIMEOFFSET NOT NULL
            CONSTRAINT DF_users_created_at DEFAULT SYSDATETIMEOFFSET(),
        updated_at                    DATETIMEOFFSET NOT NULL
            CONSTRAINT DF_users_updated_at DEFAULT SYSDATETIMEOFFSET(),

        username                      NVARCHAR(100) NULL,

        CONSTRAINT UQ_users_email UNIQUE (email),
        CONSTRAINT CK_users_role CHECK (role IN ('tenant','landlord','admin','user'))
    );

    PRINT 'Created table: dbo.users';
END
ELSE
BEGIN
    PRINT 'Table dbo.users already exists — skipping create.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_email' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX IX_users_email ON dbo.users(email);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_role' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX IX_users_role ON dbo.users(role);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_email_verified' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX IX_users_email_verified ON dbo.users(email_verified);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_users_created_at' AND object_id = OBJECT_ID('dbo.users'))
    CREATE INDEX IX_users_created_at ON dbo.users(created_at);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_users_username_not_null' AND object_id = OBJECT_ID('dbo.users'))
    CREATE UNIQUE INDEX UX_users_username_not_null ON dbo.users(username)
    WHERE username IS NOT NULL;
GO

-- -----------------------------------------------------------------------------
-- 2) Trigger: update users.updated_at on UPDATE
-- -----------------------------------------------------------------------------
CREATE OR ALTER TRIGGER dbo.trg_users_update_timestamp
ON dbo.users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE u
    SET updated_at = SYSDATETIMEOFFSET()
    FROM dbo.users AS u
    INNER JOIN inserted AS i ON u.id = i.id;
END;
GO

-- -----------------------------------------------------------------------------
-- 3) Username generation function (email local-part -> sanitized unique username)
-- -----------------------------------------------------------------------------
CREATE OR ALTER FUNCTION dbo.generate_username_from_email
(
    @email NVARCHAR(255)
)
RETURNS NVARCHAR(100)
AS
BEGIN
    DECLARE @atPos INT = CHARINDEX('@', ISNULL(@email, ''));
    DECLARE @local NVARCHAR(255);

    IF @atPos > 1
        SET @local = LOWER(LEFT(@email, @atPos - 1));
    ELSE
        SET @local = LOWER(ISNULL(@email, ''));

    DECLARE @base NVARCHAR(100) = LEFT(@local, 100);

    -- Strip non [a-z0-9] with PATINDEX + STUFF loop
    DECLARE @idx INT = PATINDEX('%[^a-z0-9]%', @base);
    WHILE @idx > 0
    BEGIN
        SET @base = STUFF(@base, @idx, 1, '');
        SET @idx = PATINDEX('%[^a-z0-9]%', @base);
    END

    IF LEN(ISNULL(@base, '')) < 3
    BEGIN
        DECLARE @seed INT = ABS(CHECKSUM(ISNULL(@email, N'user')));
        SET @base = CONCAT('user', RIGHT(CONCAT('000000', CONVERT(NVARCHAR(12), @seed)), 6));
    END

    IF LEN(@base) > 90
        SET @base = LEFT(@base, 90);

    DECLARE @candidate NVARCHAR(100) = @base;
    DECLARE @counter INT = 0;
    DECLARE @suffix NVARCHAR(10);

    WHILE EXISTS (SELECT 1 FROM dbo.users WHERE username = @candidate)
    BEGIN
        SET @counter += 1;
        SET @suffix = CONVERT(NVARCHAR(10), @counter);
        SET @candidate = LEFT(@base, 100 - LEN(@suffix)) + @suffix;
    END

    RETURN @candidate;
END;
GO

-- Bulk username backfill helper (run as needed)
-- UPDATE dbo.users
-- SET username = dbo.generate_username_from_email(email)
-- WHERE username IS NULL OR LTRIM(RTRIM(username)) = N'';
-- GO

-- -----------------------------------------------------------------------------
-- 4) Analytics tables
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.apartment_analytics', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.apartment_analytics (
        apartment_id     UNIQUEIDENTIFIER NOT NULL,
        [date]           DATE             NOT NULL,
        total_views      INT              NOT NULL CONSTRAINT DF_apartment_analytics_total_views DEFAULT (0),
        total_likes      INT              NOT NULL CONSTRAINT DF_apartment_analytics_total_likes DEFAULT (0),
        viewing_requests INT              NOT NULL CONSTRAINT DF_apartment_analytics_viewing_requests DEFAULT (0),
        created_at       DATETIMEOFFSET   NOT NULL CONSTRAINT DF_apartment_analytics_created_at DEFAULT SYSDATETIMEOFFSET(),
        updated_at       DATETIMEOFFSET   NOT NULL CONSTRAINT DF_apartment_analytics_updated_at DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT PK_apartment_analytics PRIMARY KEY (apartment_id, [date])
    );

    PRINT 'Created table: dbo.apartment_analytics';
END
ELSE
BEGIN
    PRINT 'Table dbo.apartment_analytics already exists — skipping create.';
END
GO

IF OBJECT_ID('dbo.analytics_summary', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.analytics_summary (
        [date]         DATE           NOT NULL,
        event_type     NVARCHAR(50)   NOT NULL,
        [count]        BIGINT         NOT NULL CONSTRAINT DF_analytics_summary_count DEFAULT (0),
        created_at     DATETIMEOFFSET NOT NULL CONSTRAINT DF_analytics_summary_created_at DEFAULT SYSDATETIMEOFFSET(),
        updated_at     DATETIMEOFFSET NOT NULL CONSTRAINT DF_analytics_summary_updated_at DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT PK_analytics_summary PRIMARY KEY ([date], event_type)
    );

    PRINT 'Created table: dbo.analytics_summary';
END
ELSE
BEGIN
    PRINT 'Table dbo.analytics_summary already exists — skipping create.';
END
GO

IF OBJECT_ID('dbo.viewing_requests', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.viewing_requests (
        id             UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_viewing_requests PRIMARY KEY
            CONSTRAINT DF_viewing_requests_id DEFAULT NEWID(),
        apartment_id   UNIQUEIDENTIFIER NOT NULL,
        tenant_id      UNIQUEIDENTIFIER NULL,
        status         NVARCHAR(30)     NOT NULL CONSTRAINT DF_viewing_requests_status DEFAULT N'PENDING',
        created_at     DATETIMEOFFSET   NOT NULL CONSTRAINT DF_viewing_requests_created_at DEFAULT SYSDATETIMEOFFSET(),
        updated_at     DATETIMEOFFSET   NOT NULL CONSTRAINT DF_viewing_requests_updated_at DEFAULT SYSDATETIMEOFFSET()
    );

    CREATE INDEX IX_viewing_requests_apartment_created ON dbo.viewing_requests(apartment_id, created_at);
    CREATE INDEX IX_viewing_requests_status_created ON dbo.viewing_requests(status, created_at);

    PRINT 'Created table: dbo.viewing_requests';
END
ELSE
BEGIN
    PRINT 'Table dbo.viewing_requests already exists — skipping create.';
END
GO

IF OBJECT_ID('dbo.analytics_events', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.analytics_events (
        id             UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_analytics_events PRIMARY KEY
            CONSTRAINT DF_analytics_events_id DEFAULT NEWID(),
        event_type     NVARCHAR(50)     NOT NULL,
        apartment_id   UNIQUEIDENTIFIER NULL,
        user_id        UNIQUEIDENTIFIER NULL,
        metadata_json  NVARCHAR(MAX)    NULL,
        occurred_at    DATETIMEOFFSET   NOT NULL CONSTRAINT DF_analytics_events_occurred_at DEFAULT SYSDATETIMEOFFSET(),
        created_at     DATETIMEOFFSET   NOT NULL CONSTRAINT DF_analytics_events_created_at DEFAULT SYSDATETIMEOFFSET()
    );

    CREATE INDEX IX_analytics_events_type_time ON dbo.analytics_events(event_type, occurred_at);
    CREATE INDEX IX_analytics_events_apartment_time ON dbo.analytics_events(apartment_id, occurred_at);

    PRINT 'Created table: dbo.analytics_events';
END
ELSE
BEGIN
    PRINT 'Table dbo.analytics_events already exists — skipping create.';
END
GO

-- -----------------------------------------------------------------------------
-- 5) Stored procedure: increment apartment views
-- -----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.increment_apartment_views
    @apartment_id UNIQUEIDENTIFIER,
    @date DATE
AS
BEGIN
    SET NOCOUNT ON;

    MERGE dbo.apartment_analytics WITH (HOLDLOCK) AS target
    USING (SELECT @apartment_id AS apartment_id, @date AS [date]) AS src
        ON target.apartment_id = src.apartment_id
       AND target.[date] = src.[date]
    WHEN MATCHED THEN
        UPDATE
            SET total_views = target.total_views + 1,
                updated_at = SYSDATETIMEOFFSET()
    WHEN NOT MATCHED THEN
        INSERT (apartment_id, [date], total_views, total_likes, viewing_requests, created_at, updated_at)
        VALUES (src.apartment_id, src.[date], 1, 0, 0, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END;
GO

-- -----------------------------------------------------------------------------
-- 6) Verification block (safe to run in playground)
-- -----------------------------------------------------------------------------
/*
-- A) Trigger verification (updated_at changes on UPDATE)
DECLARE @uid UNIQUEIDENTIFIER = NEWID();
INSERT INTO dbo.users (id, email, password_hash, role, first_name)
VALUES (@uid, N'trigger-demo@sichrplace.local', N'hash-demo', N'user', N'Before');

SELECT id, first_name, created_at, updated_at
FROM dbo.users WHERE id = @uid;

WAITFOR DELAY '00:00:01';
UPDATE dbo.users SET first_name = N'After' WHERE id = @uid;

SELECT id, first_name, created_at, updated_at
FROM dbo.users WHERE id = @uid;

-- B) Username generation usage
UPDATE dbo.users
SET username = dbo.generate_username_from_email(email)
WHERE username IS NULL OR LTRIM(RTRIM(username)) = N'';

SELECT TOP 20 id, email, username FROM dbo.users ORDER BY created_at DESC;

-- C) Procedure verification
DECLARE @apt UNIQUEIDENTIFIER = NEWID();
EXEC dbo.increment_apartment_views @apartment_id = @apt, @date = CAST(SYSDATETIMEOFFSET() AS DATE);
EXEC dbo.increment_apartment_views @apartment_id = @apt, @date = CAST(SYSDATETIMEOFFSET() AS DATE);
EXEC dbo.increment_apartment_views @apartment_id = @apt, @date = CAST(SYSDATETIMEOFFSET() AS DATE);

SELECT *
FROM dbo.apartment_analytics
WHERE apartment_id = @apt
  AND [date] = CAST(SYSDATETIMEOFFSET() AS DATE);
*/
GO

-- =============================================================================
-- App-level enforcement note (no Supabase RLS)
--
-- Authorization/tenant boundaries are enforced in backend services using JWT
-- claims (userId, role), e.g.:
--   - users: self-only read/update, admin override
--   - apartments: landlord-owned records + admin override
--   - conversations/messages: participant-only visibility + sender constraints
-- =============================================================================
