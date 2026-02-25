package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserIdAndRevokedAtIsNull(Long userId);

    /** Revoke all active tokens for a user (logout-all). */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :now WHERE rt.userId = :userId AND rt.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") Long userId, @Param("now") Instant now);

    /** Count active (not revoked, not expired) tokens for a user. */
    @Query("SELECT COUNT(rt) FROM RefreshToken rt WHERE rt.userId = :userId AND rt.revokedAt IS NULL AND rt.expiresAt > :now")
    long countActiveByUserId(@Param("userId") Long userId, @Param("now") Instant now);
}
