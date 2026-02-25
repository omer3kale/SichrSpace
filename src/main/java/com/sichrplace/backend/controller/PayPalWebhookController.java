package com.sichrplace.backend.controller;

import com.sichrplace.backend.service.PayPalWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Receives PayPal webhook events.
 *
 * <p>Unauthenticated endpoint — PayPal verifies events via webhook ID.
 * Production systems should validate the webhook signature using the
 * PayPal Notifications SDK, but this controller provides the endpoint
 * wiring and delegates to {@link PayPalWebhookService}.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/payments/paypal")
@RequiredArgsConstructor
@Tag(name = "Payments – PayPal Webhooks", description = "PayPal webhook receiver")
public class PayPalWebhookController {

    private final PayPalWebhookService payPalWebhookService;

    @PostMapping("/webhook")
    @Operation(summary = "Receive PayPal webhook event",
            description = "Parses PayPal event and updates payment transaction status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Event processed"),
            @ApiResponse(responseCode = "400", description = "Invalid payload")
    })
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestBody String payload) {

        if (payload == null || payload.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("received", false, "error", "Empty webhook payload"));
        }

        try {
            payPalWebhookService.handlePayPalWebhook(payload);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (IllegalArgumentException e) {
            log.warn("PayPal webhook rejected: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("received", false, "error", e.getMessage()));
        }
    }
}
