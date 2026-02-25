package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.VideoAccessLinkDto;
import com.sichrplace.backend.dto.VideoAccessLogDto;
import com.sichrplace.backend.dto.ViewingVideoDto;
import com.sichrplace.backend.model.*;
import com.sichrplace.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ViewingVideoServiceImpl implements ViewingVideoService {

    private final ViewingVideoRepository viewingVideoRepository;
    private final VideoAccessLinkRepository videoAccessLinkRepository;
    private final VideoAccessLogRepository videoAccessLogRepository;
    private final UserRepository userRepository;
    private final ApartmentRepository apartmentRepository;
    private final ViewingRequestRepository viewingRequestRepository;
    private final FileStorageService fileStorageService;
    private final VideoTokenService videoTokenService;
    private final EmailService emailService;
    private final NotificationService notificationService;

    @Value("${app.video.link-validity-hours:48}")
    private long linkValidityHours;

    @Value("${app.video.allowed-types:video/mp4,video/webm,video/quicktime}")
    private String allowedTypes;

    // ─── Upload ───────────────────────────────────────────────────────────────────

    @Override
    public ViewingVideoDto uploadVideo(Long userId, Long apartmentId, Long viewingRequestId,
                                       String title, String notes, MultipartFile file) {
        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        // Only apartment owner can upload
        if (!apartment.getOwner().getId().equals(userId)) {
            throw new SecurityException("Only the apartment owner can upload viewing videos");
        }

        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !List.of(allowedTypes.split(",")).contains(contentType)) {
            throw new IllegalArgumentException("Unsupported video file type: " + contentType);
        }

        // Store file
        String storagePath = fileStorageService.store(file, "apartment-" + apartmentId);

        // Build entity
        ViewingVideo video = ViewingVideo.builder()
                .apartment(apartment)
                .uploadedBy(uploader)
                .storagePath(storagePath)
                .originalFilename(file.getOriginalFilename())
                .contentType(contentType)
                .fileSizeBytes(file.getSize())
                .title(title)
                .notes(notes)
                .status(ViewingVideo.VideoStatus.ACTIVE)
                .build();

        // Optionally associate with a viewing request
        if (viewingRequestId != null) {
            ViewingRequest viewingRequest = viewingRequestRepository.findById(viewingRequestId)
                    .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));
            video.setViewingRequest(viewingRequest);
        }

        video = viewingVideoRepository.save(video);
        log.info("Video uploaded: id={}, apartment={}, file={}", video.getId(), apartmentId, file.getOriginalFilename());

        return ViewingVideoDto.fromEntity(video, 0L);
    }

    // ─── Send to Tenant ───────────────────────────────────────────────────────────

    @Override
    public VideoAccessLinkDto sendVideoToTenant(Long videoId, Long tenantId, Long senderId) {
        ViewingVideo video = findActiveVideo(videoId);
        verifyOwnership(video, senderId);

        User tenant = userRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        Instant expiresAt = Instant.now().plus(linkValidityHours, ChronoUnit.HOURS);

        // Generate token and hash
        // We save the link first to get its ID, then generate token and update hash
        VideoAccessLink link = VideoAccessLink.builder()
                .video(video)
                .recipient(tenant)
                .recipientEmail(tenant.getEmail())
                .tokenHash("pending") // placeholder
                .expiresAt(expiresAt)
                .build();
        link = videoAccessLinkRepository.save(link);

        String token = videoTokenService.generateToken(videoId, link.getId(), expiresAt.getEpochSecond());
        String tokenHash = videoTokenService.hashToken(token);
        link.setTokenHash(tokenHash);
        link = videoAccessLinkRepository.save(link);

        // Send email with the link
        String subject = "Viewing video: " + video.getTitle();
        String body = String.format(
                "You have received a viewing video for %s.\n\n" +
                "Click the link below to watch (valid for %d hours):\n\n" +
                "Token: %s\n\n" +
                "This link will expire automatically and the video cannot be downloaded.",
                video.getApartment().getTitle(),
                linkValidityHours,
                token
        );
        emailService.sendEmail(tenant.getEmail(), subject, body);

        // Create notification
        notificationService.createNotification(
                tenantId,
                Notification.NotificationType.VIDEO_SHARED,
                "New viewing video",
                "A viewing video for " + video.getApartment().getTitle() + " has been shared with you.",
                Notification.NotificationPriority.NORMAL,
                "/videos/watch?token=" + token
        );

        log.info("Video {} sent to tenant {} (link {})", videoId, tenantId, link.getId());

        return VideoAccessLinkDto.fromEntity(link);
    }

    // ─── Stream ───────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public Resource streamVideo(String token, String ipHash, String userAgent) {
        VideoTokenService.DecodedVideoToken decoded = videoTokenService.validateAndDecode(token);

        String tokenHash = videoTokenService.hashToken(token);
        VideoAccessLink link = videoAccessLinkRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Access link not found"));

        if (!link.isActive()) {
            throw new IllegalStateException("This video link has been revoked or expired");
        }

        ViewingVideo video = link.getVideo();
        if (video.getStatus() != ViewingVideo.VideoStatus.ACTIVE) {
            throw new IllegalStateException("Video is no longer available");
        }

        // Record access
        link.recordView(0);
        videoAccessLinkRepository.save(link);

        video.incrementAccessCount();
        viewingVideoRepository.save(video);

        // Log access
        VideoAccessLog accessLog = VideoAccessLog.builder()
                .link(link)
                .video(video)
                .ipAddressHash(ipHash)
                .userAgent(userAgent)
                .accessedAt(Instant.now())
                .build();
        videoAccessLogRepository.save(accessLog);

        log.info("Video streamed: video={}, link={}", video.getId(), link.getId());

        return fileStorageService.load(video.getStoragePath());
    }

    // ─── Watch Time ───────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void recordWatchTime(String token, long watchDurationSeconds) {
        VideoTokenService.DecodedVideoToken decoded = videoTokenService.validateAndDecode(token);

        String tokenHash = videoTokenService.hashToken(token);
        VideoAccessLink link = videoAccessLinkRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Access link not found"));

        if (!link.isActive()) {
            return; // silently ignore analytics for expired links
        }

        link.recordView(watchDurationSeconds);
        videoAccessLinkRepository.save(link);

        log.debug("Watch time recorded: link={}, duration={}s", link.getId(), watchDurationSeconds);
    }

    // ─── Get by ID ────────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ViewingVideoDto getVideoById(Long videoId, Long userId) {
        ViewingVideo video = findActiveVideo(videoId);
        verifyOwnership(video, userId);

        long activeLinkCount = videoAccessLinkRepository.countActiveLinks(videoId, Instant.now());
        List<VideoAccessLinkDto> links = videoAccessLinkRepository.findByVideoId(videoId)
                .stream()
                .map(VideoAccessLinkDto::fromEntity)
                .collect(Collectors.toList());

        return ViewingVideoDto.fromEntity(video, activeLinkCount, links);
    }

    // ─── List by Viewing Request ──────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<ViewingVideoDto> getVideosByViewingRequest(Long viewingRequestId, Long userId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(viewingRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        // Allow access for both tenant and apartment owner
        boolean isTenant = viewingRequest.getTenant().getId().equals(userId);
        boolean isOwner = viewingRequest.getApartment().getOwner().getId().equals(userId);
        if (!isTenant && !isOwner) {
            throw new SecurityException("Not authorized to view these videos");
        }

        return viewingVideoRepository.findActiveByViewingRequestId(viewingRequestId)
                .stream()
                .map(v -> {
                    long count = videoAccessLinkRepository.countActiveLinks(v.getId(), Instant.now());
                    return ViewingVideoDto.fromEntity(v, count);
                })
                .collect(Collectors.toList());
    }

    // ─── List by Apartment ────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public Page<ViewingVideoDto> getVideosByApartment(Long apartmentId, Long userId, Pageable pageable) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        if (!apartment.getOwner().getId().equals(userId)) {
            throw new SecurityException("Only the apartment owner can view all videos for this apartment");
        }

        return viewingVideoRepository.findByApartmentIdAndStatus(apartmentId, ViewingVideo.VideoStatus.ACTIVE, pageable)
                .map(v -> {
                    long count = videoAccessLinkRepository.countActiveLinks(v.getId(), Instant.now());
                    return ViewingVideoDto.fromEntity(v, count);
                });
    }

    // ─── Delete ───────────────────────────────────────────────────────────────────

    @Override
    public void deleteVideo(Long videoId, Long userId) {
        ViewingVideo video = findActiveVideo(videoId);
        verifyOwnership(video, userId);

        // Soft delete
        video.setStatus(ViewingVideo.VideoStatus.DELETED);
        video.setDeletedAt(Instant.now());
        viewingVideoRepository.save(video);

        // Revoke all active links
        List<VideoAccessLink> activeLinks = videoAccessLinkRepository.findActiveLinks(videoId, Instant.now());
        for (VideoAccessLink link : activeLinks) {
            link.setRevoked(true);
            videoAccessLinkRepository.save(link);
        }

        // Delete file from storage
        fileStorageService.delete(video.getStoragePath());

        log.info("Video deleted: id={}", videoId);
    }

    // ─── Revoke Link ──────────────────────────────────────────────────────────────

    @Override
    public void revokeLink(Long linkId, Long userId) {
        VideoAccessLink link = videoAccessLinkRepository.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Access link not found"));

        verifyOwnership(link.getVideo(), userId);

        link.setRevoked(true);
        videoAccessLinkRepository.save(link);

        log.info("Access link revoked: linkId={}", linkId);
    }

    // ─── Access Logs ──────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<VideoAccessLogDto> getAccessLogs(Long videoId, Long userId) {
        ViewingVideo video = findActiveVideo(videoId);
        verifyOwnership(video, userId);

        return videoAccessLogRepository.findByVideoId(videoId)
                .stream()
                .map(VideoAccessLogDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────────

    @Override
    public void cleanupExpiredVideos() {
        // 1. Revoke expired but unrevoked links
        List<VideoAccessLink> expiredLinks = videoAccessLinkRepository.findExpiredUnrevokedLinks(Instant.now());
        for (VideoAccessLink link : expiredLinks) {
            link.setRevoked(true);
            videoAccessLinkRepository.save(link);
        }
        if (!expiredLinks.isEmpty()) {
            log.info("Revoked {} expired access links", expiredLinks.size());
        }

        // 2. Soft-delete videos where ALL links have expired
        List<ViewingVideo> orphanedVideos = viewingVideoRepository.findActiveVideosWithAllLinksExpired();
        for (ViewingVideo video : orphanedVideos) {
            video.setStatus(ViewingVideo.VideoStatus.DELETED);
            video.setDeletedAt(Instant.now());
            viewingVideoRepository.save(video);

            // Delete the file
            fileStorageService.delete(video.getStoragePath());
            log.info("Cleaned up expired video: id={}", video.getId());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────────

    private ViewingVideo findActiveVideo(Long videoId) {
        return viewingVideoRepository.findByIdAndStatus(videoId, ViewingVideo.VideoStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Video not found"));
    }

    private void verifyOwnership(ViewingVideo video, Long userId) {
        if (!video.getUploadedBy().getId().equals(userId)) {
            throw new SecurityException("Not authorized to manage this video");
        }
    }
}
