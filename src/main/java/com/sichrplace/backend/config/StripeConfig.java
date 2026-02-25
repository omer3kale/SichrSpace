package com.sichrplace.backend.config;

import com.stripe.Stripe;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Configures the Stripe SDK with the API key read from the environment.
 *
 * <p>Required environment variables / properties:
 * <ul>
 *   <li>{@code STRIPE_SECRET_KEY} — Stripe secret key (sk_test_... / sk_live_...)</li>
 *   <li>{@code STRIPE_PUBLISHABLE_KEY} — Stripe publishable key (pk_test_... / pk_live_...)</li>
 *   <li>{@code STRIPE_SUCCESS_URL} — URL the user is redirected to after a successful payment</li>
 *   <li>{@code STRIPE_CANCEL_URL} — URL the user is redirected to if they cancel</li>
 * </ul>
 */
@Slf4j
@Configuration
public class StripeConfig {

    @Value("${stripe.secret-key:${STRIPE_SECRET_KEY:sk_test_placeholder}}")
    private String secretKey;

    @Getter
    @Value("${stripe.publishable-key:${STRIPE_PUBLISHABLE_KEY:pk_test_placeholder}}")
    private String publishableKey;

    @Getter
    @Value("${stripe.success-url:${STRIPE_SUCCESS_URL:http://localhost:3000/payments/success}}")
    private String successUrl;

    @Getter
    @Value("${stripe.cancel-url:${STRIPE_CANCEL_URL:http://localhost:3000/payments/cancel}}")
    private String cancelUrl;

    @Getter
    @Value("${stripe.webhook-secret:${STRIPE_WEBHOOK_SECRET:whsec_test_placeholder}}")
    private String webhookSecret;

    @PostConstruct
    void init() {
        Stripe.apiKey = secretKey;
        log.info("Stripe SDK initialised (key starts with {}...)",
                secretKey.length() > 8 ? secretKey.substring(0, 8) : "****");
    }
}
