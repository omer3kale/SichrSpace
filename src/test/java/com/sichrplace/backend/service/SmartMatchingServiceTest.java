package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ApartmentMatchDto;
import com.sichrplace.backend.dto.ApplicantMatchDto;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SmartMatchingService — FTL-14")
class SmartMatchingServiceTest {

    @Mock private BookingRequestRepository bookingRequestRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private SmartMatchingService smartMatchingService;

    private User landlord;
    private Apartment apartment;

    @BeforeEach
    void setUp() {
        landlord = User.builder()
                .id(20L).email("landlord@example.com")
                .firstName("Land").lastName("Lord")
                .role(User.UserRole.LANDLORD).isActive(true).emailVerified(true)
                .build();

        apartment = Apartment.builder()
                .id(100L).title("Nice flat").city("Berlin")
                .owner(landlord)
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .petFriendly(true)
                .availableFrom(LocalDate.of(2026, 5, 1))
                .moveOutDate(LocalDate.of(2027, 4, 30))
                .build();
    }

    @Test
    @DisplayName("better match scores higher — non-smoker with dates in range")
    void betterMatchScoresHigher() {
        User strongTenant = User.builder()
                .id(10L).email("strong@example.com")
                .firstName("Strong").lastName("Tenant")
                .role(User.UserRole.TENANT)
                .smokingStatus(User.SmokingStatus.NON_SMOKER)
                .lifestyleTags("clean,quiet")
                .hobbies("reading,yoga")
                .build();

        User weakTenant = User.builder()
                .id(11L).email("weak@example.com")
                .firstName("Weak").lastName("Tenant")
                .role(User.UserRole.TENANT)
                .smokingStatus(User.SmokingStatus.SMOKER)
                .build();

        BookingRequest strongReq = BookingRequest.builder()
                .id(1L).apartment(apartment).tenant(strongTenant).landlord(landlord)
                .preferredMoveIn(LocalDate.of(2026, 6, 1))
                .preferredMoveOut(LocalDate.of(2027, 3, 31))
                .wouldExtendLater(true)
                .adultsJson("[{\"name\":\"Self\"}]")
                .detailedReason("New job at company X")
                .status(BookingRequest.BookingStatus.SUBMITTED)
                .build();

        BookingRequest weakReq = BookingRequest.builder()
                .id(2L).apartment(apartment).tenant(weakTenant).landlord(landlord)
                .preferredMoveIn(LocalDate.of(2026, 6, 1))
                .status(BookingRequest.BookingStatus.SUBMITTED)
                .build();

        when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
        when(bookingRequestRepository.findByApartmentIdAndStatus(100L, BookingRequest.BookingStatus.SUBMITTED))
                .thenReturn(List.of(strongReq, weakReq));

        List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(100L, 20L);

        assertEquals(2, ranked.size());
        // Strong applicant should be first (higher score)
        assertEquals(1L, ranked.get(0).getBookingRequestId());
        assertTrue(ranked.get(0).getScore() > ranked.get(1).getScore(),
                "Strong applicant score (" + ranked.get(0).getScore()
                        + ") should be > weak (" + ranked.get(1).getScore() + ")");
        assertFalse(ranked.get(0).getReasons().isEmpty());
        assertNotNull(ranked.get(0).getPublicProfile());
    }

    @Test
    @DisplayName("five applicants ranked in descending score order")
    void fiveApplicantsDescending() {
        when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));

        List<BookingRequest> requests = List.of(
                makeRequest(1L, makeUser(10L, User.SmokingStatus.SMOKER, null, null), null, null, false),
                makeRequest(2L, makeUser(11L, User.SmokingStatus.NON_SMOKER, "tags", "hobbies"), "[{\"name\":\"Self\"}]", "reason", true),
                makeRequest(3L, makeUser(12L, User.SmokingStatus.OCCASIONAL, "tags", null), null, null, false),
                makeRequest(4L, makeUser(13L, User.SmokingStatus.NON_SMOKER, null, "running"), "[{\"name\":\"Self\"}]", null, false),
                makeRequest(5L, makeUser(14L, null, null, null), null, null, false)
        );
        when(bookingRequestRepository.findByApartmentIdAndStatus(100L, BookingRequest.BookingStatus.SUBMITTED))
                .thenReturn(requests);

        List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(100L, 20L);

        assertEquals(5, ranked.size());
        for (int i = 0; i < ranked.size() - 1; i++) {
            assertTrue(ranked.get(i).getScore() >= ranked.get(i + 1).getScore(),
                    "Score at index " + i + " (" + ranked.get(i).getScore()
                            + ") should be >= index " + (i + 1) + " (" + ranked.get(i + 1).getScore() + ")");
        }
    }

    @Test
    @DisplayName("unauthorized landlord → SecurityException")
    void unauthorizedLandlord() {
        when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));

        assertThrows(SecurityException.class,
                () -> smartMatchingService.compareApplicants(100L, 999L));
    }

    @Test
    @DisplayName("apartment not found → throws")
    void apartmentNotFound() {
        when(apartmentRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> smartMatchingService.compareApplicants(999L, 20L));
    }

    @Test
    @DisplayName("pet owner + pet-friendly apartment gets good pet score")
    void petScoring() {
        User petOwner = User.builder()
                .id(15L).email("petowner@example.com")
                .firstName("Pet").lastName("Owner").role(User.UserRole.TENANT)
                .smokingStatus(User.SmokingStatus.NON_SMOKER)
                .build();

        BookingRequest petReq = BookingRequest.builder()
                .id(10L).apartment(apartment).tenant(petOwner).landlord(landlord)
                .preferredMoveIn(LocalDate.of(2026, 6, 1))
                .petsJson("[\"DOG\"]")
                .status(BookingRequest.BookingStatus.SUBMITTED)
                .build();

        when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
        when(bookingRequestRepository.findByApartmentIdAndStatus(100L, BookingRequest.BookingStatus.SUBMITTED))
                .thenReturn(List.of(petReq));

        List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(100L, 20L);

        assertEquals(1, ranked.size());
        assertTrue(ranked.get(0).getReasons().stream()
                        .anyMatch(r -> r.contains("Pet-friendly")),
                "Should include pet-friendly reason");
    }

    // ── helpers ──

    private User makeUser(Long id, User.SmokingStatus smoking, String tags, String hobbies) {
        return User.builder()
                .id(id).email("u" + id + "@example.com")
                .firstName("User" + id).lastName("Test")
                .role(User.UserRole.TENANT)
                .smokingStatus(smoking).lifestyleTags(tags).hobbies(hobbies)
                .build();
    }

    private BookingRequest makeRequest(Long id, User tenant, String adultsJson, String detail, boolean extend) {
        return BookingRequest.builder()
                .id(id).apartment(apartment).tenant(tenant).landlord(landlord)
                .preferredMoveIn(LocalDate.of(2026, 6, 1))
                .preferredMoveOut(LocalDate.of(2027, 3, 31))
                .wouldExtendLater(extend)
                .adultsJson(adultsJson)
                .detailedReason(detail)
                .status(BookingRequest.BookingStatus.SUBMITTED)
                .build();
    }

    // ══════════════════════════════════════════════════════════════
    // FTL-22 — Tenant-side: matchApartmentsForTenant
    // ══════════════════════════════════════════════════════════════

    @Nested
    @DisplayName("FTL-22 — matchApartmentsForTenant")
    class TenantMatchingTests {

        private User tenant;

        @BeforeEach
        void setUpTenant() {
            tenant = User.builder()
                    .id(30L).email("tenant@example.com")
                    .firstName("Tenant").lastName("Test")
                    .role(User.UserRole.TENANT)
                    .city("Berlin")
                    .smokingStatus(User.SmokingStatus.NON_SMOKER)
                    .lifestyleTags("quiet,vegan")
                    .hobbies("hiking")
                    .petOwner(false)
                    .isActive(true).emailVerified(true)
                    .build();
        }

        @Test
        @DisplayName("returns scored apartments sorted descending")
        void returnsScoredApartmentsSorted() {
            Apartment good = Apartment.builder()
                    .id(1L).title("Perfect match").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(800))
                    .petFriendly(true)
                    .furnishedStatus(Apartment.FurnishedStatus.FURNISHED)
                    .areaDescription("Quiet neighbourhood near parks")
                    .flexibleTimeslot(true)
                    .build(); // available now (null = available)

            Apartment ok = Apartment.builder()
                    .id(2L).title("Okay match").city("Hamburg")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(900))
                    .availableFrom(LocalDate.now().plusDays(60))
                    .build();

            when(userRepository.findById(30L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(good, ok)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(30L, 20);

            assertEquals(2, results.size());
            // Berlin apartment should score higher for Berlin tenant
            assertEquals(1L, results.get(0).getApartmentId());
            assertTrue(results.get(0).getScore() > results.get(1).getScore());
            assertFalse(results.get(0).getReasons().isEmpty());
            assertNotNull(results.get(0).getCard());
        }

        @Test
        @DisplayName("city match gives highest location score")
        void cityMatchLocation() {
            Apartment berlinApt = Apartment.builder()
                    .id(1L).title("Berlin flat").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(800))
                    .build();

            when(userRepository.findById(30L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(berlinApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(30L, 20);

            assertEquals(1, results.size());
            assertTrue(results.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("Same city")));
        }

        @Test
        @DisplayName("pet owner matched to pet-friendly apartment")
        void petOwnerMatching() {
            User petTenant = User.builder()
                    .id(31L).email("pet@example.com")
                    .firstName("Pet").lastName("Tenant")
                    .role(User.UserRole.TENANT).city("Berlin")
                    .petOwner(true)
                    .build();

            Apartment petApt = Apartment.builder()
                    .id(1L).title("Pet flat").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(800))
                    .petFriendly(true)
                    .build();

            Apartment noPetApt = Apartment.builder()
                    .id(2L).title("No pet flat").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(700))
                    .petFriendly(false)
                    .build();

            when(userRepository.findById(31L)).thenReturn(Optional.of(petTenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(petApt, noPetApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(31L, 20);

            assertEquals(2, results.size());
            // Pet-friendly apartment should rank higher
            assertEquals(1L, results.get(0).getApartmentId());
            assertTrue(results.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("Pet-friendly")));
        }

        @Test
        @DisplayName("tenant not found → throws")
        void tenantNotFound() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> smartMatchingService.matchApartmentsForTenant(999L, 20));
        }

        @Test
        @DisplayName("limit caps the result count")
        void limitCapsResults() {
            List<Apartment> many = new java.util.ArrayList<>();
            for (int i = 0; i < 10; i++) {
                many.add(Apartment.builder()
                        .id((long) i).title("Apt " + i).city("Berlin")
                        .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                        .monthlyRent(java.math.BigDecimal.valueOf(500 + i * 50))
                        .build());
            }

            when(userRepository.findById(30L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(many));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(30L, 3);

            assertEquals(3, results.size());
        }

        @Test
        @DisplayName("no available apartments → empty list")
        void noAvailableApartments() {
            when(userRepository.findById(30L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of()));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(30L, 20);

            assertTrue(results.isEmpty());
        }

        @Test
        @DisplayName("available-now apartment scores higher than future availability")
        void availabilityScoring() {
            Apartment nowApt = Apartment.builder()
                    .id(1L).title("Available now").city("Munich")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(800))
                    .flexibleTimeslot(true)
                    .build(); // availableFrom null = available now

            Apartment futureApt = Apartment.builder()
                    .id(2L).title("Future").city("Munich")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(800))
                    .availableFrom(LocalDate.now().plusDays(90))
                    .build();

            // Tenant without city preference (to isolate availability scoring)
            User noCityTenant = User.builder()
                    .id(32L).email("nocity@example.com")
                    .firstName("No").lastName("City")
                    .role(User.UserRole.TENANT)
                    .build();

            when(userRepository.findById(32L)).thenReturn(Optional.of(noCityTenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(nowApt, futureApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(32L, 20);

            assertEquals(2, results.size());
            assertEquals(1L, results.get(0).getApartmentId());
            assertTrue(results.get(0).getScore() > results.get(1).getScore());
        }

        @Test
        @DisplayName("district partial match gives 10 points")
        void districtPartialMatch() {
            Apartment districtApt = Apartment.builder()
                    .id(3L).title("District flat").city("Munich")
                    .district("Berlin-Mitte area")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(700))
                    .build();

            when(userRepository.findById(30L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(districtApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(30L, 20);

            assertEquals(1, results.size());
            assertTrue(results.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("District")));
        }

        @Test
        @DisplayName("pet owner + non-pet-friendly apartment → 0 pet score with reason")
        void petOwnerNonPetFriendly() {
            User petTenant = User.builder()
                    .id(33L).email("petowner2@example.com")
                    .firstName("Pet").lastName("Owner2")
                    .role(User.UserRole.TENANT).city("Berlin")
                    .petOwner(true)
                    .build();

            Apartment noPetApt = Apartment.builder()
                    .id(4L).title("No pets allowed").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(600))
                    .petFriendly(false)
                    .build();

            when(userRepository.findById(33L)).thenReturn(Optional.of(petTenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(noPetApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(33L, 20);

            assertEquals(1, results.size());
            assertTrue(results.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("not pet-friendly")));
        }

        @Test
        @DisplayName("available within 30 days gives 10 points")
        void availableWithin30Days() {
            Apartment soonApt = Apartment.builder()
                    .id(5L).title("Available soon").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(800))
                    .availableFrom(LocalDate.now().plusDays(15))
                    .build();

            when(userRepository.findById(30L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(soonApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(30L, 20);

            assertEquals(1, results.size());
            assertTrue(results.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("Available within 30 days")));
        }

        @Test
        @DisplayName("short-term moveOutDate within 6 months → no long-term bonus")
        void shortTermMoveOut() {
            Apartment shortTermApt = Apartment.builder()
                    .id(6L).title("Short term").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(750))
                    .moveOutDate(LocalDate.now().plusMonths(3))
                    .build();

            when(userRepository.findById(30L)).thenReturn(Optional.of(tenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(shortTermApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(30L, 20);

            assertEquals(1, results.size());
            assertTrue(results.get(0).getReasons().stream()
                    .noneMatch(r -> r.contains("Long-term")));
        }

        @Test
        @DisplayName("SMOKER tenant gets no smoking bonus")
        void smokerTenantNoBonus() {
            User smokerTenant = User.builder()
                    .id(34L).email("smoker@example.com")
                    .firstName("Smoker").lastName("Tenant")
                    .role(User.UserRole.TENANT).city("Berlin")
                    .smokingStatus(User.SmokingStatus.SMOKER)
                    .build();

            Apartment berlinApt = Apartment.builder()
                    .id(7L).title("Berlin flat").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .monthlyRent(java.math.BigDecimal.valueOf(700))
                    .build();

            when(userRepository.findById(34L)).thenReturn(Optional.of(smokerTenant));
            when(apartmentRepository.findAllAvailable(PageRequest.of(0, 200)))
                    .thenReturn(new PageImpl<>(List.of(berlinApt)));

            List<ApartmentMatchDto> results = smartMatchingService.matchApartmentsForTenant(34L, 20);

            assertEquals(1, results.size());
            assertTrue(results.get(0).getReasons().stream()
                    .noneMatch(r -> r.toLowerCase().contains("smoker")));
        }
    }

    // ── Landlord-side duration & pet edge-case tests ──

    @Nested
    @DisplayName("FTL-14 — Duration & Pet edge cases")
    class DurationAndPetEdgeCases {

        @Test
        @DisplayName("move-in before apartment availability → no move-in bonus")
        void moveInBeforeAvailability() {
            BookingRequest earlyReq = BookingRequest.builder()
                    .id(20L).apartment(apartment).tenant(makeUser(40L, User.SmokingStatus.NON_SMOKER, null, null)).landlord(landlord)
                    .preferredMoveIn(LocalDate.of(2026, 3, 1)) // before apt 2026-05-01
                    .preferredMoveOut(LocalDate.of(2027, 3, 31))
                    .status(BookingRequest.BookingStatus.SUBMITTED)
                    .build();

            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(bookingRequestRepository.findByApartmentIdAndStatus(100L, BookingRequest.BookingStatus.SUBMITTED))
                    .thenReturn(List.of(earlyReq));

            List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(100L, 20L);

            assertEquals(1, ranked.size());
            assertTrue(ranked.get(0).getReasons().stream()
                    .noneMatch(r -> r.contains("Move-in date within availability")));
        }

        @Test
        @DisplayName("move-out after apartment end → no move-out bonus")
        void moveOutAfterApartmentEnd() {
            BookingRequest lateReq = BookingRequest.builder()
                    .id(21L).apartment(apartment).tenant(makeUser(41L, User.SmokingStatus.NON_SMOKER, null, null)).landlord(landlord)
                    .preferredMoveIn(LocalDate.of(2026, 6, 1))
                    .preferredMoveOut(LocalDate.of(2028, 6, 1)) // after apt end 2027-04-30
                    .status(BookingRequest.BookingStatus.SUBMITTED)
                    .build();

            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(bookingRequestRepository.findByApartmentIdAndStatus(100L, BookingRequest.BookingStatus.SUBMITTED))
                    .thenReturn(List.of(lateReq));

            List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(100L, 20L);

            assertEquals(1, ranked.size());
            assertTrue(ranked.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("Move-in date")));
            assertTrue(ranked.get(0).getReasons().stream()
                    .noneMatch(r -> r.contains("Move-out date")));
        }

        @Test
        @DisplayName("pet owner + non-pet-friendly apartment → 0 pet score (landlord side)")
        void petOwnerNonPetFriendlyLandlordSide() {
            User petTenant = makeUser(42L, User.SmokingStatus.NON_SMOKER, null, null);
            Apartment noPetApt = Apartment.builder()
                    .id(101L).title("No pets").city("Berlin")
                    .owner(landlord).status(Apartment.ApartmentStatus.AVAILABLE)
                    .petFriendly(false)
                    .availableFrom(LocalDate.of(2026, 5, 1))
                    .moveOutDate(LocalDate.of(2027, 4, 30))
                    .build();

            BookingRequest petReq = BookingRequest.builder()
                    .id(22L).apartment(noPetApt).tenant(petTenant).landlord(landlord)
                    .preferredMoveIn(LocalDate.of(2026, 6, 1))
                    .petsJson("[\"CAT\"]")
                    .status(BookingRequest.BookingStatus.SUBMITTED)
                    .build();

            when(apartmentRepository.findById(101L)).thenReturn(Optional.of(noPetApt));
            when(bookingRequestRepository.findByApartmentIdAndStatus(101L, BookingRequest.BookingStatus.SUBMITTED))
                    .thenReturn(List.of(petReq));

            List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(101L, 20L);

            assertEquals(1, ranked.size());
            assertTrue(ranked.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("not pet-friendly")));
        }

        @Test
        @DisplayName("childrenJson provided → occupant bonus")
        void childrenJsonProvided() {
            BookingRequest familyReq = BookingRequest.builder()
                    .id(23L).apartment(apartment).tenant(makeUser(43L, User.SmokingStatus.NON_SMOKER, "tags", "hobbies")).landlord(landlord)
                    .preferredMoveIn(LocalDate.of(2026, 6, 1))
                    .preferredMoveOut(LocalDate.of(2027, 3, 31))
                    .adultsJson("[{\"name\":\"Parent\"}]")
                    .childrenJson("[{\"name\":\"Child\",\"age\":5}]")
                    .detailedReason("Family relocation")
                    .wouldExtendLater(true)
                    .status(BookingRequest.BookingStatus.SUBMITTED)
                    .build();

            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(bookingRequestRepository.findByApartmentIdAndStatus(100L, BookingRequest.BookingStatus.SUBMITTED))
                    .thenReturn(List.of(familyReq));

            List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(100L, 20L);

            assertEquals(1, ranked.size());
            assertTrue(ranked.get(0).getReasons().stream()
                    .anyMatch(r -> r.contains("Children details")));
        }

        @Test
        @DisplayName("null moveIn and moveOut dates → no duration score")
        void nullMoveInDates() {
            BookingRequest noDateReq = BookingRequest.builder()
                    .id(24L).apartment(apartment).tenant(makeUser(44L, null, null, null)).landlord(landlord)
                    .status(BookingRequest.BookingStatus.SUBMITTED)
                    .build();

            when(apartmentRepository.findById(100L)).thenReturn(Optional.of(apartment));
            when(bookingRequestRepository.findByApartmentIdAndStatus(100L, BookingRequest.BookingStatus.SUBMITTED))
                    .thenReturn(List.of(noDateReq));

            List<ApplicantMatchDto> ranked = smartMatchingService.compareApplicants(100L, 20L);

            assertEquals(1, ranked.size());
            assertTrue(ranked.get(0).getReasons().stream()
                    .noneMatch(r -> r.contains("Move-in") || r.contains("Move-out")));
        }
    }

    // ── Matching success rate ────────────────────────────────────────

    @Nested
    @DisplayName("getMatchingSuccessRate")
    class MatchingSuccessRate {

        @Test
        @DisplayName("Returns correct rate when bookings exist")
        void returnsCorrectRate() {
            when(userRepository.findById(20L)).thenReturn(Optional.of(landlord));

            BookingRequest accepted = BookingRequest.builder()
                    .id(1L).landlord(landlord).status(BookingRequest.BookingStatus.ACCEPTED).build();
            BookingRequest declined = BookingRequest.builder()
                    .id(2L).landlord(landlord).status(BookingRequest.BookingStatus.DECLINED).build();
            BookingRequest submitted = BookingRequest.builder()
                    .id(3L).landlord(landlord).status(BookingRequest.BookingStatus.SUBMITTED).build();

            when(bookingRequestRepository.findByLandlordId(20L))
                    .thenReturn(List.of(accepted, declined, submitted));

            Map<String, Object> stats = smartMatchingService.getMatchingSuccessRate(20L);

            assertEquals(3L, ((Number) stats.get("totalBookingRequests")).longValue());
            assertEquals(1L, ((Number) stats.get("acceptedBookings")).longValue());
            assertEquals(0.333, ((Number) stats.get("successRate")).doubleValue());
        }

        @Test
        @DisplayName("Returns zero rate when no bookings")
        void zeroRateWhenNoBookings() {
            when(userRepository.findById(20L)).thenReturn(Optional.of(landlord));
            when(bookingRequestRepository.findByLandlordId(20L)).thenReturn(List.of());

            Map<String, Object> stats = smartMatchingService.getMatchingSuccessRate(20L);

            assertEquals(0L, ((Number) stats.get("totalBookingRequests")).longValue());
            assertEquals(0L, ((Number) stats.get("acceptedBookings")).longValue());
            assertEquals(0.0, ((Number) stats.get("successRate")).doubleValue());
        }

        @Test
        @DisplayName("Throws when landlord not found")
        void throwsWhenLandlordNotFound() {
            when(userRepository.findById(999L)).thenReturn(Optional.empty());

            assertThrows(IllegalArgumentException.class,
                    () -> smartMatchingService.getMatchingSuccessRate(999L));
        }
    }
}
