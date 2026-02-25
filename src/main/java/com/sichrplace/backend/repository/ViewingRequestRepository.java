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

    /** Find all viewing requests for apartments owned by a specific landlord. */
    @Query("SELECT vr FROM ViewingRequest vr WHERE vr.apartment.owner.id = :ownerId ORDER BY vr.createdAt DESC")
    List<ViewingRequest> findByLandlordId(@Param("ownerId") Long ownerId);

    @Query("SELECT COUNT(vr) FROM ViewingRequest vr WHERE vr.apartment.owner.id = :ownerId AND vr.status = :status")
    long countByLandlordIdAndStatus(@Param("ownerId") Long ownerId, @Param("status") ViewingRequest.ViewingStatus status);

    /** Find viewing request linked to a specific payment transaction. */
    java.util.Optional<ViewingRequest> findByPaymentTransactionId(Long paymentTransactionId);

    /** FTL-17: Admin listing with status filter. */
    Page<ViewingRequest> findByStatus(ViewingRequest.ViewingStatus status, Pageable pageable);

    /** FTL-16: Check for existing active (PENDING or CONFIRMED) viewing request for same tenant + apartment. */
    boolean existsByTenantIdAndApartmentIdAndStatusIn(
            Long tenantId, Long apartmentId, java.util.Collection<ViewingRequest.ViewingStatus> statuses);

    /** Check if a tenant has a COMPLETED viewing for a specific apartment (review eligibility). */
    boolean existsByTenantIdAndApartmentIdAndStatus(
            Long tenantId, Long apartmentId, ViewingRequest.ViewingStatus status);

    /** Count paid viewings for a user (viewing credits). */
    long countByTenantIdAndPaymentRequiredTrue(Long tenantId);
}
