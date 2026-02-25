package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.VideoAccessLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VideoAccessLogRepository extends JpaRepository<VideoAccessLog, Long> {

    List<VideoAccessLog> findByLinkId(Long linkId);

    Page<VideoAccessLog> findByLinkId(Long linkId, Pageable pageable);

    List<VideoAccessLog> findByVideoId(Long videoId);

    long countByVideoId(Long videoId);

    long countByLinkId(Long linkId);
}
