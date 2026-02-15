package com.sichrplace.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "apartments")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Apartment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank @Size(max = 200)
    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @NotNull
    @DecimalMin("0.00")
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Size(max = 200)
    @Column(length = 200)
    private String location;

    @Size(max = 200)
    @Column(length = 200)
    private String address;

    @Size(max = 100)
    @Column(length = 100)
    private String city;

    private Double latitude;
    private Double longitude;

    @Size(max = 255)
    @Column(name = "place_id")
    private String placeId;

    private Integer rooms;
    private Integer bedrooms;
    private Integer bathrooms;

    @Column(name = "size_sqm")
    private Double sizeSqm;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String images; // JSON array

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String amenities; // JSON array

    @Size(max = 20)
    @Column(length = 20)
    @Builder.Default
    private String status = "active";

    @Builder.Default
    private Boolean verified = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(name = "available_from")
    private OffsetDateTime availableFrom;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
