-- ============================================================
-- SichrPlace — Droplet MSSQL 2025 Initialization Script
-- ============================================================
-- Run ONCE after the container starts for the first time:
--
--   docker exec -it sichrplace-mssql /opt/mssql-tools18/bin/sqlcmd \
--     -S localhost -U SA -P "$SA_PASSWORD" -C -i /opt/sichrplace/init.sql
--
-- This creates the database and a restricted application user.
-- Hibernate (ddl-auto=update) creates all tables from JPA entities.
-- ============================================================

USE [master];
GO

-- 1. Create the application database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'sichrplace')
BEGIN
    CREATE DATABASE sichrplace;
    PRINT '✓ Database [sichrplace] created.';
END
ELSE
    PRINT '→ Database [sichrplace] already exists — skipped.';
GO

-- 2. Create the application login
--    Password is passed via environment; change it after first run.
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'sichrplace_user')
BEGIN
    CREATE LOGIN sichrplace_user WITH PASSWORD = 'CHANGE_ME_VIA_ENV!1';
    PRINT '✓ Login [sichrplace_user] created.';
    PRINT '  ⚠ Run: ALTER LOGIN sichrplace_user WITH PASSWORD = ''<real password>'';';
END
ELSE
    PRINT '→ Login [sichrplace_user] already exists — skipped.';
GO

-- 3. Map login to database user
USE [sichrplace];
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'sichrplace_user')
BEGIN
    CREATE USER sichrplace_user FOR LOGIN sichrplace_user;
    PRINT '✓ User [sichrplace_user] mapped to [sichrplace].';
END
GO

-- 4. Grant roles
--    db_owner for beta (simplest). In production, use tighter roles:
--      db_datareader + db_datawriter + db_ddladmin (for Hibernate DDL).
ALTER ROLE db_owner ADD MEMBER sichrplace_user;
GO

-- 5. Verify
SELECT
    dp.name       AS [User],
    dp.type_desc  AS [Type],
    r.name        AS [Role]
FROM sys.database_principals dp
JOIN sys.database_role_members rm ON dp.principal_id = rm.member_principal_id
JOIN sys.database_principals r   ON rm.role_principal_id = r.principal_id
WHERE dp.name = 'sichrplace_user';
GO

PRINT '=== SichrPlace droplet MSSQL initialization complete ===';
GO
