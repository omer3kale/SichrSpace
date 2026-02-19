package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.SavedSearch;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SavedSearchDto {
    private Long id;
    private Long userId;
    private String userName;
    private String name;
    private String filterJson;
    private Boolean isActive;
    private Instant lastMatchedAt;
    private Integer matchCount;
    private Instant createdAt;
    private Instant updatedAt;

    public static SavedSearchDto fromEntity(SavedSearch ss) {
        String userName = ss.getUser().getFirstName() + " " + ss.getUser().getLastName();
        return SavedSearchDto.builder()
                .id(ss.getId())
                .userId(ss.getUser().getId())
                .userName(userName)
                .name(ss.getName())
                .filterJson(ss.getFilterJson())
                .isActive(ss.getIsActive())
                .lastMatchedAt(ss.getLastMatchedAt())
                .matchCount(ss.getMatchCount())
                .createdAt(ss.getCreatedAt())
                .updatedAt(ss.getUpdatedAt())
                .build();
    }
}
