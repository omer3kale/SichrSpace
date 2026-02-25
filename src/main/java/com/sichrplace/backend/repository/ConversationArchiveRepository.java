package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ConversationArchive;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConversationArchiveRepository extends JpaRepository<ConversationArchive, Long> {

    boolean existsByConversationIdAndUserId(Long conversationId, Long userId);

    void deleteByConversationIdAndUserId(Long conversationId, Long userId);
}
