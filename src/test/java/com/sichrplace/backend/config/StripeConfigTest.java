package com.sichrplace.backend.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("StripeConfig")
class StripeConfigTest {

    @Autowired
    private StripeConfig stripeConfig;

    @Test
    @DisplayName("StripeConfig bean is loaded with default placeholder values")
    void beanIsLoaded() {
        assertNotNull(stripeConfig);
        assertNotNull(stripeConfig.getPublishableKey());
        assertNotNull(stripeConfig.getSuccessUrl());
        assertNotNull(stripeConfig.getCancelUrl());
    }

    @Test
    @DisplayName("success and cancel URLs have sensible defaults")
    void urlDefaults() {
        assertTrue(stripeConfig.getSuccessUrl().contains("payments/success"));
        assertTrue(stripeConfig.getCancelUrl().contains("payments/cancel"));
    }
}
