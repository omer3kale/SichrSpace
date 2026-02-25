package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.MessageAttachmentDto;

import java.util.List;

public interface MessageAttachmentService {

    MessageAttachmentDto addAttachment(Long userId, Long messageId,
                                       String filename, String contentType,
                                       Long sizeBytes, String storageUrl);

    List<MessageAttachmentDto> getAttachments(Long userId, Long messageId);
}
