package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ViewingRequestService {
    ViewingRequestDto createViewingRequest(Long tenantId, CreateViewingRequestRequest request);
    ViewingRequestDto getViewingRequestById(Long id, Long userId);
    List<ViewingRequestDto> getViewingRequestsByTenant(Long tenantId);
    Page<ViewingRequestDto> getViewingRequestsByTenantPaged(Long tenantId, ViewingRequestStatus status, Pageable pageable);
    List<ViewingRequestDto> getViewingRequestsByApartment(Long apartmentId, Long userId);
    Page<ViewingRequestDto> getViewingRequestsByApartmentPaged(Long apartmentId, Long userId, ViewingRequestStatus status, Pageable pageable);
    ViewingRequestDto confirmViewingRequest(Long id, Long ownerId);
    ViewingRequestDto declineViewingRequest(Long id, Long ownerId, String reason);
    void cancelViewingRequest(Long id, Long tenantId);

    enum ViewingRequestStatus {
        PENDING, CONFIRMED, DECLINED, COMPLETED, CANCELLED
    }
}
