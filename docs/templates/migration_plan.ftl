<#-- ============================================================
     SichrPlace — Migration Plan Template
     Usage:  For any feature that requires new tables or column
             changes.  Render to produce a migration description
             doc that accompanies the actual .sql file.
     Output: docs/generated/migrations/${migrationId}_plan.md
     ============================================================ -->
# Migration Plan — ${migrationId}

> **Feature:** ${featureName}
> **Phase:** ${phase}
> **Author:** ${author}
> **Date:** ${date}

---

## 1. Changes Summary

${changesSummary}

---

## 2. Tables Touched

| Table | Action | Details |
|-------|--------|---------|
<#list tablesTouched as t>
| `${t.name}` | ${t.action} | ${t.details} |
</#list>

---

## 3. DDL Changes

```sql
${ddlSketch}
```

**File:** `db/migrations/${migrationId}.sql`
**Mirror:** `src/main/resources/db/migrations/${migrationId}.sql`

---

## 4. Data Migration / Backfilling

<#if backfillSteps?has_content>
<#list backfillSteps as step>
${step?counter}. ${step}
</#list>
<#else>
_No data backfilling required — new table with no pre-existing data._
</#if>

---

## 5. Rollback Plan

<#if rollbackSteps?has_content>
<#list rollbackSteps as step>
${step?counter}. ${step}
</#list>
<#else>
```sql
-- Rollback: drop newly created objects
<#list tablesTouched as t>
<#if t.action == "CREATE">
IF OBJECT_ID('dbo.${t.name}', 'U') IS NOT NULL DROP TABLE dbo.${t.name};
</#if>
<#if t.action == "ALTER">
-- Reverse ALTER for ${t.name}: ${t.details}
</#if>
</#list>
```
</#if>

---

## 6. Verification Steps

After running the migration, verify:

<#list verificationSteps as vs>
${vs?counter}. ${vs}
</#list>

---

## 7. Seed Data (if applicable)

<#if seedSql?has_content>
```sql
${seedSql}
```
<#else>
_Seed data will be handled by DataSeeder.java at application startup._
</#if>

---

## 8. Dependencies

<#if migrationDependencies?has_content>
<#list migrationDependencies as dep>
- Requires `${dep}` to have run first.
</#list>
<#else>
- Depends on all prior migrations (V001–V005).
</#if>
