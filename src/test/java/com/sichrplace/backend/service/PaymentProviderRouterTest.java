package com.sichrplace.backend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PaymentProviderRouter}.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentProviderRouter")
class PaymentProviderRouterTest {

    @Mock
    private StripePaymentProviderClient stripeClient;

    @Mock
    private PaymentProviderClient paypalClient;

    private PaymentProviderRouter router;

    @BeforeEach
    void setUp() {
        router = new PaymentProviderRouter(stripeClient, paypalClient);
    }

    @Test
    @DisplayName("resolve('stripe') returns Stripe client")
    void resolve_stripe_returnsStripeClient() {
        PaymentProviderClient result = router.resolve("stripe");
        assertSame(stripeClient, result);
    }

    @Test
    @DisplayName("resolve('paypal') returns PayPal client")
    void resolve_paypal_returnsPayPalClient() {
        PaymentProviderClient result = router.resolve("paypal");
        assertSame(paypalClient, result);
    }

    @Test
    @DisplayName("resolve is case-insensitive ('STRIPE')")
    void resolve_caseInsensitive_stripe() {
        assertSame(stripeClient, router.resolve("STRIPE"));
        assertSame(stripeClient, router.resolve("Stripe"));
    }

    @Test
    @DisplayName("resolve is case-insensitive ('PAYPAL')")
    void resolve_caseInsensitive_paypal() {
        assertSame(paypalClient, router.resolve("PAYPAL"));
        assertSame(paypalClient, router.resolve("PayPal"));
    }

    @Test
    @DisplayName("resolve(null) throws IllegalArgumentException")
    void resolve_null_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> router.resolve(null));
        assertTrue(ex.getMessage().toLowerCase().contains("provider"));
    }

    @Test
    @DisplayName("resolve('') throws IllegalArgumentException")
    void resolve_blank_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> router.resolve(""));
        assertTrue(ex.getMessage().toLowerCase().contains("provider"));
    }

    @Test
    @DisplayName("resolve('unknown') throws IllegalArgumentException")
    void resolve_unknownProvider_throws() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> router.resolve("bitcoin"));
        assertTrue(ex.getMessage().toLowerCase().contains("unsupported")
                || ex.getMessage().toLowerCase().contains("unknown"));
    }
}
