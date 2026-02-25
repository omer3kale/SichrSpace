package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.PaymentProviderSession;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.ViewingRequest;

/**
 * Abstraction over external payment providers (Stripe, PayPal, etc.).
 * Each provider implements this interface so the service layer
 * stays provider-agnostic.
 */
public interface PaymentProviderClient {

    /**
     * Create a checkout session with the external provider.
     *
     * @param tx the internal PaymentTransaction (already persisted)
     * @param vr the ViewingRequest that triggered the payment
     * @return a {@link PaymentProviderSession} containing the provider's session id and redirect URL
     * @throws IllegalStateException if the provider call fails
     */
    PaymentProviderSession createCheckoutSession(PaymentTransaction tx, ViewingRequest vr);
}
