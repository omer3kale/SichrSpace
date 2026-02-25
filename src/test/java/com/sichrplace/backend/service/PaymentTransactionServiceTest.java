package com.sichrplace.backend.service;

import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.PaymentTransaction.PaymentTransactionStatus;
import com.sichrplace.backend.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentTransactionServiceImpl")
class PaymentTransactionServiceTest {

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @InjectMocks
    private PaymentTransactionServiceImpl service;

    // ---- createTransaction ----

    @Test
    void createTransaction_createsWithCreatedStatus() {
        when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> {
            PaymentTransaction tx = inv.getArgument(0);
            tx.setId(1L);
            return tx;
        });

        PaymentTransaction result = service.createTransaction("PAYPAL", BigDecimal.valueOf(250), "EUR", "VR-42");

        assertEquals(1L, result.getId());
        assertEquals("PAYPAL", result.getProvider());
        assertEquals(BigDecimal.valueOf(250), result.getAmount());
        assertEquals("EUR", result.getCurrency());
        assertEquals("VR-42", result.getReference());
        assertEquals(PaymentTransactionStatus.CREATED, result.getStatus());
        verify(paymentTransactionRepository).save(any(PaymentTransaction.class));
    }

    // ---- markPending ----

    @Test
    void markPending_fromCreated_updatesStatus() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.CREATED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markPending(1L);

        assertEquals(PaymentTransactionStatus.PENDING, result.getStatus());
        verify(paymentTransactionRepository).save(tx);
    }

    @Test
    void markPending_fromCompleted_throwsIllegalState() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.COMPLETED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        assertThrows(IllegalStateException.class, () -> service.markPending(1L));
    }

    // ---- markCompleted ----

    @Test
    void markCompleted_fromPending_updatesStatusAndCompletedAt() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.PENDING);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markCompleted(1L);

        assertEquals(PaymentTransactionStatus.COMPLETED, result.getStatus());
        assertNotNull(result.getCompletedAt());
        verify(paymentTransactionRepository).save(tx);
    }

    @Test
    void markCompleted_fromCreated_throwsIllegalState() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.CREATED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        assertThrows(IllegalStateException.class, () -> service.markCompleted(1L));
    }

    @Test
    void markCompleted_fromRefunded_throwsIllegalState() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.REFUNDED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        assertThrows(IllegalStateException.class, () -> service.markCompleted(1L));
    }

    // ---- markFailed ----

    @Test
    void markFailed_fromPending_setsFailureReason() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.PENDING);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markFailed(1L, "Insufficient funds");

        assertEquals(PaymentTransactionStatus.FAILED, result.getStatus());
        assertEquals("Insufficient funds", result.getFailureReason());
        verify(paymentTransactionRepository).save(tx);
    }

    @Test
    void markFailed_fromCreated_setsFailureReason() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.CREATED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markFailed(1L, "Timeout");

        assertEquals(PaymentTransactionStatus.FAILED, result.getStatus());
        assertEquals("Timeout", result.getFailureReason());
    }

    @Test
    void markFailed_fromCompleted_throwsIllegalState() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.COMPLETED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        assertThrows(IllegalStateException.class, () -> service.markFailed(1L, "nope"));
    }

    // ---- markRefunded ----

    @Test
    void markRefunded_fromCompleted_updatesStatus() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.COMPLETED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markRefunded(1L);

        assertEquals(PaymentTransactionStatus.REFUNDED, result.getStatus());
        verify(paymentTransactionRepository).save(tx);
    }

    @Test
    void markRefunded_fromPending_throwsIllegalState() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.PENDING);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        assertThrows(IllegalStateException.class, () -> service.markRefunded(1L));
    }

    // ---- updateProviderDetails ----

    @Test
    void updateProviderDetails_fromCreated_setsIdAndMarksPending() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.CREATED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.updateProviderDetails(1L, "cs_test_abc123");

        assertEquals("cs_test_abc123", result.getProviderTransactionId());
        assertEquals(PaymentTransactionStatus.PENDING, result.getStatus());
        verify(paymentTransactionRepository).save(tx);
    }

    @Test
    void updateProviderDetails_fromCompleted_throwsIllegalState() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.COMPLETED);
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));

        assertThrows(IllegalStateException.class,
                () -> service.updateProviderDetails(1L, "cs_test_abc123"));
    }

    @Test
    void updateProviderDetails_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.updateProviderDetails(999L, "cs_test_abc123"));
    }

    // ---- not found ----

    @Test
    void markPending_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.markPending(999L));
    }

    @Test
    void markCompleted_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.markCompleted(999L));
    }

    @Test
    void markFailed_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.markFailed(999L, "err"));
    }

    @Test
    void markRefunded_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> service.markRefunded(999L));
    }

    // ---- byProviderId methods ----

    @Test
    void markCompletedByProviderId_updatesStatus() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.PENDING);
        tx.setProviderTransactionId("cs_test_abc");
        when(paymentTransactionRepository.findByProviderTransactionId("cs_test_abc"))
                .thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markCompletedByProviderId("cs_test_abc");

        assertEquals(PaymentTransactionStatus.COMPLETED, result.getStatus());
        assertNotNull(result.getCompletedAt());
    }

    @Test
    void markCompletedByProviderId_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findByProviderTransactionId("unknown"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.markCompletedByProviderId("unknown"));
    }

    @Test
    void markFailedByProviderId_setsFailureReason() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.PENDING);
        tx.setProviderTransactionId("cs_test_fail");
        when(paymentTransactionRepository.findByProviderTransactionId("cs_test_fail"))
                .thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markFailedByProviderId("cs_test_fail", "Card declined");

        assertEquals(PaymentTransactionStatus.FAILED, result.getStatus());
        assertEquals("Card declined", result.getFailureReason());
    }

    @Test
    void markFailedByProviderId_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findByProviderTransactionId("unknown"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.markFailedByProviderId("unknown", "err"));
    }

    @Test
    void markRefundedByProviderId_updatesStatus() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.COMPLETED);
        tx.setProviderTransactionId("cs_test_refund");
        when(paymentTransactionRepository.findByProviderTransactionId("cs_test_refund"))
                .thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.findById(1L)).thenReturn(Optional.of(tx));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        PaymentTransaction result = service.markRefundedByProviderId("cs_test_refund");

        assertEquals(PaymentTransactionStatus.REFUNDED, result.getStatus());
    }

    @Test
    void markRefundedByProviderId_notFound_throwsIllegalArgument() {
        when(paymentTransactionRepository.findByProviderTransactionId("unknown"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> service.markRefundedByProviderId("unknown"));
    }

    // ---- query methods ----

    @Test
    void findByProviderTransactionId_delegates() {
        PaymentTransaction tx = buildTx(PaymentTransactionStatus.COMPLETED);
        when(paymentTransactionRepository.findByProviderTransactionId("PP-123")).thenReturn(Optional.of(tx));

        Optional<PaymentTransaction> result = service.findByProviderTransactionId("PP-123");

        assertTrue(result.isPresent());
        assertEquals(tx, result.get());
    }

    @Test
    void findByProviderTransactionId_notFound_returnsEmpty() {
        when(paymentTransactionRepository.findByProviderTransactionId("NONE")).thenReturn(Optional.empty());

        Optional<PaymentTransaction> result = service.findByProviderTransactionId("NONE");

        assertTrue(result.isEmpty());
    }

    @Test
    void findByReference_delegates() {
        PaymentTransaction tx1 = buildTx(PaymentTransactionStatus.CREATED);
        PaymentTransaction tx2 = buildTx(PaymentTransactionStatus.FAILED);
        tx2.setId(2L);
        when(paymentTransactionRepository.findByReference("VR-42")).thenReturn(List.of(tx1, tx2));

        List<PaymentTransaction> result = service.findByReference("VR-42");

        assertEquals(2, result.size());
    }

    @Test
    void findByReference_noResults_returnsEmptyList() {
        when(paymentTransactionRepository.findByReference("NONE")).thenReturn(List.of());

        List<PaymentTransaction> result = service.findByReference("NONE");

        assertTrue(result.isEmpty());
    }

    // ---- helper ----

    private PaymentTransaction buildTx(PaymentTransactionStatus status) {
        return PaymentTransaction.builder()
                .id(1L)
                .provider("PAYPAL")
                .amount(BigDecimal.valueOf(100))
                .currency("EUR")
                .status(status)
                .reference("VR-1")
                .build();
    }
}
