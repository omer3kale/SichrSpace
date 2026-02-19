<#-- ============================================================
     SichrPlace — Controller / Service / Repository Design Template
     Usage:  One per feature — describes class-level design for
             the Spring Boot layer (controller ↔ service ↔ repo).
     Output: docs/generated/design/${featureId}_design.md
     ============================================================ -->
# Design Doc — ${featureName}

> **Feature ID:** `${featureId}`
> **Phase:** ${phase}
> **Date:** ${date}

---

## 1. Class Overview

| Layer | Class | Package |
|-------|-------|---------|
| Controller | `${controllerName}` | `com.sichrplace.backend.controller` |
| Service (interface) | `${serviceName}` | `com.sichrplace.backend.service` |
| Service (impl) | `${serviceImplName}` | `com.sichrplace.backend.service` |
| Repository | `${repositoryName}` | `com.sichrplace.backend.repository` |
<#if dtoNames?has_content>
<#list dtoNames as dto>
| DTO | `${dto}` | `com.sichrplace.backend.dto` |
</#list>
</#if>

---

## 2. Responsibilities

### Controller — `${controllerName}`
- Base path: `${basePath}`
- Translates HTTP requests into service calls.
- Returns appropriate HTTP status codes (201 Created, 204 No Content, etc.).
- Applies `@PreAuthorize` for role-based access.
- Swagger/OpenAPI annotations (`@Tag`, `@Operation`).

### Service — `${serviceName}` / `${serviceImplName}`
- Business logic and validation.
- Transactional boundaries (`@Transactional`).
- Throws domain-specific exceptions for controller-level error mapping.

### Repository — `${repositoryName}`
- Extends `JpaRepository<${entityName}, Long>`.
- Custom query methods as needed.

---

## 3. Public Endpoints

| # | Method | Path | Summary | Roles |
|---|--------|------|---------|-------|
<#list methods as m>
| ${m?counter} | ${m.httpMethod} | `${m.path}` | ${m.summary} | ${m.roles} |
</#list>

---

## 4. Method-Level Notes

<#list methods as m>
### ${m.httpMethod} `${m.path}` — ${m.summary}

<#if m.requestBody?has_content>
**Request body:** `${m.requestBody}`
</#if>
<#if m.responseBody?has_content>
**Response:** `${m.responseBody}`
</#if>
<#if m.notes?has_content>
**Notes:** ${m.notes}
</#if>
**Status codes:** ${m.statusCodes}

---

</#list>

## 5. Security & Roles

| Role | Allowed Actions |
|------|----------------|
<#list securityRoles as sr>
| ${sr.role} | ${sr.actions} |
</#list>

---

## 6. Dependencies (Other Services / External APIs)

<#list serviceDependencies as dep>
- `${dep.name}` — ${dep.reason}
</#list>

---

## 7. Error Handling

| Scenario | Exception | HTTP Status |
|----------|-----------|-------------|
<#list errorHandling as eh>
| ${eh.scenario} | `${eh.exception}` | ${eh.httpStatus} |
</#list>

---

## 8. Lombok & Annotations Checklist

- [ ] `@RestController`, `@RequestMapping("${basePath}")`
- [ ] `@RequiredArgsConstructor`, `@Slf4j`
- [ ] `@Tag(name = "${controllerName}")` (Swagger)
- [ ] `@Transactional` on service write methods
- [ ] `@Transactional(readOnly = true)` on service read methods
- [ ] `@PreAuthorize` on controller methods
- [ ] `@Valid` on request body parameters
- [ ] Entity: `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`
