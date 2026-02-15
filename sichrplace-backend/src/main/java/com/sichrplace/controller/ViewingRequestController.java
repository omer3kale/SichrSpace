package com.sichrplace.controller;

import com.sichrplace.entity.*;
import com.sichrplace.repository.ApartmentRepository;
import com.sichrplace.repository.ViewingRequestRepository;
import com.sichrplace.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/viewing-requests")
@RequiredArgsConstructor
public class ViewingRequestController {

    private final ViewingRequestRepository viewingRequestRepository;
    private final ApartmentRepository apartmentRepository;
    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<?> createRequest(@RequestBody Map<String, String> body,
                                            @AuthenticationPrincipal User user) {
        UUID apartmentId = UUID.fromString(body.get("apartmentId"));
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new RuntimeException("Apartment not found"));

        ViewingRequest vr = ViewingRequest.builder()
                .apartment(apartment)
                .requester(user)
                .landlord(apartment.getOwner())
                .notes(body.get("notes"))
                .status("pending")
                .build();

        vr = viewingRequestRepository.save(vr);

        // Notify landlord
        notificationService.create(
                apartment.getOwner().getId(),
                "viewing_request",
                "New Viewing Request",
                user.getFirstName() + " wants to view " + apartment.getTitle(),
                "/viewing-requests/" + vr.getId(),
                "high"
        );

        return ResponseEntity.status(201).body(vr);
    }

    @GetMapping("/my-requests")
    public List<ViewingRequest> getMyRequests(@AuthenticationPrincipal User user) {
        return viewingRequestRepository.findByRequester_IdOrderByCreatedAtDesc(user.getId());
    }

    @GetMapping("/landlord-requests")
    public List<ViewingRequest> getLandlordRequests(@AuthenticationPrincipal User user) {
        return viewingRequestRepository.findByLandlord_IdOrderByCreatedAtDesc(user.getId());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id,
                                           @RequestBody Map<String, String> body,
                                           @AuthenticationPrincipal User user) {
        return viewingRequestRepository.findById(id)
                .filter(vr -> vr.getLandlord().getId().equals(user.getId()) || "admin".equals(user.getRole()))
                .map(vr -> {
                    vr.setStatus(body.get("status"));
                    viewingRequestRepository.save(vr);

                    notificationService.create(
                            vr.getRequester().getId(),
                            "viewing_" + body.get("status"),
                            "Viewing Request " + body.get("status"),
                            "Your viewing request has been " + body.get("status"),
                            "/viewing-requests/" + id,
                            "normal"
                    );

                    return ResponseEntity.ok(Map.of("success", true, "status", body.get("status")));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
