package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ConsentRequest;
import com.sichrplace.backend.dto.GdprExportResponse;
import com.sichrplace.backend.model.GdprConsentLog;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.GdprConsentLogRepository;
import com.sichrplace.backend.repository.GdprExportJobRepository;
import com.sichrplace.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link GdprServiceImpl}.
 *
 * <p>Covers the job-queue pattern (QUEUED state), user-deletion deactivation,
 * consent logging, and consent-history retrieval.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("GdprService")
class GdprServiceTest {

    @Mock private GdprExportJobRepository exportJobRepository;
    @Mock private GdprConsentLogRepository consentLogRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private GdprServiceImpl gdprService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(20L)
                .email("gdpr@example.com")
                .role(User.UserRole.TENANT)
                .isActive(true)
                .build();
    }

    // ── queueExport ──────────────────────────────────────────────────────

    @Test
    @DisplayName("queueExport creates a GdprExportJob with status QUEUED and returns a response")
    void queueExport_createsQueuedJob() {
        when(exportJobRepository.save(any())).thenAnswer(inv -> {
            var job = inv.getArgument(0, com.sichrplace.backend.model.GdprExportJob.class);
            job.setId(1L);
            return job;
        });

        GdprExportResponse result = gdprService.queueExport(20L);

        assertNotNull(result);
        assertEquals(1L, result.getJobId());
        assertEquals("QUEUED", result.getStatus());
        assertEquals(20L, result.getUserId());
    }

    // ── getExportStatus ──────────────────────────────────────────────────

    @Test
    @DisplayName("getExportStatus returns the response for matching jobId + userId")
    void getExportStatus_returnsResponse() {
        var job = new com.sichrplace.backend.model.GdprExportJob();
        job.setId(42L);
        job.setUserId(20L);
        job.setStatus("QUEUED");

        when(exportJobRepository.findByIdAndUserId(42L, 20L)).thenReturn(Optional.of(job));

        // Note: arg order is (jobId, userId) matching the service signature
        GdprExportResponse result = gdprService.getExportStatus(42L, 20L);

        assertNotNull(result);
        assertEquals("QUEUED", result.getStatus());
        assertEquals(42L, result.getJobId());
    }

    @Test
    @DisplayName("getExportStatus throws when job not found or not owned by user")
    void getExportStatus_notFound_throws() {
        when(exportJobRepository.findByIdAndUserId(999L, 20L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class,
                () -> gdprService.getExportStatus(999L, 20L),
                "Should throw when no matching export job exists");
    }

    // ── requestDeletion ──────────────────────────────────────────────────

    @Test
    @DisplayName("requestDeletion deactivates the user account (soft delete / isActive=false)")
    void requestDeletion_deactivatesUser() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        gdprService.requestDeletion(20L);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertFalse(captor.getValue().getIsActive(),
                "User.isActive must be false after GDPR deletion request");
    }

    // ── logConsent ───────────────────────────────────────────────────────

    @Test
    @DisplayName("logConsent persists a GdprConsentLog entry with uppercased type")
    void logConsent_persistsEntry() {
        when(consentLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ConsentRequest req = new ConsentRequest();
        req.setConsentType("marketing");
        req.setGranted(true);

        // ipHash and uaHash are pre-hashed by the controller layer
        gdprService.logConsent(20L, req, "ip-sha256-hash", "ua-sha256-hash");

        ArgumentCaptor<GdprConsentLog> captor = ArgumentCaptor.forClass(GdprConsentLog.class);
        verify(consentLogRepository).save(captor.capture());
        GdprConsentLog saved = captor.getValue();
        assertEquals("MARKETING", saved.getConsentType(), "consentType must be uppercased");
        assertTrue(saved.isGranted());
        assertEquals("ip-sha256-hash", saved.getIpHash());
    }

    // ── getConsentHistory ────────────────────────────────────────────────

    @Test
    @DisplayName("getConsentHistory delegates to repository and returns ordered list")
    void getConsentHistory_returnsList() {
        GdprConsentLog l1 = new GdprConsentLog();
        l1.setUserId(20L);
        l1.setConsentType("MARKETING");
        l1.setGranted(false);
        l1.setRecordedAt(Instant.now());

        when(consentLogRepository.findByUserIdOrderByRecordedAtDesc(20L)).thenReturn(List.of(l1));

        List<GdprConsentLog> history = gdprService.getConsentHistory(20L);

        assertEquals(1, history.size());
        assertEquals("MARKETING", history.get(0).getConsentType());
    }
}
