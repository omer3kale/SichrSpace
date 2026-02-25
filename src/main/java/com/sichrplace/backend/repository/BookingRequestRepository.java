package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.BookingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRequestRepository extends JpaRepository<BookingRequest, Long> {

    List<BookingRequest> findByTenantId(Long tenantId);

    List<BookingRequest> findByLandlordId(Long landlordId);

    List<BookingRequest> findByApartmentId(Long apartmentId);

    List<BookingRequest> findByApartmentIdAndStatus(Long apartmentId, BookingRequest.BookingStatus status);

    /** Check if a tenant has an ACCEPTED booking for a specific apartment (review eligibility). */
    boolean existsByTenantIdAndApartmentIdAndStatus(
            Long tenantId, Long apartmentId, BookingRequest.BookingStatus status);
}
