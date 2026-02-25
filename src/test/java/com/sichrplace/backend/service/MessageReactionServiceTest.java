package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.MessageReactionDto;
import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.MessageReaction;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.MessageReactionRepository;
import com.sichrplace.backend.repository.MessageRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MessageReactionServiceImpl")
class MessageReactionServiceTest {

    @Mock private MessageReactionRepository reactionRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private MessageReactionServiceImpl reactionService;

    private User user1;
    private Conversation conversation;
    private Message message;

    @BeforeEach
    void setUp() {
        user1 = User.builder().id(1L).firstName("John").lastName("Doe").build();
        User user2 = User.builder().id(2L).firstName("Jane").lastName("Smith").build();
        conversation = Conversation.builder().id(10L)
                .participant1(user1).participant2(user2).build();
        message = Message.builder().id(100L).conversation(conversation)
                .sender(user1).content("hello").messageType(Message.MessageType.TEXT)
                .createdAt(Instant.now()).build();

        // Inject the optional messagingTemplate so WS branch executes
        ReflectionTestUtils.setField(reactionService, "messagingTemplate", messagingTemplate);
    }

    @Test
    void addReaction_success() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        when(reactionRepository.existsByMessageIdAndUserIdAndEmojiCode(100L, 1L, "👍")).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(reactionRepository.save(any(MessageReaction.class))).thenAnswer(inv -> {
            MessageReaction r = inv.getArgument(0);
            r.setId(200L);
            return r;
        });

        MessageReactionDto dto = reactionService.addReaction(1L, 100L, "👍");

        assertEquals(200L, dto.getId());
        assertEquals(100L, dto.getMessageId());
        assertEquals("👍", dto.getEmojiCode());
        verify(reactionRepository).save(any(MessageReaction.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations.10.reactions"), anyMap());
    }

    @Test
    void addReaction_duplicate_throwsIllegalState() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        when(reactionRepository.existsByMessageIdAndUserIdAndEmojiCode(100L, 1L, "👍")).thenReturn(true);

        assertThrows(IllegalStateException.class,
                () -> reactionService.addReaction(1L, 100L, "👍"));
    }

    @Test
    void addReaction_notParticipant_throwsSecurity() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));

        assertThrows(SecurityException.class,
                () -> reactionService.addReaction(999L, 100L, "👍"));
    }

    @Test
    void addReaction_messageNotFound_throwsIllegalArgument() {
        when(messageRepository.findById(100L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reactionService.addReaction(1L, 100L, "👍"));
    }

    @Test
    void removeReaction_success() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        MessageReaction reaction = MessageReaction.builder()
                .id(200L).message(message).user(user1).emojiCode("👍")
                .createdAt(Instant.now()).build();
        when(reactionRepository.findByMessageIdAndUserIdAndEmojiCode(100L, 1L, "👍"))
                .thenReturn(Optional.of(reaction));

        reactionService.removeReaction(1L, 100L, "👍");

        verify(reactionRepository).delete(reaction);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations.10.reactions"), anyMap());
    }

    @Test
    void removeReaction_notFound_throwsIllegalArgument() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        when(reactionRepository.findByMessageIdAndUserIdAndEmojiCode(100L, 1L, "👍"))
                .thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reactionService.removeReaction(1L, 100L, "👍"));
    }

    @Test
    void removeReaction_notParticipant_throwsSecurity() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));

        assertThrows(SecurityException.class,
                () -> reactionService.removeReaction(999L, 100L, "👍"));
    }

    @Test
    void getReactions_success() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        MessageReaction r = MessageReaction.builder()
                .id(200L).message(message).user(user1).emojiCode("❤️")
                .createdAt(Instant.now()).build();
        when(reactionRepository.findByMessageId(100L)).thenReturn(List.of(r));

        List<MessageReactionDto> result = reactionService.getReactions(1L, 100L);

        assertEquals(1, result.size());
        assertEquals("❤️", result.get(0).getEmojiCode());
    }

    @Test
    void getReactions_notParticipant_throwsSecurity() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));

        assertThrows(SecurityException.class,
                () -> reactionService.getReactions(999L, 100L));
    }

    @Test
    void addReaction_noWebSocket_stillSucceeds() {
        // Null out messagingTemplate to test no-WS branch
        ReflectionTestUtils.setField(reactionService, "messagingTemplate", null);

        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        when(reactionRepository.existsByMessageIdAndUserIdAndEmojiCode(100L, 1L, "🔥")).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(reactionRepository.save(any(MessageReaction.class))).thenAnswer(inv -> {
            MessageReaction r = inv.getArgument(0);
            r.setId(201L);
            return r;
        });

        MessageReactionDto dto = reactionService.addReaction(1L, 100L, "🔥");

        assertEquals(201L, dto.getId());
        assertEquals("🔥", dto.getEmojiCode());
    }

    @Test
    void removeReaction_noWebSocket_stillSucceeds() {
        // Null out messagingTemplate to test no-WS branch on remove
        ReflectionTestUtils.setField(reactionService, "messagingTemplate", null);

        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        MessageReaction reaction = MessageReaction.builder()
                .id(200L).message(message).user(user1).emojiCode("👍")
                .createdAt(Instant.now()).build();
        when(reactionRepository.findByMessageIdAndUserIdAndEmojiCode(100L, 1L, "👍"))
                .thenReturn(Optional.of(reaction));

        reactionService.removeReaction(1L, 100L, "👍");

        verify(reactionRepository).delete(reaction);
    }

    @Test
    void removeReaction_messageNotFound_throwsIllegalArgument() {
        when(messageRepository.findById(100L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reactionService.removeReaction(1L, 100L, "👍"));
    }

    @Test
    void getReactions_messageNotFound_throwsIllegalArgument() {
        when(messageRepository.findById(100L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> reactionService.getReactions(1L, 100L));
    }
}
