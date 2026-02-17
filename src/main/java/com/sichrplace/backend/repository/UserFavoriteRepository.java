package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.UserFavorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    Page<UserFavorite> findByUserId(Long userId, Pageable pageable);

    Optional<UserFavorite> findByUserIdAndApartmentId(Long userId, Long apartmentId);

    boolean existsByUserIdAndApartmentId(Long userId, Long apartmentId);

    void deleteByUserIdAndApartmentId(Long userId, Long apartmentId);

    long countByUserId(Long userId);

    long countByApartmentId(Long apartmentId);
}
