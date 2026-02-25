package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ViewingCreditPack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ViewingCreditPackRepository extends JpaRepository<ViewingCreditPack, Long> {

    /** Find the most recent active (non-expired, credits remaining) pack for a user. */
    @Query("SELECT p FROM ViewingCreditPack p " +
           "WHERE p.user.id = :userId " +
           "AND p.usedCredits < p.totalCredits " +
           "AND (p.expiresAt IS NULL OR p.expiresAt > :now) " +
           "ORDER BY p.createdAt DESC")
    List<ViewingCreditPack> findActivePacksByUserId(
            @Param("userId") Long userId,
            @Param("now") Instant now);

    /** Find all packs for a user (for history). */
    List<ViewingCreditPack> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Check if a pack was already created for a specific viewing request (idempotency). */
    Optional<ViewingCreditPack> findByPurchaseViewingRequestId(Long purchaseViewingRequestId);

    /** Count total credits used by a user. */
    @Query("SELECT COALESCE(SUM(p.usedCredits), 0) FROM ViewingCreditPack p WHERE p.user.id = :userId")
    long countTotalCreditsUsedByUserId(@Param("userId") Long userId);
}
