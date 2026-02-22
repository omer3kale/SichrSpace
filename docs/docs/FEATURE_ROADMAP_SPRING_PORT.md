# SichrPlace — Template-Driven Feature Porting Roadmap

> **Last updated:** February 2026
> **Source:** Legacy Node.js / Express / Supabase backend (~175 endpoints, 24 categories)
> **Target:** Spring Boot 3.2.2 / Java 21 / MSSQL 2025 (currently 61 endpoints, 11 controllers)
> **Current parity rating:** **4 / 10**
> **Thesis target:** **8 / 10** (Phases 1–4)
> **Full parity target:** **10 / 10** (Phases 1–8)

---

## Table of Contents

1. [Overview](#1-overview)
2. [FreeMarker Template System](#2-freemarker-template-system)
3. [Phase Roadmap](#3-phase-roadmap)
4. [Legacy → Spring Mapping Table](#4-legacy--spring-mapping-table)
5. [Generated Artifacts Directory Structure](#5-generated-artifacts-directory-structure)
6. [How to Generate From Templates](#6-how-to-generate-from-templates)
7. [Teaching Angle](#7-teaching-angle)
8. [Appendix — Template Quick Reference](#8-appendix--template-quick-reference)

---

## 1. Overview

### The Problem

The legacy JS backend grew organically over many months.  It accumulated:

- **~175 endpoints** across 24 feature categories.
- A **hybrid MongoDB / Supabase** data layer (many routes call disconnected Mongoose models).
- **12+ admin stubs** returning mock data.
- **In-memory stores** for payments and video metadata.
- **Hardcoded credentials** in source code.
- **Duplicate route files** (3 PayPal variants, 2 Maps files).

Roughly **60 %** of endpoints are fully working against Supabase, **25 %** partially
work (MongoDB stubs), and **15 %** are pure mock stubs.

### The Solution

Port every *meaningful* feature to the Spring Boot backend using a **template-driven
approach**:

1. **Describe** each feature in a YAML descriptor (one file per feature).
2. **Generate** a Feature Spec + Design Doc + Migration Plan by applying FreeMarker
   templates to the descriptor.
3. **Implement** the Spring Boot code following the generated spec.
4. **Verify** with integration tests and update the API documentation.

This standardises how features are documented, makes porting predictable, and gives
students a repeatable workflow for their own feature implementations.

### Rating Baseline

| Metric | Value |
|--------|-------|
| Spring Boot endpoints | 61 |
| Spring Boot controllers | 11 (User, Apartment, Listing, Conversation, Favorite, Review, ViewingRequest, Notification, SavedSearch, Admin) |
| Spring Boot tables | 11 (users, apartments, listings, conversations, messages, user_favorites, reviews, viewing_requests, notifications, viewing_request_transitions, saved_searches) |
| Old JS categories covered | 9 of 24 |
| Old JS categories missing | 15 |
| Feature parity score | **4 / 10** |

---

## 2. FreeMarker Template System

### Template Inventory

| Template | File | Purpose | Output |
|----------|------|---------|--------|
| Feature Spec | `docs/templates/feature_spec.ftl` | Full specification of one feature ported from JS to Spring Boot | `docs/generated/features/${featureId}.md` |
| Controller / Service Design | `docs/templates/controller_service_design.ftl` | Class-level design for controller ↔ service ↔ repository | `docs/generated/design/${featureId}_design.md` |
| API Doc Entry | `docs/templates/api_doc_entry.ftl` | Row(s) + detail for `API_ENDPOINTS_BACKEND.md` | Appended to `docs/API_ENDPOINTS_BACKEND.md` |
| Migration Plan | `docs/templates/migration_plan.ftl` | DDL + backfill + rollback + verification for DB changes | `docs/generated/migrations/${migrationId}_plan.md` |

### Placeholder Summary

All four templates share a common set of placeholders populated from YAML descriptors:

```yaml
# ── Feature identity ──
featureId:        "auth_email_verification"
featureName:      "Email Verification"
phase:            "Phase 1"
priority:         "P0 — Critical Path"
effort:           "4–6 hours"
author:           "Omer Kale"
date:             "2026-02-20"

# ── Legacy references ──
legacyRouteFiles:
  - "routes/auth.js"
legacyServiceFiles:
  - "services/emailService.js"
legacyEndpoints:
  - { method: "GET", path: "/api/auth/verify-email/:token",
      description: "Verify email via token", status: "IMPLEMENTED" }
legacyDescription: |
  After registration the old backend sends a verification email
  containing a signed JWT as a URL parameter.  The GET endpoint
  decodes the token, marks the user as verified in Supabase, and
  redirects to the login page.

# ── Spring Boot design ──
springControllers:
  - "UserController.java"
springServices:
  - "UserService.java / UserServiceImpl.java"
  - "EmailService.java / EmailServiceImpl.java"
springEntities:
  - "User.java (add emailVerified, verificationToken fields)"
dbTables:
  - "users (ALTER — add columns)"

# ── Endpoints (new) ──
endpoints:
  - { method: "GET", path: "/api/auth/verify-email/{token}",
      auth: "—", description: "Verify email address via token" }

# ── Schema ──
migrationId:      "V007__user_email_verification"
ddlSketch:        |
  ALTER TABLE dbo.users
    ADD email_verified BIT NOT NULL DEFAULT 0,
        verification_token NVARCHAR(512) NULL;
relationships:    "No new relationships — column additions to existing users table."

# ── Quality ──
securityConsiderations: |
  - Token must be single-use (set to NULL after verification).
  - Token must expire (e.g. 24 h).  Re-request endpoint needed.
  - Rate-limit the resend-verification endpoint.
edgeCases:
  - "Token already used → 400 Bad Request"
  - "Token expired → 410 Gone + suggest resend"
  - "User already verified → 200 OK (idempotent)"
acceptanceCriteria:
  - "Registration sends a verification email with a unique token."
  - "GET /api/auth/verify-email/{token} marks the user as verified."
  - "Login returns 403 if user is not yet verified."
  - "Expired / reused tokens are rejected gracefully."
testingStrategy:
  - { layer: "Unit", tool: "JUnit 5 + Mockito",
      description: "Service logic — token generation, expiry, idempotency" }
  - { layer: "Integration", tool: "SpringBootTest + H2",
      description: "Full flow — register → verify → login" }
  - { layer: "API", tool: "MockMvc",
      description: "Endpoint contracts, error codes" }
dependencies:
  - "spring-boot-starter-mail"
  - "spring-boot-starter-freemarker (or Thymeleaf) for email templates"
openQuestions:
  - "Use FreeMarker or Thymeleaf for email body rendering?"
```

---

## 3. Phase Roadmap

### Rating Progression

```
Phase 0 (now)  ████░░░░░░  4/10   61 endpoints, 11 tables
Phase 1        ██████░░░░  6/10   68 endpoints, 12 tables
Phase 2        ███████░░░  7/10   79 endpoints, 13 tables
Phase 3        ███████▌░░  7.5/10 86 endpoints, 15 tables
Phase 4        ████████░░  8/10   93 endpoints, 17 tables   ← THESIS TARGET
Phase 5        ████████▌░  8.5/10 97 endpoints, 19 tables
Phase 6        █████████░  9/10   103 endpoints, 21 tables
Phase 7        █████████▌  9.5/10 108 endpoints, 23 tables
Phase 8        ██████████  10/10  116 endpoints, 23 tables
```

---

### Phase 1 — Core Auth Gaps + Infrastructure (P0)

> **Target rating:** 4 → **6 / 10**
> **Estimated effort:** 2–3 days
> **New endpoints:** +7 → 68 total
> **COCO target:** overall ≥ 85 %, new service classes ≥ 95 %

| Feature | Spec (generated) | Design (generated) | Migration | Template(s) |
|---------|-------------------|--------------------|-----------|-------------|
| Email verification | `features/auth_email_verification.md` | `design/auth_email_verification_design.md` | V007 | feature_spec, controller_service_design, migration_plan |
| Forgot / reset password | `features/auth_password_reset.md` | `design/auth_password_reset_design.md` | V006 | feature_spec, controller_service_design, migration_plan |
| Health check endpoint | `features/infra_health_check.md` | `design/infra_health_check_design.md` | — | feature_spec, controller_service_design |
| Delete notification | `features/notifications_delete.md` | — | — | feature_spec |
| Execute saved search | `features/saved_search_execute.md` | — | — | feature_spec |
| Viewing request statistics | `features/vr_statistics.md` | `design/vr_statistics_design.md` | — | feature_spec, controller_service_design |
| Mark viewing completed | `features/vr_complete.md` | — | — | feature_spec |

**Migration scripts:**
- `V006__password_reset_tokens.sql` — new table
- `V007__user_email_verification.sql` — ALTER users

---

### Phase 2 — Search, Recently Viewed, Profile (P0 / P1)

> **Target rating:** 6 → **7 / 10**
> **Estimated effort:** 2–3 days
> **New endpoints:** +11 → 79 total
> **COCO target:** overall ≥ 85 %, new service classes ≥ 95 %

| Feature | Spec | Design | Migration | Template(s) |
|---------|------|--------|-----------|-------------|
| Advanced search | `features/search_advanced.md` | `design/search_advanced_design.md` | — | feature_spec, controller_service_design |
| Recently viewed | `features/recently_viewed.md` | `design/recently_viewed_design.md` | V008 | all 4 |
| Profile stats | `features/profile_stats.md` | `design/profile_stats_design.md` | — | feature_spec, controller_service_design |
| Notification preferences | `features/notification_prefs.md` | — | V009 | feature_spec, migration_plan |

**Migration scripts:**
- `V008__recently_viewed.sql` — new table
- `V009__user_notification_preferences.sql` — ALTER users

---

### Phase 3 — Analytics & Feedback (P1)

> **Target rating:** 7 → **7.5 / 10**
> **Estimated effort:** 1–2 days
> **New endpoints:** +7 → 86 total
> **COCO target:** overall ≥ 85 %, new service classes ≥ 95 %

| Feature | Spec | Design | Migration | Template(s) |
|---------|------|--------|-----------|-------------|
| Analytics dashboard | `features/analytics_dashboard.md` | `design/analytics_dashboard_design.md` | V010 | all 4 |
| Feedback | `features/feedback.md` | `design/feedback_design.md` | V011 | all 4 |

**Migration scripts:**
- `V010__search_logs.sql` — new table
- `V011__feedback.sql` — new table

---

### Phase 4 — Email Service & GDPR Basics (P1)

> **Target rating:** 7.5 → **8 / 10** — THESIS TARGET
> **Estimated effort:** 2–3 days
> **New endpoints:** +7 → 93 total
> **COCO target:** overall ≥ 85 %, new service classes ≥ 95 %, security ≥ 90 %

| Feature | Spec | Design | Migration | Template(s) |
|---------|------|--------|-----------|-------------|
| Email service | `features/email_service.md` | `design/email_service_design.md` | — | feature_spec, controller_service_design |
| GDPR consent | `features/gdpr_consent.md` | `design/gdpr_consent_design.md` | V012 | all 4 |
| GDPR data export | `features/gdpr_export.md` | — | — | feature_spec |
| GDPR account deletion | `features/gdpr_delete_account.md` | — | V013 | feature_spec, migration_plan |

**Migration scripts:**
- `V012__gdpr_consents.sql` — new table
- `V013__gdpr_requests.sql` — new table

---

### Phase 5 — File Upload & Media (P1)

> **Target rating:** 8 → **8.5 / 10**
> **Estimated effort:** 2 days
> **New endpoints:** +4 → 97 total
> **COCO target:** overall ≥ 85 %, new service classes ≥ 95 %

| Feature | Spec | Design | Migration | Template(s) |
|---------|------|--------|-----------|-------------|
| Apartment image upload | `features/apartment_images.md` | `design/apartment_images_design.md` | V014 | all 4 |
| Profile avatar upload | `features/profile_avatar.md` | — | V015 | feature_spec, migration_plan |

**Migration scripts:**
- `V014__apartment_images.sql` — new table
- `V015__user_avatar_url.sql` — ALTER users

---

### Phase 6 — Messaging Extras & Push Notifications (P2)

> **Target rating:** 8.5 → **9 / 10**
> **Estimated effort:** 3–4 days
> **New endpoints:** +6 → 103 total
> **COCO target:** overall ≥ 85 %, new service classes ≥ 95 %

| Feature | Spec | Design | Migration | Template(s) |
|---------|------|--------|-----------|-------------|
| WebSocket real-time chat | `features/websocket_chat.md` | `design/websocket_chat_design.md` | — | feature_spec, controller_service_design |
| Message search | `features/message_search.md` | — | — | feature_spec |
| Push notifications | `features/push_notifications.md` | `design/push_notifications_design.md` | V016 | all 4 |
| Archive conversation | `features/conversation_archive.md` | — | V017 | feature_spec, migration_plan |

**Migration scripts:**
- `V016__push_subscriptions.sql` — new table
- `V017__conversation_archived.sql` — ALTER conversations

---

### Phase 7 — Payments / PayPal (P2)

> **Target rating:** 9 → **9.5 / 10**
> **Estimated effort:** 3 days
> **New endpoints:** +5 → 108 total
> **COCO target:** overall ≥ 85 %, new service classes ≥ 95 %, security ≥ 90 %

| Feature | Spec | Design | Migration | Template(s) |
|---------|------|--------|-----------|-------------|
| PayPal order lifecycle | `features/paypal_payments.md` | `design/paypal_payments_design.md` | V018 | all 4 |
| PayPal webhooks | `features/paypal_webhooks.md` | — | — | feature_spec |
| Payment status on VR | `features/vr_payment_status.md` | — | V019 | feature_spec, migration_plan |

**Migration scripts:**
- `V018__payment_orders.sql` — new table
- `V019__vr_payment_status.sql` — ALTER viewing_requests

---

### Phase 8 — Google Maps & Geolocation (P2)

> **Target rating:** 9.5 → **10 / 10**
> **Estimated effort:** 2–3 days
> **New endpoints:** +8 → 116 total
> **COCO target:** overall ≥ 85 %, all packages at or above COCO_RULES.md targets

| Feature | Spec | Design | Migration | Template(s) |
|---------|------|--------|-----------|-------------|
| Geocoding & reverse geocode | `features/maps_geocoding.md` | `design/maps_controller_design.md` | — | feature_spec, controller_service_design |
| Nearby places | `features/maps_nearby.md` | — | — | feature_spec |
| Distance & commute | `features/maps_distance.md` | — | — | feature_spec |
| Nearby apartments | `features/maps_nearby_apartments.md` | — | — | feature_spec |
| Address validation | `features/maps_validate_address.md` | — | — | feature_spec |

**Migration scripts:** None — external API, no new tables.

---

### Skipped (P3) — Not Worth Porting

| Feature | Reason |
|---------|--------|
| Google Forms integration | MongoDB-only, niche use case |
| Stripe payments | PayPal sufficient; Stripe was barely implemented |
| Advanced GDPR (DPIA, breaches, compliance scanner) | MongoDB stubs, overkill for thesis |
| Redis caching / leaderboards | Performance optimisation, not a functional feature |
| Secure video upload / streaming | In-memory metadata, not production-ready |
| Admin stubs (upload queue, video links, account reps) | Mock data, no real logic |
| CSRF token endpoint | Spring Security handles CSRF natively |
| Login-test endpoint | Security risk |

---

## 4. Legacy → Spring Mapping Table

| # | Legacy Category | Example Feature | Spring Phase | Template(s) | Status |
|---|----------------|-----------------|-------------|-------------|--------|
| 1 | Auth lifecycle | Email verification, password reset | Phase 1 | feature_spec, controller_service_design, migration_plan | Not started |
| 2 | Apartments / Listings | Image upload | Phase 5 | all 4 | Not started |
| 3 | Viewing Requests | Statistics, complete, payment tracking | Phase 1, 7 | feature_spec, controller_service_design | Not started |
| 4 | Favorites | (Complete) | — | — | **Done** |
| 5 | Reviews / Ratings | (Complete) | — | — | **Done** |
| 6 | Notifications | Delete notification, helper generators | Phase 1 | feature_spec | Not started |
| 7 | Saved Searches | Execute saved search | Phase 1 | feature_spec | Not started |
| 8 | Messaging | WebSocket, search, archive, reactions | Phase 6 | feature_spec, controller_service_design | Not started |
| 9 | Admin | GDPR report, expanded user mgmt | Phase 4 | feature_spec | Not started |
| 10 | PayPal Payments | Create/capture orders, webhooks | Phase 7 | all 4 | Not started |
| 11 | Stripe Payments | — | Skipped | — | P3 skip |
| 12 | Google Maps / Geo | Geocode, nearby, distance, commute | Phase 8 | feature_spec, controller_service_design | Not started |
| 13 | GDPR / Privacy | Consent, export, deletion | Phase 4 | all 4 | Not started |
| 14 | Analytics Dashboard | Stats, popular, activity, locations | Phase 3 | all 4 | Not started |
| 15 | Email Service | Send, templates, stage emails | Phase 4 | feature_spec, controller_service_design | Not started |
| 16 | Caching / Performance | — | Skipped | — | P3 skip |
| 17 | Advanced Search | Advanced filters, suggestions, alerts | Phase 2 | feature_spec, controller_service_design | Not started |
| 18 | Media / Secure Video | — | Skipped | — | P3 skip |
| 19 | Feedback | Submit, list (admin), clear | Phase 3 | all 4 | Not started |
| 20 | Recently Viewed | Track, list, remove, clear | Phase 2 | all 4 | Not started |
| 21 | Push Notifications | VAPID, subscribe, send, bulk | Phase 6 | all 4 | Not started |
| 22 | Profile Features | Stats, avatar, notification prefs | Phase 2, 5 | feature_spec, controller_service_design, migration_plan | Not started |
| 23 | Google Forms | — | Skipped | — | P3 skip |
| 24 | Infrastructure | Health check, config | Phase 1 | feature_spec | Not started |

---

## 5. Generated Artifacts Directory Structure

```
docs/
├── templates/                          # FreeMarker templates (checked in)
│   ├── feature_spec.ftl
│   ├── controller_service_design.ftl
│   ├── api_doc_entry.ftl
│   └── migration_plan.ftl
├── descriptors/                        # YAML feature descriptors (checked in)
│   ├── auth_email_verification.yml
│   ├── auth_password_reset.yml
│   ├── infra_health_check.yml
│   ├── recently_viewed.yml
│   ├── feedback.yml
│   ├── analytics_dashboard.yml
│   └── ...                             # one per feature
├── generated/                          # Rendered output (generated, gitignored or committed)
│   ├── features/
│   │   ├── auth_email_verification.md
│   │   ├── auth_password_reset.md
│   │   └── ...
│   ├── design/
│   │   ├── auth_email_verification_design.md
│   │   ├── auth_password_reset_design.md
│   │   └── ...
│   └── migrations/
│       ├── V006__password_reset_tokens_plan.md
│       ├── V007__user_email_verification_plan.md
│       └── ...
├── FEATURE_ROADMAP.md                  # Original gap analysis (static)
├── FEATURE_ROADMAP_SPRING_PORT.md      # THIS document (template-driven roadmap)
└── ...
```

---

## 6. How to Generate From Templates

### Option A — Java CLI (FreeMarker native)

A small command-line tool reads a YAML descriptor and applies the `.ftl` templates.

```java
// tools/src/main/java/FtlGenerator.java  (sketch)
import freemarker.template.*;
import org.yaml.snakeyaml.Yaml;
import java.io.*;
import java.util.Map;

public class FtlGenerator {
    public static void main(String[] args) throws Exception {
        String descriptorPath = args[0]; // e.g. docs/descriptors/auth_email_verification.yml

        // 1. Load YAML
        Yaml yaml = new Yaml();
        Map<String, Object> data;
        try (InputStream in = new FileInputStream(descriptorPath)) {
            data = yaml.load(in);
        }

        // 2. Configure FreeMarker
        Configuration cfg = new Configuration(Configuration.VERSION_2_3_32);
        cfg.setDirectoryForTemplateLoading(new File("docs/templates"));
        cfg.setDefaultEncoding("UTF-8");

        // 3. Render feature_spec.ftl → docs/generated/features/<id>.md
        String featureId = (String) data.get("featureId");
        render(cfg, "feature_spec.ftl", data,
               "docs/generated/features/" + featureId + ".md");

        // 4. Render controller_service_design.ftl → docs/generated/design/<id>_design.md
        render(cfg, "controller_service_design.ftl", data,
               "docs/generated/design/" + featureId + "_design.md");

        // 5. Render migration_plan.ftl (if migrationId present)
        if (data.containsKey("migrationId")) {
            render(cfg, "migration_plan.ftl", data,
                   "docs/generated/migrations/" + data.get("migrationId") + "_plan.md");
        }

        System.out.println("Generated docs for: " + featureId);
    }

    private static void render(Configuration cfg, String template,
                               Map<String, Object> data, String outPath)
            throws Exception {
        Template tpl = cfg.getTemplate(template);
        File out = new File(outPath);
        out.getParentFile().mkdirs();
        try (Writer w = new FileWriter(out)) {
            tpl.process(data, w);
        }
    }
}
```

**Build & run:**
```bash
cd tools
javac -cp freemarker.jar:snakeyaml.jar FtlGenerator.java
java -cp .:freemarker.jar:snakeyaml.jar FtlGenerator \
     ../docs/descriptors/auth_email_verification.yml
```

Or package as a fat JAR:
```bash
java -jar tools/ftl-generator.jar docs/descriptors/auth_email_verification.yml
```

### Option B — Python + Jinja2 (lightweight alternative)

Since FreeMarker syntax (`${var}`, `<#list>`, `<#if>`) is very close to Jinja2
(`{{ var }}`, `{% for %}`, `{% if %}`), you can maintain the `.ftl` files as the
**canonical spec** but process them with a thin Python script using Jinja2-compatible
syntax:

```python
#!/usr/bin/env python3
"""ftl_generate.py — render feature spec from YAML descriptor."""
import sys, yaml, os
from jinja2 import Environment, FileSystemLoader

def main():
    descriptor = sys.argv[1]
    with open(descriptor) as f:
        data = yaml.safe_load(f)

    env = Environment(
        loader=FileSystemLoader("docs/templates"),
        variable_start_string="${",   # match FreeMarker syntax
        variable_end_string="}",
        block_start_string="<#",
        block_end_string=">",
        comment_start_string="<#--",
        comment_end_string="-->",
    )

    feature_id = data["featureId"]

    for tpl_name, out_dir, suffix in [
        ("feature_spec.ftl",              "docs/generated/features",    ""),
        ("controller_service_design.ftl", "docs/generated/design",     "_design"),
    ]:
        tpl = env.get_template(tpl_name)
        os.makedirs(out_dir, exist_ok=True)
        out_path = f"{out_dir}/{feature_id}{suffix}.md"
        with open(out_path, "w") as out:
            out.write(tpl.render(**data))
        print(f"  → {out_path}")

    if "migrationId" in data:
        tpl = env.get_template("migration_plan.ftl")
        mid = data["migrationId"]
        out_dir = "docs/generated/migrations"
        os.makedirs(out_dir, exist_ok=True)
        out_path = f"{out_dir}/{mid}_plan.md"
        with open(out_path, "w") as out:
            out.write(tpl.render(**data))
        print(f"  → {out_path}")

if __name__ == "__main__":
    main()
```

**Run:**
```bash
pip install jinja2 pyyaml
python ftl_generate.py docs/descriptors/auth_email_verification.yml
```

### Option C — Manual (no tooling)

If you prefer not to run a generator, simply:

1. Open the `.ftl` template in your editor.
2. Open the YAML descriptor side-by-side.
3. Copy the template, replace every `${placeholder}` with the YAML value.
4. Save as the output `.md` file.

This is perfectly fine for a small number of features.

---

## 7. Teaching Angle

### How Students Use This System

Students in the tutorium can pick a feature from the mapping table (§4) and implement
it end-to-end:

1. **Choose a feature** — pick one marked "Not started" from the mapping table.
2. **Create a YAML descriptor** — copy the example in §2 and fill in the blanks.
3. **Generate the spec** — run the generator (Option A, B, or C above).
4. **Implement the code:**
   - Entity + Repository (if new table needed)
   - Service interface + implementation
   - Controller with Swagger annotations
   - Migration `.sql` script
5. **Write tests** — at least one `@SpringBootTest` integration test.
6. **Update docs** — add endpoints to `API_ENDPOINTS_BACKEND.md`.
7. **Submit a PR** — with the YAML descriptor + generated docs + code.

### Recommended Mini-Projects for Students

These features are self-contained, moderate in complexity, and teach core Spring Boot
patterns:

| # | Feature | Difficulty | What It Teaches |
|---|---------|-----------|-----------------|
| 1 | **Feedback** (Phase 3) | ⭐⭐ Easy | Full CRUD cycle: Entity → Repository → Service → Controller → Swagger. New table. Admin-only list/delete. |
| 2 | **Recently Viewed** (Phase 2) | ⭐⭐ Easy | @ManyToOne relationships, cleanup logic (keep last 50), user-scoped queries. |
| 3 | **Analytics Dashboard** (Phase 3) | ⭐⭐⭐ Medium | Aggregation queries (COUNT, GROUP BY), DTOs with computed fields, read-only service. |
| 4 | **Execute Saved Search** (Phase 1) | ⭐⭐⭐ Medium | JPA Specification API, dynamic query building from JSON filter, existing table reuse. |
| 5 | **Health Check** (Phase 1) | ⭐ Trivial | Spring Boot Actuator or custom endpoint, dependency checks (DB, external services). |

### Student Workflow Summary

```
┌─────────────────┐
│  Pick feature    │
│  from roadmap    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fill YAML       │
│  descriptor      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────┐
│  Run generator   │────▶│ Generated:               │
│  (Java / Python) │     │  • Feature spec (.md)    │
└────────┬────────┘     │  • Design doc (.md)      │
         │              │  • Migration plan (.md)  │
         │              └──────────────────────────┘
         ▼
┌─────────────────┐
│  Implement code  │
│  (entity, repo,  │
│   service, ctrl) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Write tests +   │
│  update API docs │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Submit PR       │
└─────────────────┘
```

---

## 8. Appendix — Template Quick Reference

### feature_spec.ftl — Key Sections

| Section | Purpose |
|---------|---------|
| Legacy Behavior | What the JS backend did (routes, services, DB calls) |
| New Spring Boot Behavior | Controllers, services, entities to create |
| API Surface | Endpoint table matching our existing doc format |
| Persistence & Schema | DDL sketch, migration ID, relationships |
| Security Considerations | Auth, rate limiting, input validation |
| Edge Cases & Error Handling | Boundary conditions, error responses |
| Acceptance Criteria | Checkbox list for definition-of-done |
| Testing Strategy | Unit / integration / API test breakdown |

### controller_service_design.ftl — Key Sections

| Section | Purpose |
|---------|---------|
| Class Overview | Table of Controller / Service / Repo / DTOs |
| Responsibilities | What each layer does |
| Public Endpoints | Method + path + roles table |
| Method-Level Notes | Request/response bodies, status codes per endpoint |
| Security & Roles | Role → allowed actions matrix |
| Dependencies | Other services or external APIs needed |
| Error Handling | Exception → HTTP status mapping |
| Annotations Checklist | Lombok / Spring / Swagger annotation reminders |

### api_doc_entry.ftl — Output Format

Produces table rows matching the existing `API_ENDPOINTS_BACKEND.md` format plus
detailed per-endpoint sections with curl examples and error codes.

### migration_plan.ftl — Key Sections

| Section | Purpose |
|---------|---------|
| Changes Summary | One-paragraph description |
| Tables Touched | Table name + action (CREATE / ALTER) + details |
| DDL Changes | Full SQL script |
| Backfilling | Steps to migrate existing data (if any) |
| Rollback Plan | Reverse DDL or manual steps |
| Verification | Queries to confirm migration success |
| Seed Data | Optional INSERT statements |
