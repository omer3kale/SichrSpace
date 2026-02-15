package com.sichrplace.repository;

import com.sichrplace.entity.Apartment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, UUID> {

    List<Apartment> findByOwner_Id(UUID ownerId);

    @Query("SELECT a FROM Apartment a WHERE a.status = 'active' " +
           "AND (:city IS NULL OR LOWER(a.city) LIKE LOWER(CONCAT('%', :city, '%'))) " +
           "AND (:minPrice IS NULL OR a.price >= :minPrice) " +
           "AND (:maxPrice IS NULL OR a.price <= :maxPrice) " +
           "AND (:minRooms IS NULL OR a.rooms >= :minRooms) " +
           "AND (:maxRooms IS NULL OR a.rooms <= :maxRooms) " +
           "AND (:minSize IS NULL OR a.sizeSqm >= :minSize) " +
           "AND (:maxSize IS NULL OR a.sizeSqm <= :maxSize)")
    Page<Apartment> searchApartments(
            @Param("city") String city,
            @Param("minPrice") BigDecimal minPrice,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("minRooms") Integer minRooms,
            @Param("maxRooms") Integer maxRooms,
            @Param("minSize") Double minSize,
            @Param("maxSize") Double maxSize,
            Pageable pageable);

    Page<Apartment> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}
