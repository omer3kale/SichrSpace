package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "apartments", indexes = {
        @Index(name = "idx_apartment_owner", columnList = "user_id"),
        @Index(name = "idx_apartment_status", columnList = "status"),
        @Index(name = "idx_apartment_city", columnList = "city"),
        @Index(name = "idx_apartment_district", columnList = "district"),
        @Index(name = "idx_apartment_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String city;

    private String district;

    private String address;

    private Double latitude;

    private Double longitude;

    @Column(name = "monthly_rent", nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyRent;

    @Column(name = "deposit_amount", precision = 10, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "size_square_meters")
    private Double sizeSquareMeters;

    @Column(name = "number_of_bedrooms")
    private Integer numberOfBedrooms;

    @Column(name = "number_of_bathrooms")
    private Integer numberOfBathrooms;

    private Boolean furnished;

    @Column(name = "pet_friendly")
    private Boolean petFriendly;

    @Column(name = "has_parking")
    private Boolean hasParking;

    @Column(name = "has_elevator")
    private Boolean hasElevator;

    @Column(name = "has_balcony")
    private Boolean hasBalcony;

    @Column(columnDefinition = "TEXT")
    private String amenities;

    @Column(name = "available_from")
    private LocalDate availableFrom;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApartmentStatus status;

    @Column(name = "number_of_views")
    private Long numberOfViews;

    @Column(name = "average_rating")
    private Double averageRating;

    @Column(name = "review_count")
    private Integer reviewCount;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    public enum ApartmentStatus {
        AVAILABLE, RENTED, ARCHIVED, PENDING
    }
}
