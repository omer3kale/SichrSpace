package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConversationReportDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ConversationReportService {

    ConversationReportDto reportConversation(Long userId, Long conversationId, String reason);

    Page<ConversationReportDto> getReports(String status, Pageable pageable);

    ConversationReportDto updateReportStatus(Long adminUserId, Long reportId, String newStatus);
}
