package com.sichrplace.repository;

import com.sichrplace.entity.SecureVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SecureVideoRepository extends JpaRepository<SecureVideo, UUID> {
    List<SecureVideo> findByApartment_IdAndStatus(UUID apartmentId, String status);
}
