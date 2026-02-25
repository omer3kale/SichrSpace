package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.ApartmentSearchCardDto;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ApartmentServiceImpl implements ApartmentService {

    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;
    private final GeocodingService geocodingService;

    @Override
    public ApartmentDto createApartment(Long ownerId, CreateApartmentRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Owner not found"));

        if (owner.getRole() != User.UserRole.LANDLORD && owner.getRole() != User.UserRole.ADMIN) {
            throw new SecurityException("Only landlords can create apartment listings");
        }

        Apartment apartment = mapRequestToEntity(request, new Apartment());
        apartment.setOwner(owner);
        apartment.setStatus(Apartment.ApartmentStatus.AVAILABLE);
        apartment.setNumberOfViews(0L);

        // FTL-21: auto-geocode if address provided and no lat/lng given
        autoGeocode(apartment);

        apartment = apartmentRepository.save(apartment);
        log.info("Apartment created id={}, ownerId={}, city={}", apartment.getId(), ownerId, request.getCity());
        return ApartmentDto.fromEntity(apartment);
    }

    @Override
    public ApartmentDto getApartmentById(Long id) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));
        apartment.setNumberOfViews(apartment.getNumberOfViews() == null ? 1L : apartment.getNumberOfViews() + 1);
        apartmentRepository.save(apartment);
        return ApartmentDto.fromEntity(apartment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ApartmentDto> searchApartments(String city, BigDecimal minPrice, BigDecimal maxPrice,
                                                Integer minBedrooms, Double minSize,
                                                Boolean furnished, Boolean petFriendly, Pageable pageable) {
        Specification<Apartment> spec = buildBasicSpec(city, minPrice, maxPrice, minBedrooms, minSize, furnished, petFriendly);
        return apartmentRepository.findAll(spec, pageable).map(ApartmentDto::fromEntity);
    }

    // ─── FTL-09 / FTL-10 / FTL-11: advanced search returning card DTOs ───

    @Override
    @Transactional(readOnly = true)
    public Page<ApartmentSearchCardDto> searchApartmentCards(
            String city, String district,
            LocalDate moveInDate, LocalDate moveOutDate, LocalDate earliestMoveIn,
            Boolean flexibleTimeslot,
            BigDecimal priceMin, BigDecimal priceMax, String priceType,
            String propertyType, Integer rooms, Integer singleBeds, Integer doubleBeds,
            String furnishedStatus,
            Boolean petFriendly, Boolean excludeExchangeOffer,
            Boolean hasWifi, Boolean hasWashingMachine, Boolean hasElevator,
            Boolean hasDishwasher, Boolean hasAirConditioning, Boolean hasParking,
            Pageable pageable) {

        Specification<Apartment> spec = (root, query, cb) -> {
            List<Predicate> preds = new ArrayList<>();
            preds.add(cb.equal(root.get("status"), Apartment.ApartmentStatus.AVAILABLE));

            if (city != null && !city.isBlank())
                preds.add(cb.equal(cb.lower(root.get("city")), city.toLowerCase()));
            if (district != null && !district.isBlank())
                preds.add(cb.equal(cb.lower(root.get("district")), district.toLowerCase()));

            // dates
            if (moveInDate != null)
                preds.add(cb.lessThanOrEqualTo(root.get("availableFrom"), moveInDate));
            if (moveOutDate != null)
                preds.add(cb.greaterThanOrEqualTo(root.get("moveOutDate"), moveOutDate));
            if (earliestMoveIn != null)
                preds.add(cb.lessThanOrEqualTo(root.get("earliestMoveIn"), earliestMoveIn));
            if (flexibleTimeslot != null)
                preds.add(cb.equal(root.get("flexibleTimeslot"), flexibleTimeslot));

            // price: choose warm or kalt (default kalt)
            String priceField = "WARM".equalsIgnoreCase(priceType) ? "priceWarm" : "monthlyRent";
            if (priceMin != null)
                preds.add(cb.greaterThanOrEqualTo(root.get(priceField), priceMin));
            if (priceMax != null)
                preds.add(cb.lessThanOrEqualTo(root.get(priceField), priceMax));

            // layout
            if (propertyType != null) {
                preds.add(cb.equal(root.get("propertyType"),
                        Apartment.PropertyType.valueOf(propertyType.toUpperCase(java.util.Locale.ROOT))));
            }
            if (rooms != null)
                preds.add(cb.greaterThanOrEqualTo(root.get("numberOfBedrooms"), rooms));
            if (singleBeds != null)
                preds.add(cb.greaterThanOrEqualTo(root.get("numberOfSingleBeds"), singleBeds));
            if (doubleBeds != null)
                preds.add(cb.greaterThanOrEqualTo(root.get("numberOfDoubleBeds"), doubleBeds));

            if (furnishedStatus != null) {
                preds.add(cb.equal(root.get("furnishedStatus"),
                        Apartment.FurnishedStatus.valueOf(furnishedStatus.toUpperCase(java.util.Locale.ROOT))));
            }

            // amenity booleans
            if (petFriendly != null)          preds.add(cb.equal(root.get("petFriendly"), petFriendly));
            if (excludeExchangeOffer != null) preds.add(cb.equal(root.get("excludeExchangeOffer"), excludeExchangeOffer));
            if (hasWifi != null)              preds.add(cb.equal(root.get("hasWifi"), hasWifi));
            if (hasWashingMachine != null)     preds.add(cb.equal(root.get("hasWashingMachine"), hasWashingMachine));
            if (hasElevator != null)           preds.add(cb.equal(root.get("hasElevator"), hasElevator));
            if (hasDishwasher != null)          preds.add(cb.equal(root.get("hasDishwasher"), hasDishwasher));
            if (hasAirConditioning != null)    preds.add(cb.equal(root.get("hasAirConditioning"), hasAirConditioning));
            if (hasParking != null)            preds.add(cb.equal(root.get("hasParking"), hasParking));

            return cb.and(preds.toArray(new Predicate[0]));
        };

        return apartmentRepository.findAll(spec, pageable).map(ApartmentSearchCardDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApartmentDto> getApartmentsByOwner(Long ownerId) {
        return apartmentRepository.findByOwnerId(ownerId)
                .stream()
                .map(ApartmentDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public ApartmentDto updateApartment(Long id, Long userId, CreateApartmentRequest request) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;
        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment update attempt userId={}, apartmentId={}", userId, id);
            throw new SecurityException("Not authorized to update this apartment");
        }

        mapRequestToEntity(request, apartment);

        // FTL-21: auto-geocode if address changed and no lat/lng given
        autoGeocode(apartment);

        apartment = apartmentRepository.save(apartment);
        log.info("Apartment updated id={}, by userId={}", id, userId);
        return ApartmentDto.fromEntity(apartment);
    }

    @Override
    public void deleteApartment(Long id, Long userId) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;
        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment delete attempt userId={}, apartmentId={}", userId, id);
            throw new SecurityException("Not authorized to delete this apartment");
        }

        apartmentRepository.delete(apartment);
        log.info("Apartment deleted id={}, by userId={}", id, userId);
    }

    // ─── helpers ──────────────────────────────────────────────────────

    /** Maps all CreateApartmentRequest fields onto an Apartment entity (create or update). */
    private Apartment mapRequestToEntity(CreateApartmentRequest req, Apartment a) {
        a.setTitle(req.getTitle());
        a.setDescription(req.getDescription());
        a.setAreaDescription(req.getAreaDescription());
        a.setCity(req.getCity());
        a.setDistrict(req.getDistrict());
        a.setAddress(req.getAddress());
        a.setLatitude(req.getLatitude());
        a.setLongitude(req.getLongitude());
        a.setMonthlyRent(req.getMonthlyRent());
        a.setPriceWarm(req.getPriceWarm());
        a.setDepositAmount(req.getDepositAmount());
        a.setSizeSquareMeters(req.getSizeSquareMeters());

        if (req.getPropertyType() != null) {
            a.setPropertyType(Apartment.PropertyType.valueOf(req.getPropertyType().toUpperCase(java.util.Locale.ROOT)));
        }

        a.setNumberOfBedrooms(req.getNumberOfBedrooms());
        a.setNumberOfBathrooms(req.getNumberOfBathrooms());
        a.setNumberOfSingleBeds(req.getNumberOfSingleBeds());
        a.setNumberOfDoubleBeds(req.getNumberOfDoubleBeds());

        if (req.getFurnishedStatus() != null) {
            a.setFurnishedStatus(Apartment.FurnishedStatus.valueOf(req.getFurnishedStatus().toUpperCase(java.util.Locale.ROOT)));
        }
        a.setFurnished(req.getFurnished());

        a.setAvailableFrom(req.getAvailableFrom());
        a.setMoveOutDate(req.getMoveOutDate());
        a.setEarliestMoveIn(req.getEarliestMoveIn());
        a.setFlexibleTimeslot(req.getFlexibleTimeslot());

        a.setPetFriendly(req.getPetFriendly());
        a.setHasParking(req.getHasParking());
        a.setHasElevator(req.getHasElevator());
        a.setHasBalcony(req.getHasBalcony());
        a.setHasWifi(req.getHasWifi());
        a.setHasWashingMachine(req.getHasWashingMachine());
        a.setHasDishwasher(req.getHasDishwasher());
        a.setHasAirConditioning(req.getHasAirConditioning());
        a.setHasHeating(req.getHasHeating());
        a.setExcludeExchangeOffer(req.getExcludeExchangeOffer());
        a.setAmenities(req.getAmenities());

        a.setImages(req.getImages());
        a.setFloorPlanUrl(req.getFloorPlanUrl());

        return a;
    }

    /** Build the legacy basic search specification. */
    private Specification<Apartment> buildBasicSpec(String city, BigDecimal minPrice, BigDecimal maxPrice,
                                                     Integer minBedrooms, Double minSize,
                                                     Boolean furnished, Boolean petFriendly) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), Apartment.ApartmentStatus.AVAILABLE));

            if (city != null && !city.isBlank())
                predicates.add(cb.equal(cb.lower(root.get("city")), city.toLowerCase()));
            if (minPrice != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("monthlyRent"), minPrice));
            if (maxPrice != null)
                predicates.add(cb.lessThanOrEqualTo(root.get("monthlyRent"), maxPrice));
            if (minBedrooms != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("numberOfBedrooms"), minBedrooms));
            if (minSize != null)
                predicates.add(cb.greaterThanOrEqualTo(root.get("sizeSquareMeters"), minSize));
            if (furnished != null)
                predicates.add(cb.equal(root.get("furnished"), furnished));
            if (petFriendly != null)
                predicates.add(cb.equal(root.get("petFriendly"), petFriendly));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ─── FTL-21: Nearby search & auto-geocoding ──────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<ApartmentDto> findNearbyApartments(double latitude, double longitude,
                                                    double radiusKm, Pageable pageable) {
        // Convert km radius to approximate degree bounding box
        // 1 degree latitude ≈ 111.32 km
        double latDelta = radiusKm / 111.32;
        // 1 degree longitude ≈ 111.32 km × cos(latitude)
        double lngDelta = radiusKm / (111.32 * Math.cos(Math.toRadians(latitude)));

        double minLat = latitude - latDelta;
        double maxLat = latitude + latDelta;
        double minLng = longitude - lngDelta;
        double maxLng = longitude + lngDelta;

        return apartmentRepository.findNearby(minLat, maxLat, minLng, maxLng, pageable)
                .map(ApartmentDto::fromEntity);
    }

    /**
     * Attempts to geocode the apartment's address if lat/lng are null and an address is available.
     * Fails softly — never throws, only logs.
     */
    private void autoGeocode(Apartment apartment) {
        if (apartment.getLatitude() != null && apartment.getLongitude() != null) {
            return; // already has coordinates
        }
        String address = buildGeocodableAddress(apartment);
        if (address == null) return;

        try {
            GeocodingService.GeoResult result = geocodingService.geocode(address);
            if (result != null) {
                apartment.setLatitude(result.latitude());
                apartment.setLongitude(result.longitude());
                log.info("Auto-geocoded apartment address='{}' → ({}, {})",
                        address, result.latitude(), result.longitude());
            }
        } catch (Exception e) {
            log.warn("Auto-geocode failed for address='{}': {}", address, e.getMessage());
        }
    }

    private String buildGeocodableAddress(Apartment apartment) {
        StringBuilder sb = new StringBuilder();
        if (apartment.getAddress() != null && !apartment.getAddress().isBlank()) {
            sb.append(apartment.getAddress());
        }
        if (apartment.getDistrict() != null && !apartment.getDistrict().isBlank()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(apartment.getDistrict());
        }
        if (apartment.getCity() != null && !apartment.getCity().isBlank()) {
            if (sb.length() > 0) sb.append(", ");
            sb.append(apartment.getCity());
        }
        return sb.length() > 0 ? sb.toString() : null;
    }
}
