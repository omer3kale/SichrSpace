package com.sichrplace.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.PayPalConfig;
import com.sichrplace.backend.model.PaymentTransaction;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PayPalWebhookService}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PayPalWebhookService")
class PayPalWebhookServiceTest {

    @Mock
    private PayPalConfig payPalConfig;

    @Mock
    private PaymentTransactionService paymentTransactionService;

    @Mock
    private PaymentDomainListener paymentDomainListener;

    private PayPalWebhookService webhookService;

    @BeforeEach
    void setUp() {
        webhookService = new PayPalWebhookService(
                payPalConfig, paymentTransactionService, paymentDomainListener, new ObjectMapper());
    }

    // ---- CHECKOUT.ORDER.APPROVED ----

    @Test
    @DisplayName("CHECKOUT.ORDER.APPROVED marks transaction COMPLETED and notifies listener")
    void checkoutOrderApproved_marksCompleted() {
        String payload = """
                {
                    "event_type": "CHECKOUT.ORDER.APPROVED",
                    "resource": { "id": "ORDER-123" }
                }
                """;
        PaymentTransaction tx = PaymentTransaction.builder().id(1L).build();
        when(paymentTransactionService.markCompletedByProviderId("ORDER-123")).thenReturn(tx);

        webhookService.handlePayPalWebhook(payload);

        verify(paymentTransactionService).markCompletedByProviderId("ORDER-123");
        verify(paymentDomainListener).onPaymentCompleted(tx);
    }

    // ---- PAYMENT.CAPTURE.COMPLETED ----

    @Test
    @DisplayName("PAYMENT.CAPTURE.COMPLETED marks transaction COMPLETED and notifies listener")
    void paymentCaptureCompleted_marksCompleted() {
        String payload = """
                {
                    "event_type": "PAYMENT.CAPTURE.COMPLETED",
                    "resource": { "id": "CAPTURE-456" }
                }
                """;
        PaymentTransaction tx = PaymentTransaction.builder().id(2L).build();
        when(paymentTransactionService.markCompletedByProviderId("CAPTURE-456")).thenReturn(tx);

        webhookService.handlePayPalWebhook(payload);

        verify(paymentTransactionService).markCompletedByProviderId("CAPTURE-456");
        verify(paymentDomainListener).onPaymentCompleted(tx);
    }

    // ---- PAYMENT.CAPTURE.DENIED ----

    @Test
    @DisplayName("PAYMENT.CAPTURE.DENIED marks transaction FAILED")
    void paymentCaptureDenied_marksFailed() {
        String payload = """
                {
                    "event_type": "PAYMENT.CAPTURE.DENIED",
                    "resource": { "id": "CAPTURE-789" }
                }
                """;

        webhookService.handlePayPalWebhook(payload);

        verify(paymentTransactionService).markFailedByProviderId("CAPTURE-789",
                "Payment denied via PayPal webhook");
        verifyNoInteractions(paymentDomainListener);
    }

    // ---- PAYMENT.CAPTURE.REFUNDED ----

    @Test
    @DisplayName("PAYMENT.CAPTURE.REFUNDED marks transaction REFUNDED and notifies listener")
    void paymentCaptureRefunded_marksRefunded() {
        String payload = """
                {
                    "event_type": "PAYMENT.CAPTURE.REFUNDED",
                    "resource": { "id": "REFUND-101" }
                }
                """;
        PaymentTransaction tx = PaymentTransaction.builder().id(3L).build();
        when(paymentTransactionService.markRefundedByProviderId("REFUND-101")).thenReturn(tx);

        webhookService.handlePayPalWebhook(payload);

        verify(paymentTransactionService).markRefundedByProviderId("REFUND-101");
        verify(paymentDomainListener).onPaymentRefunded(tx);
    }

    // ---- unknown event type ----

    @Test
    @DisplayName("Unknown event type is ignored without error")
    void unknownEventType_ignored() {
        String payload = """
                {
                    "event_type": "SOME.UNKNOWN.EVENT",
                    "resource": { "id": "UNKNOWN-1" }
                }
                """;

        assertDoesNotThrow(() -> webhookService.handlePayPalWebhook(payload));
        verifyNoInteractions(paymentTransactionService);
        verifyNoInteractions(paymentDomainListener);
    }

    // ---- malformed payload ----

    @Test
    @DisplayName("Non-JSON payload throws IllegalArgumentException")
    void malformedPayload_throwsIllegalArgument() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> webhookService.handlePayPalWebhook("not_valid_json"));
        assertTrue(ex.getMessage().contains("Invalid PayPal webhook payload"));
    }

    // ---- missing event_type ----

    @Test
    @DisplayName("Missing event_type field throws IllegalArgumentException")
    void missingEventType_throwsIllegalArgument() {
        String payload = """
                {
                    "resource": { "id": "NO-TYPE" }
                }
                """;

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> webhookService.handlePayPalWebhook(payload));
        assertTrue(ex.getMessage().contains("missing event_type"));
    }

    // ---- missing resource ----

    @Test
    @DisplayName("Missing resource does not throw, just logs warning")
    void missingResource_doesNotThrow() {
        String payload = """
                {
                    "event_type": "CHECKOUT.ORDER.APPROVED"
                }
                """;

        assertDoesNotThrow(() -> webhookService.handlePayPalWebhook(payload));
        verifyNoInteractions(paymentTransactionService);
    }

    // ---- missing resource id ----

    @Test
    @DisplayName("Resource without id does not throw, just logs warning")
    void missingResourceId_doesNotThrow() {
        String payload = """
                {
                    "event_type": "CHECKOUT.ORDER.APPROVED",
                    "resource": { "status": "COMPLETED" }
                }
                """;

        assertDoesNotThrow(() -> webhookService.handlePayPalWebhook(payload));
        verifyNoInteractions(paymentTransactionService);
    }
}
