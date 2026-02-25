package com.sichrplace.backend.service;

import com.sichrplace.backend.config.StripeConfig;
import com.sichrplace.backend.model.PaymentTransaction;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Charge;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Processes Stripe webhook events.
 *
 * <p>Verifies the event signature using the configured webhook secret,
 * then dispatches status transitions to {@link PaymentTransactionService}
 * based on the event type.</p>
 *
 * <p><strong>Idempotency (FTL-47):</strong> Each processed event ID is cached
 * in-memory. Duplicate deliveries of the same event are silently ignored.</p>
 *
 * <p>Supported events:</p>
 * <ul>
 *   <li>{@code checkout.session.completed} → COMPLETED</li>
 *   <li>{@code payment_intent.payment_failed} → FAILED</li>
 *   <li>{@code charge.refunded} → REFUNDED</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StripeWebhookService {

    /** Max number of event IDs to keep in the deduplication cache. */
    private static final int MAX_PROCESSED_EVENTS = 10_000;

    private final StripeConfig stripeConfig;
    private final PaymentTransactionService paymentTransactionService;
    private final PaymentDomainListener paymentDomainListener;

    /**
     * Thread-safe LRU set: remembers the last {@value MAX_PROCESSED_EVENTS}
     * processed Stripe event IDs so duplicates are silently ignored.
     */
    private final Set<String> processedEventIds = Collections.newSetFromMap(
            Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Boolean> eldest) {
                    return size() > MAX_PROCESSED_EVENTS;
                }
            }));

    /**
     * Handle an incoming Stripe webhook.
     *
     * @param payload   raw request body
     * @param signature value of the {@code Stripe-Signature} header
     * @throws IllegalArgumentException if signature verification fails
     */
    public void handleStripeWebhook(String payload, String signature) {
        Event event = verifyAndConstructEvent(payload, signature);

        // FTL-47: Idempotency guard — skip already-processed events
        if (!processedEventIds.add(event.getId())) {
            log.info("Duplicate Stripe webhook ignored: id={}", event.getId());
            return;
        }

        String eventType = event.getType();
        log.info("Stripe webhook received: type={} id={}", eventType, event.getId());

        switch (eventType) {
            case "checkout.session.completed" -> handleCheckoutSessionCompleted(event);
            case "payment_intent.payment_failed" -> handlePaymentFailed(event);
            case "charge.refunded" -> handleChargeRefunded(event);
            default -> log.info("Ignoring unhandled Stripe event type: {}", eventType);
        }
    }

    /**
     * Verify the event signature and construct the Event.
     * Extracted to allow test overrides without mockStatic.
     */
    Event verifyAndConstructEvent(String payload, String signature) {
        try {
            return Webhook.constructEvent(payload, signature, stripeConfig.getWebhookSecret());
        } catch (SignatureVerificationException e) {
            log.warn("Stripe webhook signature verification failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid Stripe webhook signature", e);
        } catch (Exception e) {
            log.warn("Stripe webhook event construction failed: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid Stripe webhook payload", e);
        }
    }

    private void handleCheckoutSessionCompleted(Event event) {
        Session session = extractSession(event);
        if (session == null) return;

        String sessionId = session.getId();
        log.info("Checkout session completed: sessionId={}", sessionId);
        PaymentTransaction tx = paymentTransactionService.markCompletedByProviderId(sessionId);
        paymentDomainListener.onPaymentCompleted(tx);
    }

    private void handlePaymentFailed(Event event) {
        var dataObject = event.getDataObjectDeserializer().getObject();
        if (dataObject.isEmpty()) {
            log.warn("Could not deserialise payment_intent.payment_failed data object");
            return;
        }
        if (!(dataObject.get() instanceof PaymentIntent paymentIntent)) {
            log.warn("payment_intent.payment_failed data object is not a PaymentIntent: {}",
                    dataObject.get().getClass().getSimpleName());
            return;
        }
        String paymentIntentId = paymentIntent.getId();
        log.info("Payment intent failed: id={}", paymentIntentId);
        paymentTransactionService.markFailedByProviderId(paymentIntentId, "Payment failed via Stripe webhook");
    }

    private void handleChargeRefunded(Event event) {
        var dataObject = event.getDataObjectDeserializer().getObject();
        if (dataObject.isEmpty()) {
            log.warn("Could not deserialise charge.refunded data object");
            return;
        }
        if (!(dataObject.get() instanceof Charge charge)) {
            log.warn("charge.refunded data object is not a Charge: {}",
                    dataObject.get().getClass().getSimpleName());
            return;
        }
        String chargeId = charge.getId();
        log.info("Charge refunded: id={}", chargeId);
        PaymentTransaction tx = paymentTransactionService.markRefundedByProviderId(chargeId);
        paymentDomainListener.onPaymentRefunded(tx);
    }

    private Session extractSession(Event event) {
        var dataObject = event.getDataObjectDeserializer().getObject();
        if (dataObject.isEmpty()) {
            log.warn("Could not deserialise checkout.session.completed data object");
            return null;
        }
        if (dataObject.get() instanceof Session session) {
            return session;
        }
        log.warn("checkout.session.completed data object is not a Session: {}",
                dataObject.get().getClass().getSimpleName());
        return null;
    }
}
