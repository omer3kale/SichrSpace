package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.VideoAccessLinkDto;
import com.sichrplace.backend.dto.VideoAccessLogDto;
import com.sichrplace.backend.dto.ViewingVideoDto;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * Service for managing dissolving viewing videos.
 */
public interface ViewingVideoService {

    /**
     * Upload a new viewing video.
     *
     * @param userId           the uploading user's ID
     * @param apartmentId      the apartment the video belongs to
     * @param viewingRequestId optional viewing request to associate
     * @param title            video title
     * @param notes            optional notes
     * @param file             the video file
     * @return the created video DTO
     */
    ViewingVideoDto uploadVideo(Long userId, Long apartmentId, Long viewingRequestId,
                                String title, String notes, MultipartFile file);

    /**
     * Send a dissolving video link to a tenant.
     *
     * @param videoId the video ID
     * @param tenantId the recipient tenant's ID
     * @param senderId the user sending the link (owner)
     * @return the created access link DTO with token
     */
    VideoAccessLinkDto sendVideoToTenant(Long videoId, Long tenantId, Long senderId);

    /**
     * Stream a video by validating the token.
     *
     * @param token     the dissolving link token
     * @param ipHash    hashed IP address
     * @param userAgent request user agent
     * @return the video file resource
     */
    Resource streamVideo(String token, String ipHash, String userAgent);

    /**
     * Record watch time analytics via beacon POST.
     *
     * @param token              the token
     * @param watchDurationSeconds seconds watched in this session
     */
    void recordWatchTime(String token, long watchDurationSeconds);

    /**
     * Get a video by ID (owner access).
     *
     * @param videoId the video ID
     * @param userId  the requesting user's ID
     * @return the video DTO with link info
     */
    ViewingVideoDto getVideoById(Long videoId, Long userId);

    /**
     * List videos for a viewing request.
     *
     * @param viewingRequestId the viewing request ID
     * @param userId           the requesting user's ID
     * @return list of video DTOs
     */
    List<ViewingVideoDto> getVideosByViewingRequest(Long viewingRequestId, Long userId);

    /**
     * List all videos for an apartment (owner only).
     *
     * @param apartmentId the apartment ID
     * @param userId      the requesting user's ID
     * @param pageable    pagination
     * @return paged video DTOs
     */
    Page<ViewingVideoDto> getVideosByApartment(Long apartmentId, Long userId, Pageable pageable);

    /**
     * Soft-delete a video and revoke all access links.
     *
     * @param videoId the video ID
     * @param userId  the requesting user's ID
     */
    void deleteVideo(Long videoId, Long userId);

    /**
     * Revoke a specific access link.
     *
     * @param linkId the link ID
     * @param userId the requesting user's ID
     */
    void revokeLink(Long linkId, Long userId);

    /**
     * Get analytics / access logs for a video.
     *
     * @param videoId the video ID
     * @param userId  the requesting user's ID
     * @return list of access log DTOs
     */
    List<VideoAccessLogDto> getAccessLogs(Long videoId, Long userId);

    /**
     * Cleanup expired links and delete videos where all links have expired.
     * Called by the scheduled cleanup job.
     */
    void cleanupExpiredVideos();
}
