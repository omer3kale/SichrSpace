-- ============================================================
-- SichrPlace — MSSQL 2022 Local Dev Initialization Script
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

-- 2. Create a dev login (matches application-local-mssql.yml)
IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = 'sichrplace_dev')
BEGIN
    CREATE LOGIN sichrplace_dev WITH PASSWORD = 'SichrDev2025!';
    PRINT 'Login [sichrplace_dev] created.';
END
GO

-- 3. Map login to database user
USE [sichrplace];
GO

IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = 'sichrplace_dev')
BEGIN
    CREATE USER sichrplace_dev FOR LOGIN sichrplace_dev;
    PRINT 'User [sichrplace_dev] mapped.';
END
GO

-- 4. Grant full DDL + DML privileges (dev only — NEVER in production)
ALTER ROLE db_owner ADD MEMBER sichrplace_dev;
GO

PRINT '=== SichrPlace MSSQL initialization complete ===';
GO
