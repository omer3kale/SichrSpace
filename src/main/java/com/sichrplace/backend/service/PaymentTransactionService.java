package com.sichrplace.backend.service;

import com.sichrplace.backend.model.PaymentTransaction;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface PaymentTransactionService {

    PaymentTransaction createTransaction(String provider, BigDecimal amount, String currency, String reference);

    PaymentTransaction markPending(Long id);

    PaymentTransaction markCompleted(Long id);

    PaymentTransaction markFailed(Long id, String failureReason);

    PaymentTransaction markRefunded(Long id);

    /** Update the provider-side transaction id and mark the transaction as PENDING. */
    PaymentTransaction updateProviderDetails(Long id, String providerTransactionId);

    /** Mark COMPLETED by provider-side transaction ID (used by webhooks). */
    PaymentTransaction markCompletedByProviderId(String providerTransactionId);

    /** Mark FAILED by provider-side transaction ID with a reason (used by webhooks). */
    PaymentTransaction markFailedByProviderId(String providerTransactionId, String reason);

    /** Mark REFUNDED by provider-side transaction ID (used by webhooks). */
    PaymentTransaction markRefundedByProviderId(String providerTransactionId);

    Optional<PaymentTransaction> findByProviderTransactionId(String providerTransactionId);

    List<PaymentTransaction> findByReference(String reference);
}
