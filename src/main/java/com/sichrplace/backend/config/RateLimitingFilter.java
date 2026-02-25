package com.sichrplace.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.dto.ApiErrorResponse;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP rate-limiting filter protecting sensitive auth endpoints.
 *
 * <p>Uses Bucket4j token-bucket algorithm with in-memory storage (no Redis required).
 * Limits are applied independently per client IP on these paths:
 * <ul>
 *   <li>{@code POST /api/auth/login}</li>
 *   <li>{@code POST /api/auth/register}</li>
 *   <li>{@code POST /api/auth/forgot-password}</li>
 *   <li>{@code POST /api/auth/refresh}</li>
 * </ul>
 *
 * <p>Configuration via {@code application.yml} (defaults in parentheses):
 * <ul>
 *   <li>{@code app.ratelimit.capacity} — max tokens per IP (10)</li>
 *   <li>{@code app.ratelimit.refillTokens} — tokens added per refill period (10)</li>
 *   <li>{@code app.ratelimit.refillSeconds} — refill period in seconds (60)</li>
 * </ul>
 * After exhausting the bucket the filter returns {@code 429 Too Many Requests}
 * with a {@code Retry-After: <refillSeconds>} header.
 *
 * <p><strong>Teaching note:</strong> This is a simple in-process rate limiter.
 * For multi-instance deployments, replace with a Redis-backed Bucket4j store.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitingFilter extends OncePerRequestFilter {

    /** Maximum tokens per IP bucket. Configurable via {@code app.ratelimit.capacity}. */
    @Value("${app.ratelimit.capacity:10}")
    private int capacity;

    /** Tokens added per refill period. Configurable via {@code app.ratelimit.refillTokens}. */
    @Value("${app.ratelimit.refillTokens:10}")
    private int refillTokens;

    /**
     * Refill period in seconds. Configurable via {@code app.ratelimit.refillSeconds}.
     * After exhausting the bucket the filter returns {@code 429} with
     * {@code Retry-After: <refillSeconds>} header.
     */
    @Value("${app.ratelimit.refillSeconds:60}")
    private long refillSeconds;

    /** Paths subject to rate limiting (POST only). */
    private static final Set<String> RATE_LIMITED_PATHS = Set.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/forgot-password",
            "/api/auth/refresh"
    );

    /** In-memory bucket cache: clientKey → Bucket. */
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method) && RATE_LIMITED_PATHS.contains(path)) {
            String clientKey = resolveClientKey(request);
            Bucket bucket = buckets.computeIfAbsent(clientKey, k -> buildBucket());

            if (!bucket.tryConsume(1)) {
                log.warn("Rate limit exceeded — ip={} path={}", clientKey, path);
                sendRateLimitResponse(request, response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    // ── helpers ─────────────────────────────────────────────────────────────

    private String resolveClientKey(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Use only the first IP if there are multiple proxies
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private Bucket buildBucket() {
        Bandwidth limit = Bandwidth.classic(
                capacity,
                Refill.greedy(refillTokens, Duration.ofSeconds(refillSeconds))
        );
        return Bucket.builder().addLimit(limit).build();
    }

    private void sendRateLimitResponse(HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Retry-After", String.valueOf(refillSeconds));

        ApiErrorResponse body = ApiErrorResponse.builder()
                .status(429)
                .error("Too Many Requests")
                .message("Rate limit exceeded. Please wait " + refillSeconds + " seconds.")
                .errorCode("RATE_LIMIT_EXCEEDED")
                .path(request.getRequestURI())
                .timestamp(Instant.now())
                .build();

        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
