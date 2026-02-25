package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.VideoAccessLink;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoAccessLinkDto {
    private Long id;
    private Long videoId;
    private String recipientEmail;
    private String recipientName;
    private Instant createdAt;
    private Instant expiresAt;
    private boolean revoked;
    private boolean expired;
    private Integer viewCount;
    private Instant firstViewedAt;
    private Instant lastViewedAt;
    private Long totalWatchTimeSeconds;

    public static VideoAccessLinkDto fromEntity(VideoAccessLink link) {
        String recipientName = link.getRecipient().getFirstName() + " " + link.getRecipient().getLastName();
        return VideoAccessLinkDto.builder()
                .id(link.getId())
                .videoId(link.getVideo().getId())
                .recipientEmail(link.getRecipientEmail())
                .recipientName(recipientName)
                .createdAt(link.getCreatedAt())
                .expiresAt(link.getExpiresAt())
                .revoked(link.isRevoked())
                .expired(link.isExpired())
                .viewCount(link.getViewCount())
                .firstViewedAt(link.getFirstViewedAt())
                .lastViewedAt(link.getLastViewedAt())
                .totalWatchTimeSeconds(link.getTotalWatchTimeSeconds())
                .build();
    }
}
