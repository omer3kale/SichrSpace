package com.sichrplace.backend.service;

import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.ViewingRequestTransition;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import com.sichrplace.backend.repository.ViewingRequestTransitionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PaymentDomainListener}.
 * Verifies booking-aware status transitions triggered by payment events.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentDomainListener")
class PaymentDomainListenerTest {

    @Mock
    private ViewingRequestRepository viewingRequestRepository;

    @Mock
    private ViewingRequestTransitionRepository transitionRepository;

    @InjectMocks
    private PaymentDomainListener listener;

    // ---- onPaymentCompleted ----

    @Test
    @DisplayName("Payment COMPLETED auto-confirms PENDING viewing request")
    void onPaymentCompleted_pendingViewing_becomesConfirmed() {
        PaymentTransaction tx = buildTransaction(1L);
        ViewingRequest vr = buildViewingRequest(10L, ViewingRequest.ViewingStatus.PENDING);

        when(viewingRequestRepository.findByPaymentTransactionId(1L)).thenReturn(Optional.of(vr));

        listener.onPaymentCompleted(tx);

        assertEquals(ViewingRequest.ViewingStatus.CONFIRMED, vr.getStatus());
        assertNotNull(vr.getConfirmedDateTime());
        assertNotNull(vr.getRespondedAt());
        verify(viewingRequestRepository).save(vr);

        ArgumentCaptor<ViewingRequestTransition> captor = ArgumentCaptor.forClass(ViewingRequestTransition.class);
        verify(transitionRepository).save(captor.capture());
        ViewingRequestTransition transition = captor.getValue();
        assertEquals("PENDING", transition.getFromStatus());
        assertEquals("CONFIRMED", transition.getToStatus());
        assertEquals("Auto-confirmed: payment completed", transition.getReason());
    }

    @Test
    @DisplayName("Payment COMPLETED does not change CONFIRMED viewing request")
    void onPaymentCompleted_confirmedViewing_noChange() {
        PaymentTransaction tx = buildTransaction(2L);
        ViewingRequest vr = buildViewingRequest(20L, ViewingRequest.ViewingStatus.CONFIRMED);

        when(viewingRequestRepository.findByPaymentTransactionId(2L)).thenReturn(Optional.of(vr));

        listener.onPaymentCompleted(tx);

        assertEquals(ViewingRequest.ViewingStatus.CONFIRMED, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment COMPLETED does not change COMPLETED viewing request")
    void onPaymentCompleted_completedViewing_noChange() {
        PaymentTransaction tx = buildTransaction(3L);
        ViewingRequest vr = buildViewingRequest(30L, ViewingRequest.ViewingStatus.COMPLETED);

        when(viewingRequestRepository.findByPaymentTransactionId(3L)).thenReturn(Optional.of(vr));

        listener.onPaymentCompleted(tx);

        assertEquals(ViewingRequest.ViewingStatus.COMPLETED, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment COMPLETED with no linked viewing request does nothing")
    void onPaymentCompleted_noViewingRequest_doesNothing() {
        PaymentTransaction tx = buildTransaction(4L);
        when(viewingRequestRepository.findByPaymentTransactionId(4L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> listener.onPaymentCompleted(tx));
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    // ---- onPaymentRefunded ----

    @Test
    @DisplayName("Payment REFUNDED auto-cancels CONFIRMED viewing request")
    void onPaymentRefunded_confirmedViewing_becomesCancelled() {
        PaymentTransaction tx = buildTransaction(5L);
        ViewingRequest vr = buildViewingRequest(50L, ViewingRequest.ViewingStatus.CONFIRMED);

        when(viewingRequestRepository.findByPaymentTransactionId(5L)).thenReturn(Optional.of(vr));

        listener.onPaymentRefunded(tx);

        assertEquals(ViewingRequest.ViewingStatus.CANCELLED, vr.getStatus());
        verify(viewingRequestRepository).save(vr);

        ArgumentCaptor<ViewingRequestTransition> captor = ArgumentCaptor.forClass(ViewingRequestTransition.class);
        verify(transitionRepository).save(captor.capture());
        ViewingRequestTransition transition = captor.getValue();
        assertEquals("CONFIRMED", transition.getFromStatus());
        assertEquals("CANCELLED", transition.getToStatus());
        assertEquals("Auto-cancelled: payment refunded", transition.getReason());
    }

    @Test
    @DisplayName("Payment REFUNDED does not change PENDING viewing request")
    void onPaymentRefunded_pendingViewing_noChange() {
        PaymentTransaction tx = buildTransaction(6L);
        ViewingRequest vr = buildViewingRequest(60L, ViewingRequest.ViewingStatus.PENDING);

        when(viewingRequestRepository.findByPaymentTransactionId(6L)).thenReturn(Optional.of(vr));

        listener.onPaymentRefunded(tx);

        assertEquals(ViewingRequest.ViewingStatus.PENDING, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment REFUNDED does not change COMPLETED viewing request")
    void onPaymentRefunded_completedViewing_noChange() {
        PaymentTransaction tx = buildTransaction(7L);
        ViewingRequest vr = buildViewingRequest(70L, ViewingRequest.ViewingStatus.COMPLETED);

        when(viewingRequestRepository.findByPaymentTransactionId(7L)).thenReturn(Optional.of(vr));

        listener.onPaymentRefunded(tx);

        assertEquals(ViewingRequest.ViewingStatus.COMPLETED, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment REFUNDED with no linked viewing request does nothing")
    void onPaymentRefunded_noViewingRequest_doesNothing() {
        PaymentTransaction tx = buildTransaction(8L);
        when(viewingRequestRepository.findByPaymentTransactionId(8L)).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> listener.onPaymentRefunded(tx));
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment REFUNDED does not change CANCELLED viewing request")
    void onPaymentRefunded_cancelledViewing_noChange() {
        PaymentTransaction tx = buildTransaction(9L);
        ViewingRequest vr = buildViewingRequest(90L, ViewingRequest.ViewingStatus.CANCELLED);

        when(viewingRequestRepository.findByPaymentTransactionId(9L)).thenReturn(Optional.of(vr));

        listener.onPaymentRefunded(tx);

        assertEquals(ViewingRequest.ViewingStatus.CANCELLED, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment REFUNDED does not change DECLINED viewing request")
    void onPaymentRefunded_declinedViewing_noChange() {
        PaymentTransaction tx = buildTransaction(11L);
        ViewingRequest vr = buildViewingRequest(110L, ViewingRequest.ViewingStatus.DECLINED);

        when(viewingRequestRepository.findByPaymentTransactionId(11L)).thenReturn(Optional.of(vr));

        listener.onPaymentRefunded(tx);

        assertEquals(ViewingRequest.ViewingStatus.DECLINED, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment COMPLETED does not change DECLINED viewing request")
    void onPaymentCompleted_declinedViewing_noChange() {
        PaymentTransaction tx = buildTransaction(12L);
        ViewingRequest vr = buildViewingRequest(120L, ViewingRequest.ViewingStatus.DECLINED);

        when(viewingRequestRepository.findByPaymentTransactionId(12L)).thenReturn(Optional.of(vr));

        listener.onPaymentCompleted(tx);

        assertEquals(ViewingRequest.ViewingStatus.DECLINED, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Payment COMPLETED does not change CANCELLED viewing request")
    void onPaymentCompleted_cancelledViewing_noChange() {
        PaymentTransaction tx = buildTransaction(13L);
        ViewingRequest vr = buildViewingRequest(130L, ViewingRequest.ViewingStatus.CANCELLED);

        when(viewingRequestRepository.findByPaymentTransactionId(13L)).thenReturn(Optional.of(vr));

        listener.onPaymentCompleted(tx);

        assertEquals(ViewingRequest.ViewingStatus.CANCELLED, vr.getStatus());
        verify(viewingRequestRepository, never()).save(any());
        verify(transitionRepository, never()).save(any());
    }

    // ---- helpers ----

    private PaymentTransaction buildTransaction(Long id) {
        return PaymentTransaction.builder()
                .id(id)
                .provider("stripe")
                .amount(java.math.BigDecimal.valueOf(50))
                .currency("EUR")
                .status(PaymentTransaction.PaymentTransactionStatus.COMPLETED)
                .build();
    }

    private ViewingRequest buildViewingRequest(Long id, ViewingRequest.ViewingStatus status) {
        User tenant = User.builder()
                .id(id + 1000)
                .email("tenant" + id + "@test.com")
                .firstName("Tenant")
                .lastName("Test")
                .build();
        Apartment apartment = Apartment.builder()
                .id(id + 2000)
                .title("Test Apartment " + id)
                .build();

        return ViewingRequest.builder()
                .id(id)
                .tenant(tenant)
                .apartment(apartment)
                .status(status)
                .proposedDateTime(LocalDateTime.of(2026, 3, 15, 10, 0))
                .build();
    }
}
