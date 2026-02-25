package com.sichrplace.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Routes payment requests to the correct {@link PaymentProviderClient}
 * based on the provider name stored on the {@link com.sichrplace.backend.model.PaymentTransaction}.
 *
 * <p>Supported providers: {@code stripe}, {@code paypal} (case-insensitive).</p>
 */
@Slf4j
@Component
public class PaymentProviderRouter {

    private final PaymentProviderClient stripeClient;
    private final PaymentProviderClient paypalClient;

    public PaymentProviderRouter(
            StripePaymentProviderClient stripeClient,
            @Qualifier("paypalPaymentProviderClient") PaymentProviderClient paypalClient) {
        this.stripeClient = stripeClient;
        this.paypalClient = paypalClient;
    }

    /**
     * Resolve the appropriate provider client for the given provider name.
     *
     * @param provider provider name (e.g. "stripe", "paypal")
     * @return the matching {@link PaymentProviderClient}
     * @throws IllegalArgumentException if the provider is unknown
     */
    public PaymentProviderClient resolve(String provider) {
        if (provider == null || provider.isBlank()) {
            throw new IllegalArgumentException("Payment provider must not be blank");
        }
        return switch (provider.toLowerCase(Locale.ROOT)) {
            case "stripe" -> stripeClient;
            case "paypal" -> paypalClient;
            default -> {
                log.warn("Unknown payment provider requested: {}", provider);
                throw new IllegalArgumentException("Unsupported payment provider: " + provider);
            }
        };
    }
}
