package com.sichrplace.backend.repository;

import com.sichrplace.backend.model.Apartment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApartmentRepository extends JpaRepository<Apartment, Long>, JpaSpecificationExecutor<Apartment> {
    List<Apartment> findByOwnerId(Long ownerId);

    Page<Apartment> findByStatus(Apartment.ApartmentStatus status, Pageable pageable);

    @Query("SELECT a FROM Apartment a WHERE a.city = :city AND a.status = 'AVAILABLE'")
    Page<Apartment> findAvailableByCity(@Param("city") String city, Pageable pageable);

    @Query("SELECT a FROM Apartment a WHERE a.status = 'AVAILABLE' ORDER BY a.createdAt DESC")
    Page<Apartment> findAllAvailable(Pageable pageable);
}
