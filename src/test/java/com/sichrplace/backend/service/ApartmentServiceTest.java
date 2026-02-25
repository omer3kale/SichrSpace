package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.ApartmentSearchCardDto;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ApartmentServiceImpl")
class ApartmentServiceTest {

    @Mock private ApartmentRepository apartmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private GeocodingService geocodingService;

    @InjectMocks private ApartmentServiceImpl apartmentService;

    private User landlord;
    private User tenant;
    private User admin;
    private Apartment apartment;
    private CreateApartmentRequest request;

    @BeforeEach
    void setUp() {
        landlord = User.builder().id(1L).role(User.UserRole.LANDLORD).firstName("L").lastName("L").build();
        tenant = User.builder().id(2L).role(User.UserRole.TENANT).firstName("T").lastName("T").build();
        admin = User.builder().id(3L).role(User.UserRole.ADMIN).firstName("A").lastName("A").build();

        request = CreateApartmentRequest.builder()
                .title("Apartment X")
                .description("Nice")
                .city("Berlin")
                .district("Mitte")
                .address("Street 1")
                .monthlyRent(BigDecimal.valueOf(1200))
                .depositAmount(BigDecimal.valueOf(2400))
                .sizeSquareMeters(70.0)
                .numberOfBedrooms(2)
                .numberOfBathrooms(1)
                .furnished(true)
                .petFriendly(false)
                .hasParking(true)
                .hasElevator(true)
                .hasBalcony(false)
                .amenities("WiFi")
                .availableFrom(LocalDate.now())
                .build();

        apartment = Apartment.builder()
                .id(10L)
                .owner(landlord)
                .title("Apartment X")
                .city("Berlin")
                .monthlyRent(BigDecimal.valueOf(1200))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(0L)
                .build();
    }

    @Test
    void createApartment_success_forLandlord() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
        when(apartmentRepository.save(any(Apartment.class))).thenReturn(apartment);

        ApartmentDto dto = apartmentService.createApartment(1L, request);

        assertEquals(10L, dto.getId());
        assertEquals("Apartment X", dto.getTitle());
        verify(apartmentRepository).save(any(Apartment.class));
    }

    @Test
    void createApartment_success_forAdmin() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(admin));
        when(apartmentRepository.save(any(Apartment.class))).thenReturn(apartment);

        ApartmentDto dto = apartmentService.createApartment(3L, request);

        assertNotNull(dto);
    }

    @Test
    void createApartment_nonLandlordDenied() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));

        assertThrows(SecurityException.class, () -> apartmentService.createApartment(2L, request));
    }

    @Test
    void createApartment_ownerNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> apartmentService.createApartment(99L, request));
    }

    @Test
    void getApartmentById_incrementsViews_whenNull() {
        apartment.setNumberOfViews(null);
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(apartmentRepository.save(any(Apartment.class))).thenAnswer(inv -> inv.getArgument(0));

        ApartmentDto dto = apartmentService.getApartmentById(10L);

        assertEquals(1L, dto.getNumberOfViews());
    }

    @Test
    void getApartmentById_incrementsViews_whenExisting() {
        apartment.setNumberOfViews(5L);
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(apartmentRepository.save(any(Apartment.class))).thenAnswer(inv -> inv.getArgument(0));

        ApartmentDto dto = apartmentService.getApartmentById(10L);

        assertEquals(6L, dto.getNumberOfViews());
    }

    @Test
    void searchApartments_returnsMappedPage() {
        Page<Apartment> page = new PageImpl<>(List.of(apartment), PageRequest.of(0, 10), 1);
        when(apartmentRepository.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(page);

        Page<ApartmentDto> result = apartmentService.searchApartments("Berlin", null, null, null, null, null, null, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("Apartment X", result.getContent().get(0).getTitle());
    }

    @Test
    void getApartmentsByOwner_mapsList() {
        when(apartmentRepository.findByOwnerId(1L)).thenReturn(List.of(apartment));

        List<ApartmentDto> result = apartmentService.getApartmentsByOwner(1L);

        assertEquals(1, result.size());
        assertEquals(10L, result.get(0).getId());
    }

    @Test
    void updateApartment_ownerAllowed() {
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
        when(apartmentRepository.save(any(Apartment.class))).thenAnswer(inv -> inv.getArgument(0));

        ApartmentDto result = apartmentService.updateApartment(10L, 1L, request);

        assertEquals("Apartment X", result.getTitle());
    }

    @Test
    void updateApartment_nonOwnerDenied() {
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));

        assertThrows(SecurityException.class, () -> apartmentService.updateApartment(10L, 2L, request));
    }

    @Test
    void updateApartment_notFound() {
        when(apartmentRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> apartmentService.updateApartment(404L, 1L, request));
    }

    @Test
    void updateApartment_userNotFound() {
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(123L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> apartmentService.updateApartment(10L, 123L, request));
    }

    @Test
    void deleteApartment_adminAllowed() {
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(3L)).thenReturn(Optional.of(admin));

        apartmentService.deleteApartment(10L, 3L);

        verify(apartmentRepository).delete(eq(apartment));
    }

    @Test
    void deleteApartment_nonOwnerDenied() {
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(2L)).thenReturn(Optional.of(tenant));

        assertThrows(SecurityException.class, () -> apartmentService.deleteApartment(10L, 2L));
    }

    @Test
    void deleteApartment_notFound() {
        when(apartmentRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> apartmentService.deleteApartment(404L, 1L));
    }

    @Test
    void searchApartments_executesAllSpecificationBranches() {
        Page<Apartment> page = new PageImpl<>(List.of(apartment), PageRequest.of(0, 10), 1);
        org.mockito.ArgumentCaptor<Specification<Apartment>> captor = org.mockito.ArgumentCaptor.forClass(Specification.class);
        when(apartmentRepository.findAll(captor.capture(), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(page);

        apartmentService.searchApartments(
                "Berlin",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(2000),
                2,
                60.0,
                true,
                false,
                PageRequest.of(0, 10)
        );

        Specification<Apartment> spec = captor.getValue();

        Root<Apartment> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);

        Path statusPath = mock(Path.class);
        Path cityPath = mock(Path.class);
        Path rentPath = mock(Path.class);
        Path bedroomsPath = mock(Path.class);
        Path sizePath = mock(Path.class);
        Path furnishedPath = mock(Path.class);
        Path petPath = mock(Path.class);
        Expression<String> loweredCity = mock(Expression.class);

        when(root.get("status")).thenReturn(statusPath);
        when(root.get("city")).thenReturn(cityPath);
        when(root.get("monthlyRent")).thenReturn(rentPath);
        when(root.get("numberOfBedrooms")).thenReturn(bedroomsPath);
        when(root.get("sizeSquareMeters")).thenReturn(sizePath);
        when(root.get("furnished")).thenReturn(furnishedPath);
        when(root.get("petFriendly")).thenReturn(petPath);
        when(cb.lower(cityPath)).thenReturn(loweredCity);

        Predicate p = mock(Predicate.class);
        lenient().when(cb.equal(any(), any())).thenReturn(p);
        lenient().when(cb.greaterThanOrEqualTo(any(Expression.class), any(BigDecimal.class))).thenReturn(p);
        lenient().when(cb.greaterThanOrEqualTo(any(Expression.class), any(Integer.class))).thenReturn(p);
        lenient().when(cb.greaterThanOrEqualTo(any(Expression.class), any(Double.class))).thenReturn(p);
        lenient().when(cb.lessThanOrEqualTo(any(Expression.class), any(BigDecimal.class))).thenReturn(p);
        lenient().when(cb.and(any(Predicate[].class))).thenReturn(p);

        Predicate built = spec.toPredicate(root, query, cb);
        assertNotNull(built);
        verify(cb).lower(cityPath);
        verify(cb).lessThanOrEqualTo(any(Expression.class), eq(BigDecimal.valueOf(2000)));
        verify(cb).and(any(Predicate[].class));
    }

    @Test
    void deleteApartment_ownerAllowed() {
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));

        apartmentService.deleteApartment(10L, 1L);

        verify(apartmentRepository).delete(apartment);
    }

    @Test
    void deleteApartment_userNotFound() {
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(44L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> apartmentService.deleteApartment(10L, 44L));
    }

    // ─── FTL-08: new fields mapping tests ────────────────────────────

    @Test
    @DisplayName("createApartment with all FTL-08 fields maps correctly")
    void createApartment_withFTL08Fields_mapsCorrectly() {
        CreateApartmentRequest fullReq = CreateApartmentRequest.builder()
                .title("Full Flat")
                .city("Munich")
                .monthlyRent(BigDecimal.valueOf(900))
                .priceWarm(BigDecimal.valueOf(1100))
                .propertyType("APARTMENT")
                .numberOfSingleBeds(2)
                .numberOfDoubleBeds(1)
                .furnishedStatus("FURNISHED")
                .hasWifi(true)
                .hasWashingMachine(true)
                .petFriendly(true)
                .moveOutDate(LocalDate.of(2026, 6, 1))
                .earliestMoveIn(LocalDate.of(2025, 3, 1))
                .flexibleTimeslot(true)
                .images("img1.jpg,img2.jpg")
                .floorPlanUrl("floor.jpg")
                .build();

        Apartment saved = Apartment.builder()
                .id(20L)
                .owner(landlord)
                .title("Full Flat")
                .city("Munich")
                .monthlyRent(BigDecimal.valueOf(900))
                .priceWarm(BigDecimal.valueOf(1100))
                .propertyType(Apartment.PropertyType.APARTMENT)
                .numberOfSingleBeds(2)
                .numberOfDoubleBeds(1)
                .furnishedStatus(Apartment.FurnishedStatus.FURNISHED)
                .hasWifi(true)
                .hasWashingMachine(true)
                .petFriendly(true)
                .moveOutDate(LocalDate.of(2026, 6, 1))
                .earliestMoveIn(LocalDate.of(2025, 3, 1))
                .flexibleTimeslot(true)
                .images("img1.jpg,img2.jpg")
                .floorPlanUrl("floor.jpg")
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(0L)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
        when(apartmentRepository.save(any(Apartment.class))).thenReturn(saved);

        ApartmentDto dto = apartmentService.createApartment(1L, fullReq);

        assertEquals("APARTMENT", dto.getPropertyType());
        assertEquals("FURNISHED", dto.getFurnishedStatus());
        assertEquals(2, dto.getNumberOfSingleBeds());
        assertEquals(1, dto.getNumberOfDoubleBeds());
        assertTrue(dto.getHasWifi());
        assertTrue(dto.getHasWashingMachine());
        assertTrue(dto.getPetFriendly());
        assertEquals(BigDecimal.valueOf(1100), dto.getPriceWarm());
        assertEquals(2, dto.getImages().size());
        assertEquals("floor.jpg", dto.getFloorPlanUrl());
        assertTrue(dto.getFlexibleTimeslot());
    }

    @Test
    @DisplayName("updateApartment maps all FTL-08 fields via mapRequestToEntity")
    void updateApartment_mapsFTL08Fields() {
        CreateApartmentRequest updateReq = CreateApartmentRequest.builder()
                .title("Updated")
                .city("Berlin")
                .monthlyRent(BigDecimal.valueOf(1500))
                .propertyType("STUDIO")
                .furnishedStatus("UNFURNISHED")
                .hasAirConditioning(true)
                .hasDishwasher(true)
                .excludeExchangeOffer(true)
                .areaDescription("Near park")
                .build();

        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
        when(apartmentRepository.save(any(Apartment.class))).thenAnswer(inv -> inv.getArgument(0));

        ApartmentDto dto = apartmentService.updateApartment(10L, 1L, updateReq);

        assertEquals("STUDIO", dto.getPropertyType());
        assertEquals("UNFURNISHED", dto.getFurnishedStatus());
        assertTrue(dto.getHasAirConditioning());
        assertTrue(dto.getHasDishwasher());
        assertTrue(dto.getExcludeExchangeOffer());
        assertEquals("Near park", dto.getAreaDescription());
    }

    // ─── FTL-09/10/11: searchApartmentCards tests ────────────────────

    @Test
    @DisplayName("searchApartmentCards returns card DTOs with correct mapping")
    void searchApartmentCards_returnsCardDtos() {
        Apartment cardApt = Apartment.builder()
                .id(30L)
                .owner(landlord)
                .title("Card Flat")
                .city("Berlin")
                .district("Mitte")
                .monthlyRent(BigDecimal.valueOf(800))
                .priceWarm(BigDecimal.valueOf(1000))
                .propertyType(Apartment.PropertyType.STUDIO)
                .sizeSquareMeters(45.0)
                .numberOfSingleBeds(1)
                .numberOfDoubleBeds(0)
                .furnishedStatus(Apartment.FurnishedStatus.SEMI_FURNISHED)
                .petFriendly(false)
                .availableFrom(LocalDate.of(2025, 4, 1))
                .moveOutDate(LocalDate.of(2026, 3, 31))
                .images("main.jpg,other.jpg")
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(5L)
                .build();

        Page<Apartment> page = new PageImpl<>(List.of(cardApt), PageRequest.of(0, 10), 1);
        when(apartmentRepository.findAll(any(Specification.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(page);

        Page<ApartmentSearchCardDto> result = apartmentService.searchApartmentCards(
                "Berlin", null, null, null, null, null,
                null, null, null,
                null, null, null, null, null,
                null, null,
                null, null, null, null, null, null,
                PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        ApartmentSearchCardDto card = result.getContent().get(0);
        assertEquals(30L, card.getId());
        assertEquals("main.jpg", card.getMainImageUrl());
        assertEquals("Berlin", card.getCity());
        assertEquals("Mitte", card.getDistrict());
        assertEquals(BigDecimal.valueOf(800), card.getPricePerMonth());
        assertEquals("STUDIO", card.getPropertyType());
        assertEquals("SEMI_FURNISHED", card.getFurnishedStatus());
        assertFalse(card.getPetFriendly());
    }

    @Test
    @DisplayName("searchApartmentCards with all filters builds specification")
    void searchApartmentCards_allFilters_buildsSpec() {
        Page<Apartment> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        org.mockito.ArgumentCaptor<Specification<Apartment>> captor =
                org.mockito.ArgumentCaptor.forClass(Specification.class);
        when(apartmentRepository.findAll(captor.capture(), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(page);

        apartmentService.searchApartmentCards(
                "Berlin", "Mitte",
                LocalDate.of(2025, 4, 1), LocalDate.of(2026, 3, 31), LocalDate.of(2025, 3, 1),
                true,
                BigDecimal.valueOf(500), BigDecimal.valueOf(1500), "WARM",
                "STUDIO", 2, 1, 1,
                "FURNISHED",
                true, false,
                true, true, true, true, true, true,
                PageRequest.of(0, 10));

        Specification<Apartment> spec = captor.getValue();

        Root<Apartment> root = mock(Root.class);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);

        // set up generic path mocks
        Path genericPath = mock(Path.class);
        Expression loweredExpr = mock(Expression.class);

        when(root.get(anyString())).thenReturn(genericPath);
        when(cb.lower(any())).thenReturn(loweredExpr);

        Predicate p = mock(Predicate.class);
        lenient().when(cb.equal(any(), any())).thenReturn(p);
        lenient().when(cb.greaterThanOrEqualTo(any(Expression.class), any(Comparable.class))).thenReturn(p);
        lenient().when(cb.lessThanOrEqualTo(any(Expression.class), any(Comparable.class))).thenReturn(p);
        lenient().when(cb.and(any(Predicate[].class))).thenReturn(p);

        Predicate built = spec.toPredicate(root, query, cb);
        assertNotNull(built);

        // Collect all field names accessed via root.get()
        org.mockito.ArgumentCaptor<String> fieldCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(root, atLeast(1)).get(fieldCaptor.capture());
        java.util.List<String> accessedFields = fieldCaptor.getAllValues();

        // Verify price uses priceWarm (because priceType="WARM")
        assertTrue(accessedFields.contains("priceWarm"), "Expected priceWarm field");
        assertFalse(accessedFields.contains("monthlyRent"), "Should not use monthlyRent for WARM");
        // Verify district filter
        assertTrue(accessedFields.contains("district"), "Expected district field");
        // Verify amenity booleans
        assertTrue(accessedFields.contains("hasWifi"), "Expected hasWifi field");
        assertTrue(accessedFields.contains("hasWashingMachine"), "Expected hasWashingMachine field");
        assertTrue(accessedFields.contains("hasElevator"), "Expected hasElevator field");
    }

    @Test
    @DisplayName("searchApartmentCards with priceType=null defaults to monthlyRent")
    void searchApartmentCards_defaultPriceType_usesKalt() {
        Page<Apartment> page = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        org.mockito.ArgumentCaptor<Specification<Apartment>> captor =
                org.mockito.ArgumentCaptor.forClass(Specification.class);
        when(apartmentRepository.findAll(captor.capture(), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(page);

        apartmentService.searchApartmentCards(
                null, null, null, null, null, null,
                BigDecimal.valueOf(500), BigDecimal.valueOf(1500), null,
                null, null, null, null, null,
                null, null,
                null, null, null, null, null, null,
                PageRequest.of(0, 10));

        Specification<Apartment> spec = captor.getValue();

        Root<Apartment> root = mock(Root.class);
        CriteriaQuery<?> cq = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class);

        Path genericPath = mock(Path.class);
        when(root.get(anyString())).thenReturn(genericPath);
        Predicate p = mock(Predicate.class);
        lenient().when(cb.equal(any(), any())).thenReturn(p);
        lenient().when(cb.greaterThanOrEqualTo(any(Expression.class), any(Comparable.class))).thenReturn(p);
        lenient().when(cb.lessThanOrEqualTo(any(Expression.class), any(Comparable.class))).thenReturn(p);
        lenient().when(cb.and(any(Predicate[].class))).thenReturn(p);

        spec.toPredicate(root, cq, cb);

        // Collect all field names accessed via root.get()
        org.mockito.ArgumentCaptor<String> fieldCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(root, atLeast(1)).get(fieldCaptor.capture());
        java.util.List<String> accessedFields = fieldCaptor.getAllValues();

        // monthlyRent used (not priceWarm) when priceType is null
        assertTrue(accessedFields.contains("monthlyRent"), "Expected monthlyRent field");
        assertFalse(accessedFields.contains("priceWarm"), "Should not use priceWarm when priceType is null");
    }

    // ─── FTL-21: auto-geocode + nearby search tests ─────────────────

    @Test
    @DisplayName("createApartment auto-geocodes when lat/lng are null")
    void createApartment_autoGeocodesWhenLatLngNull() {
        CreateApartmentRequest geoReq = CreateApartmentRequest.builder()
                .title("Geo Flat")
                .city("Aachen")
                .district("Mitte")
                .address("Pontstr. 1")
                .monthlyRent(BigDecimal.valueOf(800))
                .build();

        GeocodingService.GeoResult geoResult = new GeocodingService.GeoResult(50.7753, 6.0839, "Pontstr. 1, Aachen");
        when(geocodingService.geocode(anyString())).thenReturn(geoResult);

        Apartment saved = Apartment.builder()
                .id(40L)
                .owner(landlord)
                .title("Geo Flat")
                .city("Aachen")
                .latitude(50.7753)
                .longitude(6.0839)
                .monthlyRent(BigDecimal.valueOf(800))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(0L)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
        when(apartmentRepository.save(any(Apartment.class))).thenReturn(saved);

        ApartmentDto dto = apartmentService.createApartment(1L, geoReq);

        verify(geocodingService).geocode(anyString());
        assertEquals(50.7753, dto.getLatitude());
        assertEquals(6.0839, dto.getLongitude());
    }

    @Test
    @DisplayName("createApartment skips geocoding when lat/lng already provided")
    void createApartment_skipsGeocodeWhenLatLngProvided() {
        CreateApartmentRequest geoReq = CreateApartmentRequest.builder()
                .title("Pre-Geocoded")
                .city("Berlin")
                .monthlyRent(BigDecimal.valueOf(900))
                .latitude(52.52)
                .longitude(13.40)
                .build();

        Apartment saved = Apartment.builder()
                .id(41L)
                .owner(landlord)
                .title("Pre-Geocoded")
                .city("Berlin")
                .latitude(52.52)
                .longitude(13.40)
                .monthlyRent(BigDecimal.valueOf(900))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(0L)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
        when(apartmentRepository.save(any(Apartment.class))).thenReturn(saved);

        ApartmentDto dto = apartmentService.createApartment(1L, geoReq);

        verify(geocodingService, never()).geocode(anyString());
        assertEquals(52.52, dto.getLatitude());
    }

    @Test
    @DisplayName("createApartment proceeds even when geocoding fails (fail-soft)")
    void createApartment_proceedsWhenGeocodeFails() {
        CreateApartmentRequest geoReq = CreateApartmentRequest.builder()
                .title("Fail-soft Flat")
                .city("Nowhere")
                .address("Unknown Str. 1")
                .monthlyRent(BigDecimal.valueOf(700))
                .build();

        when(geocodingService.geocode(anyString())).thenReturn(null);

        Apartment saved = Apartment.builder()
                .id(42L)
                .owner(landlord)
                .title("Fail-soft Flat")
                .city("Nowhere")
                .monthlyRent(BigDecimal.valueOf(700))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(0L)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(landlord));
        when(apartmentRepository.save(any(Apartment.class))).thenReturn(saved);

        ApartmentDto dto = apartmentService.createApartment(1L, geoReq);

        assertNotNull(dto);
        assertNull(dto.getLatitude());
        assertNull(dto.getLongitude());
    }

    @Test
    @DisplayName("findNearbyApartments returns bounding-box results")
    void findNearbyApartments_returnsBoundingBoxResults() {
        Apartment nearbyApt = Apartment.builder()
                .id(50L)
                .owner(landlord)
                .title("Nearby Flat")
                .city("Aachen")
                .latitude(50.78)
                .longitude(6.08)
                .monthlyRent(BigDecimal.valueOf(600))
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .build();

        Page<Apartment> page = new PageImpl<>(List.of(nearbyApt), PageRequest.of(0, 10), 1);
        when(apartmentRepository.findNearby(anyDouble(), anyDouble(), anyDouble(), anyDouble(), any()))
                .thenReturn(page);

        Page<ApartmentDto> result = apartmentService.findNearbyApartments(50.77, 6.08, 5.0, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals("Nearby Flat", result.getContent().get(0).getTitle());
        verify(apartmentRepository).findNearby(anyDouble(), anyDouble(), anyDouble(), anyDouble(), any());
    }

    @Test
    @DisplayName("findNearbyApartments with 0 radius returns empty")
    void findNearbyApartments_zeroRadius() {
        Page<Apartment> emptyPage = new PageImpl<>(List.of(), PageRequest.of(0, 10), 0);
        when(apartmentRepository.findNearby(anyDouble(), anyDouble(), anyDouble(), anyDouble(), any()))
                .thenReturn(emptyPage);

        Page<ApartmentDto> result = apartmentService.findNearbyApartments(50.77, 6.08, 0, PageRequest.of(0, 10));

        assertEquals(0, result.getTotalElements());
    }
}
