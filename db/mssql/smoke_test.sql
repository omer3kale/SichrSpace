:ON ERROR EXIT
SET NOCOUNT ON;

-- quick table snapshots
SELECT TOP (5) id, email, role, created_at
FROM dbo.users
ORDER BY created_at DESC;

SELECT TOP (5) id, landlord_id, title, city, status, created_at
FROM dbo.apartments
ORDER BY created_at DESC;

SELECT TOP (5) id, apartment_id, tenant_id, status, preferred_date, created_at
FROM dbo.viewing_requests
ORDER BY created_at DESC;

SELECT TOP (5) id, apartment_id, landlord_id, tenant_id, created_at
FROM dbo.conversations
ORDER BY created_at DESC;

SELECT TOP (5) id, conversation_id, sender_id, content, created_at
FROM dbo.messages
ORDER BY created_at DESC;

-- proc test: create viewing request with a known valid pair
DECLARE @apartment_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 a.id
    FROM dbo.apartments a
    WHERE a.status = N'available'
    ORDER BY a.created_at DESC
);

DECLARE @tenant_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 u.id
    FROM dbo.users u
    WHERE u.role = N'tenant'
    ORDER BY u.created_at DESC
);

IF @apartment_id IS NULL
    THROW 51001, 'Smoke test failed: no available apartment found.', 1;

IF @tenant_id IS NULL
    THROW 51002, 'Smoke test failed: no tenant user found.', 1;

DECLARE @preferred_date DATETIMEOFFSET = DATEADD(DAY, 3, SYSDATETIMEOFFSET());

EXEC dbo.sp_CreateViewingRequest
    @apartment_id = @apartment_id,
    @tenant_id = @tenant_id,
    @preferred_date = @preferred_date,
    @message = N'Smoke test viewing request';

-- proc test: get conversation + message stream for an authorized user
DECLARE @conversation_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 c.id
    FROM dbo.conversations c
    ORDER BY c.created_at DESC
);

DECLARE @authorized_user_id UNIQUEIDENTIFIER = (
    SELECT TOP 1 c.tenant_id
    FROM dbo.conversations c
    WHERE c.id = @conversation_id
);

IF @conversation_id IS NULL
    THROW 51003, 'Smoke test failed: no conversation found.', 1;

IF @authorized_user_id IS NULL
    THROW 51004, 'Smoke test failed: no authorized conversation user found.', 1;

EXEC dbo.sp_GetConversationWithMessages
    @conversation_id = @conversation_id,
    @user_id = @authorized_user_id;
