package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.Conversation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationDto {
    private Long id;
    private Long apartmentId;
    private String apartmentTitle;
    private Long otherParticipantId;
    private String otherParticipantName;
    private String otherParticipantImageUrl;
    private Instant lastMessageAt;
    private String lastMessagePreview;
    private Long unreadCount;
    private Instant createdAt;

    public static ConversationDto fromEntity(Conversation c, Long currentUserId) {
        var other = c.otherParticipant(currentUserId);
        var builder = ConversationDto.builder()
                .id(c.getId())
                .otherParticipantId(other.getId())
                .otherParticipantName(other.getFirstName() + " " + other.getLastName())
                .otherParticipantImageUrl(other.getProfileImageUrl())
                .lastMessageAt(c.getLastMessageAt())
                .createdAt(c.getCreatedAt());

        if (c.getApartment() != null) {
            builder.apartmentId(c.getApartment().getId())
                    .apartmentTitle(c.getApartment().getTitle());
        }

        return builder.build();
    }
}
