package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ViewingRequestDto;
import com.sichrplace.backend.dto.CreateViewingRequestRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ViewingRequestServiceImpl implements ViewingRequestService {

    private final ViewingRequestRepository viewingRequestRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;

    @Override
    public ViewingRequestDto createViewingRequest(Long tenantId, CreateViewingRequestRequest request) {
        User tenant = userRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        Apartment apartment = apartmentRepository.findById(request.getApartmentId())
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        if (apartment.getStatus() != Apartment.ApartmentStatus.AVAILABLE) {
            throw new IllegalStateException("Apartment is not available for viewing");
        }

        if (apartment.getOwner().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Cannot request a viewing for your own apartment");
        }

        ViewingRequest viewingRequest = ViewingRequest.builder()
                .apartment(apartment)
                .tenant(tenant)
                .proposedDateTime(request.getProposedDateTime())
                .message(request.getMessage())
                .status(ViewingRequest.ViewingStatus.PENDING)
                .build();

        viewingRequest = viewingRequestRepository.save(viewingRequest);
        log.info("Viewing request created id={}, tenantId={}, apartmentId={}",
                viewingRequest.getId(), tenantId, request.getApartmentId());
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public ViewingRequestDto getViewingRequestById(Long id, Long userId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        boolean isTenant = viewingRequest.getTenant().getId().equals(userId);
        boolean isOwner = viewingRequest.getApartment().getOwner().getId().equals(userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;

        if (!isTenant && !isOwner && !isAdmin) {
            log.warn("Unauthorized viewing request access userId={}, requestId={}", userId, id);
            throw new SecurityException("Not authorized to view this request");
        }

        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ViewingRequestDto> getViewingRequestsByTenant(Long tenantId) {
        return viewingRequestRepository.findByTenantId(tenantId)
                .stream()
                .map(ViewingRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ViewingRequestDto> getViewingRequestsByTenantPaged(Long tenantId, ViewingRequestStatus status, Pageable pageable) {
        ViewingRequest.ViewingStatus viewingStatus = ViewingRequest.ViewingStatus.valueOf(status.name());
        return viewingRequestRepository.findByTenantIdAndStatus(tenantId, viewingStatus, pageable)
                .map(ViewingRequestDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ViewingRequestDto> getViewingRequestsByApartment(Long apartmentId, Long userId) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;

        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment viewing-requests access userId={}, apartmentId={}", userId, apartmentId);
            throw new SecurityException("Not authorized to view requests for this apartment");
        }

        return viewingRequestRepository.findByApartmentId(apartmentId)
                .stream()
                .map(ViewingRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ViewingRequestDto> getViewingRequestsByApartmentPaged(Long apartmentId, Long userId,
                                                                       ViewingRequestStatus status, Pageable pageable) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;

        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment viewing-requests paged access userId={}, apartmentId={}", userId, apartmentId);
            throw new SecurityException("Not authorized to view requests for this apartment");
        }

        ViewingRequest.ViewingStatus viewingStatus = ViewingRequest.ViewingStatus.valueOf(status.name());
        return viewingRequestRepository.findByApartmentIdAndStatus(apartmentId, viewingStatus, pageable)
                .map(ViewingRequestDto::fromEntity);
    }

    @Override
    public ViewingRequestDto confirmViewingRequest(Long id, Long ownerId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        if (!viewingRequest.getApartment().getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Not authorized to confirm this request");
        }

        if (viewingRequest.getStatus() != ViewingRequest.ViewingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING requests can be confirmed (current: "
                    + viewingRequest.getStatus() + ")");
        }

        viewingRequest.setStatus(ViewingRequest.ViewingStatus.CONFIRMED);
        viewingRequest.setConfirmedDateTime(viewingRequest.getProposedDateTime());
        viewingRequest.setRespondedAt(LocalDateTime.now());

        viewingRequest = viewingRequestRepository.save(viewingRequest);
        log.info("Viewing request confirmed id={}, ownerId={}", id, ownerId);
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    public ViewingRequestDto declineViewingRequest(Long id, Long ownerId, String reason) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        if (!viewingRequest.getApartment().getOwner().getId().equals(ownerId)) {
            throw new SecurityException("Not authorized to decline this request");
        }

        if (viewingRequest.getStatus() != ViewingRequest.ViewingStatus.PENDING) {
            throw new IllegalStateException("Only PENDING requests can be declined (current: "
                    + viewingRequest.getStatus() + ")");
        }

        viewingRequest.setStatus(ViewingRequest.ViewingStatus.DECLINED);
        viewingRequest.setDeclineReason(reason);
        viewingRequest.setRespondedAt(LocalDateTime.now());

        viewingRequest = viewingRequestRepository.save(viewingRequest);
        log.info("Viewing request declined id={}, ownerId={}", id, ownerId);
        return ViewingRequestDto.fromEntity(viewingRequest);
    }

    @Override
    public void cancelViewingRequest(Long id, Long tenantId) {
        ViewingRequest viewingRequest = viewingRequestRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Viewing request not found"));

        if (!viewingRequest.getTenant().getId().equals(tenantId)) {
            throw new SecurityException("Not authorized to cancel this request");
        }

        if (viewingRequest.getStatus() != ViewingRequest.ViewingStatus.PENDING
                && viewingRequest.getStatus() != ViewingRequest.ViewingStatus.CONFIRMED) {
            throw new IllegalStateException("Only PENDING or CONFIRMED requests can be cancelled (current: "
                    + viewingRequest.getStatus() + ")");
        }

        viewingRequest.setStatus(ViewingRequest.ViewingStatus.CANCELLED);
        viewingRequestRepository.save(viewingRequest);
        log.info("Viewing request cancelled id={}, tenantId={}", id, tenantId);
    }
}
