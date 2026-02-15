package com.sichrplace.repository;

import com.sichrplace.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    List<Favorite> findByUser_Id(UUID userId);
    Optional<Favorite> findByUser_IdAndApartment_Id(UUID userId, UUID apartmentId);
    boolean existsByUser_IdAndApartment_Id(UUID userId, UUID apartmentId);
    void deleteByUser_IdAndApartment_Id(UUID userId, UUID apartmentId);
}
