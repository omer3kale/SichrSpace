package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConversationDto;
import com.sichrplace.backend.dto.CreateConversationRequest;
import com.sichrplace.backend.dto.MessageDto;
import com.sichrplace.backend.dto.SendMessageRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.ConversationArchive;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.ConversationArchiveRepository;
import com.sichrplace.backend.repository.ConversationRepository;
import com.sichrplace.backend.repository.MessageRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ConversationServiceImpl")
class ConversationServiceTest {

    @Mock private ConversationRepository conversationRepository;
    @Mock private ConversationArchiveRepository conversationArchiveRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private NotificationService notificationService;
    /** Injected so the messagingTemplate != null branch in sendMessage() executes. */
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private ConversationServiceImpl conversationService;

    private User user1;
    private User user2;
    private Conversation conversation;
    private Apartment apartment;

    @BeforeEach
    void setUp() {
        // Mockito won't field-inject after constructor injection — do it explicitly.
        ReflectionTestUtils.setField(conversationService, "messagingTemplate", messagingTemplate);
        user1 = User.builder().id(1L).firstName("Alice").lastName("A").email("a@x.com").build();
        user2 = User.builder().id(2L).firstName("Bob").lastName("B").email("b@x.com").build();

        conversation = Conversation.builder()
                .id(10L)
                .participant1(user1)
                .participant2(user2)
                .createdAt(Instant.now())
                .build();

        apartment = Apartment.builder()
            .id(55L)
            .owner(user2)
            .title("Apt")
            .build();
    }

    @Test
    void createOrGetConversation_createsDirectConversation_whenMissing() {
        CreateConversationRequest req = CreateConversationRequest.builder().participantId(2L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user2));
        when(conversationRepository.findDirectConversation(1L, 2L)).thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(conversation);

        ConversationDto result = conversationService.createOrGetConversation(1L, req);

        assertEquals(10L, result.getId());
        assertEquals(2L, result.getOtherParticipantId());
    }

    @Test
    void createOrGetConversation_returnsExistingDirectConversation() {
        CreateConversationRequest req = CreateConversationRequest.builder().participantId(2L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user2));
        when(conversationRepository.findDirectConversation(1L, 2L)).thenReturn(Optional.of(conversation));

        ConversationDto result = conversationService.createOrGetConversation(1L, req);

        assertEquals(10L, result.getId());
        verify(conversationRepository, never()).save(any(Conversation.class));
    }

    @Test
    void createOrGetConversation_createsApartmentConversation_whenMissing() {
        CreateConversationRequest req = CreateConversationRequest.builder()
                .participantId(2L)
                .apartmentId(55L)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user2));
        when(apartmentRepository.findById(55L)).thenReturn(Optional.of(apartment));
        when(conversationRepository.findByApartmentAndParticipants(55L, 1L, 2L)).thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenAnswer(inv -> {
            Conversation c = inv.getArgument(0);
            c.setId(66L);
            return c;
        });

        ConversationDto result = conversationService.createOrGetConversation(1L, req);

        assertEquals(66L, result.getId());
    }

    @Test
    void createOrGetConversation_userNotFound_throws() {
        CreateConversationRequest req = CreateConversationRequest.builder().participantId(2L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.createOrGetConversation(1L, req));
    }

    @Test
    void createOrGetConversation_participantNotFound_throws() {
        CreateConversationRequest req = CreateConversationRequest.builder().participantId(2L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.createOrGetConversation(1L, req));
    }

    @Test
    void createOrGetConversation_apartmentNotFound_throws() {
        CreateConversationRequest req = CreateConversationRequest.builder().participantId(2L).apartmentId(55L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user2));
        when(apartmentRepository.findById(55L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.createOrGetConversation(1L, req));
    }

    @Test
    void createOrGetConversation_withInitialMessage_sendsNotification() {
        CreateConversationRequest req = CreateConversationRequest.builder()
                .participantId(2L)
                .initialMessage("hello")
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(userRepository.findById(2L)).thenReturn(Optional.of(user2));
        when(conversationRepository.findDirectConversation(1L, 2L)).thenReturn(Optional.of(conversation));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId(77L);
            return m;
        });

        ConversationDto result = conversationService.createOrGetConversation(1L, req);

        assertEquals(10L, result.getId());
        verify(notificationService).createNotification(
                eq(2L), eq(Notification.NotificationType.NEW_MESSAGE), eq("New Message"), anyString(),
                eq(Notification.NotificationPriority.NORMAL), eq("/conversations/10")
        );
    }

    @Test
    void createOrGetConversation_selfConversation_denied() {
        CreateConversationRequest req = CreateConversationRequest.builder().participantId(1L).build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));

        assertThrows(IllegalStateException.class, () -> conversationService.createOrGetConversation(1L, req));
    }

    @Test
    void getConversation_unauthorized_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

        assertThrows(SecurityException.class, () -> conversationService.getConversation(99L, 10L));
    }

    @Test
    void getConversation_notFound_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.getConversation(1L, 10L));
    }

    @Test
    void getConversation_success_setsUnreadCount() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(messageRepository.countUnreadByConversation(10L, 1L)).thenReturn(4L);

        ConversationDto dto = conversationService.getConversation(1L, 10L);

        assertEquals(10L, dto.getId());
        assertEquals(4L, dto.getUnreadCount());
    }

    @Test
    void getUserConversations_setsUnreadCount() {
        Page<Conversation> page = new PageImpl<>(List.of(conversation), PageRequest.of(0, 10), 1);
        when(conversationRepository.findByParticipantExcludingArchived(eq(1L), any())).thenReturn(page);
        when(messageRepository.countUnreadByConversation(10L, 1L)).thenReturn(3L);

        Page<ConversationDto> result = conversationService.getUserConversations(1L, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(3L, result.getContent().get(0).getUnreadCount());
    }

    @Test
    void getUserConversations_emptyPage() {
        when(conversationRepository.findByParticipantExcludingArchived(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        Page<ConversationDto> result = conversationService.getUserConversations(1L, PageRequest.of(0, 10));

        assertTrue(result.getContent().isEmpty());
        verify(messageRepository, never()).countUnreadByConversation(anyLong(), anyLong());
    }

    @Test
    void getMessages_marksAsRead_andReturnsPage() {
        Message msg = Message.builder().id(5L).conversation(conversation).sender(user1).content("x").createdAt(Instant.now()).build();
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(messageRepository.findByConversationId(eq(10L), any())).thenReturn(new PageImpl<>(List.of(msg)));

        Page<MessageDto> result = conversationService.getMessages(1L, 10L, PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        verify(messageRepository).markAsReadByConversation(10L, 1L);
    }

    @Test
    void getMessages_unauthorized_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

        assertThrows(SecurityException.class,
                () -> conversationService.getMessages(99L, 10L, PageRequest.of(0, 20)));
    }

    @Test
    void getMessages_notFound_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> conversationService.getMessages(1L, 10L, PageRequest.of(0, 20)));
    }

    @Test
    void getMessages_emptyPage_returnsEmpty() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(messageRepository.findByConversationId(eq(10L), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        Page<MessageDto> result = conversationService.getMessages(1L, 10L, PageRequest.of(0, 20));

        assertTrue(result.getContent().isEmpty());
        verify(messageRepository).markAsReadByConversation(10L, 1L);
    }

    @Test
    void sendMessage_validToken_setsDefaultTypeWhenNull() {
        SendMessageRequest req = SendMessageRequest.builder().content("hi").messageType(null).build();
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId(9L);
            return m;
        });

        MessageDto dto = conversationService.sendMessage(1L, 10L, req);

        assertEquals("TEXT", dto.getMessageType());
        verify(notificationService).createNotification(eq(2L), eq(Notification.NotificationType.NEW_MESSAGE), eq("New Message"), anyString(), eq(Notification.NotificationPriority.NORMAL), eq("/conversations/10"));
    }

    @Test
    void sendMessage_withExplicitTypeAndFileFields() {
        SendMessageRequest req = SendMessageRequest.builder()
                .content("doc")
                .messageType("FILE")
                .fileName("x.pdf")
                .fileUrl("https://cdn/x.pdf")
                .fileSize(123)
                .build();
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> {
            Message m = inv.getArgument(0);
            m.setId(99L);
            return m;
        });

        MessageDto dto = conversationService.sendMessage(1L, 10L, req);

        assertEquals("FILE", dto.getMessageType());
    }

    @Test
    void sendMessage_conversationNotFound_throws() {
        SendMessageRequest req = SendMessageRequest.builder().content("x").build();
        when(conversationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.sendMessage(1L, 10L, req));
    }

    @Test
    void sendMessage_unauthorized_throws() {
        SendMessageRequest req = SendMessageRequest.builder().content("x").build();
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

        assertThrows(SecurityException.class, () -> conversationService.sendMessage(99L, 10L, req));
    }

    @Test
    void sendMessage_senderNotFound_throws() {
        SendMessageRequest req = SendMessageRequest.builder().content("x").build();
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.sendMessage(1L, 10L, req));
    }

    @Test
    void editMessage_senderMismatch_throws() {
        Message msg = Message.builder().id(9L).conversation(conversation).sender(user2).content("x").createdAt(Instant.now()).isDeleted(false).build();
        when(messageRepository.findById(9L)).thenReturn(Optional.of(msg));

        assertThrows(SecurityException.class, () -> conversationService.editMessage(1L, 9L, "edit"));
    }

    @Test
    void editMessage_deleted_throws() {
        Message msg = Message.builder().id(9L).conversation(conversation).sender(user1).content("x").createdAt(Instant.now()).isDeleted(true).build();
        when(messageRepository.findById(9L)).thenReturn(Optional.of(msg));

        assertThrows(IllegalStateException.class, () -> conversationService.editMessage(1L, 9L, "edit"));
    }

    @Test
    void editMessage_tooOld_throws() {
        Message msg = Message.builder()
                .id(9L)
                .conversation(conversation)
                .sender(user1)
                .content("x")
                .createdAt(Instant.now().minusSeconds(60 * 60 * 25))
                .isDeleted(false)
                .build();
        when(messageRepository.findById(9L)).thenReturn(Optional.of(msg));

        assertThrows(IllegalStateException.class, () -> conversationService.editMessage(1L, 9L, "edit"));
    }

    @Test
    void editMessage_notFound_throws() {
        when(messageRepository.findById(9L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.editMessage(1L, 9L, "edit"));
    }

    @Test
    void editMessage_success_setsEditedAt() {
        Message msg = Message.builder()
                .id(9L)
                .conversation(conversation)
                .sender(user1)
                .content("x")
                .createdAt(Instant.now().minusSeconds(60 * 60))
                .isDeleted(false)
                .build();
        when(messageRepository.findById(9L)).thenReturn(Optional.of(msg));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageDto dto = conversationService.editMessage(1L, 9L, "edited");

        assertEquals("edited", dto.getContent());
        assertNotNull(msg.getEditedAt());
    }

    @Test
    void deleteMessage_marksSoftDelete() {
        Message msg = Message.builder().id(11L).conversation(conversation).sender(user1).content("x").createdAt(Instant.now()).isDeleted(false).build();
        when(messageRepository.findById(11L)).thenReturn(Optional.of(msg));

        conversationService.deleteMessage(1L, 11L);

        assertTrue(msg.getIsDeleted());
        assertNull(msg.getContent());
        verify(messageRepository).save(msg);
    }

    @Test
    void deleteMessage_notFound_throws() {
        when(messageRepository.findById(11L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.deleteMessage(1L, 11L));
    }

    @Test
    void deleteMessage_senderMismatch_throws() {
        Message msg = Message.builder().id(11L).conversation(conversation).sender(user2).content("x").createdAt(Instant.now()).isDeleted(false).build();
        when(messageRepository.findById(11L)).thenReturn(Optional.of(msg));

        assertThrows(SecurityException.class, () -> conversationService.deleteMessage(1L, 11L));
    }

    @Test
    void markConversationAsRead_unauthorized_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        assertThrows(SecurityException.class, () -> conversationService.markConversationAsRead(99L, 10L));
    }

    @Test
    void markConversationAsRead_notFound_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.markConversationAsRead(1L, 10L));
    }

    @Test
    void markConversationAsRead_success_returnsMarkedCount() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(messageRepository.markAsReadByConversation(10L, 1L)).thenReturn(2);

        int marked = conversationService.markConversationAsRead(1L, 10L);

        assertEquals(2, marked);
    }

    @Test
    void getTotalUnreadCount_delegates() {
        when(messageRepository.countTotalUnread(1L)).thenReturn(5L);
        assertEquals(5L, conversationService.getTotalUnreadCount(1L));
    }

    @Test
    void searchMessages_returnsMatchingMessages() {
        Message msg = Message.builder().id(7L).conversation(conversation).sender(user1)
                .content("hello world").createdAt(Instant.now()).build();
        when(messageRepository.searchByUserAndContent(eq(1L), eq("hello"), any()))
                .thenReturn(new PageImpl<>(List.of(msg), PageRequest.of(0, 20), 1));

        Page<MessageDto> result = conversationService.searchMessages(1L, "hello", PageRequest.of(0, 20));

        assertEquals(1, result.getTotalElements());
        assertEquals("hello world", result.getContent().get(0).getContent());
        verify(messageRepository).searchByUserAndContent(1L, "hello", PageRequest.of(0, 20));
    }

    @Test
    void searchMessages_emptyResult() {
        when(messageRepository.searchByUserAndContent(eq(1L), eq("xyz"), any()))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        Page<MessageDto> result = conversationService.searchMessages(1L, "xyz", PageRequest.of(0, 20));

        assertTrue(result.getContent().isEmpty());
    }

    @Test
    void archiveConversation_archives_whenNotYetArchived() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(conversationArchiveRepository.existsByConversationIdAndUserId(10L, 1L)).thenReturn(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
        when(conversationArchiveRepository.save(any(ConversationArchive.class))).thenAnswer(inv -> inv.getArgument(0));

        boolean archived = conversationService.archiveConversation(1L, 10L);

        assertTrue(archived);
        verify(conversationArchiveRepository).save(any(ConversationArchive.class));
        verify(conversationArchiveRepository, never()).deleteByConversationIdAndUserId(anyLong(), anyLong());
    }

    @Test
    void archiveConversation_unarchives_whenAlreadyArchived() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));
        when(conversationArchiveRepository.existsByConversationIdAndUserId(10L, 1L)).thenReturn(true);

        boolean archived = conversationService.archiveConversation(1L, 10L);

        assertFalse(archived);
        verify(conversationArchiveRepository).deleteByConversationIdAndUserId(10L, 1L);
        verify(conversationArchiveRepository, never()).save(any(ConversationArchive.class));
    }

    @Test
    void archiveConversation_notFound_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> conversationService.archiveConversation(1L, 10L));
    }

    @Test
    void archiveConversation_unauthorized_throws() {
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conversation));

        assertThrows(SecurityException.class, () -> conversationService.archiveConversation(99L, 10L));
    }

    @Test
    void getArchivedConversations_returnsArchivedPage() {
        Page<Conversation> page = new PageImpl<>(List.of(conversation), PageRequest.of(0, 10), 1);
        when(conversationRepository.findArchivedByParticipant(eq(1L), any())).thenReturn(page);
        when(messageRepository.countUnreadByConversation(10L, 1L)).thenReturn(1L);

        Page<ConversationDto> result = conversationService.getArchivedConversations(1L, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(1L, result.getContent().get(0).getUnreadCount());
    }

    @Test
    void getUserConversations_usesExcludingArchivedQuery() {
        when(conversationRepository.findByParticipantExcludingArchived(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(conversation), PageRequest.of(0, 10), 1));
        when(messageRepository.countUnreadByConversation(10L, 1L)).thenReturn(0L);

        Page<ConversationDto> result = conversationService.getUserConversations(1L, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        verify(conversationRepository).findByParticipantExcludingArchived(eq(1L), any());
        verify(conversationRepository, never()).findByParticipant(anyLong(), any());
    }
}
