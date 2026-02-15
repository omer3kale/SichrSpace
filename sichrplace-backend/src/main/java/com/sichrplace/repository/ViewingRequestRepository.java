package com.sichrplace.repository;

import com.sichrplace.entity.ViewingRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ViewingRequestRepository extends JpaRepository<ViewingRequest, UUID> {
    List<ViewingRequest> findByRequester_IdOrderByCreatedAtDesc(UUID requesterId);
    List<ViewingRequest> findByLandlord_IdOrderByCreatedAtDesc(UUID landlordId);
    List<ViewingRequest> findByApartment_IdOrderByCreatedAtDesc(UUID apartmentId);
}
