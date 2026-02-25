package com.sichrplace.backend.config;

import com.paypal.core.PayPalEnvironment;
import com.paypal.core.PayPalHttpClient;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * PayPal SDK configuration.
 *
 * <p>Reads credentials and URLs from environment variables / application properties.
 * Creates a {@link PayPalHttpClient} bean for use by the PayPal payment provider client.</p>
 */
@Slf4j
@Configuration
public class PayPalConfig {

    @Getter
    @Value("${paypal.client-id:${PAYPAL_CLIENT_ID:sb-test-placeholder}}")
    private String clientId;

    @Value("${paypal.client-secret:${PAYPAL_CLIENT_SECRET:sb-test-secret-placeholder}}")
    private String clientSecret;

    @Getter
    @Value("${paypal.mode:${PAYPAL_MODE:sandbox}}")
    private String mode;

    @Getter
    @Value("${paypal.success-url:${PAYPAL_SUCCESS_URL:http://localhost:3000/payments/success}}")
    private String successUrl;

    @Getter
    @Value("${paypal.cancel-url:${PAYPAL_CANCEL_URL:http://localhost:3000/payments/cancel}}")
    private String cancelUrl;

    @Getter
    @Value("${paypal.webhook-id:${PAYPAL_WEBHOOK_ID:}}")
    private String webhookId;

    @Bean
    public PayPalHttpClient payPalHttpClient() {
        PayPalEnvironment environment = "live".equalsIgnoreCase(mode)
                ? new PayPalEnvironment.Live(clientId, clientSecret)
                : new PayPalEnvironment.Sandbox(clientId, clientSecret);

        log.info("PayPal SDK initialised in {} mode (clientId starts with {}...)",
                mode, clientId.length() > 8 ? clientId.substring(0, 8) : "****");

        return new PayPalHttpClient(environment);
    }
}
