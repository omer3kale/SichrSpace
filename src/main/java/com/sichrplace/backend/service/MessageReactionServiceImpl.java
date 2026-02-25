package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.MessageReactionDto;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.MessageReaction;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.MessageReactionRepository;
import com.sichrplace.backend.repository.MessageRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageReactionServiceImpl implements MessageReactionService {

    private final MessageReactionRepository reactionRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public MessageReactionDto addReaction(Long userId, Long messageId, String emojiCode) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getConversation().hasParticipant(userId)) {
            throw new SecurityException("Not authorized to react to this message");
        }

        if (reactionRepository.existsByMessageIdAndUserIdAndEmojiCode(messageId, userId, emojiCode)) {
            throw new IllegalStateException("You have already reacted with this emoji");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        MessageReaction reaction = MessageReaction.builder()
                .message(message)
                .user(user)
                .emojiCode(emojiCode)
                .build();

        MessageReaction saved = reactionRepository.save(reaction);
        log.info("User {} reacted with '{}' on message {}", userId, emojiCode, messageId);

        MessageReactionDto dto = MessageReactionDto.fromEntity(saved);

        // Push reaction event to conversation topic
        if (messagingTemplate != null) {
            Long conversationId = message.getConversation().getId();
            messagingTemplate.convertAndSend(
                    "/topic/conversations." + conversationId + ".reactions",
                    Map.of("action", "ADD", "reaction", dto));
            log.debug("WS push reaction ADD conversationId={} messageId={}", conversationId, messageId);
        }

        return dto;
    }

    @Override
    @Transactional
    public void removeReaction(Long userId, Long messageId, String emojiCode) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getConversation().hasParticipant(userId)) {
            throw new SecurityException("Not authorized to modify reactions on this message");
        }

        MessageReaction reaction = reactionRepository
                .findByMessageIdAndUserIdAndEmojiCode(messageId, userId, emojiCode)
                .orElseThrow(() -> new IllegalArgumentException("Reaction not found"));

        reactionRepository.delete(reaction);
        log.info("User {} removed reaction '{}' from message {}", userId, emojiCode, messageId);

        // Push reaction removal event
        if (messagingTemplate != null) {
            Long conversationId = message.getConversation().getId();
            messagingTemplate.convertAndSend(
                    "/topic/conversations." + conversationId + ".reactions",
                    Map.of("action", "REMOVE", "messageId", messageId,
                            "userId", userId, "emojiCode", emojiCode));
            log.debug("WS push reaction REMOVE conversationId={} messageId={}", conversationId, messageId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageReactionDto> getReactions(Long userId, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getConversation().hasParticipant(userId)) {
            throw new SecurityException("Not authorized to view reactions for this message");
        }

        return reactionRepository.findByMessageId(messageId).stream()
                .map(MessageReactionDto::fromEntity)
                .toList();
    }
}
