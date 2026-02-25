package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("SELECT c FROM Conversation c WHERE " +
            "(c.participant1.id = :userId OR c.participant2.id = :userId) " +
            "ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC")
    Page<Conversation> findByParticipant(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT c FROM Conversation c WHERE " +
            "(c.participant1.id = :userId OR c.participant2.id = :userId) AND " +
            "c.id NOT IN (SELECT ca.conversation.id FROM ConversationArchive ca WHERE ca.user.id = :userId) " +
            "ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC")
    Page<Conversation> findByParticipantExcludingArchived(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT c FROM Conversation c WHERE " +
            "(c.participant1.id = :userId OR c.participant2.id = :userId) AND " +
            "c.id IN (SELECT ca.conversation.id FROM ConversationArchive ca WHERE ca.user.id = :userId) " +
            "ORDER BY COALESCE(c.lastMessageAt, c.createdAt) DESC")
    Page<Conversation> findArchivedByParticipant(@Param("userId") Long userId, Pageable pageable);

    @Query("SELECT c FROM Conversation c WHERE " +
            "c.apartment.id = :apartmentId AND (" +
            "(c.participant1.id = :user1 AND c.participant2.id = :user2) OR " +
            "(c.participant1.id = :user2 AND c.participant2.id = :user1))")
    Optional<Conversation> findByApartmentAndParticipants(
            @Param("apartmentId") Long apartmentId,
            @Param("user1") Long user1,
            @Param("user2") Long user2);

    @Query("SELECT c FROM Conversation c WHERE " +
            "c.apartment IS NULL AND (" +
            "(c.participant1.id = :user1 AND c.participant2.id = :user2) OR " +
            "(c.participant1.id = :user2 AND c.participant2.id = :user1))")
    Optional<Conversation> findDirectConversation(
            @Param("user1") Long user1,
            @Param("user2") Long user2);

    @Query("SELECT COUNT(c) FROM Conversation c WHERE " +
            "c.participant1.id = :userId OR c.participant2.id = :userId")
    long countByParticipant(@Param("userId") Long userId);

    /** FTL-20: find conversations where lastMessageAt is before the given cutoff. */
    @Query("SELECT c FROM Conversation c WHERE c.lastMessageAt IS NOT NULL AND c.lastMessageAt < :cutoff")
    List<Conversation> findStaleConversations(@Param("cutoff") Instant cutoff);
}
