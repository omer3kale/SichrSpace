package com.sichrplace.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Health-check endpoint for load-balancer probes and uptime monitoring.
 * <p>
 * Returns HTTP 200 with status, version, and server timestamp.
 * This endpoint is public (no authentication required).
 */
@RestController
@RequestMapping("/api")
@Tag(name = "Health", description = "Application health check")
public class HealthController {

    private final JdbcTemplate jdbcTemplate;

    @Value("${stripe.api.key:not-configured}")
    private String stripeApiKey;

    @Value("${paypal.client.id:not-configured}")
    private String paypalClientId;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Value("${spring.application.name:sichrplace-backend}")
    private String appName;

    private final Instant startedAt = Instant.now();

    @GetMapping("/health")
    @Operation(summary = "Health check — returns application status")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "UP");
        response.put("application", appName);
        response.put("timestamp", Instant.now().toString());
        response.put("uptime", java.time.Duration.between(startedAt, Instant.now()).toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health/db-readiness")
    @Operation(summary = "Database readiness check — verifies SQL connectivity")
    public ResponseEntity<Map<String, Object>> dbReadiness() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("application", appName);
        response.put("timestamp", Instant.now().toString());

        try {
            Integer one = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            Integer usersCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM dbo.users", Integer.class);
            response.put("status", "UP");
            response.put("db", "UP");
            response.put("probe", one);
            response.put("usersCount", usersCount);
            return ResponseEntity.ok(response);
        } catch (DataAccessException ex) {
            response.put("status", "DOWN");
            response.put("db", "DOWN");
            response.put("error", ex.getMostSpecificCause().getMessage());
            return ResponseEntity.status(503).body(response);
        }
    }

    @GetMapping("/health/payments")
    @Operation(summary = "Payment providers health check — reports configuration status")
    public ResponseEntity<Map<String, Object>> paymentsHealth() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("timestamp", Instant.now().toString());

        boolean stripeConfigured = stripeApiKey != null
                && !stripeApiKey.isBlank()
                && !"not-configured".equals(stripeApiKey);
        boolean paypalConfigured = paypalClientId != null
                && !paypalClientId.isBlank()
                && !"not-configured".equals(paypalClientId);

        Map<String, Object> stripe = new LinkedHashMap<>();
        stripe.put("configured", stripeConfigured);
        stripe.put("provider", "stripe");

        Map<String, Object> paypal = new LinkedHashMap<>();
        paypal.put("configured", paypalConfigured);
        paypal.put("provider", "paypal");

        response.put("stripe", stripe);
        response.put("paypal", paypal);
        response.put("status", (stripeConfigured || paypalConfigured) ? "UP" : "DEGRADED");
        return ResponseEntity.ok(response);
    }
}
