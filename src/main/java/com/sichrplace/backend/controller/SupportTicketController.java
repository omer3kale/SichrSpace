package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.CreateSupportTicketRequest;
import com.sichrplace.backend.dto.SupportTicketDto;
import com.sichrplace.backend.service.SupportTicketService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/support/tickets")
@RequiredArgsConstructor
@Tag(name = "Support Tickets", description = "User-facing support ticket operations")
@SecurityRequirement(name = "bearerAuth")
public class SupportTicketController {

    private final SupportTicketService supportTicketService;

    @PostMapping
    @Operation(summary = "Create a support ticket")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Ticket created"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    public ResponseEntity<SupportTicketDto> createTicket(
            @Valid @RequestBody CreateSupportTicketRequest request) {
        Long userId = extractUserId();
        SupportTicketDto ticket = supportTicketService.createTicket(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ticket);
    }

    @GetMapping
    @Operation(summary = "Get my support tickets")
    public ResponseEntity<List<SupportTicketDto>> getMyTickets() {
        Long userId = extractUserId();
        List<SupportTicketDto> tickets = supportTicketService.getMyTickets(userId);
        return ResponseEntity.ok(tickets);
    }

    private Long extractUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return Long.valueOf(auth.getName());
    }
}
