package com.sichrplace.controller;

import com.sichrplace.entity.*;
import com.sichrplace.repository.*;
import com.sichrplace.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserFeaturesController {

    private final FavoriteRepository favoriteRepository;
    private final SavedSearchRepository savedSearchRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationRepository notificationRepository;
    private final ApartmentRepository apartmentRepository;
    private final NotificationService notificationService;

    // ===== FAVORITES =====
    @GetMapping("/favorites")
    public List<Favorite> getFavorites(@AuthenticationPrincipal User user) {
        return favoriteRepository.findByUser_Id(user.getId());
    }

    @PostMapping("/favorites")
    public ResponseEntity<?> addFavorite(@RequestBody Map<String, String> body,
                                          @AuthenticationPrincipal User user) {
        UUID apartmentId = UUID.fromString(body.get("apartmentId"));
        if (favoriteRepository.existsByUser_IdAndApartment_Id(user.getId(), apartmentId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Already favorited"));
        }
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new RuntimeException("Apartment not found"));
        Favorite fav = Favorite.builder().user(user).apartment(apartment).build();
        return ResponseEntity.status(201).body(favoriteRepository.save(fav));
    }

    @DeleteMapping("/favorites/{apartmentId}")
    @Transactional
    public ResponseEntity<?> removeFavorite(@PathVariable UUID apartmentId,
                                             @AuthenticationPrincipal User user) {
        favoriteRepository.deleteByUser_IdAndApartment_Id(user.getId(), apartmentId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    // ===== SAVED SEARCHES =====
    @GetMapping("/saved-searches")
    public List<SavedSearch> getSavedSearches(@AuthenticationPrincipal User user) {
        return savedSearchRepository.findByUser_Id(user.getId());
    }

    @PostMapping("/saved-searches")
    public ResponseEntity<SavedSearch> createSavedSearch(@RequestBody SavedSearch search,
                                                          @AuthenticationPrincipal User user) {
        search.setUser(user);
        return ResponseEntity.status(201).body(savedSearchRepository.save(search));
    }

    @DeleteMapping("/saved-searches/{id}")
    public ResponseEntity<?> deleteSavedSearch(@PathVariable UUID id, @AuthenticationPrincipal User user) {
        return savedSearchRepository.findById(id)
                .filter(s -> s.getUser().getId().equals(user.getId()))
                .map(s -> {
                    savedSearchRepository.delete(s);
                    return ResponseEntity.ok(Map.of("success", true));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ===== REVIEWS =====
    @GetMapping("/apartments/{apartmentId}/reviews")
    public Page<Review> getReviews(@PathVariable UUID apartmentId,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return reviewRepository.findByApartment_IdAndStatus(apartmentId, "approved", PageRequest.of(page, size));
    }

    @PostMapping("/reviews")
    public ResponseEntity<Review> createReview(@RequestBody Review review,
                                                @AuthenticationPrincipal User user) {
        review.setUser(user);
        review.setStatus("pending");
        return ResponseEntity.status(201).body(reviewRepository.save(review));
    }

    // ===== NOTIFICATIONS =====
    @GetMapping("/notifications")
    public Page<Notification> getNotifications(@AuthenticationPrincipal User user,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return notificationService.getUserNotifications(user.getId(), page, size);
    }

    @GetMapping("/notifications/unread-count")
    public Map<String, Long> getUnreadCount(@AuthenticationPrincipal User user) {
        return Map.of("count", notificationService.getUnreadCount(user.getId()));
    }

    @PostMapping("/notifications/mark-read")
    public Map<String, Object> markAllRead(@AuthenticationPrincipal User user) {
        int count = notificationService.markAllAsRead(user.getId());
        return Map.of("success", true, "markedRead", count);
    }
}
