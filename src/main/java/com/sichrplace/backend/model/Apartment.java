package com.sichrplace.backend.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

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

    /** Neighbourhood / area within the city. */
    private String district;

    /** Full street address (hidden in card view, shown in detail). */
    private String address;

    private Double latitude;

    private Double longitude;

    // ─── FTL-08  pricing ──────────────────────────────────────

    /** Cold rent (Kaltmiete). */
    @Column(name = "monthly_rent", nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyRent;

    /** Warm rent (Warmmiete) — includes utilities. */
    @Column(name = "price_warm", precision = 10, scale = 2)
    private BigDecimal priceWarm;

    @Column(name = "deposit_amount", precision = 10, scale = 2)
    private BigDecimal depositAmount;

    // ─── FTL-08  size & layout ─────────────────────────────────

    @Column(name = "size_square_meters")
    private Double sizeSquareMeters;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", length = 20)
    private PropertyType propertyType;

    @Column(name = "number_of_bedrooms")
    private Integer numberOfBedrooms;

    @Column(name = "number_of_bathrooms")
    private Integer numberOfBathrooms;

    @Column(name = "number_of_single_beds")
    private Integer numberOfSingleBeds;

    @Column(name = "number_of_double_beds")
    private Integer numberOfDoubleBeds;

    @Enumerated(EnumType.STRING)
    @Column(name = "furnished_status", length = 20)
    private FurnishedStatus furnishedStatus;

    /** Legacy boolean kept for backward compat — derived from furnishedStatus if null. */
    private Boolean furnished;

    // ─── FTL-08  availability ──────────────────────────────────

    @Column(name = "available_from")
    private LocalDate availableFrom;

    @Column(name = "move_out_date")
    private LocalDate moveOutDate;

    @Column(name = "earliest_move_in")
    private LocalDate earliestMoveIn;

    @Column(name = "flexible_timeslot")
    private Boolean flexibleTimeslot;

    // ─── FTL-08  amenity booleans ───────────────────────────────

    @Column(name = "pet_friendly")
    private Boolean petFriendly;

    @Column(name = "has_parking")
    private Boolean hasParking;

    @Column(name = "has_elevator")
    private Boolean hasElevator;

    @Column(name = "has_balcony")
    private Boolean hasBalcony;

    @Column(name = "has_wifi")
    private Boolean hasWifi;

    @Column(name = "has_washing_machine")
    private Boolean hasWashingMachine;

    @Column(name = "has_dishwasher")
    private Boolean hasDishwasher;

    @Column(name = "has_air_conditioning")
    private Boolean hasAirConditioning;

    @Column(name = "has_heating")
    private Boolean hasHeating;

    @Column(name = "exclude_exchange_offer")
    private Boolean excludeExchangeOffer;

    /** Legacy comma-separated amenities string. */
    @Column(columnDefinition = "TEXT")
    private String amenities;

    // ─── FTL-08  descriptions ──────────────────────────────────

    @Column(name = "area_description", columnDefinition = "TEXT")
    private String areaDescription;

    // ─── FTL-08  images ───────────────────────────────────────

    /** Comma-separated image URLs (or JSON array). */
    @Column(name = "images", columnDefinition = "TEXT")
    private String images;

    @Column(name = "floor_plan_url", length = 500)
    private String floorPlanUrl;

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

    public enum PropertyType {
        SHARED_ROOM, PRIVATE_ROOM, STUDIO, LOFT, APARTMENT, HOUSE
    }

    public enum FurnishedStatus {
        FURNISHED, SEMI_FURNISHED, UNFURNISHED
    }

    // ── helper: images as list ──
    public List<String> getImageList() {
        if (images == null || images.isBlank()) return List.of();
        List<String> list = new ArrayList<>();
        for (String url : images.split(",")) {
            String trimmed = url.trim();
            if (!trimmed.isEmpty()) list.add(trimmed);
        }
        return list;
    }
}
