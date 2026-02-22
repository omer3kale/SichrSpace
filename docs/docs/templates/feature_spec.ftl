<#-- ============================================================
     SichrPlace — Feature Specification Template (FreeMarker)
     Usage:  Populate a YAML/JSON descriptor with the variables
             below and render this template to produce a
             Markdown feature-spec document.
     Output: docs/generated/features/${featureId}.md
     ============================================================ -->
# Feature Spec — ${featureName}

> **Feature ID:** `${featureId}`
> **Phase:** ${phase}
> **Priority:** ${priority}
> **Estimated effort:** ${effort}
> **Author:** ${author}
> **Date:** ${date}

---

## 1. Legacy Behavior (Node.js / Express)

### Route files
<#list legacyRouteFiles as f>
- `${f}`
</#list>

### Service files
<#list legacyServiceFiles as f>
- `${f}`
</#list>

### Endpoint summary (old backend)

| Method | Path | Description | Status |
|--------|------|-------------|--------|
<#list legacyEndpoints as ep>
| ${ep.method} | `${ep.path}` | ${ep.description} | ${ep.status} |
</#list>

### How it worked
${legacyDescription}

---

## 2. New Spring Boot Behavior

### Controllers
<#list springControllers as c>
- `${c}`
</#list>

### Services
<#list springServices as s>
- `${s}`
</#list>

### Entities / Models
<#list springEntities as e>
- `${e}`
</#list>

### Database tables
<#list dbTables as t>
- `${t}`
</#list>

---

## 3. API Surface (Spring Boot Endpoints)

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
<#list endpoints as ep>
| ${ep?counter} | ${ep.method} | `${ep.path}` | ${ep.auth} | ${ep.description} |
</#list>

---

## 4. Persistence & Schema

### New tables

```sql
${ddlSketch}
```

### Migration script
- **ID:** `${migrationId}`
- **File:** `db/migrations/${migrationId}.sql`

### Relationships
${relationships}

---

## 5. Security Considerations

${securityConsiderations}

---

## 6. Edge Cases & Error Handling

<#list edgeCases as ec>
- ${ec}
</#list>

---

## 7. Acceptance Criteria

<#list acceptanceCriteria as ac>
- [ ] ${ac}
</#list>

---

## 8. Testing Strategy

| Layer | Tool | What to test |
|-------|------|-------------|
<#list testingStrategy as ts>
| ${ts.layer} | ${ts.tool} | ${ts.description} |
</#list>

---

## 9. Dependencies

<#if dependencies?has_content>
<#list dependencies as dep>
- ${dep}
</#list>
<#else>
_None beyond existing Spring Boot stack._
</#if>

---

## 10. Open Questions

<#if openQuestions?has_content>
<#list openQuestions as q>
- ${q}
</#list>
<#else>
_None at this time._
</#if>
