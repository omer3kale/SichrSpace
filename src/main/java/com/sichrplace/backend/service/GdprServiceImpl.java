package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConsentRequest;
import com.sichrplace.backend.dto.GdprExportResponse;
import com.sichrplace.backend.model.GdprConsentLog;
import com.sichrplace.backend.model.GdprExportJob;
import com.sichrplace.backend.repository.GdprConsentLogRepository;
import com.sichrplace.backend.repository.GdprExportJobRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GdprServiceImpl implements GdprService {

    /** How long the export download link remains valid after generation. */
    private static final long EXPORT_LINK_VALIDITY_HOURS = 48;

    private final GdprExportJobRepository exportJobRepository;
    private final GdprConsentLogRepository consentLogRepository;
    private final UserRepository userRepository;

    // -----------------------------------------------------------------------
    // Data export (Art. 20 — Right to Data Portability)
    // -----------------------------------------------------------------------

    @Override
    public GdprExportResponse queueExport(Long userId) {
        log.info("GDPR export requested userId={}", userId);

        GdprExportJob job = new GdprExportJob();
        job.setUserId(userId);
        job.setStatus(GdprExportJob.Status.QUEUED.name());
        // downloadToken and expiresAt are set when the job is processed
        job = exportJobRepository.save(job);

        log.info("GDPR export job created jobId={} userId={}", job.getId(), userId);
        return toResponse(job);
    }

    @Override
    @Transactional(readOnly = true)
    public GdprExportResponse getExportStatus(Long jobId, Long userId) {
        GdprExportJob job = exportJobRepository.findByIdAndUserId(jobId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Export job not found"));
        return toResponse(job);
    }

    @Override
    public void requestDeletion(Long userId) {
        log.info("GDPR deletion requested userId={}", userId);
        userRepository.findById(userId).ifPresent(user -> {
            // Mark the account as inactive immediately; scheduled purge handles actual deletion
            user.setIsActive(false);
            userRepository.save(user);
            log.info("User account deactivated pending deletion userId={}", userId);
        });
    }

    // -----------------------------------------------------------------------
    // Consent management (Art. 7 — Conditions for consent)
    // -----------------------------------------------------------------------

    @Override
    public void logConsent(Long userId, ConsentRequest request, String ipHash, String uaHash) {
        GdprConsentLog entry = new GdprConsentLog();
        entry.setUserId(userId);
        entry.setAnonSessionId(request.getAnonSessionId());
        entry.setConsentType(request.getConsentType().toUpperCase(java.util.Locale.ROOT));
        entry.setGranted(request.isGranted());
        entry.setIpHash(ipHash);
        entry.setUserAgentHash(uaHash);
        consentLogRepository.save(entry);
        log.info("Consent logged userId={} type={} granted={}", userId, entry.getConsentType(), entry.isGranted());
    }

    @Override
    @Transactional(readOnly = true)
    public List<GdprConsentLog> getConsentHistory(Long userId) {
        return consentLogRepository.findByUserIdOrderByRecordedAtDesc(userId);
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    private static GdprExportResponse toResponse(GdprExportJob job) {
        return GdprExportResponse.builder()
                .jobId(job.getId())
                .userId(job.getUserId())
                .status(job.getStatus())
                .downloadToken(job.getDownloadToken())
                .expiresAt(job.getExpiresAt())
                .completedAt(job.getCompletedAt())
                .requestedAt(job.getRequestedAt())
                .build();
    }
}
