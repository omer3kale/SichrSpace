package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Deserialized filter criteria from a saved search's filter_json.
 * Null fields are ignored when building the JPA Specification.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchFilterDto {

    private String city;
    private String district;
    private BigDecimal minPrice;
    private BigDecimal maxPrice;
    private Integer minBedrooms;
    private Integer maxBedrooms;
    private Double minSize;
    private Double maxSize;
    private Boolean furnished;
    private Boolean petFriendly;
    private Boolean hasParking;
    private Boolean hasElevator;
    private Boolean hasBalcony;

    // ── FTL v2 §4 additions ──

    /** Filter by property type (APARTMENT, HOUSE, STUDIO, SHARED_ROOM, WG). */
    private String propertyType;

    /** Only return apartments available from this date or earlier. */
    private LocalDate availableFrom;

    // ── Amenity filters ──
    private Boolean hasWifi;
    private Boolean hasWashingMachine;
    private Boolean hasDishwasher;
    private Boolean hasAirConditioning;
    private Boolean hasHeating;
}
