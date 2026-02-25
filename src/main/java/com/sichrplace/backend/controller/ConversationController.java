package com.sichrplace.backend.controller;

import com.sichrplace.backend.dto.*;
import com.sichrplace.backend.service.ConversationReportService;
import com.sichrplace.backend.service.ConversationService;
import com.sichrplace.backend.service.MessageAttachmentService;
import com.sichrplace.backend.service.MessageReactionService;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@Tag(name = "Conversations", description = "Messaging and conversations")
@SecurityRequirement(name = "bearerAuth")
public class ConversationController {

    private final ConversationService conversationService;
    private final ConversationReportService conversationReportService;
    private final MessageAttachmentService messageAttachmentService;
    private final MessageReactionService messageReactionService;

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

    @GetMapping("/messages/search")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Search messages across all conversations")
    public ResponseEntity<Page<MessageDto>> searchMessages(
            @RequestParam("q") String query, Pageable pageable) {
        if (query == null || query.isBlank()) {
            throw new IllegalArgumentException("Search query must not be blank");
        }
        return ResponseEntity.ok(
                conversationService.searchMessages(getCurrentUserId(), query.strip(), pageable));
    }

    @PatchMapping("/{conversationId}/archive")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Toggle archive status of a conversation")
    public ResponseEntity<Map<String, Boolean>> toggleArchive(@PathVariable Long conversationId) {
        boolean archived = conversationService.archiveConversation(getCurrentUserId(), conversationId);
        return ResponseEntity.ok(Map.of("archived", archived));
    }

    @GetMapping("/archived")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List archived conversations (paginated)")
    public ResponseEntity<Page<ConversationDto>> getArchivedConversations(Pageable pageable) {
        return ResponseEntity.ok(
                conversationService.getArchivedConversations(getCurrentUserId(), pageable));
    }

    @PostMapping("/messages/{messageId}/attachments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Register attachment metadata for a message")
    public ResponseEntity<MessageAttachmentDto> addAttachment(
            @PathVariable Long messageId,
            @RequestBody Map<String, Object> body) {
        String filename = (String) body.get("filename");
        String contentType = (String) body.get("contentType");
        Object sizeObj = body.get("sizeBytes");
        String storageUrl = (String) body.get("storageUrl");
        if (filename == null || filename.isBlank()) {
            throw new IllegalArgumentException("Filename must not be blank");
        }
        if (contentType == null || contentType.isBlank()) {
            throw new IllegalArgumentException("Content type must not be blank");
        }
        if (sizeObj == null) {
            throw new IllegalArgumentException("Size must not be null");
        }
        if (storageUrl == null || storageUrl.isBlank()) {
            throw new IllegalArgumentException("Storage URL must not be blank");
        }
        Long sizeBytes = ((Number) sizeObj).longValue();
        MessageAttachmentDto dto = messageAttachmentService.addAttachment(
                getCurrentUserId(), messageId, filename.strip(), contentType.strip(), sizeBytes, storageUrl.strip());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping("/messages/{messageId}/attachments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List attachments for a message")
    public ResponseEntity<List<MessageAttachmentDto>> getAttachments(@PathVariable Long messageId) {
        return ResponseEntity.ok(messageAttachmentService.getAttachments(getCurrentUserId(), messageId));
    }

    @PostMapping("/messages/{messageId}/reactions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Add an emoji reaction to a message")
    public ResponseEntity<MessageReactionDto> addReaction(
            @PathVariable Long messageId,
            @RequestBody Map<String, String> body) {
        String emoji = body.get("emoji");
        if (emoji == null || emoji.isBlank()) {
            throw new IllegalArgumentException("Emoji must not be blank");
        }
        MessageReactionDto dto = messageReactionService.addReaction(
                getCurrentUserId(), messageId, emoji.strip());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/messages/{messageId}/reactions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Remove an emoji reaction from a message")
    public ResponseEntity<Void> removeReaction(
            @PathVariable Long messageId,
            @RequestParam("emoji") String emoji) {
        if (emoji == null || emoji.isBlank()) {
            throw new IllegalArgumentException("Emoji must not be blank");
        }
        messageReactionService.removeReaction(getCurrentUserId(), messageId, emoji.strip());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/messages/{messageId}/reactions")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List reactions for a message")
    public ResponseEntity<List<MessageReactionDto>> getReactions(@PathVariable Long messageId) {
        return ResponseEntity.ok(messageReactionService.getReactions(getCurrentUserId(), messageId));
    }

    @PostMapping("/{conversationId}/report")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Report a conversation for admin review")
    public ResponseEntity<ConversationReportDto> reportConversation(
            @PathVariable Long conversationId,
            @RequestBody Map<String, String> body) {
        String reason = body.get("reason");
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException("Report reason must not be blank");
        }
        if (reason.length() > 1000) {
            throw new IllegalArgumentException("Report reason must not exceed 1000 characters");
        }
        ConversationReportDto dto = conversationReportService.reportConversation(
                getCurrentUserId(), conversationId, reason.strip());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }
}
