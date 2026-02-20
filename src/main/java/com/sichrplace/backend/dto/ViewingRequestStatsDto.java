package com.sichrplace.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Aggregated viewing-request statistics for a user (landlord or tenant).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViewingRequestStatsDto {

    private long totalRequests;
    private long pendingCount;
    private long confirmedCount;
    private long declinedCount;
    private long completedCount;
    private long cancelledCount;

    /** Average hours between request creation and landlord response (confirm/decline). */
    private Double averageResponseTimeHours;
}
