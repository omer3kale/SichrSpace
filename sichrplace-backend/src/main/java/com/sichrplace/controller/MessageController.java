package com.sichrplace.controller;

import com.sichrplace.dto.ChatDto;
import com.sichrplace.entity.Conversation;
import com.sichrplace.entity.Message;
import com.sichrplace.entity.User;
import com.sichrplace.repository.ConversationRepository;
import com.sichrplace.repository.MessageRepository;
import com.sichrplace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@Slf4j
public class MessageController {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Get all conversations for the current user
     */
    @GetMapping("/conversations")
    public List<Conversation> getConversations(@AuthenticationPrincipal User user) {
        return conversationRepository.findByParticipant(user.getId());
    }

    /**
     * Get messages for a conversation
     */
    @GetMapping("/conversations/{conversationId}")
    public Page<Message> getMessages(@PathVariable UUID conversationId,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "50") int size) {
        return messageRepository.findByConversation_IdOrderByCreatedAtAsc(conversationId, PageRequest.of(page, size));
    }

    /**
     * Send a message via REST (alternative to WebSocket)
     */
    @PostMapping("/send")
    @Transactional
    public Message sendMessage(@RequestBody Map<String, String> body,
                                @AuthenticationPrincipal User user) {
        UUID conversationId = UUID.fromString(body.get("conversationId"));
        String content = body.get("content");

        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        Message message = Message.builder()
                .conversation(conversation)
                .sender(user)
                .content(content)
                .build();

        message = messageRepository.save(message);

        // Update last message timestamp
        conversation.setLastMessageAt(OffsetDateTime.now());
        conversationRepository.save(conversation);

        // Notify via WebSocket
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId,
                ChatDto.ChatNotification.builder()
                        .id(message.getId().toString())
                        .conversationId(conversationId.toString())
                        .senderId(user.getId().toString())
                        .senderName(user.getFirstName() + " " + user.getLastName())
                        .content(content)
                        .timestamp(message.getCreatedAt().toString())
                        .build()
        );

        return message;
    }

    /**
     * Mark messages as read
     */
    @PostMapping("/conversations/{conversationId}/read")
    @Transactional
    public Map<String, Object> markAsRead(@PathVariable UUID conversationId,
                                           @AuthenticationPrincipal User user) {
        int updated = messageRepository.markAsRead(conversationId, user.getId());
        return Map.of("success", true, "markedRead", updated);
    }

    /**
     * WebSocket: Handle incoming chat messages via STOMP
     */
    @MessageMapping("/chat.send")
    public void handleChatMessage(@Payload ChatDto.ChatMessage chatMessage) {
        UUID conversationId = UUID.fromString(chatMessage.getConversationId());
        UUID senderId = UUID.fromString(chatMessage.getSenderId());

        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        User sender = userRepository.findById(senderId).orElse(null);

        if (conversation == null || sender == null) return;

        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(chatMessage.getContent())
                .build();

        message = messageRepository.save(message);
        conversation.setLastMessageAt(OffsetDateTime.now());
        conversationRepository.save(conversation);

        messagingTemplate.convertAndSend(
                "/topic/conversation/" + conversationId,
                ChatDto.ChatNotification.builder()
                        .id(message.getId().toString())
                        .conversationId(conversationId.toString())
                        .senderId(senderId.toString())
                        .senderName(sender.getFirstName() + " " + sender.getLastName())
                        .content(chatMessage.getContent())
                        .timestamp(message.getCreatedAt().toString())
                        .build()
        );
    }

    /**
     * WebSocket: Handle typing indicators
     */
    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload ChatDto.ChatMessage chatMessage) {
        messagingTemplate.convertAndSend(
                "/topic/conversation/" + chatMessage.getConversationId() + "/typing",
                Map.of("userId", chatMessage.getSenderId(), "typing", true)
        );
    }
}
