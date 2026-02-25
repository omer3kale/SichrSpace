package com.sichrplace.backend.controller;

import com.sichrplace.backend.service.StripeWebhookService;
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
 * Receives Stripe webhook events.
 *
 * <p>This endpoint is <strong>unauthenticated</strong> (no JWT required) —
 * security is enforced via Stripe signature verification inside
 * {@link StripeWebhookService}.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/payments/stripe")
@RequiredArgsConstructor
@Tag(name = "Payments – Stripe Webhooks", description = "Stripe webhook receiver")
public class StripeWebhookController {

    private final StripeWebhookService stripeWebhookService;

    @PostMapping("/webhook")
    @Operation(summary = "Receive Stripe webhook event",
            description = "Verifies signature and updates payment transaction status.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Event processed"),
            @ApiResponse(responseCode = "400", description = "Invalid signature or payload")
    })
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {

        if (signature == null || signature.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("received", false, "error", "Missing Stripe-Signature header"));
        }

        try {
            stripeWebhookService.handleStripeWebhook(payload, signature);
            return ResponseEntity.ok(Map.of("received", true));
        } catch (IllegalArgumentException e) {
            log.warn("Webhook rejected: {}", e.getMessage());
            return ResponseEntity.badRequest()
                    .body(Map.of("received", false, "error", e.getMessage()));
        }
    }
}
