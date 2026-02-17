package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConversationDto;
import com.sichrplace.backend.dto.CreateConversationRequest;
import com.sichrplace.backend.dto.MessageDto;
import com.sichrplace.backend.dto.SendMessageRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.ConversationRepository;
import com.sichrplace.backend.repository.MessageRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationServiceImpl implements ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public ConversationDto createOrGetConversation(Long userId, CreateConversationRequest request) {
        User currentUser = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User otherUser = userRepository.findById(request.getParticipantId())
                .orElseThrow(() -> new IllegalArgumentException("Participant not found"));

        if (userId.equals(request.getParticipantId())) {
            throw new IllegalStateException("Cannot create conversation with yourself");
        }

        Apartment apartment = null;
        Optional<Conversation> existing;

        if (request.getApartmentId() != null) {
            apartment = apartmentRepository.findById(request.getApartmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));
            existing = conversationRepository.findByApartmentAndParticipants(
                    request.getApartmentId(), userId, request.getParticipantId());
        } else {
            existing = conversationRepository.findDirectConversation(userId, request.getParticipantId());
        }

        Conversation conversation;
        if (existing.isPresent()) {
            conversation = existing.get();
            log.debug("Returning existing conversation {} between users {} and {}",
                    conversation.getId(), userId, request.getParticipantId());
        } else {
            conversation = new Conversation();
            conversation.setParticipant1(currentUser);
            conversation.setParticipant2(otherUser);
            conversation.setApartment(apartment);
            conversation = conversationRepository.save(conversation);
            log.info("Created conversation {} between users {} and {}",
                    conversation.getId(), userId, request.getParticipantId());
        }

        // Send initial message if provided
        if (request.getInitialMessage() != null && !request.getInitialMessage().isBlank()) {
            Message msg = new Message();
            msg.setConversation(conversation);
            msg.setSender(currentUser);
            msg.setContent(request.getInitialMessage());
            msg.setMessageType(Message.MessageType.TEXT);
            messageRepository.save(msg);

            conversation.setLastMessageAt(Instant.now());
            conversationRepository.save(conversation);

            // Notify the other participant
            notificationService.createNotification(
                    request.getParticipantId(),
                    Notification.NotificationType.NEW_MESSAGE,
                    "New Message",
                    currentUser.getFirstName() + " sent you a message",
                    Notification.NotificationPriority.NORMAL,
                    "/conversations/" + conversation.getId()
            );
        }

        return ConversationDto.fromEntity(conversation, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ConversationDto> getUserConversations(Long userId, Pageable pageable) {
        return conversationRepository.findByParticipant(userId, pageable)
                .map(c -> {
                    ConversationDto dto = ConversationDto.fromEntity(c, userId);
                    dto.setUnreadCount(messageRepository.countUnreadByConversation(c.getId(), userId));
                    return dto;
                });
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationDto getConversation(Long userId, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!conversation.hasParticipant(userId)) {
            throw new SecurityException("Not authorized to access this conversation");
        }

        ConversationDto dto = ConversationDto.fromEntity(conversation, userId);
        dto.setUnreadCount(messageRepository.countUnreadByConversation(conversationId, userId));
        return dto;
    }

    @Override
    @Transactional
    public Page<MessageDto> getMessages(Long userId, Long conversationId, Pageable pageable) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!conversation.hasParticipant(userId)) {
            throw new SecurityException("Not authorized to access this conversation");
        }

        // Mark messages as read when viewing
        messageRepository.markAsReadByConversation(conversationId, userId);

        return messageRepository.findByConversationId(conversationId, pageable)
                .map(MessageDto::fromEntity);
    }

    @Override
    @Transactional
    public MessageDto sendMessage(Long userId, Long conversationId, SendMessageRequest request) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!conversation.hasParticipant(userId)) {
            throw new SecurityException("Not authorized to send messages in this conversation");
        }

        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Message message = new Message();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setContent(request.getContent());
        message.setMessageType(request.getMessageType() != null
                ? Message.MessageType.valueOf(request.getMessageType())
                : Message.MessageType.TEXT);
        message.setFileName(request.getFileName());
        message.setFileUrl(request.getFileUrl());
        message.setFileSize(request.getFileSize());

        Message saved = messageRepository.save(message);

        // Update conversation's last message timestamp
        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);

        // Notify the other participant
        User recipient = conversation.otherParticipant(userId);
        notificationService.createNotification(
                recipient.getId(),
                Notification.NotificationType.NEW_MESSAGE,
                "New Message",
                sender.getFirstName() + " sent you a message",
                Notification.NotificationPriority.NORMAL,
                "/conversations/" + conversationId
        );

        log.info("User {} sent message in conversation {}", userId, conversationId);
        return MessageDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public MessageDto editMessage(Long userId, Long messageId, String newContent) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getSender().getId().equals(userId)) {
            throw new SecurityException("Not authorized to edit this message");
        }

        // 24-hour edit window
        if (message.getCreatedAt().plus(Duration.ofHours(24)).isBefore(Instant.now())) {
            throw new IllegalStateException("Messages can only be edited within 24 hours");
        }

        if (message.getIsDeleted()) {
            throw new IllegalStateException("Cannot edit a deleted message");
        }

        message.setContent(newContent);
        message.setEditedAt(Instant.now());

        Message saved = messageRepository.save(message);
        log.info("User {} edited message {}", userId, messageId);
        return MessageDto.fromEntity(saved);
    }

    @Override
    @Transactional
    public void deleteMessage(Long userId, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getSender().getId().equals(userId)) {
            throw new SecurityException("Not authorized to delete this message");
        }

        // Soft delete
        message.setIsDeleted(true);
        message.setContent(null);
        messageRepository.save(message);
        log.info("User {} soft-deleted message {}", userId, messageId);
    }

    @Override
    @Transactional
    public int markConversationAsRead(Long userId, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!conversation.hasParticipant(userId)) {
            throw new SecurityException("Not authorized to access this conversation");
        }

        return messageRepository.markAsReadByConversation(conversationId, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public long getTotalUnreadCount(Long userId) {
        return messageRepository.countTotalUnread(userId);
    }
}
