package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ViewingRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViewingRequestRepository extends JpaRepository<ViewingRequest, Long> {
    List<ViewingRequest> findByTenantId(Long tenantId);

    List<ViewingRequest> findByApartmentId(Long apartmentId);

    Page<ViewingRequest> findByTenantIdAndStatus(Long tenantId, ViewingRequest.ViewingStatus status, Pageable pageable);

    Page<ViewingRequest> findByApartmentIdAndStatus(Long apartmentId, ViewingRequest.ViewingStatus status, Pageable pageable);

    long countByTenantId(Long tenantId);

    long countByTenantIdAndStatus(Long tenantId, ViewingRequest.ViewingStatus status);

    /** Count requests for apartments owned by a specific landlord. */
    @Query("SELECT COUNT(vr) FROM ViewingRequest vr WHERE vr.apartment.owner.id = :ownerId")
    long countByLandlordId(@Param("ownerId") Long ownerId);

    @Query("SELECT COUNT(vr) FROM ViewingRequest vr WHERE vr.apartment.owner.id = :ownerId AND vr.status = :status")
    long countByLandlordIdAndStatus(@Param("ownerId") Long ownerId, @Param("status") ViewingRequest.ViewingStatus status);
}
