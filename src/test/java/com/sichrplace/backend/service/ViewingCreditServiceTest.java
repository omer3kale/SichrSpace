package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ViewingCreditSummaryDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingCreditPack;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingCreditPackRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ViewingCreditServiceImpl")
class ViewingCreditServiceTest {

    @Mock private ViewingCreditPackRepository creditPackRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private ViewingCreditServiceImpl viewingCreditService;

    private User user;
    private Apartment apartment;
    private ViewingRequest viewingRequest;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).email("tenant@test.com")
                .firstName("T").lastName("U").build();
        apartment = Apartment.builder().id(9L).title("Apt")
                .owner(User.builder().id(2L).build())
                .status(Apartment.ApartmentStatus.AVAILABLE).build();
        viewingRequest = ViewingRequest.builder()
                .id(100L)
                .tenant(user)
                .apartment(apartment)
                .status(ViewingRequest.ViewingStatus.CONFIRMED)
                .build();
    }

    // ── onViewingPaymentSucceeded ──

    @Test
    @DisplayName("First paid viewing creates a new pack with 1 used credit")
    void firstPaidViewing_createsNewPack() {
        when(creditPackRepository.findByPurchaseViewingRequestId(100L))
                .thenReturn(Optional.empty());
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(creditPackRepository.save(any(ViewingCreditPack.class)))
                .thenAnswer(inv -> {
                    ViewingCreditPack p = inv.getArgument(0);
                    p.setId(10L);
                    return p;
                });

        ViewingCreditPack result = viewingCreditService.onViewingPaymentSucceeded(1L, viewingRequest);

        assertEquals(3, result.getTotalCredits());
        assertEquals(1, result.getUsedCredits());
        assertEquals(2, result.getCreditsRemaining());
        assertEquals(10L, result.getId());

        ArgumentCaptor<ViewingCreditPack> captor = ArgumentCaptor.forClass(ViewingCreditPack.class);
        verify(creditPackRepository).save(captor.capture());
        assertEquals(user, captor.getValue().getUser());
        assertEquals(viewingRequest, captor.getValue().getPurchaseViewingRequest());
    }

    @Test
    @DisplayName("Second viewing uses credit from active pack (free viewing)")
    void secondViewing_usesExistingCredit() {
        ViewingCreditPack activePack = ViewingCreditPack.builder()
                .id(10L).user(user).totalCredits(3).usedCredits(1).build();

        when(creditPackRepository.findByPurchaseViewingRequestId(100L))
                .thenReturn(Optional.empty());
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of(activePack));
        when(creditPackRepository.save(any(ViewingCreditPack.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ViewingCreditPack result = viewingCreditService.onViewingPaymentSucceeded(1L, viewingRequest);

        assertEquals(2, result.getUsedCredits());
        assertEquals(1, result.getCreditsRemaining());
    }

    @Test
    @DisplayName("Third viewing uses last credit from pack")
    void thirdViewing_usesLastCredit() {
        ViewingCreditPack activePack = ViewingCreditPack.builder()
                .id(10L).user(user).totalCredits(3).usedCredits(2).build();

        when(creditPackRepository.findByPurchaseViewingRequestId(100L))
                .thenReturn(Optional.empty());
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of(activePack));
        when(creditPackRepository.save(any(ViewingCreditPack.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ViewingCreditPack result = viewingCreditService.onViewingPaymentSucceeded(1L, viewingRequest);

        assertEquals(3, result.getUsedCredits());
        assertEquals(0, result.getCreditsRemaining());
        assertFalse(result.hasCreditsRemaining());
    }

    @Test
    @DisplayName("Fourth viewing creates a new pack (previous pack exhausted)")
    void fourthViewing_createsNewPack() {
        // All packs are exhausted — findActivePacksByUserId returns empty
        when(creditPackRepository.findByPurchaseViewingRequestId(100L))
                .thenReturn(Optional.empty());
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(creditPackRepository.save(any(ViewingCreditPack.class)))
                .thenAnswer(inv -> {
                    ViewingCreditPack p = inv.getArgument(0);
                    p.setId(20L);
                    return p;
                });

        ViewingCreditPack result = viewingCreditService.onViewingPaymentSucceeded(1L, viewingRequest);

        assertEquals(3, result.getTotalCredits());
        assertEquals(1, result.getUsedCredits());
        assertEquals(20L, result.getId()); // new pack
    }

    @Test
    @DisplayName("Idempotent: duplicate call for same viewing request returns existing pack")
    void idempotent_duplicateCallReturnsSamePack() {
        ViewingCreditPack existing = ViewingCreditPack.builder()
                .id(10L).user(user).totalCredits(3).usedCredits(1)
                .purchaseViewingRequest(viewingRequest).build();

        when(creditPackRepository.findByPurchaseViewingRequestId(100L))
                .thenReturn(Optional.of(existing));

        ViewingCreditPack result = viewingCreditService.onViewingPaymentSucceeded(1L, viewingRequest);

        assertEquals(10L, result.getId());
        assertEquals(1, result.getUsedCredits()); // no change
        verify(creditPackRepository, never()).save(any());
    }

    @Test
    @DisplayName("User not found throws IllegalArgumentException")
    void userNotFound_throws() {
        when(creditPackRepository.findByPurchaseViewingRequestId(100L))
                .thenReturn(Optional.empty());
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of());
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> viewingCreditService.onViewingPaymentSucceeded(1L, viewingRequest));
    }

    // ── getCreditSummary ──

    @Test
    @DisplayName("Credit summary with active pack returns populated summary")
    void creditSummary_withActivePack() {
        ViewingCreditPack activePack = ViewingCreditPack.builder()
                .id(10L).user(user).totalCredits(3).usedCredits(1)
                .purchaseViewingRequest(viewingRequest).build();
        ViewingCreditPack oldPack = ViewingCreditPack.builder()
                .id(5L).user(user).totalCredits(3).usedCredits(3).build();

        when(creditPackRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of(activePack, oldPack));
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of(activePack));
        when(creditPackRepository.countTotalCreditsUsedByUserId(1L)).thenReturn(4L);

        ViewingCreditSummaryDto summary = viewingCreditService.getCreditSummary(1L);

        assertNotNull(summary.getActivePack());
        assertEquals(10L, summary.getActivePack().getPackId());
        assertEquals(2, summary.getTotalCreditsRemaining());
        assertEquals(4, summary.getTotalCreditsUsed());
        assertEquals(2, summary.getHistory().size());
    }

    @Test
    @DisplayName("Credit summary with no packs returns zeroed summary")
    void creditSummary_noPacks() {
        when(creditPackRepository.findByUserIdOrderByCreatedAtDesc(1L))
                .thenReturn(List.of());
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of());
        when(creditPackRepository.countTotalCreditsUsedByUserId(1L)).thenReturn(0L);

        ViewingCreditSummaryDto summary = viewingCreditService.getCreditSummary(1L);

        assertNull(summary.getActivePack());
        assertEquals(0, summary.getTotalCreditsRemaining());
        assertEquals(0, summary.getTotalCreditsUsed());
        assertTrue(summary.getHistory().isEmpty());
    }

    // ── hasActiveCredit ──

    @Test
    @DisplayName("hasActiveCredit returns true when usable pack exists")
    void hasActiveCredit_true() {
        ViewingCreditPack activePack = ViewingCreditPack.builder()
                .id(10L).user(user).totalCredits(3).usedCredits(1).build();

        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of(activePack));

        assertTrue(viewingCreditService.hasActiveCredit(1L));
    }

    @Test
    @DisplayName("hasActiveCredit returns false when no usable packs")
    void hasActiveCredit_false() {
        when(creditPackRepository.findActivePacksByUserId(eq(1L), any(Instant.class)))
                .thenReturn(List.of());

        assertFalse(viewingCreditService.hasActiveCredit(1L));
    }

    // ── ViewingCreditPack entity edge cases ──

    @Test
    @DisplayName("Expired pack is not usable")
    void expiredPack_notUsable() {
        ViewingCreditPack pack = ViewingCreditPack.builder()
                .id(1L).user(user).totalCredits(3).usedCredits(0)
                .expiresAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();

        assertTrue(pack.isExpired());
        assertFalse(pack.isUsable());
    }

    @Test
    @DisplayName("useCredit on exhausted pack throws IllegalStateException")
    void useCredit_exhausted_throws() {
        ViewingCreditPack pack = ViewingCreditPack.builder()
                .id(1L).user(user).totalCredits(3).usedCredits(3)
                .build();

        assertThrows(IllegalStateException.class, pack::useCredit);
    }

    @Test
    @DisplayName("useCredit on expired pack throws IllegalStateException")
    void useCredit_expired_throws() {
        ViewingCreditPack pack = ViewingCreditPack.builder()
                .id(1L).user(user).totalCredits(3).usedCredits(0)
                .expiresAt(Instant.now().minus(1, ChronoUnit.DAYS))
                .build();

        assertThrows(IllegalStateException.class, pack::useCredit);
    }
}
