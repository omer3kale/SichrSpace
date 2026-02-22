<#-- ============================================================
     SichrPlace — API Documentation Entry Template
     Usage:  Adds one or more rows to API_ENDPOINTS_BACKEND.md.
             Render per endpoint, then paste into the Quick-
             Reference table.
     Output: stdout / clipboard — append to API_ENDPOINTS_BACKEND.md
     ============================================================ -->
<#-- —————— Quick-Reference table row(s) —————— -->
<#list endpoints as ep>
| ${ep.number} | ${ep.httpMethod} | `${ep.path}` | ${ep.auth} | ${ep.controller} | ${ep.description} |
</#list>

<#-- —————— Detailed section per endpoint —————— -->
<#list endpoints as ep>
---

### ${ep.number}. ${ep.httpMethod} `${ep.path}`

> **Controller:** `${ep.controller}` | **Auth:** ${ep.auth}

**Description:** ${ep.description}

<#if ep.requestSchema?has_content>
**Request body:**
```json
${ep.requestSchema}
```
</#if>

<#if ep.responseSchema?has_content>
**Response (${ep.successStatus}):**
```json
${ep.responseSchema}
```
</#if>

**Example:**
```bash
${ep.exampleCurl}
```

**Error codes:**
<#list ep.errorCodes as err>
- `${err.code}` — ${err.reason}
</#list>

</#list>
