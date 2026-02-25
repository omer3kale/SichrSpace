-- =============================================================================
-- V008__sichrplace_mini_backend.sql
-- SichrPlace mini-backend relational slice for MSSQL playground
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
-- apartments
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.apartments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.apartments (
        id             UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_apartments PRIMARY KEY
            CONSTRAINT DF_apartments_id DEFAULT NEWID(),
        landlord_id    UNIQUEIDENTIFIER NOT NULL,
        title          NVARCHAR(200)    NOT NULL,
        description    NVARCHAR(MAX)    NULL,
        city           NVARCHAR(100)    NOT NULL,
        address        NVARCHAR(300)    NULL,
        rent_amount    DECIMAL(12,2)    NOT NULL,
        rooms          INT              NOT NULL,
        size_sqm       DECIMAL(10,2)    NULL,
        status         NVARCHAR(20)     NOT NULL
            CONSTRAINT DF_apartments_status DEFAULT N'available',
        created_at     DATETIMEOFFSET   NOT NULL
            CONSTRAINT DF_apartments_created_at DEFAULT SYSDATETIMEOFFSET(),
        updated_at     DATETIMEOFFSET   NOT NULL
            CONSTRAINT DF_apartments_updated_at DEFAULT SYSDATETIMEOFFSET(),

        CONSTRAINT CK_apartments_status CHECK (status IN (N'available', N'rented', N'pending', N'maintenance'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_apartments_landlord')
BEGIN
    ALTER TABLE dbo.apartments WITH CHECK
        ADD CONSTRAINT FK_apartments_landlord
        FOREIGN KEY (landlord_id) REFERENCES dbo.users(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.apartments') AND name = 'IX_apartments_landlord_status_city')
    CREATE INDEX IX_apartments_landlord_status_city ON dbo.apartments(landlord_id, status, city);
GO

IF NOT EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_apartments_update_timestamp')
EXEC('CREATE TRIGGER dbo.trg_apartments_update_timestamp ON dbo.apartments AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE a SET updated_at = SYSDATETIMEOFFSET() FROM dbo.apartments a INNER JOIN inserted i ON a.id=i.id; END');
GO

-- -----------------------------------------------------------------------------
-- viewing_requests (upgrade existing template table)
-- -----------------------------------------------------------------------------
IF COL_LENGTH('dbo.viewing_requests', 'preferred_date') IS NULL
    ALTER TABLE dbo.viewing_requests ADD preferred_date DATETIMEOFFSET NULL;
GO

IF COL_LENGTH('dbo.viewing_requests', 'message') IS NULL
    ALTER TABLE dbo.viewing_requests ADD message NVARCHAR(1000) NULL;
GO

IF COL_LENGTH('dbo.viewing_requests', 'apartment_id') IS NULL
    ALTER TABLE dbo.viewing_requests ADD apartment_id UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH('dbo.viewing_requests', 'tenant_id') IS NULL
    ALTER TABLE dbo.viewing_requests ADD tenant_id UNIQUEIDENTIFIER NULL;
GO

UPDATE dbo.viewing_requests
SET status = LOWER(ISNULL(status, N'pending'));
GO

UPDATE dbo.viewing_requests
SET status = N'pending'
WHERE status NOT IN (N'pending', N'confirmed', N'completed', N'cancelled', N'rejected');
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_viewing_requests_status')
    ALTER TABLE dbo.viewing_requests DROP CONSTRAINT CK_viewing_requests_status;
GO

ALTER TABLE dbo.viewing_requests
    ADD CONSTRAINT CK_viewing_requests_status
    CHECK (status IN (N'pending', N'confirmed', N'completed', N'cancelled', N'rejected'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_viewing_requests_apartment')
BEGIN
    ALTER TABLE dbo.viewing_requests WITH CHECK
        ADD CONSTRAINT FK_viewing_requests_apartment
        FOREIGN KEY (apartment_id) REFERENCES dbo.apartments(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_viewing_requests_tenant')
BEGIN
    ALTER TABLE dbo.viewing_requests WITH CHECK
        ADD CONSTRAINT FK_viewing_requests_tenant
        FOREIGN KEY (tenant_id) REFERENCES dbo.users(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.viewing_requests') AND name = 'IX_viewing_requests_apartment_tenant_status')
    CREATE INDEX IX_viewing_requests_apartment_tenant_status ON dbo.viewing_requests(apartment_id, tenant_id, status);
GO

IF NOT EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_viewing_requests_update_timestamp')
EXEC('CREATE TRIGGER dbo.trg_viewing_requests_update_timestamp ON dbo.viewing_requests AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE vr SET updated_at = SYSDATETIMEOFFSET() FROM dbo.viewing_requests vr INNER JOIN inserted i ON vr.id=i.id; END');
GO

-- -----------------------------------------------------------------------------
-- conversations
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.conversations', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.conversations (
        id            UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_conversations PRIMARY KEY
            CONSTRAINT DF_conversations_id DEFAULT NEWID(),
        apartment_id  UNIQUEIDENTIFIER NOT NULL,
        landlord_id   UNIQUEIDENTIFIER NOT NULL,
        tenant_id     UNIQUEIDENTIFIER NOT NULL,
        created_at    DATETIMEOFFSET   NOT NULL
            CONSTRAINT DF_conversations_created_at DEFAULT SYSDATETIMEOFFSET(),
        updated_at    DATETIMEOFFSET   NOT NULL
            CONSTRAINT DF_conversations_updated_at DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_conversations_apartment')
    ALTER TABLE dbo.conversations WITH CHECK ADD CONSTRAINT FK_conversations_apartment FOREIGN KEY (apartment_id) REFERENCES dbo.apartments(id) ON DELETE NO ACTION;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_conversations_landlord')
    ALTER TABLE dbo.conversations WITH CHECK ADD CONSTRAINT FK_conversations_landlord FOREIGN KEY (landlord_id) REFERENCES dbo.users(id) ON DELETE NO ACTION;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_conversations_tenant')
    ALTER TABLE dbo.conversations WITH CHECK ADD CONSTRAINT FK_conversations_tenant FOREIGN KEY (tenant_id) REFERENCES dbo.users(id) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.conversations') AND name = 'IX_conversations_landlord_tenant_apartment')
    CREATE INDEX IX_conversations_landlord_tenant_apartment ON dbo.conversations(landlord_id, tenant_id, apartment_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_conversations_update_timestamp')
EXEC('CREATE TRIGGER dbo.trg_conversations_update_timestamp ON dbo.conversations AFTER UPDATE AS BEGIN SET NOCOUNT ON; UPDATE c SET updated_at = SYSDATETIMEOFFSET() FROM dbo.conversations c INNER JOIN inserted i ON c.id=i.id; END');
GO

-- -----------------------------------------------------------------------------
-- messages
-- -----------------------------------------------------------------------------
IF OBJECT_ID('dbo.messages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.messages (
        id               UNIQUEIDENTIFIER NOT NULL
            CONSTRAINT PK_messages PRIMARY KEY
            CONSTRAINT DF_messages_id DEFAULT NEWID(),
        conversation_id  UNIQUEIDENTIFIER NOT NULL,
        sender_id        UNIQUEIDENTIFIER NOT NULL,
        content          NVARCHAR(MAX)    NOT NULL,
        created_at       DATETIMEOFFSET   NOT NULL
            CONSTRAINT DF_messages_created_at DEFAULT SYSDATETIMEOFFSET()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_messages_conversation')
    ALTER TABLE dbo.messages WITH CHECK ADD CONSTRAINT FK_messages_conversation FOREIGN KEY (conversation_id) REFERENCES dbo.conversations(id) ON DELETE NO ACTION;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_messages_sender')
    ALTER TABLE dbo.messages WITH CHECK ADD CONSTRAINT FK_messages_sender FOREIGN KEY (sender_id) REFERENCES dbo.users(id) ON DELETE NO ACTION;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.messages') AND name = 'IX_messages_conversation_created_at')
    CREATE INDEX IX_messages_conversation_created_at ON dbo.messages(conversation_id, created_at);
GO

-- -----------------------------------------------------------------------------
-- Stored procedures
-- -----------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.sp_CreateViewingRequest
    @apartment_id UNIQUEIDENTIFIER,
    @tenant_id UNIQUEIDENTIFIER,
    @preferred_date DATETIMEOFFSET,
    @message NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.apartments WHERE id = @apartment_id)
    BEGIN
        THROW 50011, 'Apartment not found', 1;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.apartments WHERE id = @apartment_id AND status = N'available')
    BEGIN
        THROW 50012, 'Apartment is not available', 1;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @tenant_id)
    BEGIN
        THROW 50013, 'Tenant user not found', 1;
    END

    DECLARE @new_id UNIQUEIDENTIFIER = NEWID();

    INSERT INTO dbo.viewing_requests (id, apartment_id, tenant_id, status, preferred_date, message, created_at, updated_at)
    VALUES (@new_id, @apartment_id, @tenant_id, N'pending', @preferred_date, @message, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());

    SELECT * FROM dbo.viewing_requests WHERE id = @new_id;
END;
GO

CREATE OR ALTER PROCEDURE dbo.sp_GetConversationWithMessages
    @conversation_id UNIQUEIDENTIFIER,
    @user_id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.conversations c
        WHERE c.id = @conversation_id
          AND (@user_id = c.landlord_id OR @user_id = c.tenant_id)
    )
    BEGIN
        THROW 50021, 'Not authorized for this conversation', 1;
    END

    SELECT
        c.id,
        c.apartment_id,
        c.landlord_id,
        c.tenant_id,
        c.created_at,
        c.updated_at,
        a.title AS apartment_title,
        a.city AS apartment_city
    FROM dbo.conversations c
    INNER JOIN dbo.apartments a ON a.id = c.apartment_id
    WHERE c.id = @conversation_id;

    SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        u.role AS sender_role,
        m.content,
        m.created_at
    FROM dbo.messages m
    INNER JOIN dbo.users u ON u.id = m.sender_id
    WHERE m.conversation_id = @conversation_id
    ORDER BY m.created_at ASC;
END;
GO

-- -----------------------------------------------------------------------------
-- Analytics performance view (reusable read model)
-- -----------------------------------------------------------------------------
CREATE OR ALTER VIEW dbo.ApartmentPerformanceSummary
AS
WITH analytics_30d AS (
    SELECT
        aa.apartment_id,
        SUM(aa.total_views) AS total_views,
        SUM(aa.total_likes) AS total_likes,
        COUNT(*) AS active_days
    FROM dbo.apartment_analytics aa
    WHERE aa.[date] >= DATEADD(DAY, -30, CAST(SYSDATETIMEOFFSET() AS DATE))
    GROUP BY aa.apartment_id
), request_30d AS (
    SELECT
        vr.apartment_id,
        COUNT(*) AS viewing_requests
    FROM dbo.viewing_requests vr
    WHERE vr.created_at >= DATEADD(DAY, -30, SYSDATETIMEOFFSET())
    GROUP BY vr.apartment_id
)
SELECT
    a.apartment_id,
    a.total_views,
    a.total_likes,
    ISNULL(r.viewing_requests, 0) AS viewing_requests,
    CAST(ISNULL(r.viewing_requests, 0) * 1.0 / NULLIF(a.total_views, 0) AS DECIMAL(18,6)) AS conversion_rate,
    CAST(a.total_views * 1.0 / NULLIF(a.active_days, 0) AS DECIMAL(18,6)) AS average_daily_views
FROM analytics_30d a
LEFT JOIN request_30d r ON r.apartment_id = a.apartment_id;
GO
