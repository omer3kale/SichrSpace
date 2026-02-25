package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.ApartmentSearchCardDto;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface ApartmentService {
    ApartmentDto createApartment(Long ownerId, CreateApartmentRequest request);
    ApartmentDto getApartmentById(Long id);

    /** Legacy basic search (backward compat). */
    Page<ApartmentDto> searchApartments(String city, BigDecimal minPrice, BigDecimal maxPrice,
                                        Integer minBedrooms, Double minSize,
                                        Boolean furnished, Boolean petFriendly, Pageable pageable);

    /** FTL-09/10/11: advanced search returning card DTOs with pagination. */
    Page<ApartmentSearchCardDto> searchApartmentCards(
            String city, String district,
            LocalDate moveInDate, LocalDate moveOutDate, LocalDate earliestMoveIn,
            Boolean flexibleTimeslot,
            BigDecimal priceMin, BigDecimal priceMax, String priceType,
            String propertyType, Integer rooms, Integer singleBeds, Integer doubleBeds,
            String furnishedStatus,
            Boolean petFriendly, Boolean excludeExchangeOffer,
            Boolean hasWifi, Boolean hasWashingMachine, Boolean hasElevator,
            Boolean hasDishwasher, Boolean hasAirConditioning, Boolean hasParking,
            Pageable pageable);

    List<ApartmentDto> getApartmentsByOwner(Long ownerId);
    ApartmentDto updateApartment(Long id, Long ownerId, CreateApartmentRequest request);
    void deleteApartment(Long id, Long ownerId);

    /** FTL-21: Find available apartments near a given point within a radius. */
    Page<ApartmentDto> findNearbyApartments(double latitude, double longitude, double radiusKm, Pageable pageable);
}
