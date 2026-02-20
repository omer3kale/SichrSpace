package com.sichrplace.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
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
}
