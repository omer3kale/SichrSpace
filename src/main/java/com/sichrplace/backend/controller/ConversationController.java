package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.*;
import com.sichrplace.backend.service.ConversationService;
import io.swagger.v3.oas.annotations.Operation;
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

import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@Tag(name = "Conversations", description = "Messaging and conversations")
@SecurityRequirement(name = "bearerAuth")
public class ConversationController {

    private final ConversationService conversationService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Create or get existing conversation")
    public ResponseEntity<ConversationDto> createOrGet(
            @Valid @RequestBody CreateConversationRequest request) {
        ConversationDto dto = conversationService.createOrGetConversation(getCurrentUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List my conversations (paginated)")
    public ResponseEntity<Page<ConversationDto>> getConversations(Pageable pageable) {
        return ResponseEntity.ok(conversationService.getUserConversations(getCurrentUserId(), pageable));
    }

    @GetMapping("/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get conversation details")
    public ResponseEntity<ConversationDto> getConversation(@PathVariable Long conversationId) {
        return ResponseEntity.ok(conversationService.getConversation(getCurrentUserId(), conversationId));
    }

    @GetMapping("/{conversationId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get messages in a conversation (paginated)")
    public ResponseEntity<Page<MessageDto>> getMessages(
            @PathVariable Long conversationId, Pageable pageable) {
        return ResponseEntity.ok(conversationService.getMessages(getCurrentUserId(), conversationId, pageable));
    }

    @PostMapping("/{conversationId}/messages")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Send a message")
    public ResponseEntity<MessageDto> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody SendMessageRequest request) {
        MessageDto dto = conversationService.sendMessage(getCurrentUserId(), conversationId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @PatchMapping("/messages/{messageId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Edit a message (within 24h)")
    public ResponseEntity<MessageDto> editMessage(
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body) {
        String content = body.get("content");
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("Message content must not be blank");
        }
        if (content.length() > 5000) {
            throw new IllegalArgumentException("Message content must not exceed 5000 characters");
        }
        return ResponseEntity.ok(
                conversationService.editMessage(getCurrentUserId(), messageId, content));
    }

    @DeleteMapping("/messages/{messageId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Soft delete a message")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long messageId) {
        conversationService.deleteMessage(getCurrentUserId(), messageId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{conversationId}/read")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Mark all messages in conversation as read")
    public ResponseEntity<Map<String, Integer>> markAsRead(@PathVariable Long conversationId) {
        int count = conversationService.markConversationAsRead(getCurrentUserId(), conversationId);
        return ResponseEntity.ok(Map.of("markedRead", count));
    }

    @GetMapping("/unread/count")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get total unread message count across all conversations")
    public ResponseEntity<Map<String, Long>> getTotalUnreadCount() {
        long count = conversationService.getTotalUnreadCount(getCurrentUserId());
        return ResponseEntity.ok(Map.of("count", count));
    }
}
