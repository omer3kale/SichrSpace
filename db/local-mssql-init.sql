-- ============================================================
-- SichrPlace — MSSQL 2025 Local Dev Initialization Script
-- ============================================================
-- This script runs once when the MSSQL container is created.
-- It creates the database, a dev login/user, and grants access.
--
-- Hibernate (ddl-auto=update) will create all tables via JPA
-- entities, so we do NOT define tables here.
-- ============================================================

USE [master];
GO

-- 1. Create the application database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'sichrplace')
BEGIN
    CREATE DATABASE sichrplace;
    PRINT 'Database [sichrplace] created.';
END
GO

-- 2. Create a restricted dev login (matches application-local-mssql.yml)
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'sichrplace_user')
BEGIN
    CREATE LOGIN sichrplace_user WITH PASSWORD = 'SichrDev2025!';
    PRINT 'Login [sichrplace_user] created.';
END
GO

-- 3. Map login to database user
USE [sichrplace];
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'sichrplace_user')
BEGIN
    CREATE USER sichrplace_user FOR LOGIN sichrplace_user;
    PRINT 'User [sichrplace_user] mapped.';
END
GO

-- 4. Grant DDL + DML privileges (dev only — NEVER in production)
--    Students: In production you would use a more restrictive role.
ALTER ROLE db_datareader ADD MEMBER sichrplace_user;
ALTER ROLE db_datawriter ADD MEMBER sichrplace_user;
ALTER ROLE db_ddladmin   ADD MEMBER sichrplace_user;
GO

PRINT '=== SichrPlace MSSQL initialization complete ===';
GO
