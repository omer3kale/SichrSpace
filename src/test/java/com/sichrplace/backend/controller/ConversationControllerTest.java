package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ConversationDto;
import com.sichrplace.backend.dto.ConversationReportDto;
import com.sichrplace.backend.dto.MessageAttachmentDto;
import com.sichrplace.backend.dto.MessageDto;
import com.sichrplace.backend.dto.MessageReactionDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ConversationReportService;
import com.sichrplace.backend.service.ConversationService;
import com.sichrplace.backend.service.MessageAttachmentService;
import com.sichrplace.backend.service.MessageReactionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ConversationController.class)
@Import(GlobalExceptionHandler.class)
@DisplayName("ConversationController")
class ConversationControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockBean private ConversationService conversationService;
    @MockBean private ConversationReportService conversationReportService;
    @MockBean private MessageAttachmentService messageAttachmentService;
    @MockBean private MessageReactionService messageReactionService;
    @MockBean private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(
                1L,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TENANT"))
        );
    }

    @Test
    void createOrGet_returns201() throws Exception {
        when(conversationService.createOrGetConversation(eq(1L), any()))
                .thenReturn(ConversationDto.builder().id(10L).otherParticipantId(2L).build());

        mockMvc.perform(post("/api/conversations")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(java.util.Map.of("participantId", 2))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void createOrGet_validationError_returns400() throws Exception {
        mockMvc.perform(post("/api/conversations")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation Failed"));
    }

    @Test
    void getConversations_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/conversations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getConversation_serviceSecurityException_returns403() throws Exception {
        when(conversationService.getConversation(1L, 10L))
                .thenThrow(new SecurityException("Not authorized to access this conversation"));

        mockMvc.perform(get("/api/conversations/10")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not authorized to access this conversation"));
    }

    @Test
    void getConversation_success200() throws Exception {
        when(conversationService.getConversation(1L, 10L))
                .thenReturn(ConversationDto.builder().id(10L).otherParticipantId(2L).build());

        mockMvc.perform(get("/api/conversations/10")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));
    }

    @Test
    void listAndGetMessagesAndUnreadCount_return200() throws Exception {
        when(conversationService.getUserConversations(eq(1L), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(ConversationDto.builder().id(1L).build())));
        when(conversationService.getMessages(eq(1L), eq(10L), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(MessageDto.builder().id(5L).content("hi").build())));
        when(conversationService.getTotalUnreadCount(1L)).thenReturn(6L);

        mockMvc.perform(get("/api/conversations").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1));

        mockMvc.perform(get("/api/conversations/10/messages").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(5));

        mockMvc.perform(get("/api/conversations/unread/count").with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(6));
    }

    @Test
    void sendEditDeleteAndMarkRead_paths() throws Exception {
        when(conversationService.sendMessage(eq(1L), eq(10L), any()))
                .thenReturn(MessageDto.builder().id(9L).content("sent").build());
        when(conversationService.editMessage(1L, 9L, "updated"))
                .thenReturn(MessageDto.builder().id(9L).content("updated").build());
        when(conversationService.markConversationAsRead(1L, 10L)).thenReturn(2);

        mockMvc.perform(post("/api/conversations/10/messages")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "sent"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(9));

        mockMvc.perform(patch("/api/conversations/messages/9")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "updated"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("updated"));

        mockMvc.perform(delete("/api/conversations/messages/9")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isNoContent());

        mockMvc.perform(patch("/api/conversations/10/read")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.markedRead").value(2));
    }

    @Test
    void editMessage_blankAndTooLong_return400() throws Exception {
        mockMvc.perform(patch("/api/conversations/messages/9")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "   "))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/conversations/messages/9")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("content", "x".repeat(5001)))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void searchMessages_returns200WithResults() throws Exception {
        when(conversationService.searchMessages(eq(1L), eq("hello"), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(
                        List.of(MessageDto.builder().id(7L).content("hello world").build())));

        mockMvc.perform(get("/api/conversations/messages/search")
                        .param("q", "hello")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(7))
                .andExpect(jsonPath("$.content[0].content").value("hello world"));
    }

    @Test
    void searchMessages_blankQuery_returns400() throws Exception {
        mockMvc.perform(get("/api/conversations/messages/search")
                        .param("q", "   ")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void searchMessages_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/conversations/messages/search").param("q", "test"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void toggleArchive_returns200WithArchived() throws Exception {
        when(conversationService.archiveConversation(1L, 10L)).thenReturn(true);

        mockMvc.perform(patch("/api/conversations/10/archive")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archived").value(true));
    }

    @Test
    void toggleArchive_returnsUnarchived() throws Exception {
        when(conversationService.archiveConversation(1L, 10L)).thenReturn(false);

        mockMvc.perform(patch("/api/conversations/10/archive")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.archived").value(false));
    }

    @Test
    void toggleArchive_withoutAuth_returns401() throws Exception {
        mockMvc.perform(patch("/api/conversations/10/archive").with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getArchivedConversations_returns200() throws Exception {
        when(conversationService.getArchivedConversations(eq(1L), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(
                        List.of(ConversationDto.builder().id(10L).otherParticipantId(2L).build())));

        mockMvc.perform(get("/api/conversations/archived")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(10));
    }

    @Test
    void reportConversation_returns201() throws Exception {
        when(conversationReportService.reportConversation(eq(1L), eq(10L), eq("spam")))
                .thenReturn(ConversationReportDto.builder()
                        .id(100L).conversationId(10L).reporterId(1L)
                        .reason("spam").status("PENDING").build());

        mockMvc.perform(post("/api/conversations/10/report")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("reason", "spam"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(100))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void reportConversation_blankReason_returns400() throws Exception {
        mockMvc.perform(post("/api/conversations/10/report")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("reason", "   "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reportConversation_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/conversations/10/report")
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("reason", "spam"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void reportConversation_notParticipant_returns403() throws Exception {
        when(conversationReportService.reportConversation(eq(1L), eq(10L), eq("spam")))
                .thenThrow(new SecurityException("Not authorized to report this conversation"));

        mockMvc.perform(post("/api/conversations/10/report")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("reason", "spam"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Not authorized to report this conversation"));
    }

    @Test
    void reportConversation_duplicate_returns409() throws Exception {
        when(conversationReportService.reportConversation(eq(1L), eq(10L), eq("spam")))
                .thenThrow(new IllegalStateException("You have already reported this conversation"));

        mockMvc.perform(post("/api/conversations/10/report")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("reason", "spam"))))
                .andExpect(status().isConflict());
    }

    // ── B-3 File Attachment tests ──

    @Test
    void addAttachment_returns201() throws Exception {
        when(messageAttachmentService.addAttachment(eq(1L), eq(100L), eq("photo.jpg"),
                eq("image/jpeg"), eq(12345L), eq("https://cdn.example.com/photo.jpg")))
                .thenReturn(MessageAttachmentDto.builder()
                        .id(50L).messageId(100L).filename("photo.jpg")
                        .contentType("image/jpeg").sizeBytes(12345L)
                        .storageUrl("https://cdn.example.com/photo.jpg").build());

        mockMvc.perform(post("/api/conversations/messages/100/attachments")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "filename", "photo.jpg",
                                "contentType", "image/jpeg",
                                "sizeBytes", 12345,
                                "storageUrl", "https://cdn.example.com/photo.jpg"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(50))
                .andExpect(jsonPath("$.filename").value("photo.jpg"));
    }

    @Test
    void addAttachment_blankFilename_returns400() throws Exception {
        mockMvc.perform(post("/api/conversations/messages/100/attachments")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "filename", "   ",
                                "contentType", "image/jpeg",
                                "sizeBytes", 100,
                                "storageUrl", "https://cdn.example.com/x"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addAttachment_blankContentType_returns400() throws Exception {
        mockMvc.perform(post("/api/conversations/messages/100/attachments")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "filename", "f.txt",
                                "contentType", "   ",
                                "sizeBytes", 100,
                                "storageUrl", "https://cdn.example.com/x"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addAttachment_blankStorageUrl_returns400() throws Exception {
        mockMvc.perform(post("/api/conversations/messages/100/attachments")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "filename", "f.txt",
                                "contentType", "text/plain",
                                "sizeBytes", 100,
                                "storageUrl", "  "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addAttachment_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/conversations/messages/100/attachments")
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "filename", "f.txt", "contentType", "text/plain",
                                "sizeBytes", 100, "storageUrl", "https://cdn.example.com/f"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addAttachment_notParticipant_returns403() throws Exception {
        when(messageAttachmentService.addAttachment(eq(1L), eq(100L), any(), any(), any(), any()))
                .thenThrow(new SecurityException("Not authorized to add attachments to this message"));

        mockMvc.perform(post("/api/conversations/messages/100/attachments")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of(
                                "filename", "f.txt", "contentType", "text/plain",
                                "sizeBytes", 100, "storageUrl", "https://cdn.example.com/f"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAttachments_returns200() throws Exception {
        when(messageAttachmentService.getAttachments(1L, 100L))
                .thenReturn(List.of(MessageAttachmentDto.builder()
                        .id(50L).messageId(100L).filename("doc.pdf").build()));

        mockMvc.perform(get("/api/conversations/messages/100/attachments")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(50))
                .andExpect(jsonPath("$[0].filename").value("doc.pdf"));
    }

    @Test
    void getAttachments_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/conversations/messages/100/attachments"))
                .andExpect(status().isUnauthorized());
    }

    // ── B-4 Emoji Reaction tests ──

    @Test
    void addReaction_returns201() throws Exception {
        when(messageReactionService.addReaction(eq(1L), eq(100L), eq("\uD83D\uDC4D")))
                .thenReturn(MessageReactionDto.builder()
                        .id(200L).messageId(100L).userId(1L)
                        .emojiCode("\uD83D\uDC4D").build());

        mockMvc.perform(post("/api/conversations/messages/100/reactions")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("emoji", "\uD83D\uDC4D"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(200))
                .andExpect(jsonPath("$.emojiCode").value("\uD83D\uDC4D"));
    }

    @Test
    void addReaction_blankEmoji_returns400() throws Exception {
        mockMvc.perform(post("/api/conversations/messages/100/reactions")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("emoji", "   "))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void addReaction_withoutAuth_returns401() throws Exception {
        mockMvc.perform(post("/api/conversations/messages/100/reactions")
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("emoji", "\uD83D\uDC4D"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void addReaction_notParticipant_returns403() throws Exception {
        when(messageReactionService.addReaction(eq(1L), eq(100L), eq("\uD83D\uDC4D")))
                .thenThrow(new SecurityException("Not authorized to react to this message"));

        mockMvc.perform(post("/api/conversations/messages/100/reactions")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("emoji", "\uD83D\uDC4D"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void addReaction_duplicate_returns409() throws Exception {
        when(messageReactionService.addReaction(eq(1L), eq(100L), eq("\uD83D\uDC4D")))
                .thenThrow(new IllegalStateException("You have already reacted with this emoji"));

        mockMvc.perform(post("/api/conversations/messages/100/reactions")
                        .with(authentication(tenantAuth()))
                        .with(csrf())
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(Map.of("emoji", "\uD83D\uDC4D"))))
                .andExpect(status().isConflict());
    }

    @Test
    void removeReaction_returns204() throws Exception {
        mockMvc.perform(delete("/api/conversations/messages/100/reactions")
                        .param("emoji", "\uD83D\uDC4D")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    void removeReaction_blankEmoji_returns400() throws Exception {
        mockMvc.perform(delete("/api/conversations/messages/100/reactions")
                        .param("emoji", "   ")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void removeReaction_withoutAuth_returns401() throws Exception {
        mockMvc.perform(delete("/api/conversations/messages/100/reactions")
                        .param("emoji", "\uD83D\uDC4D")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void removeReaction_notParticipant_returns403() throws Exception {
        doThrow(new SecurityException("Not authorized"))
                .when(messageReactionService).removeReaction(eq(1L), eq(100L), eq("\uD83D\uDC4D"));

        mockMvc.perform(delete("/api/conversations/messages/100/reactions")
                        .param("emoji", "\uD83D\uDC4D")
                        .with(authentication(tenantAuth()))
                        .with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    void getReactions_returns200() throws Exception {
        when(messageReactionService.getReactions(1L, 100L))
                .thenReturn(List.of(MessageReactionDto.builder()
                        .id(200L).messageId(100L).userId(1L)
                        .emojiCode("\uD83D\uDC4D").build()));

        mockMvc.perform(get("/api/conversations/messages/100/reactions")
                        .with(authentication(tenantAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(200))
                .andExpect(jsonPath("$[0].emojiCode").value("\uD83D\uDC4D"));
    }

    @Test
    void getReactions_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/conversations/messages/100/reactions"))
                .andExpect(status().isUnauthorized());
    }
}
