package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ViewingCreditSummaryDto;
import com.sichrplace.backend.service.ViewingCreditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/viewing-credits")
@RequiredArgsConstructor
@Tag(name = "Viewing Credits", description = "Viewing credit pack operations")
@SecurityRequirement(name = "bearerAuth")
public class ViewingCreditController {

    private final ViewingCreditService viewingCreditService;

    @Operation(summary = "Get my viewing credit summary",
               description = "Returns the authenticated user's active credit pack, total remaining, and full history")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Credit summary returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping("/me")
    public ResponseEntity<ViewingCreditSummaryDto> getMyCreditSummary() {
        Long userId = extractUserId();
        ViewingCreditSummaryDto summary = viewingCreditService.getCreditSummary(userId);
        return ResponseEntity.ok(summary);
    }

    @Operation(summary = "Check if next viewing is free",
               description = "Returns true if the user has an active credit pack with remaining credits")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Active credit status returned"),
            @ApiResponse(responseCode = "401", description = "Not authenticated")
    })
    @GetMapping("/me/has-credit")
    public ResponseEntity<Boolean> hasActiveCredit() {
        Long userId = extractUserId();
        boolean hasCredit = viewingCreditService.hasActiveCredit(userId);
        return ResponseEntity.ok(hasCredit);
    }

    private Long extractUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return Long.valueOf(auth.getName());
    }
}
