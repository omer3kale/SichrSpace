package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ListingDto;
import com.sichrplace.backend.model.Listing;
import com.sichrplace.backend.repository.ListingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ListingServiceImpl implements ListingService {

    private final ListingRepository listingRepository;

    @Override
    public List<ListingDto> getAllListings() {
        return listingRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public ListingDto getListingById(Long id) {
        return listingRepository.findById(id)
                .map(this::toDto)
                .orElse(null);
    }

    private ListingDto toDto(Listing listing) {
        return ListingDto.builder()
                .id(listing.getId())
                .title(listing.getTitle())
                .description(listing.getDescription())
                .city(listing.getCity())
                .district(listing.getDistrict())
                .monthlyRent(listing.getMonthlyRent())
                .sizeSquareMeters(listing.getSizeSquareMeters())
                .furnished(listing.getFurnished())
                .availableFrom(listing.getAvailableFrom())
                .createdAt(listing.getCreatedAt())
                .updatedAt(listing.getUpdatedAt())
                .ownerId(listing.getOwnerId())
                .build();
    }
}
