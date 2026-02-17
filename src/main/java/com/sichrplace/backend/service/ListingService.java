package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ListingDto;

import java.util.List;

public interface ListingService {

    List<ListingDto> getAllListings();

    ListingDto getListingById(Long id);
}
