package com.sichrplace.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.PayPalConfig;
import com.sichrplace.backend.model.PaymentTransaction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Processes PayPal webhook events.
 *
 * <p>Parses the incoming JSON payload, maps PayPal event types to internal
 * {@link PaymentTransaction} status transitions, and notifies the
 * {@link PaymentDomainListener} for booking-aware reactions.</p>
 *
 * <h3>Supported events</h3>
 * <ul>
 *   <li>{@code CHECKOUT.ORDER.APPROVED} → COMPLETED</li>
 *   <li>{@code PAYMENT.CAPTURE.COMPLETED} → COMPLETED</li>
 *   <li>{@code PAYMENT.CAPTURE.DENIED} → FAILED</li>
 *   <li>{@code PAYMENT.CAPTURE.REFUNDED} → REFUNDED</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayPalWebhookService {

    private final PayPalConfig payPalConfig;
    private final PaymentTransactionService paymentTransactionService;
    private final PaymentDomainListener paymentDomainListener;
    private final ObjectMapper objectMapper;

    /**
     * Handle an incoming PayPal webhook event.
     *
     * @param payload raw JSON request body
     * @throws IllegalArgumentException if the payload is invalid or cannot be parsed
     */
    public void handlePayPalWebhook(String payload) {
        JsonNode root = parsePayload(payload);

        String eventType = extractEventType(root);
        String resourceId = extractResourceId(root);

        log.info("PayPal webhook received: type={} resourceId={}", eventType, resourceId);

        if (resourceId == null || resourceId.isBlank()) {
            log.warn("PayPal webhook missing resource ID for event type: {}", eventType);
            return;
        }

        switch (eventType) {
            case "CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED" -> handlePaymentCompleted(resourceId);
            case "PAYMENT.CAPTURE.DENIED" -> handlePaymentFailed(resourceId);
            case "PAYMENT.CAPTURE.REFUNDED" -> handlePaymentRefunded(resourceId);
            default -> log.info("Ignoring unhandled PayPal event type: {}", eventType);
        }
    }

    JsonNode parsePayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (JsonProcessingException e) {
            log.warn("PayPal webhook payload parsing failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid PayPal webhook payload", e);
        }
    }

    String extractEventType(JsonNode root) {
        JsonNode eventTypeNode = root.path("event_type");
        if (eventTypeNode.isMissingNode() || eventTypeNode.isNull()) {
            throw new IllegalArgumentException("PayPal webhook missing event_type field");
        }
        return eventTypeNode.asText();
    }

    String extractResourceId(JsonNode root) {
        JsonNode resource = root.path("resource");
        if (resource.isMissingNode() || resource.isNull()) {
            return null;
        }
        // For orders, the ID is directly on the resource
        JsonNode idNode = resource.path("id");
        if (!idNode.isMissingNode() && !idNode.isNull()) {
            return idNode.asText();
        }
        return null;
    }

    private void handlePaymentCompleted(String resourceId) {
        log.info("PayPal payment completed: resourceId={}", resourceId);
        PaymentTransaction tx = paymentTransactionService.markCompletedByProviderId(resourceId);
        paymentDomainListener.onPaymentCompleted(tx);
    }

    private void handlePaymentFailed(String resourceId) {
        log.info("PayPal payment denied: resourceId={}", resourceId);
        paymentTransactionService.markFailedByProviderId(resourceId, "Payment denied via PayPal webhook");
    }

    private void handlePaymentRefunded(String resourceId) {
        log.info("PayPal payment refunded: resourceId={}", resourceId);
        PaymentTransaction tx = paymentTransactionService.markRefundedByProviderId(resourceId);
        paymentDomainListener.onPaymentRefunded(tx);
    }
}
