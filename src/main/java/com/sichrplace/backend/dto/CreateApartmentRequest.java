package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateApartmentRequest {
    @NotBlank(message = "Title is required")
    @Size(min = 3, max = 200, message = "Title must be between 3 and 200 characters")
    private String title;

    @Size(max = 5000, message = "Description must not exceed 5000 characters")
    private String description;

    @Size(max = 5000, message = "Area description must not exceed 5000 characters")
    private String areaDescription;

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @Size(max = 100, message = "District must not exceed 100 characters")
    private String district;

    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    private Double latitude;
    private Double longitude;

    // ── pricing ──
    @NotNull(message = "Monthly rent is required")
    @DecimalMin(value = "0.01", message = "Monthly rent must be at least 0.01")
    @DecimalMax(value = "999999.99", message = "Monthly rent must not exceed 999999.99")
    private BigDecimal monthlyRent;

    @DecimalMin(value = "0.01", message = "Warm price must be at least 0.01")
    @DecimalMax(value = "999999.99", message = "Warm price must not exceed 999999.99")
    private BigDecimal priceWarm;

    @DecimalMin(value = "0.01", message = "Deposit amount must be at least 0.01")
    @DecimalMax(value = "999999.99", message = "Deposit amount must not exceed 999999.99")
    private BigDecimal depositAmount;

    // ── size & layout ──
    @DecimalMin(value = "1.0", message = "Size must be at least 1 sqm")
    @DecimalMax(value = "99999.0", message = "Size must not exceed 99999 sqm")
    private Double sizeSquareMeters;

    /** One of SHARED_ROOM, PRIVATE_ROOM, STUDIO, LOFT, APARTMENT, HOUSE. */
    private String propertyType;

    @Min(value = 0, message = "Number of bedrooms cannot be negative")
    @Max(value = 50, message = "Number of bedrooms must not exceed 50")
    private Integer numberOfBedrooms;

    @Min(value = 0, message = "Number of bathrooms cannot be negative")
    @Max(value = 50, message = "Number of bathrooms must not exceed 50")
    private Integer numberOfBathrooms;

    @Min(value = 0, message = "Number of single beds cannot be negative")
    private Integer numberOfSingleBeds;

    @Min(value = 0, message = "Number of double beds cannot be negative")
    private Integer numberOfDoubleBeds;

    /** One of FURNISHED, SEMI_FURNISHED, UNFURNISHED. */
    private String furnishedStatus;

    /** Legacy boolean — ignored if furnishedStatus is set. */
    private Boolean furnished;

    // ── availability ──
    private LocalDate availableFrom;
    private LocalDate moveOutDate;
    private LocalDate earliestMoveIn;
    private Boolean flexibleTimeslot;

    // ── amenities ──
    private Boolean petFriendly;
    private Boolean hasParking;
    private Boolean hasElevator;
    private Boolean hasBalcony;
    private Boolean hasWifi;
    private Boolean hasWashingMachine;
    private Boolean hasDishwasher;
    private Boolean hasAirConditioning;
    private Boolean hasHeating;
    private Boolean excludeExchangeOffer;

    @Size(max = 1000, message = "Amenities must not exceed 1000 characters")
    private String amenities;

    // ── images ──
    /** Comma-separated image URLs. */
    @Size(max = 5000, message = "Images string must not exceed 5000 characters")
    private String images;

    @Size(max = 500, message = "Floor plan URL must not exceed 500 characters")
    private String floorPlanUrl;
}
