package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.VideoAccessLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface VideoAccessLinkRepository extends JpaRepository<VideoAccessLink, Long> {

    List<VideoAccessLink> findByVideoId(Long videoId);

    List<VideoAccessLink> findByVideoIdAndRevokedFalse(Long videoId);

    Optional<VideoAccessLink> findByTokenHash(String tokenHash);

    long countByVideoIdAndRevokedFalseAndExpiresAtAfter(Long videoId, Instant now);

    @Query("SELECT l FROM VideoAccessLink l WHERE l.video.id = :videoId " +
           "AND l.revoked = false AND l.expiresAt > :now")
    List<VideoAccessLink> findActiveLinks(@Param("videoId") Long videoId, @Param("now") Instant now);

    @Query("SELECT COUNT(l) FROM VideoAccessLink l WHERE l.video.id = :videoId " +
           "AND l.revoked = false AND l.expiresAt > :now")
    long countActiveLinks(@Param("videoId") Long videoId, @Param("now") Instant now);

    @Query("SELECT l FROM VideoAccessLink l WHERE l.expiresAt < :now AND l.revoked = false")
    List<VideoAccessLink> findExpiredUnrevokedLinks(@Param("now") Instant now);

    List<VideoAccessLink> findByRecipientId(Long recipientId);
}
