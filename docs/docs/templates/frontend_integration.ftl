<#--
  frontend_integration.ftl
  ========================
  FreeMarker template for generating frontend integration specs.
  Each spec describes how ANY responsive frontend (custom HTML/CSS/JS,
  AppleMontiCore-style components, or third-party frameworks) should
  consume one backend feature via pure HTTP + JSON.

  Render with a YAML descriptor from descriptors/frontend/*.yml.

  SichrPlace Backend — v1.2.0-thesis-showcase
  Generated: ${"$"}{.now?string("yyyy-MM-dd")}
-->
# Frontend Integration Spec — ${featureName}

| Meta | Value |
|------|-------|
| **Backend tag** | `${backendTag}` |
| **Integration level** | ${integrationLevel} |
| **Generated** | ${"$"}{.now?string("yyyy-MM-dd")} |

---

## 1  Domain & UX Intent

**User story**

> ${userStory}

| Aspect | Detail |
|--------|--------|
| **Primary user role** | ${primaryUserRole} |
| **Screen context** | ${screenContext} |

---

## 2  Backend Contract

<#list endpoints as ep>
### ${ep?counter}. `${ep.httpMethod} ${ep.endpointPath}`

| Property | Value |
|----------|-------|
| **Auth required** | ${ep.authRequired} |
| **Rate-limit notes** | ${ep.rateLimitNotes} |

<#if ep.requestFields?has_content>
#### Request fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
<#list ep.requestFields as f>
| `${f.name}` | `${f.type}` | ${f.required} | ${f.constraints} |
</#list>
</#if>

#### Response fields

| Field | Type | Notes |
|-------|------|-------|
<#list ep.responseFields as f>
| `${f.name}` | `${f.type}` | ${f.notes} |
</#list>

#### Error codes

| HTTP Status | Meaning | Suggested UX |
|-------------|---------|--------------|
<#list ep.errorCodes as e>
| `${e.status}` | ${e.meaning} | ${e.suggestedUx} |
</#list>

<#if ep.validationHints?has_content>
#### Validation hints

<#list ep.validationHints as hint>
- ${hint}
</#list>
</#if>

</#list>

---

## 3  Frontend Consumption Pattern

> **No framework lock-in** — the patterns below are expressed in plain
> JavaScript (`fetch` / `XMLHttpRequest`). Adapt to your own component
> model (AppleMontiCore, Web Components, etc.) as needed.

### Data-fetch pattern

```
${dataFetchPattern}
```

### State shape (plain object)

```json
${stateShape}
```

### Render hints

<#list renderHints as hint>
- ${hint}
</#list>

---

## 4  Responsive & Accessibility Notes

### Breakpoints

| Breakpoint | Layout guidance |
|------------|----------------|
<#list breakpoints as bp>
| ${bp.name} | ${bp.guidance} |
</#list>

### Priority content

<#list priorityContent as pc>
- ${pc}
</#list>

### Accessibility (a11y)

<#list a11yNotes as note>
- ${note}
</#list>

---

## 5  Testing Hooks

### Mock data source

```
${mockDataSource}
```

### Manual test checklist

<#list manualTestChecklist as item>
- [ ] ${item}
</#list>
