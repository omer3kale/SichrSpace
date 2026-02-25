package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Apartment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Full detail DTO for a single apartment (FTL-12 offer detail view).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApartmentDto {
    private Long id;
    private Long ownerId;
    private String ownerName;
    private String ownerAvatarUrl;
    private Boolean ownerIsCompany;
    private String title;
    private String description;
    private String areaDescription;
    private String city;
    private String district;
    private String address;
    private Double latitude;
    private Double longitude;

    // pricing
    private BigDecimal monthlyRent;
    private BigDecimal priceWarm;
    private BigDecimal depositAmount;

    // size & layout
    private Double sizeSquareMeters;
    private String propertyType;
    private Integer numberOfBedrooms;
    private Integer numberOfBathrooms;
    private Integer numberOfSingleBeds;
    private Integer numberOfDoubleBeds;
    private String furnishedStatus;
    private Boolean furnished;

    // availability
    private LocalDate availableFrom;
    private LocalDate moveOutDate;
    private LocalDate earliestMoveIn;
    private Boolean flexibleTimeslot;

    // amenities
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
    private String amenities;

    // images
    private List<String> images;
    private String floorPlanUrl;

    // stats
    private String status;
    private Long numberOfViews;
    private Double averageRating;
    private Integer reviewCount;
    private Instant createdAt;
    private Instant updatedAt;

    public static ApartmentDto fromEntity(Apartment a) {
        return ApartmentDto.builder()
                .id(a.getId())
                .ownerId(a.getOwner().getId())
                .ownerName(a.getOwner().getFirstName() + " " + a.getOwner().getLastName())
                .ownerAvatarUrl(a.getOwner().getProfileImageUrl())
                .ownerIsCompany(a.getOwner().getCompanyName() != null && !a.getOwner().getCompanyName().isBlank())
                .title(a.getTitle())
                .description(a.getDescription())
                .areaDescription(a.getAreaDescription())
                .city(a.getCity())
                .district(a.getDistrict())
                .address(a.getAddress())
                .latitude(a.getLatitude())
                .longitude(a.getLongitude())
                .monthlyRent(a.getMonthlyRent())
                .priceWarm(a.getPriceWarm())
                .depositAmount(a.getDepositAmount())
                .sizeSquareMeters(a.getSizeSquareMeters())
                .propertyType(a.getPropertyType() != null ? a.getPropertyType().name() : null)
                .numberOfBedrooms(a.getNumberOfBedrooms())
                .numberOfBathrooms(a.getNumberOfBathrooms())
                .numberOfSingleBeds(a.getNumberOfSingleBeds())
                .numberOfDoubleBeds(a.getNumberOfDoubleBeds())
                .furnishedStatus(a.getFurnishedStatus() != null ? a.getFurnishedStatus().name() : null)
                .furnished(a.getFurnished())
                .availableFrom(a.getAvailableFrom())
                .moveOutDate(a.getMoveOutDate())
                .earliestMoveIn(a.getEarliestMoveIn())
                .flexibleTimeslot(a.getFlexibleTimeslot())
                .petFriendly(a.getPetFriendly())
                .hasParking(a.getHasParking())
                .hasElevator(a.getHasElevator())
                .hasBalcony(a.getHasBalcony())
                .hasWifi(a.getHasWifi())
                .hasWashingMachine(a.getHasWashingMachine())
                .hasDishwasher(a.getHasDishwasher())
                .hasAirConditioning(a.getHasAirConditioning())
                .hasHeating(a.getHasHeating())
                .excludeExchangeOffer(a.getExcludeExchangeOffer())
                .amenities(a.getAmenities())
                .images(a.getImageList())
                .floorPlanUrl(a.getFloorPlanUrl())
                .status(a.getStatus().name())
                .numberOfViews(a.getNumberOfViews())
                .averageRating(a.getAverageRating())
                .reviewCount(a.getReviewCount())
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}
