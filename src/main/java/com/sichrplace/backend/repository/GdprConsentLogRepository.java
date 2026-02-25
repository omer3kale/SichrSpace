package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.GdprConsentLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GdprConsentLogRepository extends JpaRepository<GdprConsentLog, Long> {

    List<GdprConsentLog> findByUserIdOrderByRecordedAtDesc(Long userId);

    List<GdprConsentLog> findByUserIdAndConsentTypeOrderByRecordedAtDesc(Long userId, String consentType);
}
