package com.sichrplace.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Static content endpoints for navigation pages.
 * <p>
 * Returns stub JSON for About, FAQ, Customer Service, and Scam Stories pages.
 * These endpoints are public (no authentication required) and satisfy
 * ROADMAP_FTL Phase D §D1: "Replace dead About / FAQ / Customer Service /
 * Scam Stories links with feature-flagged stubs that return an explicit
 * coming-soon JSON with 501/204."
 */
@RestController
@RequestMapping("/api/content")
@Tag(name = "Content", description = "Static content pages")
public class ContentController {

    @GetMapping("/about")
    @Operation(summary = "About page content")
    public ResponseEntity<Map<String, Object>> about() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("page", "about");
        body.put("title", "About SichrPlace");
        body.put("status", "coming-soon");
        body.put("description", "SichrPlace is a modern apartment rental platform connecting landlords and tenants.");
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(501).body(body);
    }

    @GetMapping("/faq")
    @Operation(summary = "FAQ page content")
    public ResponseEntity<Map<String, Object>> faq() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("page", "faq");
        body.put("title", "Frequently Asked Questions");
        body.put("status", "coming-soon");
        body.put("items", List.of(
                Map.of("question", "How do I register?", "answer", "Coming soon."),
                Map.of("question", "How do I search for apartments?", "answer", "Coming soon."),
                Map.of("question", "How does the booking process work?", "answer", "Coming soon.")
        ));
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(501).body(body);
    }

    @GetMapping("/customer-service")
    @Operation(summary = "Customer service contact information")
    public ResponseEntity<Map<String, Object>> customerService() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("page", "customer-service");
        body.put("title", "Customer Service");
        body.put("status", "coming-soon");
        body.put("contact", Map.of(
                "email", "support@sichrplace.com",
                "hours", "Mon-Fri 09:00-17:00 CET"
        ));
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(501).body(body);
    }

    @GetMapping("/scam-stories")
    @Operation(summary = "Scam awareness stories and tips")
    public ResponseEntity<Map<String, Object>> scamStories() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("page", "scam-stories");
        body.put("title", "Scam Awareness");
        body.put("status", "coming-soon");
        body.put("description", "Learn how to identify and avoid rental scams.");
        body.put("tips", List.of(
                "Never send money before viewing an apartment.",
                "Verify the landlord's identity through the platform.",
                "Report suspicious listings immediately."
        ));
        body.put("timestamp", Instant.now().toString());
        return ResponseEntity.status(501).body(body);
    }
}
