package com.sichrplace.repository;

import com.sichrplace.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    @Query("SELECT c FROM Conversation c WHERE c.participant1.id = :userId OR c.participant2.id = :userId ORDER BY c.lastMessageAt DESC")
    List<Conversation> findByParticipant(@Param("userId") UUID userId);

    @Query("SELECT c FROM Conversation c WHERE c.apartment.id = :apartmentId " +
           "AND ((c.participant1.id = :user1 AND c.participant2.id = :user2) " +
           "OR (c.participant1.id = :user2 AND c.participant2.id = :user1))")
    Optional<Conversation> findExisting(@Param("apartmentId") UUID apartmentId,
                                         @Param("user1") UUID user1,
                                         @Param("user2") UUID user2);
}
