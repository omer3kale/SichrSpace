package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Apartment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApartmentDto {
    private Long id;
    private Long ownerId;
    private String ownerName;
    private String title;
    private String description;
    private String city;
    private String district;
    private String address;
    private Double latitude;
    private Double longitude;
    private BigDecimal monthlyRent;
    private BigDecimal depositAmount;
    private Double sizeSquareMeters;
    private Integer numberOfBedrooms;
    private Integer numberOfBathrooms;
    private Boolean furnished;
    private Boolean petFriendly;
    private Boolean hasParking;
    private Boolean hasElevator;
    private Boolean hasBalcony;
    private String amenities;
    private LocalDate availableFrom;
    private String status;
    private Long numberOfViews;
    private Double averageRating;
    private Integer reviewCount;
    private Instant createdAt;
    private Instant updatedAt;

    public static ApartmentDto fromEntity(Apartment apartment) {
        return ApartmentDto.builder()
                .id(apartment.getId())
                .ownerId(apartment.getOwner().getId())
                .ownerName(apartment.getOwner().getFirstName() + " " + apartment.getOwner().getLastName())
                .title(apartment.getTitle())
                .description(apartment.getDescription())
                .city(apartment.getCity())
                .district(apartment.getDistrict())
                .address(apartment.getAddress())
                .latitude(apartment.getLatitude())
                .longitude(apartment.getLongitude())
                .monthlyRent(apartment.getMonthlyRent())
                .depositAmount(apartment.getDepositAmount())
                .sizeSquareMeters(apartment.getSizeSquareMeters())
                .numberOfBedrooms(apartment.getNumberOfBedrooms())
                .numberOfBathrooms(apartment.getNumberOfBathrooms())
                .furnished(apartment.getFurnished())
                .petFriendly(apartment.getPetFriendly())
                .hasParking(apartment.getHasParking())
                .hasElevator(apartment.getHasElevator())
                .hasBalcony(apartment.getHasBalcony())
                .amenities(apartment.getAmenities())
                .availableFrom(apartment.getAvailableFrom())
                .status(apartment.getStatus().name())
                .numberOfViews(apartment.getNumberOfViews())
                .averageRating(apartment.getAverageRating())
                .reviewCount(apartment.getReviewCount())
                .createdAt(apartment.getCreatedAt())
                .updatedAt(apartment.getUpdatedAt())
                .build();
    }
}
