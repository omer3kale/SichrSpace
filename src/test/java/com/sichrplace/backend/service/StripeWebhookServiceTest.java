package com.sichrplace.backend.service;

import com.sichrplace.backend.config.StripeConfig;
import com.sichrplace.backend.model.PaymentTransaction;
import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Charge;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link StripeWebhookService}.
 * Uses a spy to bypass real Stripe signature verification.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StripeWebhookService")
class StripeWebhookServiceTest {

    @Mock
    private StripeConfig stripeConfig;

    @Mock
    private PaymentTransactionService paymentTransactionService;

    @Mock
    private PaymentDomainListener paymentDomainListener;

    private StripeWebhookService webhookService;

    @BeforeEach
    void setUp() {
        webhookService = spy(new StripeWebhookService(stripeConfig, paymentTransactionService, paymentDomainListener));
    }

    // ---- checkout.session.completed ----

    @Test
    @DisplayName("checkout.session.completed marks transaction COMPLETED and notifies listener")
    void checkoutSessionCompleted_marksCompleted() {
        Session session = mock(Session.class);
        when(session.getId()).thenReturn("cs_test_completed");

        PaymentTransaction tx = PaymentTransaction.builder().id(1L).build();
        when(paymentTransactionService.markCompletedByProviderId("cs_test_completed")).thenReturn(tx);

        Event event = buildEvent("checkout.session.completed", session);
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        webhookService.handleStripeWebhook("payload", "sig");

        verify(paymentTransactionService).markCompletedByProviderId("cs_test_completed");
        verify(paymentDomainListener).onPaymentCompleted(tx);
    }

    // ---- payment_intent.payment_failed ----

    @Test
    @DisplayName("payment_intent.payment_failed marks transaction FAILED")
    void paymentIntentFailed_marksFailed() {
        PaymentIntent paymentIntent = mock(PaymentIntent.class);
        when(paymentIntent.getId()).thenReturn("pi_test_failed");

        Event event = buildEvent("payment_intent.payment_failed", paymentIntent);
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        webhookService.handleStripeWebhook("payload", "sig");

        verify(paymentTransactionService).markFailedByProviderId("pi_test_failed",
                "Payment failed via Stripe webhook");
    }

    // ---- charge.refunded ----

    @Test
    @DisplayName("charge.refunded marks transaction REFUNDED and notifies listener")
    void chargeRefunded_marksRefunded() {
        Charge charge = mock(Charge.class);
        when(charge.getId()).thenReturn("ch_test_refunded");

        PaymentTransaction tx = PaymentTransaction.builder().id(3L).build();
        when(paymentTransactionService.markRefundedByProviderId("ch_test_refunded")).thenReturn(tx);

        Event event = buildEvent("charge.refunded", charge);
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        webhookService.handleStripeWebhook("payload", "sig");

        verify(paymentTransactionService).markRefundedByProviderId("ch_test_refunded");
        verify(paymentDomainListener).onPaymentRefunded(tx);
    }

    // ---- unknown event type ----

    @Test
    @DisplayName("Unknown event type is ignored without error")
    void unknownEventType_ignored() {
        Event event = mock(Event.class);
        when(event.getType()).thenReturn("some.unknown.event");
        when(event.getId()).thenReturn("evt_test_unknown");
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        assertDoesNotThrow(() -> webhookService.handleStripeWebhook("payload", "sig"));

        verifyNoInteractions(paymentTransactionService);
    }

    // ---- idempotency (FTL-47) ----

    @Test
    @DisplayName("FTL-47: duplicate webhook event is silently ignored")
    void duplicateWebhookIgnored() {
        Session session = mock(Session.class);
        when(session.getId()).thenReturn("cs_test_dup");

        PaymentTransaction tx = PaymentTransaction.builder().id(10L).build();
        when(paymentTransactionService.markCompletedByProviderId("cs_test_dup")).thenReturn(tx);

        Event event = buildEvent("checkout.session.completed", session);
        // Override the default ID to use a specific one for this test
        when(event.getId()).thenReturn("evt_duplicate_test");
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        // First invocation — processes normally
        webhookService.handleStripeWebhook("payload", "sig");
        verify(paymentTransactionService, times(1)).markCompletedByProviderId("cs_test_dup");

        // Second invocation (same event ID) — should be ignored
        webhookService.handleStripeWebhook("payload", "sig");
        // Still only called once — the duplicate was rejected
        verify(paymentTransactionService, times(1)).markCompletedByProviderId("cs_test_dup");
    }

    // ---- signature verification failure ----

    @Test
    @DisplayName("Invalid signature throws IllegalArgumentException (SignatureVerificationException path)")
    void invalidSignature_throwsIllegalArgument() {
        when(stripeConfig.getWebhookSecret()).thenReturn("whsec_test");

        // Valid JSON payload + invalid signature → triggers SignatureVerificationException
        StripeWebhookService realService = new StripeWebhookService(stripeConfig, paymentTransactionService, paymentDomainListener);
        String validJsonPayload = "{\"id\":\"evt_test\",\"object\":\"event\",\"type\":\"checkout.session.completed\"}";

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realService.handleStripeWebhook(validJsonPayload, "t=123,v1=abc"));
        assertTrue(ex.getMessage().contains("Invalid Stripe webhook signature"));
    }

    @Test
    @DisplayName("Malformed payload throws IllegalArgumentException (generic Exception path)")
    void malformedPayload_throwsIllegalArgument() {
        when(stripeConfig.getWebhookSecret()).thenReturn("whsec_test");

        // Non-JSON payload → triggers JsonSyntaxException (caught by generic Exception catch)
        StripeWebhookService realService = new StripeWebhookService(stripeConfig, paymentTransactionService, paymentDomainListener);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> realService.handleStripeWebhook("not_json", "invalid_sig"));
        assertTrue(ex.getMessage().contains("Invalid Stripe webhook payload"));
    }

    // ---- empty data object ----

    @Test
    @DisplayName("checkout.session.completed with empty data object does not throw")
    void checkoutSessionCompleted_emptyDataObject() {
        Event event = buildEventWithEmptyData("checkout.session.completed");
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        assertDoesNotThrow(() -> webhookService.handleStripeWebhook("payload", "sig"));
        verifyNoInteractions(paymentTransactionService);
    }

    @Test
    @DisplayName("payment_intent.payment_failed with empty data object does not throw")
    void paymentIntentFailed_emptyDataObject() {
        Event event = buildEventWithEmptyData("payment_intent.payment_failed");
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        assertDoesNotThrow(() -> webhookService.handleStripeWebhook("payload", "sig"));
        verifyNoInteractions(paymentTransactionService);
    }

    @Test
    @DisplayName("charge.refunded with empty data object does not throw")
    void chargeRefunded_emptyDataObject() {
        Event event = buildEventWithEmptyData("charge.refunded");
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        assertDoesNotThrow(() -> webhookService.handleStripeWebhook("payload", "sig"));
        verifyNoInteractions(paymentTransactionService);
    }

    // ---- wrong data object type ----

    @Test
    @DisplayName("checkout.session.completed with wrong data type does not throw")
    void checkoutSessionCompleted_wrongDataType() {
        // Pass a Charge instead of Session
        Charge charge = mock(Charge.class);
        Event event = buildEvent("checkout.session.completed", charge);
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        assertDoesNotThrow(() -> webhookService.handleStripeWebhook("payload", "sig"));
        verifyNoInteractions(paymentTransactionService);
    }

    @Test
    @DisplayName("payment_intent.payment_failed with wrong data type does not throw")
    void paymentIntentFailed_wrongDataType() {
        // Pass a Session instead of PaymentIntent
        Session session = mock(Session.class);
        Event event = buildEvent("payment_intent.payment_failed", session);
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        assertDoesNotThrow(() -> webhookService.handleStripeWebhook("payload", "sig"));
        verifyNoInteractions(paymentTransactionService);
    }

    @Test
    @DisplayName("charge.refunded with wrong data type does not throw")
    void chargeRefunded_wrongDataType() {
        // Pass a Session instead of Charge
        Session session = mock(Session.class);
        Event event = buildEvent("charge.refunded", session);
        doReturn(event).when(webhookService).verifyAndConstructEvent("payload", "sig");

        assertDoesNotThrow(() -> webhookService.handleStripeWebhook("payload", "sig"));
        verifyNoInteractions(paymentTransactionService);
    }

    // ---- helpers ----

    private Event buildEvent(String type, StripeObject dataObject) {
        Event event = mock(Event.class);
        when(event.getType()).thenReturn(type);
        when(event.getId()).thenReturn("evt_test_" + type);

        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.of(dataObject));
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        return event;
    }

    private Event buildEventWithEmptyData(String type) {
        Event event = mock(Event.class);
        when(event.getType()).thenReturn(type);
        when(event.getId()).thenReturn("evt_test_empty_" + type);

        EventDataObjectDeserializer deserializer = mock(EventDataObjectDeserializer.class);
        when(deserializer.getObject()).thenReturn(Optional.empty());
        when(event.getDataObjectDeserializer()).thenReturn(deserializer);

        return event;
    }
}
