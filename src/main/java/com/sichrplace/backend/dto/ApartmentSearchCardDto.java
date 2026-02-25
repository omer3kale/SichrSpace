package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Apartment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * FTL-11 — Compact card DTO returned by the search endpoint.
 * Shows just enough for a listing tile; click-through fetches the full {@link ApartmentDto}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApartmentSearchCardDto {
    private Long id;
    private String mainImageUrl;
    private String city;
    private String district;
    private BigDecimal pricePerMonth;
    private BigDecimal priceWarm;
    private String propertyType;
    private Double sizeM2;
    private Integer numberOfSingleBeds;
    private Integer numberOfDoubleBeds;
    private LocalDate moveInDate;
    private LocalDate moveOutDate;
    private String furnishedStatus;
    private Boolean petFriendly;

    public static ApartmentSearchCardDto fromEntity(Apartment a) {
        List<String> imgs = a.getImageList();
        return ApartmentSearchCardDto.builder()
                .id(a.getId())
                .mainImageUrl(imgs.isEmpty() ? null : imgs.get(0))
                .city(a.getCity())
                .district(a.getDistrict())
                .pricePerMonth(a.getMonthlyRent())
                .priceWarm(a.getPriceWarm())
                .propertyType(a.getPropertyType() != null ? a.getPropertyType().name() : null)
                .sizeM2(a.getSizeSquareMeters())
                .numberOfSingleBeds(a.getNumberOfSingleBeds())
                .numberOfDoubleBeds(a.getNumberOfDoubleBeds())
                .moveInDate(a.getAvailableFrom())
                .moveOutDate(a.getMoveOutDate())
                .furnishedStatus(a.getFurnishedStatus() != null ? a.getFurnishedStatus().name() : null)
                .petFriendly(a.getPetFriendly())
                .build();
    }
}
