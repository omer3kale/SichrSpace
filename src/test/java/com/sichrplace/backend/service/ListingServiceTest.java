package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ListingDto;
import com.sichrplace.backend.model.Listing;
import com.sichrplace.backend.repository.ListingRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ListingServiceImpl")
class ListingServiceTest {

    @Mock private ListingRepository listingRepository;

    @InjectMocks private ListingServiceImpl listingService;

    @Test
    void getAllListings_mapsEntities() {
        Listing listing = Listing.builder()
                .id(1L)
                .title("Listing A")
                .city("Berlin")
                .monthlyRent(BigDecimal.valueOf(1200))
                .sizeSquareMeters(65.0)
                .furnished(true)
                .availableFrom(LocalDate.now())
                .ownerId(7L)
                .build();

        when(listingRepository.findAll()).thenReturn(List.of(listing));

        List<ListingDto> result = listingService.getAllListings();

        assertEquals(1, result.size());
        assertEquals("Listing A", result.get(0).getTitle());
        assertEquals(7L, result.get(0).getOwnerId());
    }

    @Test
    void getAllListings_empty_returnsEmptyList() {
        when(listingRepository.findAll()).thenReturn(List.of());

        List<ListingDto> result = listingService.getAllListings();

        assertTrue(result.isEmpty());
    }

    @Test
    void getListingById_found_mapsEntity() {
        Listing listing = Listing.builder()
                .id(2L)
                .title("L2")
                .description("desc")
                .city("Munich")
                .district("Center")
                .ownerId(3L)
                .build();
        when(listingRepository.findById(2L)).thenReturn(Optional.of(listing));

        ListingDto result = listingService.getListingById(2L);

        assertNotNull(result);
        assertEquals("L2", result.getTitle());
        assertEquals("desc", result.getDescription());
        assertEquals("Center", result.getDistrict());
    }

    @Test
    void getListingById_found_withNullOptionalFields() {
        Listing listing = Listing.builder().id(8L).title("L8").city("Berlin").ownerId(11L).build();
        when(listingRepository.findById(8L)).thenReturn(Optional.of(listing));

        ListingDto result = listingService.getListingById(8L);

        assertNotNull(result);
        assertNull(result.getDescription());
        assertNull(result.getDistrict());
    }

    @Test
    void getListingById_missing_returnsNull() {
        when(listingRepository.findById(404L)).thenReturn(Optional.empty());
        assertNull(listingService.getListingById(404L));
    }
}
