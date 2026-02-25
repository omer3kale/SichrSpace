package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.MessageAttachmentDto;
import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.MessageAttachment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.MessageAttachmentRepository;
import com.sichrplace.backend.repository.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MessageAttachmentServiceImpl")
class MessageAttachmentServiceTest {

    @Mock private MessageAttachmentRepository attachmentRepository;
    @Mock private MessageRepository messageRepository;

    @InjectMocks private MessageAttachmentServiceImpl attachmentService;

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
    }

    @Test
    void addAttachment_success() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        when(attachmentRepository.save(any(MessageAttachment.class))).thenAnswer(inv -> {
            MessageAttachment a = inv.getArgument(0);
            a.setId(50L);
            return a;
        });

        MessageAttachmentDto dto = attachmentService.addAttachment(
                1L, 100L, "photo.jpg", "image/jpeg", 12345L, "https://cdn.example.com/photo.jpg");

        assertEquals(50L, dto.getId());
        assertEquals(100L, dto.getMessageId());
        assertEquals("photo.jpg", dto.getFilename());
        assertEquals("image/jpeg", dto.getContentType());
        assertEquals(12345L, dto.getSizeBytes());
        verify(attachmentRepository).save(any(MessageAttachment.class));
    }

    @Test
    void addAttachment_notParticipant_throwsSecurity() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));

        assertThrows(SecurityException.class,
                () -> attachmentService.addAttachment(
                        999L, 100L, "file.pdf", "application/pdf", 1000L, "https://cdn.example.com/file.pdf"));
    }

    @Test
    void addAttachment_messageNotFound_throwsIllegalArgument() {
        when(messageRepository.findById(100L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> attachmentService.addAttachment(
                        1L, 100L, "file.pdf", "application/pdf", 1000L, "https://cdn.example.com/file.pdf"));
    }

    @Test
    void getAttachments_success() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));
        MessageAttachment a = MessageAttachment.builder()
                .id(50L).message(message).filename("doc.pdf")
                .contentType("application/pdf").sizeBytes(2048L)
                .storageUrl("https://cdn.example.com/doc.pdf").createdAt(Instant.now()).build();
        when(attachmentRepository.findByMessageId(100L)).thenReturn(List.of(a));

        List<MessageAttachmentDto> result = attachmentService.getAttachments(1L, 100L);

        assertEquals(1, result.size());
        assertEquals("doc.pdf", result.get(0).getFilename());
    }

    @Test
    void getAttachments_notParticipant_throwsSecurity() {
        when(messageRepository.findById(100L)).thenReturn(Optional.of(message));

        assertThrows(SecurityException.class,
                () -> attachmentService.getAttachments(999L, 100L));
    }

    @Test
    void getAttachments_messageNotFound_throwsIllegalArgument() {
        when(messageRepository.findById(100L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> attachmentService.getAttachments(1L, 100L));
    }
}
