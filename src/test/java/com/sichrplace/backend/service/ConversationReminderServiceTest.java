package com.sichrplace.backend.service;

import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ConversationRepository;
import com.sichrplace.backend.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ConversationReminderService — FTL-20")
class ConversationReminderServiceTest {

    @Mock private ConversationRepository conversationRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private ConversationReminderService reminderService;

    private User alice;
    private User bob;
    private Conversation conversation;

    @BeforeEach
    void setUp() {
        alice = User.builder().id(1L).firstName("Alice").lastName("A").build();
        bob   = User.builder().id(2L).firstName("Bob").lastName("B").build();

        conversation = Conversation.builder()
                .id(100L)
                .participant1(alice)
                .participant2(bob)
                .lastMessageAt(Instant.now().minus(10, ChronoUnit.DAYS))
                .build();
    }

    @Test
    @DisplayName("sendReplyReminders sends notification to non-responding participant")
    void sendReplyReminders_sendsNotification() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        when(conversationRepository.findStaleConversations(any(Instant.class)))
                .thenReturn(List.of(conversation));

        // Alice sent the last message — Bob should be reminded
        Message lastMessage = Message.builder()
                .id(500L)
                .conversation(conversation)
                .sender(alice)
                .content("Hello?")
                .messageType(Message.MessageType.TEXT)
                .build();

        when(messageRepository.findLatestByConversationId(eq(100L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(lastMessage)));

        when(notificationService.createNotification(anyLong(), any(), anyString(), anyString(), any(), anyString()))
                .thenReturn(null);

        reminderService.sendReplyReminders();

        verify(notificationService).createNotification(
                eq(2L),  // Bob (recipient)
                eq(Notification.NotificationType.REPLY_REMINDER),
                eq("Pending Reply"),
                contains("Alice"),
                eq(Notification.NotificationPriority.NORMAL),
                eq("/conversations/100")
        );
    }

    @Test
    @DisplayName("sendReplyReminders skips conversations with no messages")
    void sendReplyReminders_skipsEmptyConversations() {
        when(conversationRepository.findStaleConversations(any(Instant.class)))
                .thenReturn(List.of(conversation));

        when(messageRepository.findLatestByConversationId(eq(100L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        reminderService.sendReplyReminders();

        verify(notificationService, never()).createNotification(
                anyLong(), any(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("sendReplyReminders handles multiple stale conversations")
    void sendReplyReminders_handlesMultiple() {
        Conversation conv2 = Conversation.builder()
                .id(200L)
                .participant1(bob)
                .participant2(alice)
                .lastMessageAt(Instant.now().minus(8, ChronoUnit.DAYS))
                .build();

        when(conversationRepository.findStaleConversations(any(Instant.class)))
                .thenReturn(List.of(conversation, conv2));

        // Conversation 100: Alice sent last → remind Bob
        Message msg1 = Message.builder().id(501L).conversation(conversation)
                .sender(alice).content("Hello").messageType(Message.MessageType.TEXT).build();
        when(messageRepository.findLatestByConversationId(eq(100L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(msg1)));

        // Conversation 200: Bob sent last → remind Alice
        Message msg2 = Message.builder().id(502L).conversation(conv2)
                .sender(bob).content("Hi").messageType(Message.MessageType.TEXT).build();
        when(messageRepository.findLatestByConversationId(eq(200L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(msg2)));

        when(notificationService.createNotification(anyLong(), any(), anyString(), anyString(), any(), anyString()))
                .thenReturn(null);

        reminderService.sendReplyReminders();

        verify(notificationService, times(2)).createNotification(
                anyLong(), eq(Notification.NotificationType.REPLY_REMINDER),
                anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("sendReplyReminders does nothing when no stale conversations")
    void sendReplyReminders_noStaleConversations() {
        when(conversationRepository.findStaleConversations(any(Instant.class)))
                .thenReturn(List.of());

        reminderService.sendReplyReminders();

        verify(notificationService, never()).createNotification(
                anyLong(), any(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("processConversation returns 0 when no messages")
    void processConversation_noMessages_returns0() {
        when(messageRepository.findLatestByConversationId(eq(100L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        int result = reminderService.processConversation(conversation);
        assertEquals(0, result);
    }

    @Test
    @DisplayName("processConversation returns 1 when reminder sent")
    void processConversation_sendsReminder_returns1() {
        Message msg = Message.builder().id(600L).conversation(conversation)
                .sender(alice).content("Reply pls").messageType(Message.MessageType.TEXT).build();
        when(messageRepository.findLatestByConversationId(eq(100L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(msg)));
        when(notificationService.createNotification(anyLong(), any(), anyString(), anyString(), any(), anyString()))
                .thenReturn(null);

        int result = reminderService.processConversation(conversation);
        assertEquals(1, result);

        verify(notificationService).createNotification(
                eq(2L), eq(Notification.NotificationType.REPLY_REMINDER),
                anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("processConversation is resilient to exceptions (fail-soft)")
    void processConversation_exceptionHandled() {
        when(conversationRepository.findStaleConversations(any(Instant.class)))
                .thenReturn(List.of(conversation));
        when(messageRepository.findLatestByConversationId(eq(100L), any(Pageable.class)))
                .thenThrow(new RuntimeException("DB down"));

        // Should not propagate the exception — sendReplyReminders catches it
        assertDoesNotThrow(() -> reminderService.sendReplyReminders());
    }

    @Test
    @DisplayName("processConversation returns 0 when recipient is null")
    void processConversation_nullRecipient_returns0() {
        // Conversation with null participant2
        Conversation nullParticipant = Conversation.builder()
                .id(300L)
                .participant1(alice)
                .participant2(null)
                .lastMessageAt(Instant.now().minus(10, ChronoUnit.DAYS))
                .build();

        // Alice sent last message — otherParticipant(alice.id) would return participant2 = null
        Message msg = Message.builder().id(700L).conversation(nullParticipant)
                .sender(alice).content("Hello").messageType(Message.MessageType.TEXT).build();
        when(messageRepository.findLatestByConversationId(eq(300L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(msg)));

        int result = reminderService.processConversation(nullParticipant);

        assertEquals(0, result);
        verify(notificationService, never()).createNotification(
                anyLong(), any(), anyString(), anyString(), any(), anyString());
    }

    @Test
    @DisplayName("processConversation returns 0 when recipient equals sender (self-message)")
    void processConversation_selfMessage_returns0() {
        // Both participants are the same user (edge case)
        Conversation selfConv = Conversation.builder()
                .id(400L)
                .participant1(alice)
                .participant2(alice) // same user
                .lastMessageAt(Instant.now().minus(10, ChronoUnit.DAYS))
                .build();

        // Alice sent last message — otherParticipant returns participant1 = alice
        // Since alice IS participant2 (which matches senderId), otherParticipant returns participant1
        // But participant1 is also alice, so recipient.getId().equals(lastSenderId) is true
        Message msg = Message.builder().id(800L).conversation(selfConv)
                .sender(alice).content("Note to self").messageType(Message.MessageType.TEXT).build();
        when(messageRepository.findLatestByConversationId(eq(400L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(msg)));

        int result = reminderService.processConversation(selfConv);

        assertEquals(0, result);
        verify(notificationService, never()).createNotification(
                anyLong(), any(), anyString(), anyString(), any(), anyString());
    }
}
