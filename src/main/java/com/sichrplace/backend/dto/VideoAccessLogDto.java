package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.VideoAccessLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VideoAccessLogDto {
    private Long id;
    private Long linkId;
    private Long videoId;
    private String ipAddressHash;
    private String userAgent;
    private Instant accessedAt;
    private Long watchDurationSeconds;

    public static VideoAccessLogDto fromEntity(VideoAccessLog log) {
        return VideoAccessLogDto.builder()
                .id(log.getId())
                .linkId(log.getLink().getId())
                .videoId(log.getVideo().getId())
                .ipAddressHash(log.getIpAddressHash())
                .userAgent(log.getUserAgent())
                .accessedAt(log.getAccessedAt())
                .watchDurationSeconds(log.getWatchDurationSeconds())
                .build();
    }
}
