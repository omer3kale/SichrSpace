package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.*;
import com.sichrplace.backend.service.AdminService;
import com.sichrplace.backend.service.ConversationReportService;
import com.sichrplace.backend.service.ReviewService;
import com.sichrplace.backend.service.SupportTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "Admin dashboard and management")
@SecurityRequirement(name = "bearerAuth")
public class AdminController {

    private final AdminService adminService;
    private final ReviewService reviewService;
    private final ConversationReportService conversationReportService;
    private final SupportTicketService supportTicketService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get admin dashboard statistics")
    public ResponseEntity<AdminDashboardDto> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboard());
    }

    @GetMapping("/users")
    @Operation(summary = "List all users (paginated)")
    public ResponseEntity<Page<UserDto>> getAllUsers(Pageable pageable) {
        return ResponseEntity.ok(adminService.getAllUsers(pageable));
    }

    @PatchMapping("/users/{userId}/role")
    @Operation(summary = "Update a user's role")
    public ResponseEntity<UserDto> updateUserRole(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request) {
        return ResponseEntity.ok(adminService.updateUserRole(getCurrentUserId(), userId, request));
    }

    @PatchMapping("/users/{userId}/status")
    @Operation(summary = "Activate or suspend a user")
    public ResponseEntity<UserDto> updateUserStatus(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(adminService.updateUserStatus(getCurrentUserId(), userId, request));
    }

    @GetMapping("/reviews/pending")
    @Operation(summary = "Get pending reviews for moderation")
    public ResponseEntity<Page<ReviewDto>> getPendingReviews(Pageable pageable) {
        return ResponseEntity.ok(reviewService.getPendingReviews(pageable));
    }

    @PostMapping("/reviews/{reviewId}/moderate")
    @Operation(summary = "Approve or reject a review")
    public ResponseEntity<ReviewDto> moderateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ModerateReviewRequest request) {
        return ResponseEntity.ok(reviewService.moderateReview(getCurrentUserId(), reviewId, request));
    }

    @GetMapping("/conversations/reports")
    @Operation(summary = "List conversation reports (optionally filter by status)")
    public ResponseEntity<Page<ConversationReportDto>> getConversationReports(
            @RequestParam(required = false) String status, Pageable pageable) {
        return ResponseEntity.ok(conversationReportService.getReports(status, pageable));
    }

    @PatchMapping("/conversations/reports/{reportId}")
    @Operation(summary = "Update the status of a conversation report")
    public ResponseEntity<ConversationReportDto> updateConversationReportStatus(
            @PathVariable Long reportId,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Status must not be blank");
        }
        return ResponseEntity.ok(
                conversationReportService.updateReportStatus(getCurrentUserId(), reportId, status));
    }

    @GetMapping("/support/tickets")
    @Operation(summary = "List all support tickets (paginated, optional status filter)")
    public ResponseEntity<Page<SupportTicketDto>> getSupportTickets(
            @RequestParam(required = false) String status, Pageable pageable) {
        return ResponseEntity.ok(supportTicketService.getAllTickets(status, pageable));
    }

    @PatchMapping("/support/tickets/{ticketId}")
    @Operation(summary = "Respond to a support ticket and update status")
    public ResponseEntity<SupportTicketDto> respondToTicket(
            @PathVariable Long ticketId,
            @RequestBody Map<String, String> body) {
        String response = body.get("response");
        String newStatus = body.get("status");
        if (response == null || response.isBlank()) {
            throw new IllegalArgumentException("Response must not be blank");
        }
        return ResponseEntity.ok(
                supportTicketService.respondToTicket(ticketId, getCurrentUserId(), response, newStatus));
    }
}
