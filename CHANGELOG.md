# Changelog

All notable changes to the SichrPlace backend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [v1.1.0-quality-baseline] — 2026-02-20

### Summary

Quality baseline for open-source release.  Adds automated coverage gates,
secrets scanning, and comprehensive quality/security documentation.  This tag
is the recommended starting point for forks and university adoptions.

### Added

- **JaCoCo coverage** — `./gradlew testWithCoverage` generates HTML + XML
  reports and enforces a global instruction-coverage minimum (currently 3 %,
  raising as tests are added).
- **COCO system** — `./gradlew checkCoco` reads per-package thresholds from
  `docs/coco_rules.yml` and fails the build if any package drops below its
  enforced target.  Two-tier model: enforceable-now + aspiration targets.
- **Secrets scanning** — `./gradlew secretsCheck` scans `src/` for hardcoded
  passwords, API keys, and private-key headers.  Integrated into CI.
- **docs/TEST_STRATEGY.md** — 4 test layers (unit / slice / integration / E2E),
  naming conventions, coverage goals, CI integration.
- **docs/COCO_RULES.md** — per-package coverage targets, critical scenarios
  per feature area, threshold update process with ratchet-up rule and
  `[COCO-EXCEPTION]` tag for lowering.
- **docs/SECURITY_AND_SECRETS.md** — secrets policy, env-var placeholder
  guidance, `.env.local` setup, CI secrets, leak response plan.
- **docs/CONTRIBUTING_QUALITY.md** — PR checklist for contributors (tests,
  coverage, secrets).
- **docs/TEST_TODO.md** — prioritised list of missing test classes and
  edge cases.
- **.env.example** updated with safe, obviously-fake placeholder values for
  local development.
- **Bonus lab exercises** in TUTORIUM_LAB_WORKPLACE.md — coverage and secrets
  scanning exercises for students.
- **Quality & Security Tour** section in tutorium — 15-minute guided walkthrough
  of JaCoCo, COCO, and secretsCheck.

### Changed

- **build.gradle** — added `jacoco` plugin, `testWithCoverage`, `checkCoco`,
  and `secretsCheck` Gradle tasks.  Fixed YAML parser to strip inline comments
  and handle DTD in JaCoCo XML.
- **application-local.yml** — replaced hardcoded credentials with `${ENV_VAR:placeholder}` syntax.
- **application-local-mssql.yml** — replaced hardcoded password default with `changeme`.
- **.gitignore** — added `*.pem`, `*.key`, `*.p12`, `*.jks`, `*.pfx`, `*.dump`, `*.bak`.
- **deploy-backend.yml** — replaced `./gradlew test` (continue-on-error) with
  `secretsCheck` → `testWithCoverage` → `checkCoco` pipeline.  Added coverage
  artifact upload.
- **ONBOARDING_README.md** — added "Quality & Security" section, updated
  endpoint counts (55 → 61).
- **TUTORIUM_LAB_WORKPLACE.md** — updated table/endpoint counts, added quality
  exercises and tour section.
- **FEATURE_ROADMAP_SPRING_PORT.md** — added COCO target lines per phase.

### Previous Releases

#### v1.0.0-mssql-workplace — 2026-02 (thesis submission baseline)

- 9 JPA entities → 9 tables, 55 endpoints, 9 controllers.
- Full seed data (43 rows), MSSQL 2025 + PostgreSQL dual-DB support.
- 6 smoke tests, Docker Compose, GitHub Actions CI/CD.
- Complete documentation suite (thesis overview, tutorium, API reference,
  extension tracks, demo script, diagrams).

[v1.1.0-quality-baseline]: https://github.com/omer3kale/sichrplace-backend/releases/tag/v1.1.0-quality-baseline
