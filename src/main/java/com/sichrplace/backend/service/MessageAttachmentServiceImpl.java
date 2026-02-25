package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.MessageAttachmentDto;
import com.sichrplace.backend.model.Message;
import com.sichrplace.backend.model.MessageAttachment;
import com.sichrplace.backend.repository.MessageAttachmentRepository;
import com.sichrplace.backend.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MessageAttachmentServiceImpl implements MessageAttachmentService {

    private final MessageAttachmentRepository attachmentRepository;
    private final MessageRepository messageRepository;

    @Override
    @Transactional
    public MessageAttachmentDto addAttachment(Long userId, Long messageId,
                                              String filename, String contentType,
                                              Long sizeBytes, String storageUrl) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getConversation().hasParticipant(userId)) {
            throw new SecurityException("Not authorized to add attachments to this message");
        }

        MessageAttachment attachment = MessageAttachment.builder()
                .message(message)
                .filename(filename)
                .contentType(contentType)
                .sizeBytes(sizeBytes)
                .storageUrl(storageUrl)
                .build();

        MessageAttachment saved = attachmentRepository.save(attachment);
        log.info("User {} added attachment '{}' to message {}", userId, filename, messageId);
        return MessageAttachmentDto.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MessageAttachmentDto> getAttachments(Long userId, Long messageId) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found"));

        if (!message.getConversation().hasParticipant(userId)) {
            throw new SecurityException("Not authorized to view attachments for this message");
        }

        return attachmentRepository.findByMessageId(messageId).stream()
                .map(MessageAttachmentDto::fromEntity)
                .toList();
    }
}
