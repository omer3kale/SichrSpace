package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.BookingRequestDto;
import com.sichrplace.backend.dto.CreateBookingRequestRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.BookingRequest;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.BookingRequestRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BookingRequestService")
class BookingRequestServiceTest {

    @Mock private BookingRequestRepository bookingRequestRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private BookingRequestServiceImpl bookingRequestService;

    private User tenant;
    private User landlord;
    private User otherLandlord;
    private Apartment apartment;
    private BookingRequest submittedRequest;

    @BeforeEach
    void setUp() {
        tenant = User.builder()
                .id(10L).email("tenant@example.com")
                .firstName("Tenant").lastName("User")
                .role(User.UserRole.TENANT).isActive(true).emailVerified(true)
                .build();

        landlord = User.builder()
                .id(20L).email("landlord@example.com")
                .firstName("Land").lastName("Lord")
                .role(User.UserRole.LANDLORD).isActive(true).emailVerified(true)
                .build();

        otherLandlord = User.builder()
                .id(30L).email("other@example.com")
                .firstName("Other").lastName("Lord")
                .role(User.UserRole.LANDLORD).isActive(true).emailVerified(true)
                .build();

        apartment = Apartment.builder()
                .id(100L).title("Nice flat").city("Berlin")
                .owner(landlord)
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();

        submittedRequest = BookingRequest.builder()
                .id(1L)
                .apartment(apartment)
                .tenant(tenant)
                .landlord(landlord)
                .preferredMoveIn(LocalDate.of(2026, 6, 1))
                .status(BookingRequest.BookingStatus.SUBMITTED)
                .build();
    }

    // ── Create ──

    @Nested
    @DisplayName("createBookingRequest")
    class CreateTests {

        @Test
        @DisplayName("happy path → creates SUBMITTED booking request")
        void happyPath() {
            when(userRepository.findById(10L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(bookingRequestRepository.save(any())).thenAnswer(inv -> {
                BookingRequest br = inv.getArgument(0);
                br.setId(1L);
                return br;
            });

            CreateBookingRequestRequest req = CreateBookingRequestRequest.builder()
                    .preferredMoveIn(LocalDate.of(2026, 6, 1))
                    .preferredMoveOut(LocalDate.of(2027, 5, 31))
                    .wouldExtendLater(true)
                    .reasonType("WORK")
                    .payer("MYSELF")
                    .detailedReason("Starting new job in Berlin")
                    .build();

            BookingRequestDto dto = bookingRequestService.createBookingRequest(100L, 10L, req);

            assertNotNull(dto);
            assertEquals(1L, dto.getId());
            assertEquals(100L, dto.getApartmentId());
            assertEquals(10L, dto.getTenantId());
            assertEquals(20L, dto.getLandlordId());
            assertEquals("SUBMITTED", dto.getStatus());
            assertEquals("WORK", dto.getReasonType());
            assertEquals("MYSELF", dto.getPayer());
        }

        @Test
        @DisplayName("tenant not found → throws")
        void tenantNotFound() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> bookingRequestService.createBookingRequest(100L, 999L,
                            CreateBookingRequestRequest.builder()
                                    .preferredMoveIn(LocalDate.now()).build()));
        }

        @Test
        @DisplayName("apartment not found → throws")
        void apartmentNotFound() {
            when(userRepository.findById(10L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> bookingRequestService.createBookingRequest(999L, 10L,
                            CreateBookingRequestRequest.builder()
                                    .preferredMoveIn(LocalDate.now()).build()));
        }

        @Test
        @DisplayName("landlord creating booking → throws SecurityException")
        void landlordCannotBook() {
            when(userRepository.findById(20L)).thenReturn(Optional.of(landlord));

            assertThrows(SecurityException.class,
                    () -> bookingRequestService.createBookingRequest(100L, 20L,
                            CreateBookingRequestRequest.builder()
                                    .preferredMoveIn(LocalDate.now()).build()));
        }

        @Test
        @DisplayName("tenant booking own apartment → throws")
        void cannotBookOwnApartment() {
            // Simulate landlord being a tenant (edge case: same user owns the apartment)
            apartment.setOwner(tenant);
            when(userRepository.findById(10L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));

            assertThrows(IllegalArgumentException.class,
                    () -> bookingRequestService.createBookingRequest(100L, 10L,
                            CreateBookingRequestRequest.builder()
                                    .preferredMoveIn(LocalDate.now()).build()));
        }
    }

    // ── Accept / Decline ──

    @Nested
    @DisplayName("accept / decline")
    class LifecycleTests {

        @Test
        @DisplayName("landlord accepts SUBMITTED → ACCEPTED")
        void acceptHappyPath() {
            when(bookingRequestRepository.findById(1L)).thenReturn(Optional.of(submittedRequest));
            when(bookingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BookingRequestDto dto = bookingRequestService.acceptBookingRequest(1L, 20L);

            assertEquals("ACCEPTED", dto.getStatus());
        }

        @Test
        @DisplayName("landlord declines SUBMITTED → DECLINED with reason")
        void declineHappyPath() {
            when(bookingRequestRepository.findById(1L)).thenReturn(Optional.of(submittedRequest));
            when(bookingRequestRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

            BookingRequestDto dto = bookingRequestService.declineBookingRequest(1L, 20L, "Not a good fit");

            assertEquals("DECLINED", dto.getStatus());
            assertEquals("Not a good fit", dto.getDeclineReason());
        }

        @Test
        @DisplayName("other landlord cannot accept → SecurityException")
        void otherLandlordCannotAccept() {
            when(bookingRequestRepository.findById(1L)).thenReturn(Optional.of(submittedRequest));

            assertThrows(SecurityException.class,
                    () -> bookingRequestService.acceptBookingRequest(1L, 30L));
        }

        @Test
        @DisplayName("other landlord cannot decline → SecurityException")
        void otherLandlordCannotDecline() {
            when(bookingRequestRepository.findById(1L)).thenReturn(Optional.of(submittedRequest));

            assertThrows(SecurityException.class,
                    () -> bookingRequestService.declineBookingRequest(1L, 30L, "reason"));
        }

        @Test
        @DisplayName("cannot accept already ACCEPTED request → IllegalStateException")
        void cannotAcceptTwice() {
            submittedRequest.setStatus(BookingRequest.BookingStatus.ACCEPTED);
            when(bookingRequestRepository.findById(1L)).thenReturn(Optional.of(submittedRequest));

            assertThrows(IllegalStateException.class,
                    () -> bookingRequestService.acceptBookingRequest(1L, 20L));
        }

        @Test
        @DisplayName("cannot decline DECLINED request → IllegalStateException")
        void cannotDeclineTwice() {
            submittedRequest.setStatus(BookingRequest.BookingStatus.DECLINED);
            when(bookingRequestRepository.findById(1L)).thenReturn(Optional.of(submittedRequest));

            assertThrows(IllegalStateException.class,
                    () -> bookingRequestService.declineBookingRequest(1L, 20L, "reason"));
        }
    }

    // ── Query ──

    @Nested
    @DisplayName("query")
    class QueryTests {

        @Test
        @DisplayName("tenant's booking requests returned")
        void tenantRequests() {
            when(bookingRequestRepository.findByTenantId(10L)).thenReturn(List.of(submittedRequest));

            List<BookingRequestDto> result = bookingRequestService.getBookingRequestsByTenant(10L);

            assertEquals(1, result.size());
            assertEquals(10L, result.get(0).getTenantId());
        }

        @Test
        @DisplayName("landlord's incoming booking requests returned")
        void landlordRequests() {
            when(bookingRequestRepository.findByLandlordId(20L)).thenReturn(List.of(submittedRequest));

            List<BookingRequestDto> result = bookingRequestService.getBookingRequestsByLandlord(20L);

            assertEquals(1, result.size());
            assertEquals(20L, result.get(0).getLandlordId());
        }

        @Test
        @DisplayName("getByApartment: authorized landlord sees requests")
        void byApartmentAuthorized() {
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(bookingRequestRepository.findByApartmentId(100L)).thenReturn(List.of(submittedRequest));

            List<BookingRequestDto> result = bookingRequestService.getBookingRequestsByApartment(100L, 20L);

            assertEquals(1, result.size());
        }

        @Test
        @DisplayName("getByApartment: other landlord → SecurityException")
        void byApartmentUnauthorized() {
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));

            assertThrows(SecurityException.class,
                    () -> bookingRequestService.getBookingRequestsByApartment(100L, 30L));
        }

        @Test
        @DisplayName("getByApartment: apartment not found → throws")
        void byApartmentNotFound() {
            when(apartmentRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> bookingRequestService.getBookingRequestsByApartment(999L, 20L));
        }
    }

    // ── Not-found edge cases ──

    @Nested
    @DisplayName("not-found edge cases")
    class NotFoundTests {

        @Test
        @DisplayName("accept non-existent booking request → IllegalArgumentException")
        void acceptNotFound() {
            when(bookingRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> bookingRequestService.acceptBookingRequest(999L, 20L));
        }

        @Test
        @DisplayName("decline non-existent booking request → IllegalArgumentException")
        void declineNotFound() {
            when(bookingRequestRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> bookingRequestService.declineBookingRequest(999L, 20L, "reason"));
        }
    }

    // ── Null enum fields ──

    @Nested
    @DisplayName("null optional fields on create")
    class NullFieldTests {

        @Test
        @DisplayName("null reasonType and payer → skips enum parsing")
        void nullEnumFields() {
            when(userRepository.findById(10L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(bookingRequestRepository.save(any())).thenAnswer(inv -> {
                BookingRequest br = inv.getArgument(0);
                br.setId(2L);
                return br;
            });

            CreateBookingRequestRequest req = CreateBookingRequestRequest.builder()
                    .preferredMoveIn(LocalDate.of(2026, 6, 1))
                    .reasonType(null)
                    .payer(null)
                    .build();

            BookingRequestDto dto = bookingRequestService.createBookingRequest(100L, 10L, req);

            assertNotNull(dto);
            assertNull(dto.getReasonType());
            assertNull(dto.getPayer());
        }
    }
}
