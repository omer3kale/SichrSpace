package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConversationReportDto;
import com.sichrplace.backend.model.Conversation;
import com.sichrplace.backend.model.ConversationReport;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ConversationReportRepository;
import com.sichrplace.backend.repository.ConversationRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConversationReportServiceImpl implements ConversationReportService {

    private final ConversationReportRepository reportRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public ConversationReportDto reportConversation(Long userId, Long conversationId, String reason) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Conversation not found"));

        if (!conversation.hasParticipant(userId)) {
            throw new SecurityException("Not authorized to report this conversation");
        }

        if (reportRepository.existsByConversationIdAndReporterId(conversationId, userId)) {
            throw new IllegalStateException("You have already reported this conversation");
        }

        User reporter = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ConversationReport report = ConversationReport.builder()
                .conversation(conversation)
                .reporter(reporter)
                .reason(reason)
                .build();

        ConversationReport saved = reportRepository.save(report);
        log.info("User {} reported conversation {}", userId, conversationId);
        return ConversationReportDto.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ConversationReportDto> getReports(String status, Pageable pageable) {
        if (status != null && !status.isBlank()) {
            ConversationReport.ReportStatus reportStatus =
                    ConversationReport.ReportStatus.valueOf(status.toUpperCase(java.util.Locale.ROOT));
            return reportRepository.findByStatus(reportStatus, pageable)
                    .map(ConversationReportDto::fromEntity);
        }
        return reportRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(ConversationReportDto::fromEntity);
    }

    @Override
    @Transactional
    public ConversationReportDto updateReportStatus(Long adminUserId, Long reportId, String newStatus) {
        ConversationReport report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found"));

        ConversationReport.ReportStatus status =
                ConversationReport.ReportStatus.valueOf(newStatus.toUpperCase(java.util.Locale.ROOT));

        User admin = userRepository.findById(adminUserId)
                .orElseThrow(() -> new IllegalArgumentException("Admin user not found"));

        report.setStatus(status);
        report.setResolvedAt(Instant.now());
        report.setResolvedBy(admin);

        ConversationReport saved = reportRepository.save(report);
        log.info("Admin {} updated report {} to status {}", adminUserId, reportId, status);
        return ConversationReportDto.fromEntity(saved);
    }
}
