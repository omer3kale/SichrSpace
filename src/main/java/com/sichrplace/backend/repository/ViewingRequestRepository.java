package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ViewingRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViewingRequestRepository extends JpaRepository<ViewingRequest, Long> {
    List<ViewingRequest> findByTenantId(Long tenantId);

    List<ViewingRequest> findByApartmentId(Long apartmentId);

    Page<ViewingRequest> findByTenantIdAndStatus(Long tenantId, ViewingRequest.ViewingStatus status, Pageable pageable);

    Page<ViewingRequest> findByApartmentIdAndStatus(Long apartmentId, ViewingRequest.ViewingStatus status, Pageable pageable);
}
