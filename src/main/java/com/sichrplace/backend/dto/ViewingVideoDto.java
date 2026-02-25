package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.ViewingVideo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingVideoDto {
    private Long id;
    private Long viewingRequestId;
    private Long apartmentId;
    private String apartmentTitle;
    private String title;
    private String notes;
    private String originalFilename;
    private Long fileSizeBytes;
    private Long durationSeconds;
    private String status;
    private Integer accessCount;
    private Long activeLinkCount;
    private String uploadedByName;
    private Long uploadedById;
    private Instant createdAt;
    private Instant updatedAt;
    private List<VideoAccessLinkDto> links;

    public static ViewingVideoDto fromEntity(ViewingVideo video) {
        String uploaderName = video.getUploadedBy().getFirstName() + " " + video.getUploadedBy().getLastName();
        return ViewingVideoDto.builder()
                .id(video.getId())
                .viewingRequestId(video.getViewingRequest() != null ? video.getViewingRequest().getId() : null)
                .apartmentId(video.getApartment().getId())
                .apartmentTitle(video.getApartment().getTitle())
                .title(video.getTitle())
                .notes(video.getNotes())
                .originalFilename(video.getOriginalFilename())
                .fileSizeBytes(video.getFileSizeBytes())
                .durationSeconds(video.getDurationSeconds())
                .status(video.getStatus().name())
                .accessCount(video.getAccessCount())
                .uploadedByName(uploaderName)
                .uploadedById(video.getUploadedBy().getId())
                .createdAt(video.getCreatedAt())
                .updatedAt(video.getUpdatedAt())
                .build();
    }

    public static ViewingVideoDto fromEntity(ViewingVideo video, long activeLinkCount) {
        ViewingVideoDto dto = fromEntity(video);
        dto.setActiveLinkCount(activeLinkCount);
        return dto;
    }

    public static ViewingVideoDto fromEntity(ViewingVideo video, long activeLinkCount, List<VideoAccessLinkDto> links) {
        ViewingVideoDto dto = fromEntity(video, activeLinkCount);
        dto.setLinks(links);
        return dto;
    }
}
