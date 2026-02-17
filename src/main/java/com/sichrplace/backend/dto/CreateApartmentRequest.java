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

    @NotBlank(message = "City is required")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String city;

    @Size(max = 100, message = "District must not exceed 100 characters")
    private String district;

    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    private Double latitude;
    private Double longitude;

    @NotNull(message = "Monthly rent is required")
    @DecimalMin(value = "0.01", message = "Monthly rent must be at least 0.01")
    @DecimalMax(value = "999999.99", message = "Monthly rent must not exceed 999999.99")
    private BigDecimal monthlyRent;

    @DecimalMin(value = "0.01", message = "Deposit amount must be at least 0.01")
    @DecimalMax(value = "999999.99", message = "Deposit amount must not exceed 999999.99")
    private BigDecimal depositAmount;

    @DecimalMin(value = "1.0", message = "Size must be at least 1 sqm")
    @DecimalMax(value = "99999.0", message = "Size must not exceed 99999 sqm")
    private Double sizeSquareMeters;

    @Min(value = 0, message = "Number of bedrooms cannot be negative")
    @Max(value = 50, message = "Number of bedrooms must not exceed 50")
    private Integer numberOfBedrooms;

    @Min(value = 0, message = "Number of bathrooms cannot be negative")
    @Max(value = 50, message = "Number of bathrooms must not exceed 50")
    private Integer numberOfBathrooms;

    private Boolean furnished;
    private Boolean petFriendly;
    private Boolean hasParking;
    private Boolean hasElevator;
    private Boolean hasBalcony;

    @Size(max = 1000, message = "Amenities must not exceed 1000 characters")
    private String amenities;

    private LocalDate availableFrom;
}
