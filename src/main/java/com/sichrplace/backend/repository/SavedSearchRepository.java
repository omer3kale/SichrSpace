package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.SavedSearch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {

    List<SavedSearch> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<SavedSearch> findByIsActiveTrue();

    Optional<SavedSearch> findByUserIdAndName(Long userId, String name);

    boolean existsByUserIdAndName(Long userId, String name);

    long countByUserId(Long userId);
}
