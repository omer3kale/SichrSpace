package com.sichrplace.repository;

import com.sichrplace.entity.GdprRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GdprRequestRepository extends JpaRepository<GdprRequest, UUID> {
    List<GdprRequest> findByUser_IdOrderByCreatedAtDesc(UUID userId);
}
