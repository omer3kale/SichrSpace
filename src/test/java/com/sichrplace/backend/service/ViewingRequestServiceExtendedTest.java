package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.ViewingRequestStatsDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.ViewingRequestTransition;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import com.sichrplace.backend.repository.ViewingRequestTransitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the showcase viewing-request features:
 * <ul>
 *   <li>{@code completeViewingRequest} — CONFIRMED → COMPLETED transition</li>
 *   <li>{@code getStatistics} — aggregate stats per user role</li>
 * </ul>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ViewingRequestService — Complete & Statistics")
class ViewingRequestServiceExtendedTest {

    @Mock private ViewingRequestRepository viewingRequestRepository;
    @Mock private ViewingRequestTransitionRepository transitionRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private ViewingRequestServiceImpl viewingRequestService;

    private User landlord;
    private User tenant;
    private Apartment apartment;
    private ViewingRequest confirmedRequest;

    @BeforeEach
    void setUp() {
        landlord = User.builder()
                .id(1L)
                .email("landlord@example.com")
                .password("hashed")
                .firstName("Land")
                .lastName("Lord")
                .role(User.UserRole.LANDLORD)
                .isActive(true)
                .build();

        tenant = User.builder()
                .id(2L)
                .email("tenant@example.com")
                .password("hashed")
                .firstName("Ten")
                .lastName("Ant")
                .role(User.UserRole.TENANT)
                .isActive(true)
                .build();

        apartment = Apartment.builder()
                .id(100L)
                .owner(landlord)
                .title("Test Apartment")
                .city("Berlin")
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();

        confirmedRequest = ViewingRequest.builder()
                .id(50L)
                .apartment(apartment)
                .tenant(tenant)
                .proposedDateTime(LocalDateTime.of(2025, 7, 1, 14, 0))
                .status(ViewingRequest.ViewingStatus.CONFIRMED)
                .confirmedDateTime(LocalDateTime.of(2025, 7, 1, 14, 0))
                .createdAt(Instant.now().minusSeconds(7200))
                .build();
    }

    // ─── completeViewingRequest ─────────────────────────────────────

    @Nested
    @DisplayName("completeViewingRequest")
    class CompleteTests {

        @Test
        @DisplayName("tenant can complete a CONFIRMED viewing request")
        void tenantCompletes() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(transitionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ViewingRequestDto result = viewingRequestService.completeViewingRequest(50L, 2L);

            assertNotNull(result);
            assertEquals("COMPLETED", result.getStatus());
            verify(transitionRepository).save(argThat(t ->
                    "CONFIRMED".equals(t.getFromStatus()) && "COMPLETED".equals(t.getToStatus())
            ));
        }

        @Test
        @DisplayName("landlord can complete a CONFIRMED viewing request")
        void landlordCompletes() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
            when(transitionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ViewingRequestDto result = viewingRequestService.completeViewingRequest(50L, 1L);

            assertNotNull(result);
            assertEquals("COMPLETED", result.getStatus());
        }

        @Test
        @DisplayName("unauthorized user cannot complete")
        void unauthorizedUser_throws() {
            User stranger = User.builder().id(999L).build();
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.completeViewingRequest(50L, 999L));
        }

        @Test
        @DisplayName("PENDING request cannot be completed")
        void pendingRequest_throws() {
            confirmedRequest.setStatus(ViewingRequest.ViewingStatus.PENDING);
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));

            assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.completeViewingRequest(50L, 2L));
        }

        @Test
        @DisplayName("non-existent request throws")
        void notFound_throws() {
            when(viewingRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.completeViewingRequest(999L, 2L));
        }
    }

    // ─── getStatistics ──────────────────────────────────────────────

    @Nested
    @DisplayName("getStatistics")
    class StatisticsTests {

        @Test
        @DisplayName("tenant statistics aggregates counts correctly")
        void tenantStats() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(viewingRequestRepository.countByTenantId(2L)).thenReturn(5L);
            when(viewingRequestRepository.countByTenantIdAndStatus(2L, ViewingRequest.ViewingStatus.PENDING)).thenReturn(1L);
            when(viewingRequestRepository.countByTenantIdAndStatus(2L, ViewingRequest.ViewingStatus.CONFIRMED)).thenReturn(2L);
            when(viewingRequestRepository.countByTenantIdAndStatus(2L, ViewingRequest.ViewingStatus.DECLINED)).thenReturn(1L);
            when(viewingRequestRepository.countByTenantIdAndStatus(2L, ViewingRequest.ViewingStatus.COMPLETED)).thenReturn(1L);
            when(viewingRequestRepository.countByTenantIdAndStatus(2L, ViewingRequest.ViewingStatus.CANCELLED)).thenReturn(0L);
            when(transitionRepository.findAll()).thenReturn(Collections.emptyList());

            ViewingRequestStatsDto stats = viewingRequestService.getStatistics(2L);

            assertEquals(5, stats.getTotalRequests());
            assertEquals(1, stats.getPendingCount());
            assertEquals(2, stats.getConfirmedCount());
            assertEquals(1, stats.getDeclinedCount());
            assertEquals(1, stats.getCompletedCount());
            assertEquals(0, stats.getCancelledCount());
            assertNull(stats.getAverageResponseTimeHours(), "No transitions → null avg");
        }

        @Test
        @DisplayName("landlord statistics uses landlord-specific queries")
        void landlordStats() {
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
            when(viewingRequestRepository.countByLandlordId(1L)).thenReturn(3L);
            when(viewingRequestRepository.countByLandlordIdAndStatus(1L, ViewingRequest.ViewingStatus.PENDING)).thenReturn(1L);
            when(viewingRequestRepository.countByLandlordIdAndStatus(1L, ViewingRequest.ViewingStatus.CONFIRMED)).thenReturn(1L);
            when(viewingRequestRepository.countByLandlordIdAndStatus(1L, ViewingRequest.ViewingStatus.DECLINED)).thenReturn(0L);
            when(viewingRequestRepository.countByLandlordIdAndStatus(1L, ViewingRequest.ViewingStatus.COMPLETED)).thenReturn(1L);
            when(viewingRequestRepository.countByLandlordIdAndStatus(1L, ViewingRequest.ViewingStatus.CANCELLED)).thenReturn(0L);
            when(transitionRepository.findAll()).thenReturn(Collections.emptyList());

            ViewingRequestStatsDto stats = viewingRequestService.getStatistics(1L);

            assertEquals(3, stats.getTotalRequests());
            assertEquals(1, stats.getPendingCount());
            assertEquals(1, stats.getConfirmedCount());
            assertEquals(1, stats.getCompletedCount());
            // Verify landlord-specific queries were called (not tenant queries)
            verify(viewingRequestRepository).countByLandlordId(1L);
            verify(viewingRequestRepository, never()).countByTenantId(anyLong());
        }

        @Test
        @DisplayName("statistics with response transitions computes average hours")
        void statsWithAvgResponseTime() {
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(viewingRequestRepository.countByTenantId(2L)).thenReturn(2L);
            when(viewingRequestRepository.countByTenantIdAndStatus(eq(2L), any())).thenReturn(1L);

            // Create a transition: PENDING→CONFIRMED that took 2 hours
            Instant createdAt = Instant.now().minus(4, java.time.temporal.ChronoUnit.HOURS);
            ViewingRequest vr = ViewingRequest.builder()
                    .id(60L)
                    .tenant(tenant)
                    .apartment(apartment)
                    .status(ViewingRequest.ViewingStatus.CONFIRMED)
                    .createdAt(createdAt)
                    .proposedDateTime(LocalDateTime.now())
                    .build();
            ViewingRequestTransition transition = ViewingRequestTransition.builder()
                    .id(1L)
                    .viewingRequest(vr)
                    .fromStatus("PENDING")
                    .toStatus("CONFIRMED")
                    .changedBy(landlord)
                    .changedAt(LocalDateTime.now().minusHours(2))
                    .build();
            when(transitionRepository.findAll()).thenReturn(List.of(transition));

            ViewingRequestStatsDto stats = viewingRequestService.getStatistics(2L);

            assertNotNull(stats.getAverageResponseTimeHours(),
                    "Should compute avg response time when transitions exist");
        }

        @Test
        @DisplayName("unknown user throws")
        void unknownUser_throws() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getStatistics(999L));
        }
    }
}
