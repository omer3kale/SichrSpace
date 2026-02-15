package com.sichrplace.repository;

import com.sichrplace.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {
    Page<Review> findByApartment_IdAndStatus(UUID apartmentId, String status, Pageable pageable);
    Page<Review> findByUser_Id(UUID userId, Pageable pageable);
    Page<Review> findByStatus(String status, Pageable pageable);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.apartment.id = :apartmentId AND r.status = 'approved'")
    Double getAverageRating(@Param("apartmentId") UUID apartmentId);
}
