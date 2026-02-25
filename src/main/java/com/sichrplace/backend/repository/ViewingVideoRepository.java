package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ViewingVideo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ViewingVideoRepository extends JpaRepository<ViewingVideo, Long> {

    List<ViewingVideo> findByViewingRequestIdAndStatus(Long viewingRequestId, ViewingVideo.VideoStatus status);

    Page<ViewingVideo> findByApartmentIdAndStatus(Long apartmentId, ViewingVideo.VideoStatus status, Pageable pageable);

    Page<ViewingVideo> findByStatus(ViewingVideo.VideoStatus status, Pageable pageable);

    Optional<ViewingVideo> findByIdAndStatus(Long id, ViewingVideo.VideoStatus status);

    long countByApartmentId(Long apartmentId);

    long countByUploadedById(Long userId);

    @Query("SELECT v FROM ViewingVideo v WHERE v.status = 'ACTIVE' " +
           "AND NOT EXISTS (SELECT l FROM VideoAccessLink l WHERE l.video = v AND l.revoked = false AND l.expiresAt > CURRENT_TIMESTAMP)")
    List<ViewingVideo> findActiveVideosWithAllLinksExpired();

    @Query("SELECT v FROM ViewingVideo v WHERE v.status = 'ACTIVE' " +
           "AND v.viewingRequest.id = :viewingRequestId")
    List<ViewingVideo> findActiveByViewingRequestId(@Param("viewingRequestId") Long viewingRequestId);
}
