package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.PaymentProviderSession;
import com.sichrplace.backend.dto.PaymentSessionDto;
import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.ViewingRequestStatsDto;
import com.sichrplace.backend.dto.ViewingRequestTransitionDto;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.PaymentTransaction;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.model.ViewingRequestTransition;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import com.sichrplace.backend.repository.ViewingRequestTransitionRepository;
import com.sichrplace.backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for viewing-request service branch behavior.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ViewingRequestService — Branch Coverage")
class ViewingRequestServiceExtendedTest {

    @Mock private ViewingRequestRepository viewingRequestRepository;
    @Mock private ViewingRequestTransitionRepository transitionRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private UserRepository userRepository;
    /** Injected so the messagingTemplate != null branches in confirm/decline execute. */
    @Mock private SimpMessagingTemplate messagingTemplate;
    @Mock private EmailService emailService;
    @Mock private PaymentTransactionService paymentTransactionService;
    @Mock private PaymentProviderRouter paymentProviderRouter;
    @Mock private PaymentProviderClient paymentProviderClient;
    @Mock private NotificationService notificationService;

    @InjectMocks private ViewingRequestServiceImpl viewingRequestService;

    private User landlord;
    private User tenant;
    private User admin;
    private Apartment apartment;
    private ViewingRequest confirmedRequest;
    private ViewingRequest pendingRequest;

    @BeforeEach
    void setUp() {
        // Mockito won't field-inject after constructor injection — do it explicitly.
        ReflectionTestUtils.setField(viewingRequestService, "messagingTemplate", messagingTemplate);
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

            admin = User.builder()
                .id(3L)
                .email("admin@example.com")
                .password("hashed")
                .firstName("Ad")
                .lastName("Min")
                .role(User.UserRole.ADMIN)
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

        pendingRequest = ViewingRequest.builder()
                .id(51L)
                .apartment(apartment)
                .tenant(tenant)
                .proposedDateTime(LocalDateTime.of(2025, 7, 2, 10, 0))
                .status(ViewingRequest.ViewingStatus.PENDING)
                .createdAt(Instant.now().minusSeconds(3600))
                .build();
    }

    @Nested
    @DisplayName("createViewingRequest")
    class CreateTests {

        @Test
        @DisplayName("creates pending request and transition")
        void createsPendingRequestAndTransition() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(100L);
            request.setProposedDateTime(LocalDateTime.of(2025, 8, 10, 15, 0));
            request.setMessage("Can I visit this weekend?");

            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> {
                ViewingRequest vr = inv.getArgument(0);
                vr.setId(200L);
                return vr;
            });

            ViewingRequestDto result = viewingRequestService.createViewingRequest(2L, request);

            assertEquals(200L, result.getId());
            assertEquals("PENDING", result.getStatus());
            verify(transitionRepository).save(argThat(t ->
                    t.getFromStatus() == null
                            && "PENDING".equals(t.getToStatus())
                            && "Viewing request created".equals(t.getReason())
            ));
        }

        @Test
        @DisplayName("throws when tenant not found")
        void tenantNotFound() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(100L);
            request.setProposedDateTime(LocalDateTime.now().plusDays(1));

            when(userRepository.findById(2L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.createViewingRequest(2L, request));
        }

        @Test
        @DisplayName("throws when apartment not found")
        void apartmentNotFound() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(999L);
            request.setProposedDateTime(LocalDateTime.now().plusDays(1));

            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.createViewingRequest(2L, request));
        }

        @Test
        @DisplayName("throws when apartment unavailable")
        void apartmentUnavailable() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(100L);
            request.setProposedDateTime(LocalDateTime.now().plusDays(1));

            apartment.setStatus(Apartment.ApartmentStatus.RENTED);
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));

            assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.createViewingRequest(2L, request));
        }

        @Test
        @DisplayName("throws when tenant requests own apartment")
        void ownApartmentNotAllowed() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(100L);
            request.setProposedDateTime(LocalDateTime.now().plusDays(1));

            apartment.setOwner(tenant);
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.createViewingRequest(2L, request));
        }

        @Test
        @DisplayName("FTL-16: throws when active request already exists for same tenant+apartment")
        void duplicateActiveRequestRejected() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(100L);
            request.setProposedDateTime(LocalDateTime.now().plusDays(1));

            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(viewingRequestRepository.existsByTenantIdAndApartmentIdAndStatusIn(
                    eq(2L), eq(100L), anyList())).thenReturn(true);

            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.createViewingRequest(2L, request));
            assertTrue(ex.getMessage().contains("already have an active viewing request"));
        }

        @Test
        @DisplayName("FTL-16: allows request when previous request was cancelled/declined/completed")
        void allowsRequestAfterPreviousClosed() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(100L);
            request.setProposedDateTime(LocalDateTime.of(2025, 8, 10, 15, 0));

            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(viewingRequestRepository.existsByTenantIdAndApartmentIdAndStatusIn(
                    eq(2L), eq(100L), anyList())).thenReturn(false);
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> {
                ViewingRequest vr = inv.getArgument(0);
                vr.setId(201L);
                return vr;
            });

            ViewingRequestDto result = viewingRequestService.createViewingRequest(2L, request);
            assertEquals(201L, result.getId());
            assertEquals("PENDING", result.getStatus());
        }

        @Test
        @DisplayName("FTL-24: sends email to landlord on creation")
        void sendsEmailToLandlordOnCreation() {
            CreateViewingRequestRequest request = new CreateViewingRequestRequest();
            request.setApartmentId(100L);
            request.setProposedDateTime(LocalDateTime.of(2025, 8, 10, 15, 0));

            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(viewingRequestRepository.existsByTenantIdAndApartmentIdAndStatusIn(
                    eq(2L), eq(100L), anyList())).thenReturn(false);
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> {
                ViewingRequest vr = inv.getArgument(0);
                vr.setId(202L);
                return vr;
            });

            viewingRequestService.createViewingRequest(2L, request);

            verify(emailService).sendEmail(
                    eq("landlord@example.com"),
                    eq("New viewing request received"),
                    contains("Ten Ant"));
        }
    }

    @Nested
    @DisplayName("getViewingRequestById")
    class GetByIdTests {

        @Test
        @DisplayName("tenant can view own request")
        void tenantCanView() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));

            ViewingRequestDto dto = viewingRequestService.getViewingRequestById(50L, 2L);
            assertEquals(50L, dto.getId());
        }

        @Test
        @DisplayName("owner can view request")
        void ownerCanView() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));

            ViewingRequestDto dto = viewingRequestService.getViewingRequestById(50L, 1L);
            assertEquals(50L, dto.getId());
        }

        @Test
        @DisplayName("admin can view request")
        void adminCanView() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(userRepository.findById(3L)).thenReturn(Optional.of(admin));

            ViewingRequestDto dto = viewingRequestService.getViewingRequestById(50L, 3L);
            assertEquals(50L, dto.getId());
        }

        @Test
        @DisplayName("throws when viewer unauthorized")
        void unauthorizedViewer() {
            User stranger = User.builder().id(999L).role(User.UserRole.TENANT).build();
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(userRepository.findById(999L)).thenReturn(Optional.of(stranger));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.getViewingRequestById(50L, 999L));
        }

        @Test
        @DisplayName("throws when request not found")
        void requestNotFound() {
            when(viewingRequestRepository.findById(404L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getViewingRequestById(404L, 2L));
        }

        @Test
        @DisplayName("throws when user not found")
        void userNotFound() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getViewingRequestById(50L, 2L));
        }
    }

    @Test
    @DisplayName("getViewingRequestsByTenant maps repository results")
    void getByTenantMapsResults() {
        when(viewingRequestRepository.findByTenantId(2L)).thenReturn(List.of(pendingRequest, confirmedRequest));

        List<ViewingRequestDto> results = viewingRequestService.getViewingRequestsByTenant(2L);

        assertEquals(2, results.size());
        assertEquals("PENDING", results.get(0).getStatus());
    }

    @Test
    @DisplayName("getViewingRequestsByTenantPaged maps status enum and page")
    void getByTenantPagedMapsStatusAndPage() {
        Page<ViewingRequest> page = new PageImpl<>(List.of(pendingRequest));
        when(viewingRequestRepository.findByTenantIdAndStatus(eq(2L), eq(ViewingRequest.ViewingStatus.PENDING), any(Pageable.class)))
                .thenReturn(page);

        Page<ViewingRequestDto> results = viewingRequestService.getViewingRequestsByTenantPaged(
                2L,
                ViewingRequestService.ViewingRequestStatus.PENDING,
                Pageable.unpaged());

        assertEquals(1, results.getTotalElements());
    }

    @Nested
    @DisplayName("getViewingRequestsByApartment")
    class ByApartmentTests {

        @Test
        @DisplayName("owner can list apartment requests")
        void ownerCanListApartmentRequests() {
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
            when(viewingRequestRepository.findByApartmentId(100L)).thenReturn(List.of(pendingRequest));

            List<ViewingRequestDto> results = viewingRequestService.getViewingRequestsByApartment(100L, 1L);
            assertEquals(1, results.size());
        }

        @Test
        @DisplayName("admin can list apartment requests")
        void adminCanListApartmentRequests() {
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(userRepository.findById(3L)).thenReturn(Optional.of(admin));
            when(viewingRequestRepository.findByApartmentId(100L)).thenReturn(List.of(pendingRequest));

            List<ViewingRequestDto> results = viewingRequestService.getViewingRequestsByApartment(100L, 3L);
            assertEquals(1, results.size());
        }

        @Test
        @DisplayName("unauthorized user cannot list apartment requests")
        void unauthorizedCannotListApartmentRequests() {
            User stranger = User.builder().id(999L).role(User.UserRole.TENANT).build();
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(userRepository.findById(999L)).thenReturn(Optional.of(stranger));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.getViewingRequestsByApartment(100L, 999L));
        }

        @Test
        @DisplayName("throws when apartment missing")
        void apartmentMissing() {
            when(apartmentRepository.findById(404L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getViewingRequestsByApartment(404L, 1L));
        }

        @Test
        @DisplayName("throws when user missing")
        void userMissing() {
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getViewingRequestsByApartment(100L, 1L));
        }
    }

    @Test
    @DisplayName("getViewingRequestsByApartmentPaged maps status and supports admin")
    void getByApartmentPagedMapsStatus() {
        Page<ViewingRequest> page = new PageImpl<>(List.of(confirmedRequest));
        when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(3L)).thenReturn(Optional.of(admin));
        when(viewingRequestRepository.findByApartmentIdAndStatus(eq(100L), eq(ViewingRequest.ViewingStatus.CONFIRMED), any(Pageable.class)))
                .thenReturn(page);

        Page<ViewingRequestDto> result = viewingRequestService.getViewingRequestsByApartmentPaged(
                100L,
                3L,
                ViewingRequestService.ViewingRequestStatus.CONFIRMED,
                Pageable.unpaged());

        assertEquals(1, result.getTotalElements());
    }

    @Test
    @DisplayName("getViewingRequestsByApartmentPaged throws when apartment missing")
    void getByApartmentPaged_apartmentMissing() {
        when(apartmentRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> viewingRequestService.getViewingRequestsByApartmentPaged(
                        404L, 1L, ViewingRequestService.ViewingRequestStatus.PENDING, Pageable.unpaged()));
    }

    @Test
    @DisplayName("getViewingRequestsByApartmentPaged throws when user missing")
    void getByApartmentPaged_userMissing() {
        when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> viewingRequestService.getViewingRequestsByApartmentPaged(
                        100L, 1L, ViewingRequestService.ViewingRequestStatus.PENDING, Pageable.unpaged()));
    }

    @Test
    @DisplayName("getViewingRequestsByApartmentPaged throws when unauthorized")
    void getByApartmentPaged_unauthorized() {
        User stranger = User.builder().id(9L).role(User.UserRole.TENANT).build();
        when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(9L)).thenReturn(Optional.of(stranger));

        assertThrows(SecurityException.class,
                () -> viewingRequestService.getViewingRequestsByApartmentPaged(
                        100L, 9L, ViewingRequestService.ViewingRequestStatus.PENDING, Pageable.unpaged()));
    }

    @Nested
    @DisplayName("confirmViewingRequest")
    class ConfirmTests {

        @Test
        @DisplayName("owner confirms pending request")
        void ownerConfirmsPending() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));

            ViewingRequestDto result = viewingRequestService.confirmViewingRequest(51L, 1L);

            assertEquals("CONFIRMED", result.getStatus());
            assertNotNull(result.getConfirmedDateTime());
            verify(transitionRepository).save(argThat(t ->
                    "PENDING".equals(t.getFromStatus()) && "CONFIRMED".equals(t.getToStatus())
            ));
            verify(emailService).sendEmail(
                    eq("tenant@example.com"),
                    eq("Viewing request confirmed"),
                    argThat(body -> body.contains("Test Apartment") && body.contains("confirmed")));
        }

        @Test
        @DisplayName("throws when non-owner confirms")
        void nonOwnerCannotConfirm() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.confirmViewingRequest(51L, 2L));
        }

        @Test
        @DisplayName("throws when status not pending")
        void statusNotPending() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));

            assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.confirmViewingRequest(50L, 1L));
        }

        @Test
        @DisplayName("throws when confirm request missing")
        void confirmRequestNotFound() {
            when(viewingRequestRepository.findById(404L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                () -> viewingRequestService.confirmViewingRequest(404L, 1L));
        }

        @Test
        @DisplayName("throws when owner actor missing")
        void ownerMissingAfterSave() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.confirmViewingRequest(51L, 1L));
        }
    }

    @Nested
    @DisplayName("declineViewingRequest")
    class DeclineTests {

        @Test
        @DisplayName("owner declines pending request")
        void ownerDeclinesPending() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));

            ViewingRequestDto result = viewingRequestService.declineViewingRequest(51L, 1L, "Timeslot unavailable");

            assertEquals("DECLINED", result.getStatus());
            assertEquals("Timeslot unavailable", result.getDeclineReason());
            verify(transitionRepository).save(argThat(t ->
                    "DECLINED".equals(t.getToStatus())
                            && "Timeslot unavailable".equals(t.getReason())
            ));
            verify(emailService).sendEmail(
                    eq("tenant@example.com"),
                    eq("Viewing request declined"),
                    argThat(body -> body.contains("Test Apartment") && body.contains("Timeslot unavailable")));
        }

        @Test
        @DisplayName("throws when non-owner declines")
        void nonOwnerCannotDecline() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.declineViewingRequest(51L, 2L, "nope"));
        }

        @Test
        @DisplayName("throws when status not pending")
        void declineStatusNotPending() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));

            assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.declineViewingRequest(50L, 1L, "late"));
        }

        @Test
        @DisplayName("throws when decline request not found")
        void declineRequestNotFound() {
            when(viewingRequestRepository.findById(404L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.declineViewingRequest(404L, 1L, "n/a"));
        }

        @Test
        @DisplayName("throws when owner missing during decline transition")
        void declineOwnerMissing() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.declineViewingRequest(51L, 1L, "busy"));
        }
    }

    @Nested
    @DisplayName("cancelViewingRequest")
    class CancelTests {

        @Test
        @DisplayName("tenant can cancel pending request")
        void tenantCancelsPending() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));

            viewingRequestService.cancelViewingRequest(51L, 2L);

            verify(viewingRequestRepository).save(argThat(vr -> vr.getStatus() == ViewingRequest.ViewingStatus.CANCELLED));
            verify(transitionRepository).save(argThat(t ->
                    "PENDING".equals(t.getFromStatus()) && "CANCELLED".equals(t.getToStatus())
            ));
            verify(emailService).sendEmail(
                    eq("landlord@example.com"),
                    eq("Viewing request cancelled"),
                    argThat(body -> body.contains("Test Apartment") && body.contains("Ten Ant")));
        }

        @Test
        @DisplayName("tenant can cancel confirmed request")
        void tenantCancelsConfirmed() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));

            viewingRequestService.cancelViewingRequest(50L, 2L);

            verify(transitionRepository).save(argThat(t -> "CONFIRMED".equals(t.getFromStatus())));
            verify(emailService).sendEmail(
                    eq("landlord@example.com"),
                    eq("Viewing request cancelled"),
                    argThat(body -> body.contains("Test Apartment")));
        }

        @Test
        @DisplayName("throws when non-owner tenant cancels")
        void wrongTenantCannotCancel() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.cancelViewingRequest(51L, 999L));
        }

        @Test
        @DisplayName("throws when status cannot be cancelled")
        void invalidCancelState() {
            confirmedRequest.setStatus(ViewingRequest.ViewingStatus.DECLINED);
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));

            assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.cancelViewingRequest(50L, 2L));
        }

        @Test
        @DisplayName("throws when cancel request not found")
        void cancelNotFound() {
            when(viewingRequestRepository.findById(404L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.cancelViewingRequest(404L, 2L));
        }

        @Test
        @DisplayName("throws when tenant actor missing during cancel transition")
        void cancelTenantMissing() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.cancelViewingRequest(51L, 2L));
        }
    }

    @Nested
    @DisplayName("getTransitionHistory")
    class HistoryTests {

        @Test
        @DisplayName("tenant can access transition history")
        void tenantCanAccessHistory() {
            ViewingRequestTransition transition = ViewingRequestTransition.builder()
                    .id(1L)
                    .viewingRequest(pendingRequest)
                    .fromStatus(null)
                    .toStatus("PENDING")
                    .changedBy(tenant)
                    .changedAt(LocalDateTime.now())
                    .reason("Created")
                    .build();

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(transitionRepository.findByViewingRequestIdOrderByChangedAtAsc(51L)).thenReturn(List.of(transition));

            List<ViewingRequestTransitionDto> history = viewingRequestService.getTransitionHistory(51L, 2L);

            assertEquals(1, history.size());
            assertEquals("PENDING", history.get(0).getToStatus());
        }

        @Test
        @DisplayName("unauthorized user cannot access transition history")
        void unauthorizedCannotAccessHistory() {
            User stranger = User.builder().id(999L).role(User.UserRole.TENANT).build();
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(999L)).thenReturn(Optional.of(stranger));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.getTransitionHistory(51L, 999L));
        }

        @Test
        @DisplayName("history throws when request missing")
        void historyRequestMissing() {
            when(viewingRequestRepository.findById(404L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getTransitionHistory(404L, 2L));
        }

        @Test
        @DisplayName("history throws when user missing")
        void historyUserMissing() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getTransitionHistory(51L, 2L));
        }
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
            // Tenant completed → email goes to landlord (the other party)
            verify(emailService).sendEmail(
                    eq("landlord@example.com"),
                    eq("Viewing request completed"),
                    argThat(body -> body.contains("Test Apartment") && body.contains("completed")));
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
            // Landlord completed → email goes to tenant (the other party)
            verify(emailService).sendEmail(
                    eq("tenant@example.com"),
                    eq("Viewing request completed"),
                    argThat(body -> body.contains("Test Apartment") && body.contains("completed")));
        }

        @Test
        @DisplayName("unauthorized user cannot complete")
        void unauthorizedUser_throws() {
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

        @Test
        @DisplayName("missing actor user throws")
        void actorMissing_throws() {
            when(viewingRequestRepository.findById(50L)).thenReturn(Optional.of(confirmedRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(2L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.completeViewingRequest(50L, 2L));
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
            @DisplayName("statistics considers DECLINED transitions and landlord relevance path")
            void statsWithDeclinedTransition_landlordRelevant() {
                when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
                when(viewingRequestRepository.countByLandlordId(1L)).thenReturn(1L);
                when(viewingRequestRepository.countByLandlordIdAndStatus(eq(1L), any())).thenReturn(0L);

                ViewingRequest vr = ViewingRequest.builder()
                    .id(61L)
                    .tenant(tenant)
                    .apartment(apartment)
                    .status(ViewingRequest.ViewingStatus.DECLINED)
                    .createdAt(Instant.now().minus(java.time.Duration.ofHours(5)))
                    .build();
                ViewingRequestTransition transition = ViewingRequestTransition.builder()
                    .id(2L)
                    .viewingRequest(vr)
                    .fromStatus("PENDING")
                    .toStatus("DECLINED")
                    .changedBy(landlord)
                    .changedAt(LocalDateTime.now().minusHours(1))
                    .build();
                when(transitionRepository.findAll()).thenReturn(List.of(transition));

                ViewingRequestStatsDto stats = viewingRequestService.getStatistics(1L);

                assertNotNull(stats.getAverageResponseTimeHours());
            }

            @Test
            @DisplayName("admin statistics uses tenant-style queries")
            void adminStatsUsesTenantBranch() {
                when(userRepository.findById(3L)).thenReturn(Optional.of(admin));
                when(viewingRequestRepository.countByTenantId(3L)).thenReturn(0L);
                when(viewingRequestRepository.countByTenantIdAndStatus(eq(3L), any())).thenReturn(0L);
                when(transitionRepository.findAll()).thenReturn(Collections.emptyList());

                ViewingRequestStatsDto stats = viewingRequestService.getStatistics(3L);

                assertEquals(0L, stats.getTotalRequests());
                verify(viewingRequestRepository).countByTenantId(3L);
                verify(viewingRequestRepository, never()).countByLandlordId(3L);
            }

            @Test
            @DisplayName("transitions without matching ownership or timestamps keep avg null")
            void irrelevantTransitionsYieldNullAverage() {
                User otherTenant = User.builder().id(44L).role(User.UserRole.TENANT).build();
                when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
                when(viewingRequestRepository.countByTenantId(2L)).thenReturn(1L);
                when(viewingRequestRepository.countByTenantIdAndStatus(eq(2L), any())).thenReturn(0L);

                ViewingRequest externalVr = ViewingRequest.builder()
                    .id(88L)
                    .tenant(otherTenant)
                    .apartment(apartment)
                    .createdAt(null)
                    .status(ViewingRequest.ViewingStatus.CONFIRMED)
                    .build();
                ViewingRequestTransition transition = ViewingRequestTransition.builder()
                    .id(9L)
                    .viewingRequest(externalVr)
                    .fromStatus("PENDING")
                    .toStatus("CONFIRMED")
                    .changedAt(LocalDateTime.now())
                    .changedBy(landlord)
                    .build();
                when(transitionRepository.findAll()).thenReturn(List.of(transition));

                ViewingRequestStatsDto stats = viewingRequestService.getStatistics(2L);
                assertNull(stats.getAverageResponseTimeHours());
            }

        @Test
        @DisplayName("unknown user throws")
        void unknownUser_throws() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getStatistics(999L));
        }
    }

    // ─── Email edge-case tests ──────────────────────────────────────

    @Nested
    @DisplayName("Email trigger edge cases")
    class EmailEdgeCases {

        @Test
        @DisplayName("email failure on confirm does not break the workflow")
        void emailFailureOnConfirmDoesNotThrow() {
            doThrow(new RuntimeException("SMTP down"))
                    .when(emailService).sendEmail(anyString(), anyString(), anyString());
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));

            // Should not throw despite email failure
            ViewingRequestDto result = viewingRequestService.confirmViewingRequest(51L, 1L);
            assertEquals("CONFIRMED", result.getStatus());
        }

        @Test
        @DisplayName("decline with null reason uses fallback text in email")
        void declineWithNullReasonSendsFallbackEmail() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));

            viewingRequestService.declineViewingRequest(51L, 1L, null);

            verify(emailService).sendEmail(
                    eq("tenant@example.com"),
                    eq("Viewing request declined"),
                    argThat(body -> body.contains("No reason provided")));
        }

        @Test
        @DisplayName("decline with blank reason uses fallback text in email")
        void declineWithBlankReasonSendsFallbackEmail() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));

            viewingRequestService.declineViewingRequest(51L, 1L, "   ");

            verify(emailService).sendEmail(
                    eq("tenant@example.com"),
                    eq("Viewing request declined"),
                    argThat(body -> body.contains("No reason provided")));
        }

        @Test
        @DisplayName("complete with null confirmedDateTime formats as N/A")
        void completeWithNullDateFormatsAsNA() {
            ViewingRequest noDateRequest = ViewingRequest.builder()
                    .id(52L)
                    .apartment(apartment)
                    .tenant(tenant)
                    .proposedDateTime(LocalDateTime.of(2025, 7, 5, 10, 0))
                    .status(ViewingRequest.ViewingStatus.CONFIRMED)
                    .confirmedDateTime(null)
                    .createdAt(Instant.now())
                    .build();

            when(viewingRequestRepository.findById(52L)).thenReturn(Optional.of(noDateRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));
            when(transitionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ViewingRequestDto result = viewingRequestService.completeViewingRequest(52L, 2L);

            assertEquals("COMPLETED", result.getStatus());
            verify(emailService).sendEmail(
                    eq("landlord@example.com"),
                    eq("Viewing request completed"),
                    argThat(body -> body.contains("N/A")));
        }

        @Test
        @DisplayName("email failure on cancel does not break the workflow")
        void emailFailureOnCancelDoesNotThrow() {
            doThrow(new RuntimeException("SMTP down"))
                    .when(emailService).sendEmail(anyString(), anyString(), anyString());
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));

            // Should not throw despite email failure
            assertDoesNotThrow(() -> viewingRequestService.cancelViewingRequest(51L, 2L));
        }
    }

    @Nested
    @DisplayName("Payment linkage")
    class PaymentLinkageTests {

        @Test
        @DisplayName("markViewingAsPaymentRequired sets flag and links transaction")
        void markViewingAsPaymentRequired_setsPaymentRequiredAndLinks() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(10L)
                    .provider("PAYPAL")
                    .amount(BigDecimal.valueOf(250))
                    .currency("EUR")
                    .reference("51")
                    .build();

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(paymentTransactionService.createTransaction("PAYPAL", BigDecimal.valueOf(250), "EUR", "51"))
                    .thenReturn(tx);
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ViewingRequestDto result = viewingRequestService.markViewingAsPaymentRequired(
                    51L, BigDecimal.valueOf(250), "EUR", "PAYPAL");

            assertTrue(result.getPaymentRequired());
            assertEquals("CREATED", result.getPaymentStatus());
            verify(paymentTransactionService).createTransaction("PAYPAL", BigDecimal.valueOf(250), "EUR", "51");
            verify(viewingRequestRepository).save(pendingRequest);
        }

        @Test
        @DisplayName("markViewingAsPaymentRequired with unknown id throws")
        void markViewingAsPaymentRequired_notFound() {
            when(viewingRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.markViewingAsPaymentRequired(
                            999L, BigDecimal.valueOf(100), "EUR", "PAYPAL"));
        }

        @Test
        @DisplayName("clearPaymentRequirement resets flag and removes transaction link")
        void clearPaymentRequirement_resetsPaymentRequired() {
            pendingRequest.setPaymentRequired(true);
            pendingRequest.setPaymentTransaction(PaymentTransaction.builder().id(10L).build());

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            ViewingRequestDto result = viewingRequestService.clearPaymentRequirement(51L);

            assertFalse(result.getPaymentRequired());
            assertNull(result.getPaymentStatus());
        }

        @Test
        @DisplayName("clearPaymentRequirement with unknown id throws")
        void clearPaymentRequirement_notFound() {
            when(viewingRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.clearPaymentRequirement(999L));
        }

        @Test
        @DisplayName("isPaid returns true when paymentRequired is false")
        void isPaid_noPaymentRequired() {
            ViewingRequest vr = ViewingRequest.builder()
                    .paymentRequired(false)
                    .build();
            assertTrue(vr.isPaid());
        }

        @Test
        @DisplayName("isPaid returns false when paymentRequired but no transaction")
        void isPaid_paymentRequiredNoTransaction() {
            ViewingRequest vr = ViewingRequest.builder()
                    .paymentRequired(true)
                    .paymentTransaction(null)
                    .build();
            assertFalse(vr.isPaid());
        }

        @Test
        @DisplayName("isPaid returns true when transaction is COMPLETED")
        void isPaid_transactionCompleted() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .status(PaymentTransaction.PaymentTransactionStatus.COMPLETED)
                    .build();
            ViewingRequest vr = ViewingRequest.builder()
                    .paymentRequired(true)
                    .paymentTransaction(tx)
                    .build();
            assertTrue(vr.isPaid());
        }

        @Test
        @DisplayName("isPaid returns false when transaction is PENDING")
        void isPaid_transactionPending() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .status(PaymentTransaction.PaymentTransactionStatus.PENDING)
                    .build();
            ViewingRequest vr = ViewingRequest.builder()
                    .paymentRequired(true)
                    .paymentTransaction(tx)
                    .build();
            assertFalse(vr.isPaid());
        }

        @Test
        @DisplayName("isPaymentInProgress returns true for CREATED status")
        void isPaymentInProgress_created() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .status(PaymentTransaction.PaymentTransactionStatus.CREATED)
                    .build();
            ViewingRequest vr = ViewingRequest.builder()
                    .paymentTransaction(tx)
                    .build();
            assertTrue(vr.isPaymentInProgress());
        }

        @Test
        @DisplayName("isPaymentInProgress returns false when no transaction")
        void isPaymentInProgress_noTransaction() {
            ViewingRequest vr = ViewingRequest.builder().build();
            assertFalse(vr.isPaymentInProgress());
        }

        @Test
        @DisplayName("isRefunded returns true for REFUNDED status")
        void isRefunded_true() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .status(PaymentTransaction.PaymentTransactionStatus.REFUNDED)
                    .build();
            ViewingRequest vr = ViewingRequest.builder()
                    .paymentTransaction(tx)
                    .build();
            assertTrue(vr.isRefunded());
        }

        @Test
        @DisplayName("isRefunded returns false when no transaction")
        void isRefunded_noTransaction() {
            ViewingRequest vr = ViewingRequest.builder().build();
            assertFalse(vr.isRefunded());
        }
    }

    @Nested
    @DisplayName("Payment session")
    class PaymentSessionTests {

        @Test
        @DisplayName("createPaymentSession creates transaction and returns session DTO")
        void createPaymentSession_success() {
            pendingRequest.setPaymentRequired(true);
            pendingRequest.setPaymentTransaction(null);

            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(20L)
                    .provider("stripe")
                    .amount(BigDecimal.valueOf(50))
                    .currency("EUR")
                    .reference("51")
                    .build();

            PaymentTransaction updatedTx = PaymentTransaction.builder()
                    .id(20L)
                    .provider("stripe")
                    .amount(BigDecimal.valueOf(50))
                    .currency("EUR")
                    .reference("51")
                    .providerTransactionId("cs_test_abc")
                    .status(PaymentTransaction.PaymentTransactionStatus.PENDING)
                    .build();

            PaymentProviderSession providerSession = PaymentProviderSession.builder()
                    .providerTransactionId("cs_test_abc")
                    .redirectUrl("https://checkout.stripe.com/pay/cs_test_abc")
                    .build();

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(paymentTransactionService.createTransaction("stripe", BigDecimal.valueOf(50), "EUR", "51"))
                    .thenReturn(tx);
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(paymentProviderRouter.resolve("stripe")).thenReturn(paymentProviderClient);
            when(paymentProviderClient.createCheckoutSession(tx, pendingRequest)).thenReturn(providerSession);
            when(paymentTransactionService.updateProviderDetails(20L, "cs_test_abc")).thenReturn(updatedTx);

            PaymentSessionDto result = viewingRequestService.createPaymentSession(51L, 2L, "stripe");

            assertEquals(20L, result.getTransactionId());
            assertEquals("stripe", result.getProvider());
            assertEquals("PENDING", result.getStatus());
            assertEquals("https://checkout.stripe.com/pay/cs_test_abc", result.getRedirectUrl());
            verify(paymentTransactionService).createTransaction("stripe", BigDecimal.valueOf(50), "EUR", "51");
            verify(paymentProviderRouter).resolve("stripe");
            verify(paymentProviderClient).createCheckoutSession(tx, pendingRequest);
            verify(paymentTransactionService).updateProviderDetails(20L, "cs_test_abc");
        }

        @Test
        @DisplayName("createPaymentSession reuses existing transaction")
        void createPaymentSession_reusesExistingTransaction() {
            PaymentTransaction existingTx = PaymentTransaction.builder()
                    .id(30L)
                    .provider("stripe")
                    .amount(BigDecimal.valueOf(50))
                    .status(PaymentTransaction.PaymentTransactionStatus.PENDING)
                    .build();

            PaymentProviderSession providerSession = PaymentProviderSession.builder()
                    .providerTransactionId("cs_test_existing")
                    .redirectUrl("https://checkout.stripe.com/pay/cs_test_existing")
                    .build();

            PaymentTransaction updatedTx = PaymentTransaction.builder()
                    .id(30L)
                    .provider("stripe")
                    .amount(BigDecimal.valueOf(50))
                    .providerTransactionId("cs_test_existing")
                    .status(PaymentTransaction.PaymentTransactionStatus.PENDING)
                    .build();

            pendingRequest.setPaymentRequired(true);
            pendingRequest.setPaymentTransaction(existingTx);

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(paymentProviderRouter.resolve("stripe")).thenReturn(paymentProviderClient);
            when(paymentProviderClient.createCheckoutSession(existingTx, pendingRequest)).thenReturn(providerSession);
            when(paymentTransactionService.updateProviderDetails(30L, "cs_test_existing")).thenReturn(updatedTx);

            PaymentSessionDto result = viewingRequestService.createPaymentSession(51L, 2L, "stripe");

            assertEquals(30L, result.getTransactionId());
            assertEquals("PENDING", result.getStatus());
            assertEquals("https://checkout.stripe.com/pay/cs_test_existing", result.getRedirectUrl());
            verify(paymentTransactionService, never()).createTransaction(any(), any(), any(), any());
            verify(paymentProviderRouter).resolve("stripe");
            verify(paymentProviderClient).createCheckoutSession(existingTx, pendingRequest);
        }

        @Test
        @DisplayName("createPaymentSession throws when payment not required")
        void createPaymentSession_paymentNotRequired() {
            pendingRequest.setPaymentRequired(false);
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.createPaymentSession(51L, 2L, "stripe"));
        }

        @Test
        @DisplayName("createPaymentSession throws for non-tenant caller")
        void createPaymentSession_nonTenant() {
            pendingRequest.setPaymentRequired(true);
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.createPaymentSession(51L, 1L, "stripe"));
        }

        @Test
        @DisplayName("createPaymentSession throws for not found viewing request")
        void createPaymentSession_notFound() {
            when(viewingRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.createPaymentSession(999L, 2L, "stripe"));
        }

        @Test
        @DisplayName("createPaymentSession wraps provider error as IllegalStateException")
        void createPaymentSession_providerError() {
            pendingRequest.setPaymentRequired(true);
            pendingRequest.setPaymentTransaction(null);

            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(40L)
                    .provider("stripe")
                    .amount(BigDecimal.valueOf(50))
                    .currency("EUR")
                    .reference("51")
                    .build();

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));
            when(paymentTransactionService.createTransaction("stripe", BigDecimal.valueOf(50), "EUR", "51"))
                    .thenReturn(tx);
            when(viewingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(paymentProviderRouter.resolve("stripe")).thenReturn(paymentProviderClient);
            when(paymentProviderClient.createCheckoutSession(tx, pendingRequest))
                    .thenThrow(new IllegalStateException("Payment provider error: connection refused"));

            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> viewingRequestService.createPaymentSession(51L, 2L, "stripe"));
            assertTrue(ex.getMessage().contains("Payment provider error"));
        }

        @Test
        @DisplayName("getPaymentStatus returns status from linked transaction")
        void getPaymentStatus_returnsStatus() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(10L)
                    .status(PaymentTransaction.PaymentTransactionStatus.COMPLETED)
                    .build();
            pendingRequest.setPaymentTransaction(tx);

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            String status = viewingRequestService.getPaymentStatus(51L, 2L);
            assertEquals("COMPLETED", status);
        }

        @Test
        @DisplayName("getPaymentStatus returns null when no transaction")
        void getPaymentStatus_noTransaction() {
            pendingRequest.setPaymentTransaction(null);
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            String status = viewingRequestService.getPaymentStatus(51L, 2L);
            assertNull(status);
        }

        @Test
        @DisplayName("getPaymentStatus returns status for landlord caller")
        void getPaymentStatus_landlordAccess() {
            PaymentTransaction tx = PaymentTransaction.builder()
                    .id(10L)
                    .status(PaymentTransaction.PaymentTransactionStatus.PENDING)
                    .build();
            pendingRequest.setPaymentTransaction(tx);

            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            String status = viewingRequestService.getPaymentStatus(51L, 1L);
            assertEquals("PENDING", status);
        }

        @Test
        @DisplayName("getPaymentStatus throws for non-participant")
        void getPaymentStatus_nonParticipant() {
            when(viewingRequestRepository.findById(51L)).thenReturn(Optional.of(pendingRequest));

            assertThrows(SecurityException.class,
                    () -> viewingRequestService.getPaymentStatus(51L, 999L));
        }

        @Test
        @DisplayName("getPaymentStatus throws for not found viewing request")
        void getPaymentStatus_notFound() {
            when(viewingRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> viewingRequestService.getPaymentStatus(999L, 2L));
        }
    }

    // ── getAllViewingRequestsAdmin (entirely untested until now) ──

    @Nested
    @DisplayName("getAllViewingRequestsAdmin")
    class AdminViewingRequestTests {

        @Test
        @DisplayName("returns all viewing requests when status is null")
        void allRequests_noFilter() {
            Page<ViewingRequest> page = new PageImpl<>(List.of(pendingRequest, confirmedRequest));
            when(viewingRequestRepository.findAll(any(Pageable.class))).thenReturn(page);

            Page<ViewingRequestDto> result = viewingRequestService.getAllViewingRequestsAdmin(null, Pageable.unpaged());

            assertEquals(2, result.getTotalElements());
            verify(viewingRequestRepository).findAll(any(Pageable.class));
            verify(viewingRequestRepository, never()).findByStatus(any(), any());
        }

        @Test
        @DisplayName("returns all viewing requests when status is blank")
        void allRequests_blankFilter() {
            Page<ViewingRequest> page = new PageImpl<>(List.of(pendingRequest));
            when(viewingRequestRepository.findAll(any(Pageable.class))).thenReturn(page);

            Page<ViewingRequestDto> result = viewingRequestService.getAllViewingRequestsAdmin("  ", Pageable.unpaged());

            assertEquals(1, result.getTotalElements());
            verify(viewingRequestRepository).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("filters by status when provided")
        void filteredByStatus() {
            Page<ViewingRequest> page = new PageImpl<>(List.of(pendingRequest));
            when(viewingRequestRepository.findByStatus(eq(ViewingRequest.ViewingStatus.PENDING), any(Pageable.class)))
                    .thenReturn(page);

            Page<ViewingRequestDto> result = viewingRequestService.getAllViewingRequestsAdmin("PENDING", Pageable.unpaged());

            assertEquals(1, result.getTotalElements());
            verify(viewingRequestRepository).findByStatus(eq(ViewingRequest.ViewingStatus.PENDING), any(Pageable.class));
        }

        @Test
        @DisplayName("case-insensitive status filtering")
        void caseInsensitiveStatus() {
            Page<ViewingRequest> page = new PageImpl<>(List.of(confirmedRequest));
            when(viewingRequestRepository.findByStatus(eq(ViewingRequest.ViewingStatus.CONFIRMED), any(Pageable.class)))
                    .thenReturn(page);

            Page<ViewingRequestDto> result = viewingRequestService.getAllViewingRequestsAdmin("confirmed", Pageable.unpaged());

            assertEquals(1, result.getTotalElements());
        }
    }
}
