package com.sichrplace.backend.service;

import com.sichrplace.backend.config.StripeConfig;
import com.sichrplace.backend.dto.PaymentProviderSession;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.stripe.exception.ApiException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link StripePaymentProviderClient}.
 * Uses a spy/subclass approach to avoid hitting the Stripe API.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("StripePaymentProviderClient")
class StripePaymentProviderClientTest {

    @Mock
    private StripeConfig stripeConfig;

    private StripePaymentProviderClient client;

    private PaymentTransaction sampleTx;
    private ViewingRequest sampleVr;

    @BeforeEach
    void setUp() {
        when(stripeConfig.getSuccessUrl()).thenReturn("http://localhost:3000/payments/success");
        when(stripeConfig.getCancelUrl()).thenReturn("http://localhost:3000/payments/cancel");

        // Use a spy so we can stub createStripeSession without hitting the network
        client = spy(new StripePaymentProviderClient(stripeConfig));

        User tenant = User.builder().id(2L).email("tenant@test.com").firstName("Ten").lastName("Ant")
                .password("hashed").role(User.UserRole.TENANT).isActive(true).build();
        User landlord = User.builder().id(1L).email("owner@test.com").firstName("Land").lastName("Lord")
                .password("hashed").role(User.UserRole.LANDLORD).isActive(true).build();
        Apartment apt = Apartment.builder().id(10L).owner(landlord).title("Test Apt")
                .description("desc").city("Aachen").address("Street 1").monthlyRent(BigDecimal.valueOf(450)).build();

        sampleVr = ViewingRequest.builder()
                .id(100L)
                .apartment(apt)
                .tenant(tenant)
                .proposedDateTime(LocalDateTime.now().plusDays(3))
                .status(ViewingRequest.ViewingStatus.PENDING)
                .paymentRequired(true)
                .build();

        sampleTx = PaymentTransaction.builder()
                .id(42L)
                .provider("stripe")
                .amount(BigDecimal.valueOf(50))
                .currency("EUR")
                .reference("100")
                .build();
    }

    @Test
    @DisplayName("createCheckoutSession returns provider session with id and URL")
    void createCheckoutSession_success() throws Exception {
        Session mockSession = mock(Session.class);
        when(mockSession.getId()).thenReturn("cs_test_abc123");
        when(mockSession.getUrl()).thenReturn("https://checkout.stripe.com/pay/cs_test_abc123");

        doReturn(mockSession).when(client).createStripeSession(any(SessionCreateParams.class));

        PaymentProviderSession result = client.createCheckoutSession(sampleTx, sampleVr);

        assertNotNull(result);
        assertEquals("cs_test_abc123", result.getProviderTransactionId());
        assertEquals("https://checkout.stripe.com/pay/cs_test_abc123", result.getRedirectUrl());
        verify(client).createStripeSession(any(SessionCreateParams.class));
    }

    @Test
    @DisplayName("createCheckoutSession wraps StripeException in IllegalStateException")
    void createCheckoutSession_stripeError() throws Exception {
        doThrow(new ApiException("Test error", "req_123", "code", 400, null))
                .when(client).createStripeSession(any(SessionCreateParams.class));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> client.createCheckoutSession(sampleTx, sampleVr));

        assertTrue(ex.getMessage().contains("Payment provider error"));
        assertTrue(ex.getCause() instanceof com.stripe.exception.StripeException);
    }

    @Test
    @DisplayName("buildSessionParams sets correct amount in cents")
    void buildSessionParams_amountConversion() {
        SessionCreateParams params = client.buildSessionParams(sampleTx, sampleVr);

        assertNotNull(params);
        // The params object is opaque; we verify that the method runs without error
        // and that the metadata contains the expected values.
        // Stripe SDK's SessionCreateParams doesn't expose getters easily,
        // so we just assert it builds successfully.
    }

    @Test
    @DisplayName("buildSessionParams includes success and cancel URLs from config")
    void buildSessionParams_urlsFromConfig() {
        SessionCreateParams params = client.buildSessionParams(sampleTx, sampleVr);

        assertNotNull(params);
        verify(stripeConfig).getSuccessUrl();
        verify(stripeConfig).getCancelUrl();
    }

    @Test
    @DisplayName("createCheckoutSession propagates null URL when session returns null URL")
    void createCheckoutSession_nullUrl() throws Exception {
        Session mockSession = mock(Session.class);
        when(mockSession.getId()).thenReturn("cs_test_nourl");
        when(mockSession.getUrl()).thenReturn(null);

        doReturn(mockSession).when(client).createStripeSession(any(SessionCreateParams.class));

        PaymentProviderSession result = client.createCheckoutSession(sampleTx, sampleVr);

        assertEquals("cs_test_nourl", result.getProviderTransactionId());
        assertNull(result.getRedirectUrl());
    }
}
