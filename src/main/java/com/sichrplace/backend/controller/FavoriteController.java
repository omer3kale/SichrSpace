package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.FavoriteDto;
import com.sichrplace.backend.service.FavoriteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
@Tag(name = "Favorites", description = "User favorites management")
@SecurityRequirement(name = "bearerAuth")
public class FavoriteController {

    private final FavoriteService favoriteService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }

    @PostMapping("/{apartmentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add apartment to favorites")
    public ResponseEntity<FavoriteDto> addFavorite(@PathVariable Long apartmentId) {
        FavoriteDto dto = favoriteService.addFavorite(getCurrentUserId(), apartmentId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/{apartmentId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Remove apartment from favorites")
    public ResponseEntity<Void> removeFavorite(@PathVariable Long apartmentId) {
        favoriteService.removeFavorite(getCurrentUserId(), apartmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get current user's favorites (paginated)")
    public ResponseEntity<Page<FavoriteDto>> getMyFavorites(Pageable pageable) {
        return ResponseEntity.ok(favoriteService.getUserFavorites(getCurrentUserId(), pageable));
    }

    @GetMapping("/{apartmentId}/check")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Check if apartment is favorited")
    public ResponseEntity<Map<String, Boolean>> checkFavorite(@PathVariable Long apartmentId) {
        boolean favorited = favoriteService.isFavorited(getCurrentUserId(), apartmentId);
        return ResponseEntity.ok(Map.of("favorited", favorited));
    }

    @GetMapping("/count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get total favorites count")
    public ResponseEntity<Map<String, Long>> getFavoriteCount() {
        long count = favoriteService.getFavoriteCount(getCurrentUserId());
        return ResponseEntity.ok(Map.of("count", count));
    }
}
