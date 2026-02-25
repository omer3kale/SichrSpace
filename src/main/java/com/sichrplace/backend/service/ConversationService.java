package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConversationDto;
import com.sichrplace.backend.dto.CreateConversationRequest;
import com.sichrplace.backend.dto.MessageDto;
import com.sichrplace.backend.dto.SendMessageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ConversationService {

    ConversationDto createOrGetConversation(Long userId, CreateConversationRequest request);

    Page<ConversationDto> getUserConversations(Long userId, Pageable pageable);

    ConversationDto getConversation(Long userId, Long conversationId);

    Page<MessageDto> getMessages(Long userId, Long conversationId, Pageable pageable);

    MessageDto sendMessage(Long userId, Long conversationId, SendMessageRequest request);

    MessageDto editMessage(Long userId, Long messageId, String newContent);

    void deleteMessage(Long userId, Long messageId);

    int markConversationAsRead(Long userId, Long conversationId);

    long getTotalUnreadCount(Long userId);

    Page<MessageDto> searchMessages(Long userId, String query, Pageable pageable);

    boolean archiveConversation(Long userId, Long conversationId);

    Page<ConversationDto> getArchivedConversations(Long userId, Pageable pageable);
}
