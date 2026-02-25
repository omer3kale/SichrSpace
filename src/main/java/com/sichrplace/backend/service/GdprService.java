package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConsentRequest;
import com.sichrplace.backend.dto.GdprExportResponse;
import com.sichrplace.backend.model.GdprConsentLog;
import com.sichrplace.backend.model.GdprExportJob;

import java.util.List;

/**
 * Backend skeleton for GDPR "right to data portability" and "right to erasure".
 * Full async export generation is wired up in the background-jobs sprint.
 */
public interface GdprService {

    /**
     * Queue a data-export job for the authenticated user (Art. 20).
     *
     * @param userId the requesting user
     * @return the created job response (status: QUEUED)
     */
    GdprExportResponse queueExport(Long userId);

    /**
     * Fetch the status of a previously queued export job.
     *
     * @param jobId  the job's id
     * @param userId must match the job's owner
     * @return current job state
     */
    GdprExportResponse getExportStatus(Long jobId, Long userId);

    /**
     * Mark the user's account and all related data for deletion (Art. 17).
     * Actual deletion is deferred to a scheduled job.
     *
     * @param userId the requesting user
     */
    void requestDeletion(Long userId);

    /**
     * Record a consent decision (Art. 7).
     *
     * @param userId      null for anonymous / pre-registration flows
     * @param request     consent payload
     * @param ipHash      SHA-256 of client IP
     * @param uaHash      SHA-256 of User-Agent
     */
    void logConsent(Long userId, ConsentRequest request, String ipHash, String uaHash);

    /**
     * Return the full consent history for the user (most recent first).
     */
    List<GdprConsentLog> getConsentHistory(Long userId);
}
