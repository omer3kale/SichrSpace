package com.sichrplace.controller;

import com.sichrplace.entity.Apartment;
import com.sichrplace.entity.User;
import com.sichrplace.service.ApartmentService;
import com.sichrplace.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/apartments")
@RequiredArgsConstructor
public class ApartmentController {

    private final ApartmentService apartmentService;
    private final FileStorageService fileStorageService;

    @GetMapping
    public ResponseEntity<Page<Apartment>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) Integer minRooms,
            @RequestParam(required = false) Integer maxRooms,
            @RequestParam(required = false) Double minSize,
            @RequestParam(required = false) Double maxSize) {

        if (city != null || minPrice != null || maxPrice != null || minRooms != null) {
            return ResponseEntity.ok(apartmentService.search(city, minPrice, maxPrice, minRooms, maxRooms, minSize, maxSize, page, size));
        }
        return ResponseEntity.ok(apartmentService.listActive(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable UUID id) {
        return apartmentService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Apartment> create(@RequestBody Apartment apartment,
                                            @AuthenticationPrincipal User user) {
        apartment.setOwner(user);
        apartment.setStatus("active");
        return ResponseEntity.status(201).body(apartmentService.create(apartment));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable UUID id, @RequestBody Apartment updates,
                                    @AuthenticationPrincipal User user) {
        return apartmentService.findById(id)
                .filter(a -> a.getOwner().getId().equals(user.getId()) || "admin".equals(user.getRole()))
                .map(existing -> {
                    if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
                    if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
                    if (updates.getPrice() != null) existing.setPrice(updates.getPrice());
                    if (updates.getCity() != null) existing.setCity(updates.getCity());
                    if (updates.getAddress() != null) existing.setAddress(updates.getAddress());
                    if (updates.getRooms() != null) existing.setRooms(updates.getRooms());
                    if (updates.getAmenities() != null) existing.setAmenities(updates.getAmenities());
                    return ResponseEntity.ok(apartmentService.update(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return apartmentService.findById(id)
                .filter(a -> a.getOwner().getId().equals(user.getId()) || "admin".equals(user.getRole()))
                .map(a -> {
                    apartmentService.delete(id);
                    return ResponseEntity.ok(Map.of("success", true, "message", "Apartment deleted"));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/images")
    public ResponseEntity<?> uploadImage(@PathVariable UUID id,
                                          @RequestParam("file") MultipartFile file,
                                          @AuthenticationPrincipal User user) {
        return apartmentService.findById(id)
                .filter(a -> a.getOwner().getId().equals(user.getId()))
                .map(apartment -> {
                    String url = fileStorageService.uploadFile(file, "apartment-images", id.toString());
                    return ResponseEntity.ok(Map.of("success", true, "imageUrl", url));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
