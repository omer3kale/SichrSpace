package com.sichrplace.backend.service;

import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.PaymentTransaction.PaymentTransactionStatus;
import com.sichrplace.backend.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentTransactionServiceImpl implements PaymentTransactionService {

    private final PaymentTransactionRepository paymentTransactionRepository;

    /** Valid transitions: CREATED → PENDING → COMPLETED / FAILED, COMPLETED → REFUNDED */
    private static final java.util.Map<PaymentTransactionStatus, Set<PaymentTransactionStatus>> VALID_TRANSITIONS =
            java.util.Map.of(
                    PaymentTransactionStatus.CREATED, Set.of(PaymentTransactionStatus.PENDING, PaymentTransactionStatus.FAILED),
                    PaymentTransactionStatus.PENDING, Set.of(PaymentTransactionStatus.COMPLETED, PaymentTransactionStatus.FAILED),
                    PaymentTransactionStatus.COMPLETED, Set.of(PaymentTransactionStatus.REFUNDED),
                    PaymentTransactionStatus.FAILED, Set.of(),
                    PaymentTransactionStatus.REFUNDED, Set.of()
            );

    @Override
    @Transactional
    public PaymentTransaction createTransaction(String provider, BigDecimal amount, String currency, String reference) {
        PaymentTransaction transaction = PaymentTransaction.builder()
                .provider(provider)
                .amount(amount)
                .currency(currency)
                .reference(reference)
                .build();
        PaymentTransaction saved = paymentTransactionRepository.save(transaction);
        log.info("Created payment transaction {} for provider={} amount={} {} ref={}",
                saved.getId(), provider, amount, currency, reference);
        return saved;
    }

    @Override
    @Transactional
    public PaymentTransaction markPending(Long id) {
        return transition(id, PaymentTransactionStatus.PENDING);
    }

    @Override
    @Transactional
    public PaymentTransaction markCompleted(Long id) {
        PaymentTransaction tx = findOrThrow(id);
        validateTransition(tx, PaymentTransactionStatus.COMPLETED);
        tx.setStatus(PaymentTransactionStatus.COMPLETED);
        tx.setCompletedAt(Instant.now());
        log.info("Payment transaction {} marked COMPLETED", id);
        return paymentTransactionRepository.save(tx);
    }

    @Override
    @Transactional
    public PaymentTransaction markFailed(Long id, String failureReason) {
        PaymentTransaction tx = findOrThrow(id);
        validateTransition(tx, PaymentTransactionStatus.FAILED);
        tx.setStatus(PaymentTransactionStatus.FAILED);
        tx.setFailureReason(failureReason);
        log.info("Payment transaction {} marked FAILED: {}", id, failureReason);
        return paymentTransactionRepository.save(tx);
    }

    @Override
    @Transactional
    public PaymentTransaction markRefunded(Long id) {
        return transition(id, PaymentTransactionStatus.REFUNDED);
    }

    @Override
    @Transactional
    public PaymentTransaction updateProviderDetails(Long id, String providerTransactionId) {
        PaymentTransaction tx = findOrThrow(id);
        tx.setProviderTransactionId(providerTransactionId);
        validateTransition(tx, PaymentTransactionStatus.PENDING);
        tx.setStatus(PaymentTransactionStatus.PENDING);
        log.info("Payment transaction {} updated with provider id {} and marked PENDING", id, providerTransactionId);
        return paymentTransactionRepository.save(tx);
    }

    @Override
    @Transactional
    public PaymentTransaction markCompletedByProviderId(String providerTransactionId) {
        PaymentTransaction tx = findByProviderIdOrThrow(providerTransactionId);
        return markCompleted(tx.getId());
    }

    @Override
    @Transactional
    public PaymentTransaction markFailedByProviderId(String providerTransactionId, String reason) {
        PaymentTransaction tx = findByProviderIdOrThrow(providerTransactionId);
        return markFailed(tx.getId(), reason);
    }

    @Override
    @Transactional
    public PaymentTransaction markRefundedByProviderId(String providerTransactionId) {
        PaymentTransaction tx = findByProviderIdOrThrow(providerTransactionId);
        return markRefunded(tx.getId());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<PaymentTransaction> findByProviderTransactionId(String providerTransactionId) {
        return paymentTransactionRepository.findByProviderTransactionId(providerTransactionId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentTransaction> findByReference(String reference) {
        return paymentTransactionRepository.findByReference(reference);
    }

    // ---- helpers ----

    private PaymentTransaction findOrThrow(Long id) {
        return paymentTransactionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Payment transaction not found: " + id));
    }

    private PaymentTransaction findByProviderIdOrThrow(String providerTransactionId) {
        return paymentTransactionRepository.findByProviderTransactionId(providerTransactionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment transaction not found for provider id: " + providerTransactionId));
    }

    private void validateTransition(PaymentTransaction tx, PaymentTransactionStatus target) {
        Set<PaymentTransactionStatus> allowed = VALID_TRANSITIONS.getOrDefault(tx.getStatus(), Set.of());
        if (!allowed.contains(target)) {
            throw new IllegalStateException(
                    "Cannot transition payment transaction from " + tx.getStatus() + " to " + target);
        }
    }

    private PaymentTransaction transition(Long id, PaymentTransactionStatus target) {
        PaymentTransaction tx = findOrThrow(id);
        validateTransition(tx, target);
        tx.setStatus(target);
        log.info("Payment transaction {} transitioned to {}", id, target);
        return paymentTransactionRepository.save(tx);
    }
}
