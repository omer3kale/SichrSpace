# SichrPlace — Test Strategy

> **Last updated:** February 2026
> **Stack:** Spring Boot 3.2.2 · Java 21 · JUnit 5 · JaCoCo · H2 (test) · MSSQL 2025 (prod)

---

## 1. Test Layers

SichrPlace uses four test layers, each with a distinct purpose and execution
speed.  Tests at every layer live under `src/test/java/**`.

```
                ┌─────────────────────────┐   Slow / high confidence
                │  End-to-End / API Tests │
                ├─────────────────────────┤
                │  Integration Tests      │
                ├─────────────────────────┤
                │  Slice Tests            │
                ├─────────────────────────┤
                │  Unit Tests             │   Fast / high isolation
                └─────────────────────────┘
```

### Layer 1 — Unit Tests

| Aspect | Detail |
|--------|--------|
| **Spring context** | None — pure Java. |
| **Dependencies** | Mocked with Mockito (`@Mock`, `@InjectMocks`). |
| **Speed** | < 1 ms per test. |
| **What to test** | Service logic, DTO mapping (`fromEntity`), validation rules, utility methods, token generation/expiry, business rules. |
| **Naming** | `*Test.java` (e.g. `UserServiceTest.java`). |
| **Location** | `src/test/java/com/sichrplace/backend/service/` |

**Example pattern:**

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @InjectMocks UserServiceImpl userService;

    @Test
    void register_duplicateEmail_throws() {
        when(userRepository.existsByEmail("x@y.com")).thenReturn(true);
        assertThrows(IllegalArgumentException.class,
            () -> userService.register(new RegisterRequest("x@y.com", ...)));
    }
}
```

### Layer 2 — Slice Tests

| Aspect | Detail |
|--------|--------|
| **Spring context** | Partial — only the slice under test. |
| **Annotations** | `@DataJpaTest` (repositories), `@WebMvcTest` (controllers), `@JsonTest` (serialisation). |
| **Speed** | ~100–500 ms per test (H2 in-memory). |
| **What to test** | JPA query methods, controller request/response mapping, JSON serialisation, Spring Security filter chain. |
| **Naming** | `*SliceTest.java` or `*WebTest.java`. |
| **Location** | `src/test/java/com/sichrplace/backend/repository/` or `.../controller/` |

**Repository slice example:**

```java
@DataJpaTest
@ActiveProfiles("test")
class UserRepositorySliceTest {
    @Autowired UserRepository repo;

    @Test
    void findByEmail_returnsUser() {
        User u = User.builder().email("a@b.com").username("a")
                     .passwordHash("h").role(Role.TENANT).build();
        repo.save(u);
        assertTrue(repo.findByEmail("a@b.com").isPresent());
    }
}
```

**Controller slice example:**

```java
@WebMvcTest(UserController.class)
@Import(SecurityConfig.class)
class UserControllerWebTest {
    @Autowired MockMvc mvc;
    @MockBean UserService userService;

    @Test
    void login_validCredentials_returns200() throws Exception {
        when(userService.login(any())).thenReturn(loginResponse);
        mvc.perform(post("/api/auth/login")
                .contentType(APPLICATION_JSON)
                .content("{\"email\":\"a@b.com\",\"password\":\"pw\"}"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.accessToken").exists());
    }
}
```

### Layer 3 — Integration Tests

| Aspect | Detail |
|--------|--------|
| **Spring context** | Full — `@SpringBootTest`. |
| **Database** | H2 in-memory (test profile) or MSSQL via Testcontainers. |
| **Speed** | ~2–10 s per test (context startup). |
| **What to test** | Multi-layer flows (controller → service → repo), DataSeeder correctness, transaction rollback, security integration. |
| **Naming** | `*IntegrationTest.java` or `*SmokeTest.java`. |
| **Location** | `src/test/java/com/sichrplace/backend/` |

**Existing:** `MssqlProfileSmokeTest.java` — 8 tests verifying context
loading, all 11 repositories, and custom query methods.

### Layer 4 — End-to-End / API Tests

| Aspect | Detail |
|--------|--------|
| **Spring context** | Full — `@SpringBootTest(webEnvironment = RANDOM_PORT)`. |
| **HTTP client** | `TestRestTemplate` or RestAssured. |
| **Speed** | ~5–15 s per test. |
| **What to test** | Complete request/response cycles including auth, error responses, pagination, CORS headers. |
| **Naming** | `*E2ETest.java` or `*ApiTest.java`. |
| **Location** | `src/test/java/com/sichrplace/backend/e2e/` |

**Example pattern:**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AuthApiE2ETest {
    @Autowired TestRestTemplate rest;

    @Test
    void register_login_profile_flow() {
        // 1. Register
        var reg = rest.postForEntity("/api/auth/register", body, Map.class);
        assertEquals(201, reg.getStatusCodeValue());

        // 2. Login
        var login = rest.postForEntity("/api/auth/login", creds, Map.class);
        String token = (String) login.getBody().get("accessToken");

        // 3. Get profile with token
        var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        var profile = rest.exchange("/api/auth/profile", GET,
                         new HttpEntity<>(headers), Map.class);
        assertEquals(200, profile.getStatusCodeValue());
    }
}
```

---

## 2. Naming & Placement Rules

| Pattern | Layer | Location |
|---------|-------|----------|
| `*Test.java` | Unit | `src/test/java/.../service/`, `.../dto/` |
| `*SliceTest.java` | Slice (JPA) | `src/test/java/.../repository/` |
| `*WebTest.java` | Slice (MVC) | `src/test/java/.../controller/` |
| `*IntegrationTest.java` | Integration | `src/test/java/.../` |
| `*SmokeTest.java` | Smoke / Integration | `src/test/java/.../` |
| `*E2ETest.java` | End-to-end | `src/test/java/.../e2e/` |
| `*ApiTest.java` | End-to-end | `src/test/java/.../e2e/` |

All tests run with `./gradlew test`.  No separate `integrationTest` source
set is needed at this project's scale — the H2 test profile keeps everything
fast.

---

## 3. Coverage Goals

### What "100 % coverage" means

- **Mandatory (≥ 95 %):** Service implementations, DTO `fromEntity()` methods,
  utility/helper classes, security filters, JWT provider.
- **High (≥ 80 %):** Controllers, repository custom query methods.
- **Acceptable (≥ 60 %):** Configuration classes, DataSeeder, application
  entry point.

### What is excluded from coverage

- Lombok-generated code (`@Data`, `@Builder`, `@Getter`/`@Setter`).
- Spring-generated JPA repository methods (`findAll`, `save`, `deleteById`).
- `SichrPlaceBackendApplication.main()`.

### Tooling

- **JaCoCo** — configured in `build.gradle` with XML + HTML reports.
- **COCO Rules** — per-package thresholds defined in `docs/coco_rules.yml`
  and enforced by `./gradlew checkCoco`.
- See [`docs/COCO_RULES.md`](COCO_RULES.md) for details.

---

## 4. Running Tests

### Basic test run

```bash
./gradlew test
```

### Test with coverage report

```bash
./gradlew testWithCoverage
```

Generates:
- HTML report: `build/reports/jacoco/test/html/index.html`
- XML report: `build/reports/jacoco/test/jacocoTestReport.xml`

### Test with COCO enforcement

```bash
./gradlew checkCoco
```

Runs tests → generates JaCoCo report → verifies per-package thresholds →
prints summary table → fails if any package is below target.

### Secrets check

```bash
./gradlew secretsCheck
```

Scans source files and configuration for hardcoded secrets.  Fails if any
high-severity pattern is found.

### Full CI pipeline (all checks)

```bash
./gradlew testWithCoverage checkCoco secretsCheck
```

---

## 5. Coverage Reports

### Where to find reports

| Report | Path |
|--------|------|
| HTML | `build/reports/jacoco/test/html/index.html` |
| XML | `build/reports/jacoco/test/jacocoTestReport.xml` |
| Console summary | Printed by `checkCoco` task |

### Reading the HTML report

Open `build/reports/jacoco/test/html/index.html` in a browser.  Navigate
by package → class → method.  Green = covered, red = uncovered, yellow =
branch partially covered.

---

## 6. Writing Good Tests — Checklist

### For every new feature:

- [ ] **Unit tests** for service logic (happy path + error paths).
- [ ] **Controller slice test** (`@WebMvcTest`) for each new endpoint.
- [ ] **DTO test** — verify `fromEntity()` maps all fields correctly.
- [ ] **Repository test** — if custom query methods are added.
- [ ] **Integration test** — at least one full-flow test.

### For every bug fix:

- [ ] **Regression test** — reproduces the bug, proves the fix works.

### Test quality principles:

1. **One assertion per concept** — test one behaviour per method.
2. **Descriptive names** — `confirmViewing_whenNotOwner_returns403()`.
3. **Arrange-Act-Assert** — clear structure in every test.
4. **No production side-effects** — no real emails, no real DB writes to
   external systems.
5. **Deterministic** — no dependency on time, random values, or external
   services (mock them).

---

## 7. CI Integration

The GitHub Actions workflow (`.github/workflows/deploy-backend.yml`)
runs the full pipeline on every push to `main`:

```yaml
- name: Run tests with coverage
  run: ./gradlew testWithCoverage --no-daemon

- name: COCO coverage check
  run: ./gradlew checkCoco --no-daemon

- name: Secrets check
  run: ./gradlew secretsCheck --no-daemon
```

If any step fails, the pipeline stops and the image is not pushed.

---

## 8. Next Test Waves

The current baseline has **8 smoke tests** covering bean wiring and basic
profile activation (~3.7 % overall instruction coverage).  The following
waves are planned in priority order:

| Wave | Focus | Suggested tests | Target coverage lift |
|------|-------|-----------------|---------------------|
| **Wave 1** | Service-layer unit tests | `AdminServiceTest`, `SavedSearchServiceTest`, `ViewingRequestServiceTest` — mock repositories, verify business rules | service → 40 %+ |
| **Wave 2** | Controller integration tests | `@WebMvcTest` for each controller, mock service layer, verify HTTP status & JSON shapes | controller → 30 %+ |
| **Wave 3** | Security filter tests | `JwtAuthenticationFilterTest`, `SecurityConfigTest` — valid/invalid/expired tokens, role-based access | security → 50 %+ |
| **Wave 4** | DTO validation & edge cases | `@Valid` constraint tests, null/blank fields, boundary values | dto → 60 %+ |
| **Wave 5** | End-to-end lifecycle tests | Full viewing-request flow (PENDING → CONFIRMED → CANCELLED), review moderation flow | overall → 50 %+ |

After each wave, ratchet the COCO targets following the process in
[COCO_RULES.md](COCO_RULES.md) §5.

See [`TEST_TODO.md`](TEST_TODO.md) for the detailed checklist of individual
test classes and edge cases.

---

## 9. Related Documents

| Document | Purpose |
|----------|---------|
| [`COCO_RULES.md`](COCO_RULES.md) | Per-package coverage targets and thresholds |
| [`SECURITY_AND_SECRETS.md`](SECURITY_AND_SECRETS.md) | Secrets management and scanning |
| [`ONBOARDING_README.md`](ONBOARDING_README.md) | Getting started guide |
| [`FEATURE_ROADMAP_SPRING_PORT.md`](FEATURE_ROADMAP_SPRING_PORT.md) | Template-driven porting roadmap |
