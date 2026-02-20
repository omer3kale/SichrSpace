package com.sichrplace.backend.repository;

import com.sichrplace.backend.dto.SearchFilterDto;
import com.sichrplace.backend.model.Apartment;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Builds a JPA {@link Specification} from a {@link SearchFilterDto}.
 * Null fields in the filter are simply ignored, giving a composable
 * AND-based query that works identically on MSSQL and PostgreSQL.
 */
public final class ApartmentSpecifications {

    private ApartmentSpecifications() { /* utility */ }

    public static Specification<Apartment> fromFilter(SearchFilterDto f) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Only return AVAILABLE apartments
            predicates.add(cb.equal(root.get("status"), Apartment.ApartmentStatus.AVAILABLE));

            if (f.getCity() != null && !f.getCity().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("city")), f.getCity().toLowerCase()));
            }
            if (f.getDistrict() != null && !f.getDistrict().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("district")), f.getDistrict().toLowerCase()));
            }
            if (f.getMinPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("monthlyRent"), f.getMinPrice()));
            }
            if (f.getMaxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("monthlyRent"), f.getMaxPrice()));
            }
            if (f.getMinBedrooms() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("numberOfBedrooms"), f.getMinBedrooms()));
            }
            if (f.getMaxBedrooms() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("numberOfBedrooms"), f.getMaxBedrooms()));
            }
            if (f.getMinSize() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("sizeSquareMeters"), f.getMinSize()));
            }
            if (f.getMaxSize() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("sizeSquareMeters"), f.getMaxSize()));
            }
            if (f.getFurnished() != null) {
                predicates.add(cb.equal(root.get("furnished"), f.getFurnished()));
            }
            if (f.getPetFriendly() != null) {
                predicates.add(cb.equal(root.get("petFriendly"), f.getPetFriendly()));
            }
            if (f.getHasParking() != null) {
                predicates.add(cb.equal(root.get("hasParking"), f.getHasParking()));
            }
            if (f.getHasElevator() != null) {
                predicates.add(cb.equal(root.get("hasElevator"), f.getHasElevator()));
            }
            if (f.getHasBalcony() != null) {
                predicates.add(cb.equal(root.get("hasBalcony"), f.getHasBalcony()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
