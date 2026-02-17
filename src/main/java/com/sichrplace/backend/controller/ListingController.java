package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ListingDto;
import com.sichrplace.backend.service.ListingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/listings")
@RequiredArgsConstructor
public class ListingController {

    private final ListingService listingService;

    @GetMapping
    public ResponseEntity<List<ListingDto>> getAllListings() {
        return ResponseEntity.ok(listingService.getAllListings());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ListingDto> getListingById(@PathVariable Long id) {
        ListingDto listing = listingService.getListingById(id);
        if (listing != null) {
            return ResponseEntity.ok(listing);
        }
        return ResponseEntity.notFound().build();
    }
}
