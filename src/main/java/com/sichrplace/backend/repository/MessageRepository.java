package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId " +
            "ORDER BY m.createdAt ASC")
    Page<Message> findByConversationId(@Param("conversationId") Long conversationId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE " +
            "m.conversation.id = :conversationId AND " +
            "m.sender.id != :userId AND m.readByRecipient = false AND m.isDeleted = false")
    long countUnreadByConversation(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE " +
            "m.conversation.id IN (SELECT c.id FROM Conversation c WHERE " +
            "c.participant1.id = :userId OR c.participant2.id = :userId) AND " +
            "m.sender.id != :userId AND m.readByRecipient = false AND m.isDeleted = false")
    long countTotalUnread(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Message m SET m.readByRecipient = true WHERE " +
            "m.conversation.id = :conversationId AND " +
            "m.sender.id != :userId AND m.readByRecipient = false")
    int markAsReadByConversation(
            @Param("conversationId") Long conversationId,
            @Param("userId") Long userId);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :conversationId")
    long countByConversationId(@Param("conversationId") Long conversationId);

    @Query("SELECT m FROM Message m WHERE " +
            "m.conversation.id IN (SELECT c.id FROM Conversation c WHERE " +
            "c.participant1.id = :userId OR c.participant2.id = :userId) AND " +
            "m.isDeleted = false AND " +
            "LOWER(m.content) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "ORDER BY m.createdAt DESC")
    Page<Message> searchByUserAndContent(
            @Param("userId") Long userId,
            @Param("query") String query,
            Pageable pageable);

    /** FTL-20: find the most recent non-deleted message in a conversation. */
    @Query("SELECT m FROM Message m WHERE m.conversation.id = :conversationId AND m.isDeleted = false " +
            "ORDER BY m.createdAt DESC")
    Page<Message> findLatestByConversationId(@Param("conversationId") Long conversationId, Pageable pageable);
}
