package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.GdprExportJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface GdprExportJobRepository extends JpaRepository<GdprExportJob, Long> {

    List<GdprExportJob> findByUserIdOrderByRequestedAtDesc(Long userId);

    Optional<GdprExportJob> findByDownloadToken(String downloadToken);

    @Query("SELECT j FROM GdprExportJob j WHERE j.userId = :userId AND j.id = :jobId")
    Optional<GdprExportJob> findByIdAndUserId(@Param("jobId") Long jobId, @Param("userId") Long userId);

    /**
     * Mark READY jobs whose link has expired so the gc batch can skip them.
     */
    @Modifying
    @Query("UPDATE GdprExportJob j SET j.status = 'EXPIRED' " +
           "WHERE j.status = 'READY' AND j.expiresAt < :now")
    int expireOldJobs(@Param("now") Instant now);
}
