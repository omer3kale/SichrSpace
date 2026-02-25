package com.sichrplace.backend.service;

import com.paypal.core.PayPalHttpClient;
import com.paypal.http.HttpResponse;
import com.paypal.orders.*;
import com.sichrplace.backend.config.PayPalConfig;
import com.sichrplace.backend.dto.PaymentProviderSession;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayPalPaymentProviderClient")
class PayPalPaymentProviderClientTest {

    @Mock
    private PayPalHttpClient payPalHttpClient;

    @Mock
    private PayPalConfig payPalConfig;

    private PayPalPaymentProviderClient client;

    private PaymentTransaction sampleTx;
    private ViewingRequest sampleVr;

    @BeforeEach
    void setUp() {
        client = spy(new PayPalPaymentProviderClient(payPalHttpClient, payPalConfig));

        when(payPalConfig.getSuccessUrl()).thenReturn("http://localhost:3000/payments/success");
        when(payPalConfig.getCancelUrl()).thenReturn("http://localhost:3000/payments/cancel");

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
                .provider("paypal")
                .amount(BigDecimal.valueOf(50))
                .currency("EUR")
                .reference("100")
                .build();
    }

    @Test
    @DisplayName("createCheckoutSession returns provider session with id and approval URL")
    void createCheckoutSession_success() throws Exception {
        Order mockOrder = mock(Order.class);
        when(mockOrder.id()).thenReturn("PAYID-TEST123");
        LinkDescription approveLink = new LinkDescription();
        approveLink.rel("approve");
        approveLink.href("https://www.sandbox.paypal.com/checkoutnow?token=PAYID-TEST123");
        when(mockOrder.links()).thenReturn(List.of(approveLink));

        doReturn(mockOrder).when(client).executeCreateOrder(any(OrdersCreateRequest.class));

        PaymentProviderSession result = client.createCheckoutSession(sampleTx, sampleVr);

        assertNotNull(result);
        assertEquals("PAYID-TEST123", result.getProviderTransactionId());
        assertEquals("https://www.sandbox.paypal.com/checkoutnow?token=PAYID-TEST123", result.getRedirectUrl());
    }

    @Test
    @DisplayName("createCheckoutSession wraps IOException in IllegalStateException")
    void createCheckoutSession_ioError() throws Exception {
        doThrow(new IOException("Connection refused"))
                .when(client).executeCreateOrder(any(OrdersCreateRequest.class));

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> client.createCheckoutSession(sampleTx, sampleVr));

        assertTrue(ex.getMessage().contains("Payment provider error"));
        assertTrue(ex.getCause() instanceof IOException);
    }

    @Test
    @DisplayName("buildOrderRequest sets correct amount and currency")
    void buildOrderRequest_setsAmountAndCurrency() {
        OrderRequest orderRequest = client.buildOrderRequest(sampleTx, sampleVr);

        assertNotNull(orderRequest);
        assertEquals("CAPTURE", orderRequest.checkoutPaymentIntent());
        assertEquals(1, orderRequest.purchaseUnits().size());
        assertEquals("50", orderRequest.purchaseUnits().get(0).amountWithBreakdown().value());
        assertEquals("EUR", orderRequest.purchaseUnits().get(0).amountWithBreakdown().currencyCode());
    }

    @Test
    @DisplayName("buildOrderRequest includes viewing request reference")
    void buildOrderRequest_includesReference() {
        OrderRequest orderRequest = client.buildOrderRequest(sampleTx, sampleVr);

        assertEquals(String.valueOf(sampleTx.getId()), orderRequest.purchaseUnits().get(0).referenceId());
        assertTrue(orderRequest.purchaseUnits().get(0).description().contains("100"));
    }

    @Test
    @DisplayName("createCheckoutSession returns null URL when no approve link")
    void createCheckoutSession_noApproveLink() throws Exception {
        Order mockOrder = mock(Order.class);
        when(mockOrder.id()).thenReturn("PAYID-NOURL");
        LinkDescription selfLink = new LinkDescription();
        selfLink.rel("self");
        selfLink.href("https://api.sandbox.paypal.com/v2/checkout/orders/PAYID-NOURL");
        when(mockOrder.links()).thenReturn(List.of(selfLink));

        doReturn(mockOrder).when(client).executeCreateOrder(any(OrdersCreateRequest.class));

        PaymentProviderSession result = client.createCheckoutSession(sampleTx, sampleVr);

        assertEquals("PAYID-NOURL", result.getProviderTransactionId());
        assertNull(result.getRedirectUrl());
    }

    @Test
    @DisplayName("buildOrderRequest sets success and cancel URLs from config")
    void buildOrderRequest_urlsFromConfig() {
        OrderRequest orderRequest = client.buildOrderRequest(sampleTx, sampleVr);

        assertNotNull(orderRequest.applicationContext());
        verify(payPalConfig).getSuccessUrl();
        verify(payPalConfig).getCancelUrl();
    }
}
