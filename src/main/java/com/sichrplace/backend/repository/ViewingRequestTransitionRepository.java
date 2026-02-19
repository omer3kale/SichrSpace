package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.ViewingRequestTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViewingRequestTransitionRepository extends JpaRepository<ViewingRequestTransition, Long> {

    List<ViewingRequestTransition> findByViewingRequestIdOrderByChangedAtAsc(Long viewingRequestId);

    long countByToStatus(String toStatus);
}
