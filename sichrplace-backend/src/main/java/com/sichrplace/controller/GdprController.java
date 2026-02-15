package com.sichrplace.controller;

import com.sichrplace.entity.GdprRequest;
import com.sichrplace.entity.User;
import com.sichrplace.repository.GdprRequestRepository;
import com.sichrplace.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/gdpr")
@RequiredArgsConstructor
@Slf4j
public class GdprController {

    private final GdprRequestRepository gdprRequestRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @GetMapping("/my-data")
    public ResponseEntity<?> getMyData(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(Map.of(
                "user", user,
                "gdprRequests", gdprRequestRepository.findByUser_IdOrderByCreatedAtDesc(user.getId())
        ));
    }

    @PostMapping("/data-export")
    @Transactional
    public ResponseEntity<?> requestDataExport(@AuthenticationPrincipal User user) {
        GdprRequest request = GdprRequest.builder()
                .user(user)
                .requestType("data_export")
                .status("processing")
                .build();

        try {
            String userData = objectMapper.writeValueAsString(user);
            request.setResponseData(userData);
            request.setStatus("completed");
            request.setCompletedAt(OffsetDateTime.now());
        } catch (Exception e) {
            request.setStatus("failed");
            log.error("Data export failed for user {}", user.getId(), e);
        }

        gdprRequestRepository.save(request);
        log.info("GDPR data export requested by user {}", user.getId());
        return ResponseEntity.ok(Map.of("success", true, "requestId", request.getId()));
    }

    @PostMapping("/data-deletion")
    @Transactional
    public ResponseEntity<?> requestDataDeletion(@AuthenticationPrincipal User user) {
        GdprRequest request = GdprRequest.builder()
                .user(user)
                .requestType("data_deletion")
                .status("pending")
                .build();
        gdprRequestRepository.save(request);

        log.info("GDPR data deletion requested by user {}", user.getId());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Data deletion request submitted. Will be processed within 30 days per GDPR.",
                "requestId", request.getId()
        ));
    }

    @PostMapping("/consent")
    @Transactional
    public ResponseEntity<?> updateConsent(@AuthenticationPrincipal User user,
                                            @RequestBody Map<String, Boolean> body) {
        user.setGdprConsent(body.getOrDefault("consent", false));
        userRepository.save(user);
        log.info("GDPR consent updated for user {}: {}", user.getId(), body.get("consent"));
        return ResponseEntity.ok(Map.of("success", true, "consent", user.getGdprConsent()));
    }

    @GetMapping("/requests")
    public List<GdprRequest> getMyRequests(@AuthenticationPrincipal User user) {
        return gdprRequestRepository.findByUser_IdOrderByCreatedAtDesc(user.getId());
    }
}
