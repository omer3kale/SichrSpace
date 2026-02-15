package com.sichrplace.controller;

import com.sichrplace.entity.User;
import com.sichrplace.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final ViewingRequestRepository viewingRequestRepository;
    private final ReviewRepository reviewRepository;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        return ResponseEntity.ok(Map.of(
                "totalUsers", userRepository.count(),
                "totalApartments", apartmentRepository.count(),
                "totalViewingRequests", viewingRequestRepository.count(),
                "pendingReviews", reviewRepository.findByStatus("pending", org.springframework.data.domain.PageRequest.of(0, 1)).getTotalElements()
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(userRepository.findAll(org.springframework.data.domain.PageRequest.of(page, size)));
    }

    @PatchMapping("/users/{id}/block")
    public ResponseEntity<?> toggleBlock(@PathVariable java.util.UUID id) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setBlocked(!user.getBlocked());
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.of("blocked", user.getBlocked()));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/reviews/pending")
    public ResponseEntity<?> getPendingReviews(@RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reviewRepository.findByStatus("pending", org.springframework.data.domain.PageRequest.of(page, size)));
    }

    @PatchMapping("/reviews/{id}/moderate")
    public ResponseEntity<?> moderateReview(@PathVariable java.util.UUID id,
                                             @RequestBody Map<String, String> body) {
        return reviewRepository.findById(id)
                .map(review -> {
                    review.setStatus(body.get("status"));
                    review.setModerationNote(body.get("note"));
                    reviewRepository.save(review);
                    return ResponseEntity.ok(Map.of("success", true));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
