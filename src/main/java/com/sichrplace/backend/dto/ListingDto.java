package com.sichrplace.backend.dto;

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
public class ListingDto {

    private Long id;
    private String title;
    private String description;
    private String city;
    private String district;
    private BigDecimal monthlyRent;
    private Double sizeSquareMeters;
    private Boolean furnished;
    private LocalDate availableFrom;
    private Instant createdAt;
    private Instant updatedAt;
    private Long ownerId;
}
