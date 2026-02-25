package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ConversationReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationReportRepository extends JpaRepository<ConversationReport, Long> {

    boolean existsByConversationIdAndReporterId(Long conversationId, Long reporterId);

    Page<ConversationReport> findByStatus(ConversationReport.ReportStatus status, Pageable pageable);

    Page<ConversationReport> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
