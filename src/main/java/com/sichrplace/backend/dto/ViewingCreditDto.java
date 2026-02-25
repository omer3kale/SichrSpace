package com.sichrplace.backend.dto;

import com.sichrplace.backend.model.ViewingCreditPack;
import lombok.*;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingCreditDto {

    private Long packId;
    private int totalCredits;
    private int usedCredits;
    private int creditsRemaining;
    private Instant createdAt;
    private Instant expiresAt;
    private boolean expired;
    private Long purchaseViewingRequestId;

    public static ViewingCreditDto fromEntity(ViewingCreditPack pack) {
        return ViewingCreditDto.builder()
                .packId(pack.getId())
                .totalCredits(pack.getTotalCredits())
                .usedCredits(pack.getUsedCredits())
                .creditsRemaining(pack.getCreditsRemaining())
                .createdAt(pack.getCreatedAt())
                .expiresAt(pack.getExpiresAt())
                .expired(pack.isExpired())
                .purchaseViewingRequestId(
                        pack.getPurchaseViewingRequest() != null
                                ? pack.getPurchaseViewingRequest().getId()
                                : null)
                .build();
    }
}
