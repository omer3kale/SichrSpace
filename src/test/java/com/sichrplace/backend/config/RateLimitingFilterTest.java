package com.sichrplace.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link RateLimitingFilter}.
 *
 * <p>Each test uses capacity=1 so the bucket is exhausted after a single token
 * consumption.  Tests verify:
 * <ul>
 *   <li>First POST to a rate-limited path passes through (200)</li>
 *   <li>Second POST from the same IP returns 429 with RATE_LIMIT_EXCEEDED and Retry-After</li>
 *   <li>Non-rate-limited paths are never counted (GET, non-auth POST)</li>
 *   <li>X-Forwarded-For header is used as the bucket key</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("RateLimitingFilter")
class RateLimitingFilterTest {

    private RateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        filter = new RateLimitingFilter(objectMapper);
        // Capacity = 1: the first request consumes the only token → second is rejected
        ReflectionTestUtils.setField(filter, "capacity", 1);
        ReflectionTestUtils.setField(filter, "refillTokens", 1);
        ReflectionTestUtils.setField(filter, "refillSeconds", 60L);
    }

    // ── happy path ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("First POST /api/auth/login passes through (200)")
    void firstRequest_passesThrough() throws Exception {
        MockHttpServletRequest  request  = buildPost("/api/auth/login", "10.0.0.1");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        // chain.doFilter() was called — chain recorded the request
        assertThat(chain.getRequest()).isNotNull();
    }

    // ── rate limiting ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("Second POST /api/auth/login from same IP returns 429 with RATE_LIMIT_EXCEEDED")
    void secondRequest_returns429() throws Exception {
        String ip = "10.0.0.2";

        // First request exhausts the single token
        filter.doFilter(buildPost("/api/auth/login", ip),
                        new MockHttpServletResponse(),
                        new MockFilterChain());

        // Second request → bucket empty → 429
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain         chain    = new MockFilterChain();
        filter.doFilter(buildPost("/api/auth/login", ip), response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(response.getHeader("Retry-After")).isEqualTo("60");
        assertThat(response.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
        // chain.doFilter() was NOT called — chain has no recorded request
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    @DisplayName("POST /api/auth/register returns 429 after bucket exhausted")
    void register_returns429AfterBucketExhausted() throws Exception {
        String ip = "10.0.0.3";

        filter.doFilter(buildPost("/api/auth/register", ip),
                        new MockHttpServletResponse(),
                        new MockFilterChain());

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(buildPost("/api/auth/register", ip), response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(429);
    }

    // ── bypass ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/apartments bypasses rate limiting even after many requests")
    void getRequest_bypassesRateLimit() throws Exception {
        String ip = "10.0.0.4";
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest  request  = new MockHttpServletRequest("GET", "/api/apartments");
            request.setRemoteAddr(ip);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain         chain    = new MockFilterChain();

            filter.doFilter(request, response, chain);

            assertThat(response.getStatus()).isEqualTo(200);
            assertThat(chain.getRequest()).isNotNull();
        }
    }

    @Test
    @DisplayName("POST to non-auth path is not rate-limited")
    void postToNonAuthPath_notRateLimited() throws Exception {
        String ip = "10.0.0.5";
        for (int i = 0; i < 3; i++) {
            MockHttpServletRequest  request  = buildPost("/api/apartments", ip);
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain         chain    = new MockFilterChain();

            filter.doFilter(request, response, chain);

            assertThat(response.getStatus()).isEqualTo(200);
        }
    }

    // ── IP resolution ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("X-Forwarded-For header is used as the per-IP bucket key")
    void xForwardedFor_usedAsBucketKey() throws Exception {
        String forwardedIp = "203.0.113.5";

        // First request via proxy — consumes the single token
        MockHttpServletRequest req1 = buildPost("/api/auth/refresh", "172.16.0.1");
        req1.addHeader("X-Forwarded-For", forwardedIp + ", 10.0.0.1");
        filter.doFilter(req1, new MockHttpServletResponse(), new MockFilterChain());

        // Second request via same proxy IP → bucket empty → 429
        MockHttpServletRequest  req2     = buildPost("/api/auth/refresh", "172.16.0.2");
        req2.addHeader("X-Forwarded-For", forwardedIp + ", 10.0.0.2");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(req2, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(429);
    }

    @Test
    @DisplayName("Two IPs are tracked independently — different IPs do not share buckets")
    void differentIps_haveIndependentBuckets() throws Exception {
        // IP A consumes its token
        filter.doFilter(buildPost("/api/auth/login", "10.1.0.1"),
                        new MockHttpServletResponse(),
                        new MockFilterChain());

        // IP B still has a full bucket → passes through
        MockHttpServletResponse responseB = new MockHttpServletResponse();
        filter.doFilter(buildPost("/api/auth/login", "10.1.0.2"), responseB, new MockFilterChain());

        assertThat(responseB.getStatus()).isEqualTo(200);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static MockHttpServletRequest buildPost(String path, String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.setRemoteAddr(remoteAddr);
        return request;
    }
}
