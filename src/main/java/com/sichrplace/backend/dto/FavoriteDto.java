package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.UserFavorite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FavoriteDto {
    private Long id;
    private Long apartmentId;
    private String apartmentTitle;
    private String apartmentCity;
    private BigDecimal apartmentMonthlyRent;
    private String apartmentStatus;
    private Instant createdAt;

    public static FavoriteDto fromEntity(UserFavorite fav) {
        return FavoriteDto.builder()
                .id(fav.getId())
                .apartmentId(fav.getApartment().getId())
                .apartmentTitle(fav.getApartment().getTitle())
                .apartmentCity(fav.getApartment().getCity())
                .apartmentMonthlyRent(fav.getApartment().getMonthlyRent())
                .apartmentStatus(fav.getApartment().getStatus().name())
                .createdAt(fav.getCreatedAt())
                .build();
    }
}
