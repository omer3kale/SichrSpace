package com.sichrplace.backend.service;

import com.sichrplace.backend.config.StripeConfig;
import com.sichrplace.backend.dto.PaymentProviderSession;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.ViewingRequest;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Stripe implementation of {@link PaymentProviderClient}.
 *
 * <p>Creates a Stripe Checkout Session for the given {@link PaymentTransaction}
 * and returns the session id + redirect URL so the frontend can redirect
 * the user to Stripe-hosted checkout.</p>
 *
 * <p>No webhook handling — that is deferred to P3-5.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class StripePaymentProviderClient implements PaymentProviderClient {

    private final StripeConfig stripeConfig;

    @Override
    public PaymentProviderSession createCheckoutSession(PaymentTransaction tx, ViewingRequest vr) {
        try {
            SessionCreateParams params = buildSessionParams(tx, vr);
            Session session = createStripeSession(params);

            log.info("Stripe checkout session created: id={} for tx={}", session.getId(), tx.getId());

            return PaymentProviderSession.builder()
                    .providerTransactionId(session.getId())
                    .redirectUrl(session.getUrl())
                    .build();
        } catch (StripeException e) {
            log.error("Stripe session creation failed for tx={}: {}", tx.getId(), e.getMessage(), e);
            throw new IllegalStateException("Payment provider error: " + e.getMessage(), e);
        }
    }

    /**
     * Builds the Stripe SDK parameter object. Package-private for testability.
     */
    SessionCreateParams buildSessionParams(PaymentTransaction tx, ViewingRequest vr) {
        long amountInCents = tx.getAmount().movePointRight(2).longValueExact();

        return SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(stripeConfig.getSuccessUrl() + "?session_id={CHECKOUT_SESSION_ID}")
                .setCancelUrl(stripeConfig.getCancelUrl())
                .addLineItem(SessionCreateParams.LineItem.builder()
                        .setQuantity(1L)
                        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                .setCurrency(tx.getCurrency().toLowerCase())
                                .setUnitAmount(amountInCents)
                                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                        .setName("Viewing Request #" + vr.getId())
                                        .setDescription("Payment for apartment viewing request")
                                        .build())
                                .build())
                        .build())
                .putMetadata("payment_transaction_id", String.valueOf(tx.getId()))
                .putMetadata("viewing_request_id", String.valueOf(vr.getId()))
                .build();
    }

    /**
     * Calls the Stripe SDK. Extracted into a separate method so unit tests
     * can override or mock this single call without {@code mockStatic}.
     */
    Session createStripeSession(SessionCreateParams params) throws StripeException {
        return Session.create(params);
    }
}
