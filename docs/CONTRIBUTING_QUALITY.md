# SichrPlace — Contributing (Quality Checklist)

> **Read this before opening a PR.**
> All changes must pass coverage, COCO, and secrets checks locally.

---

## PR Checklist

Before requesting a review, confirm:

- [ ] **Tests added or updated** — every new service method, controller
      endpoint, and DTO has corresponding test coverage.
- [ ] **`./gradlew testWithCoverage` passes** — all tests green, JaCoCo
      report generated, global coverage ≥ enforced minimum.
- [ ] **`./gradlew checkCoco` passes** — per-package coverage meets the
      thresholds in [`docs/coco_rules.yml`](coco_rules.yml).
- [ ] **`./gradlew secretsCheck` passes** — no hardcoded passwords, API
      keys, or private-key material in `src/`.
- [ ] **No secrets in the diff** — `application-*.yml` files use
      `${ENV_VAR:placeholder}` syntax.  Real credentials live in `.env.local`
      (git-ignored).  See [`SECURITY_AND_SECRETS.md`](SECURITY_AND_SECRETS.md).
- [ ] **COCO thresholds ratcheted up** — if your tests raised coverage for
      a package, increase the `target` in `coco_rules.yml` (see §5 of
      [`COCO_RULES.md`](COCO_RULES.md)).

---

## Quick Local Verification

```bash
# Run all quality gates in one go:
./gradlew testWithCoverage checkCoco secretsCheck
```

If everything passes, your PR is ready for review.

---

## Interpreting CI Failures

### `testWithCoverage` failed

- **Tests failed:** Check the test report at `build/reports/tests/test/index.html`.
  Fix the failing tests before pushing.
- **Coverage below minimum:** Open the JaCoCo report at
  `build/reports/jacoco/test/html/index.html`.  Navigate to the uncovered
  class and write the missing tests.

### `checkCoco` failed

The console output shows a table like:

```
║ ✗ service              4.8% /  95%                   ║
```

The `✗` means the `service` package is below its COCO target.
Write more unit tests for service classes until the target is met.

If the target is unrealistic (e.g., due to a major refactor), you may
temporarily lower it — but follow the `[COCO-EXCEPTION]` process in
[`COCO_RULES.md`](COCO_RULES.md) §5.

### `secretsCheck` failed

The output lists files and line numbers containing suspected secrets:

```
⚠  Potential hardcoded secrets found:
  src/main/resources/application-local.yml:7: password: MyRealDB_Pa$$!
```

Replace the hardcoded value with an environment-variable placeholder:

```yaml
password: ${LOCAL_DB_PASS:changeme}
```

Move the real value to your `.env.local` file (which is git-ignored).

---

## Related Documents

| Document | Purpose |
|----------|---------|
| [`TEST_STRATEGY.md`](TEST_STRATEGY.md) | Test layers, naming, writing guidelines |
| [`COCO_RULES.md`](COCO_RULES.md) | Per-package coverage targets and update process |
| [`SECURITY_AND_SECRETS.md`](SECURITY_AND_SECRETS.md) | Secrets management policy |
| [`TEST_TODO.md`](TEST_TODO.md) | Prioritised list of missing tests |
