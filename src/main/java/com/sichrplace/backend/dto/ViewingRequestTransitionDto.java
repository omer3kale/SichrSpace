package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.ViewingRequestTransition;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingRequestTransitionDto {
    private Long id;
    private Long viewingRequestId;
    private String fromStatus;
    private String toStatus;
    private Long changedById;
    private String changedByName;
    private LocalDateTime changedAt;
    private String reason;

    public static ViewingRequestTransitionDto fromEntity(ViewingRequestTransition t) {
        String changedByName = t.getChangedBy().getFirstName() + " " + t.getChangedBy().getLastName();
        return ViewingRequestTransitionDto.builder()
                .id(t.getId())
                .viewingRequestId(t.getViewingRequest().getId())
                .fromStatus(t.getFromStatus())
                .toStatus(t.getToStatus())
                .changedById(t.getChangedBy().getId())
                .changedByName(changedByName)
                .changedAt(t.getChangedAt())
                .reason(t.getReason())
                .build();
    }
}
