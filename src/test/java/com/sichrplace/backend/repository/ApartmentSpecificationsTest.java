package com.sichrplace.backend.repository;

import com.sichrplace.backend.dto.SearchFilterDto;
import com.sichrplace.backend.model.Apartment;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for {@link ApartmentSpecifications}.
 * Verifies that building specifications from a filter does not throw,
 * and that the returned specification is non-null.
 */
@DisplayName("ApartmentSpecifications")
class ApartmentSpecificationsTest {

    @Test
    @DisplayName("fromFilter with all null fields returns non-null Specification")
    void allNullFields_returnsSpec() {
        SearchFilterDto filter = new SearchFilterDto();
        Specification<Apartment> spec = ApartmentSpecifications.fromFilter(filter);
        assertNotNull(spec);
    }

    @Test
    @DisplayName("fromFilter with city and price range builds without error")
    void cityAndPriceRange() {
        SearchFilterDto filter = SearchFilterDto.builder()
                .city("Berlin")
                .minPrice(BigDecimal.valueOf(500))
                .maxPrice(BigDecimal.valueOf(1500))
                .build();
        Specification<Apartment> spec = ApartmentSpecifications.fromFilter(filter);
        assertNotNull(spec);
    }

    @Test
    @DisplayName("fromFilter with propertyType builds without error")
    void propertyTypeFilter() {
        SearchFilterDto filter = SearchFilterDto.builder()
                .propertyType("APARTMENT")
                .build();
        Specification<Apartment> spec = ApartmentSpecifications.fromFilter(filter);
        assertNotNull(spec);
    }

    @Test
    @DisplayName("fromFilter with invalid propertyType skips silently")
    void invalidPropertyType_skips() {
        SearchFilterDto filter = SearchFilterDto.builder()
                .propertyType("NONEXISTENT_TYPE")
                .build();
        Specification<Apartment> spec = ApartmentSpecifications.fromFilter(filter);
        assertNotNull(spec);
    }

    @Test
    @DisplayName("fromFilter with availableFrom builds without error")
    void availableFromFilter() {
        SearchFilterDto filter = SearchFilterDto.builder()
                .availableFrom(LocalDate.of(2025, 6, 1))
                .build();
        Specification<Apartment> spec = ApartmentSpecifications.fromFilter(filter);
        assertNotNull(spec);
    }

    @Test
    @DisplayName("fromFilter with amenity booleans builds without error")
    void amenityBooleans() {
        SearchFilterDto filter = SearchFilterDto.builder()
                .hasWifi(true)
                .hasWashingMachine(true)
                .hasDishwasher(false)
                .hasAirConditioning(true)
                .hasHeating(true)
                .build();
        Specification<Apartment> spec = ApartmentSpecifications.fromFilter(filter);
        assertNotNull(spec);
    }

    @Test
    @DisplayName("fromFilter with all fields populated builds without error")
    void allFieldsPopulated() {
        SearchFilterDto filter = SearchFilterDto.builder()
                .city("Munich")
                .district("Schwabing")
                .minPrice(BigDecimal.valueOf(700))
                .maxPrice(BigDecimal.valueOf(2000))
                .minBedrooms(1)
                .maxBedrooms(3)
                .minSize(40.0)
                .maxSize(120.0)
                .furnished(true)
                .petFriendly(true)
                .hasParking(true)
                .hasElevator(false)
                .hasBalcony(true)
                .propertyType("HOUSE")
                .availableFrom(LocalDate.of(2025, 7, 15))
                .hasWifi(true)
                .hasWashingMachine(true)
                .hasDishwasher(true)
                .hasAirConditioning(false)
                .hasHeating(true)
                .build();
        Specification<Apartment> spec = ApartmentSpecifications.fromFilter(filter);
        assertNotNull(spec);
    }
}
