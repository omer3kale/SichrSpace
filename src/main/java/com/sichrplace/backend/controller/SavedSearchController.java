package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.ApiErrorResponse;
import com.sichrplace.backend.dto.CreateSavedSearchRequest;
import com.sichrplace.backend.dto.SavedSearchDto;
import com.sichrplace.backend.service.SavedSearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saved-searches")
@RequiredArgsConstructor
@Tag(name = "Saved Searches", description = "Saved apartment search filter operations")
@SecurityRequirement(name = "bearerAuth")
public class SavedSearchController {

    private final SavedSearchService savedSearchService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create a new saved search")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Saved search created"),
            @ApiResponse(responseCode = "400", description = "Validation error",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Duplicate search name",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<SavedSearchDto> createSavedSearch(
            @Valid @RequestBody CreateSavedSearchRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        SavedSearchDto response = savedSearchService.createSavedSearch(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get all saved searches for the current user")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of saved searches"),
            @ApiResponse(responseCode = "401", description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<List<SavedSearchDto>> getMySavedSearches() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<SavedSearchDto> response = savedSearchService.getSavedSearchesByUser(userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get a saved search by ID")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Saved search details"),
            @ApiResponse(responseCode = "403", description = "Not the search owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Saved search not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<SavedSearchDto> getSavedSearchById(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        SavedSearchDto response = savedSearchService.getSavedSearchById(id, userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/toggle")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Toggle active/inactive status of a saved search")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Saved search toggled"),
            @ApiResponse(responseCode = "403", description = "Not the search owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Saved search not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<SavedSearchDto> toggleSavedSearch(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        SavedSearchDto response = savedSearchService.toggleActive(id, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Delete a saved search")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Saved search deleted"),
            @ApiResponse(responseCode = "403", description = "Not the search owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Saved search not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Void> deleteSavedSearch(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        savedSearchService.deleteSavedSearch(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/execute")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Execute a saved search against available apartments")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Matching apartments"),
            @ApiResponse(responseCode = "400", description = "Invalid filter_json",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Not the search owner",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Saved search not found",
                    content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    public ResponseEntity<Page<ApartmentDto>> executeSavedSearch(
            @PathVariable Long id,
            Pageable pageable) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        Page<ApartmentDto> results = savedSearchService.executeSavedSearch(id, userId, pageable);
        return ResponseEntity.ok(results);
    }
}
