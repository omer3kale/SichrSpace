package com.sichrplace.backend.service;

import com.paypal.core.PayPalHttpClient;
import com.paypal.orders.*;
import com.sichrplace.backend.config.PayPalConfig;
import com.sichrplace.backend.dto.PaymentProviderSession;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.ViewingRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

/**
 * PayPal implementation of {@link PaymentProviderClient}.
 *
 * <p>Creates a PayPal Order (checkout) using the PayPal Checkout SDK v2.
 * The returned approval URL is where the user is redirected to complete payment.</p>
 */
@Slf4j
@Service("paypalPaymentProviderClient")
@RequiredArgsConstructor
public class PayPalPaymentProviderClient implements PaymentProviderClient {

    private final PayPalHttpClient payPalHttpClient;
    private final PayPalConfig payPalConfig;

    @Override
    public PaymentProviderSession createCheckoutSession(PaymentTransaction tx, ViewingRequest vr) {
        try {
            OrderRequest orderRequest = buildOrderRequest(tx, vr);
            OrdersCreateRequest request = new OrdersCreateRequest();
            request.prefer("return=representation");
            request.requestBody(orderRequest);

            Order order = executeCreateOrder(request);

            String approvalUrl = order.links().stream()
                    .filter(link -> "approve".equals(link.rel()))
                    .map(LinkDescription::href)
                    .findFirst()
                    .orElse(null);

            log.info("PayPal order created: id={} for tx={}", order.id(), tx.getId());

            return PaymentProviderSession.builder()
                    .providerTransactionId(order.id())
                    .redirectUrl(approvalUrl)
                    .build();
        } catch (IOException e) {
            log.error("PayPal order creation failed for tx={}: {}", tx.getId(), e.getMessage(), e);
            throw new IllegalStateException("Payment provider error: " + e.getMessage(), e);
        }
    }

    OrderRequest buildOrderRequest(PaymentTransaction tx, ViewingRequest vr) {
        OrderRequest orderRequest = new OrderRequest();
        orderRequest.checkoutPaymentIntent("CAPTURE");

        ApplicationContext appContext = new ApplicationContext()
                .returnUrl(payPalConfig.getSuccessUrl() + "?transaction_id=" + tx.getId())
                .cancelUrl(payPalConfig.getCancelUrl())
                .brandName("SichrPlace")
                .userAction("PAY_NOW");
        orderRequest.applicationContext(appContext);

        PurchaseUnitRequest purchaseUnit = new PurchaseUnitRequest()
                .referenceId(String.valueOf(tx.getId()))
                .description("Viewing Request #" + vr.getId())
                .amountWithBreakdown(new AmountWithBreakdown()
                        .currencyCode(tx.getCurrency().toUpperCase(java.util.Locale.ROOT))
                        .value(tx.getAmount().toPlainString()));
        orderRequest.purchaseUnits(List.of(purchaseUnit));

        return orderRequest;
    }

    /**
     * Extracted for spy/mock override in tests.
     */
    Order executeCreateOrder(OrdersCreateRequest request) throws IOException {
        return payPalHttpClient.execute(request).result();
    }
}
