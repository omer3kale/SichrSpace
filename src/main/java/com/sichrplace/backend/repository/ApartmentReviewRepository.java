package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ApartmentReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ApartmentReviewRepository extends JpaRepository<ApartmentReview, Long> {

    Page<ApartmentReview> findByApartmentIdAndStatus(Long apartmentId,
                                                      ApartmentReview.ReviewStatus status,
                                                      Pageable pageable);

    Page<ApartmentReview> findByReviewerId(Long reviewerId, Pageable pageable);

    Page<ApartmentReview> findByStatus(ApartmentReview.ReviewStatus status, Pageable pageable);

    Optional<ApartmentReview> findByApartmentIdAndReviewerId(Long apartmentId, Long reviewerId);

    boolean existsByApartmentIdAndReviewerId(Long apartmentId, Long reviewerId);

    long countByApartmentIdAndStatus(Long apartmentId, ApartmentReview.ReviewStatus status);

    long countByStatus(ApartmentReview.ReviewStatus status);

    @Query("SELECT AVG(r.rating) FROM ApartmentReview r WHERE r.apartment.id = :apartmentId AND r.status = 'APPROVED'")
    Double findAverageRatingByApartmentId(@Param("apartmentId") Long apartmentId);

    @Query("SELECT AVG(r.landlordRating) FROM ApartmentReview r WHERE r.apartment.id = :apartmentId AND r.status = 'APPROVED' AND r.landlordRating IS NOT NULL")
    Double findAverageLandlordRatingByApartmentId(@Param("apartmentId") Long apartmentId);

    @Query("SELECT AVG(r.locationRating) FROM ApartmentReview r WHERE r.apartment.id = :apartmentId AND r.status = 'APPROVED' AND r.locationRating IS NOT NULL")
    Double findAverageLocationRatingByApartmentId(@Param("apartmentId") Long apartmentId);

    @Query("SELECT AVG(r.valueRating) FROM ApartmentReview r WHERE r.apartment.id = :apartmentId AND r.status = 'APPROVED' AND r.valueRating IS NOT NULL")
    Double findAverageValueRatingByApartmentId(@Param("apartmentId") Long apartmentId);

    @Query("SELECT COUNT(r) FROM ApartmentReview r WHERE r.apartment.id = :apartmentId AND r.status = 'APPROVED' AND r.rating = :rating")
    long countByApartmentIdAndRating(@Param("apartmentId") Long apartmentId, @Param("rating") int rating);
}
