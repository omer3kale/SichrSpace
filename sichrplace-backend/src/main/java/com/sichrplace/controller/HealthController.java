package com.sichrplace.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final long startTime = System.currentTimeMillis();

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "timestamp", Instant.now().toString(),
                "uptime", (System.currentTimeMillis() - startTime) / 1000 + "s",
                "service", "SichrPlace Spring Boot Backend",
                "version", "1.0.0",
                "environment", System.getProperty("spring.profiles.active", "default")
        ));
    }
}
