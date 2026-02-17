package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;

public interface ApartmentService {
    ApartmentDto createApartment(Long ownerId, CreateApartmentRequest request);
    ApartmentDto getApartmentById(Long id);
    Page<ApartmentDto> searchApartments(String city, BigDecimal minPrice, BigDecimal maxPrice,
                                        Integer minBedrooms, Double minSize,
                                        Boolean furnished, Boolean petFriendly, Pageable pageable);
    List<ApartmentDto> getApartmentsByOwner(Long ownerId);
    ApartmentDto updateApartment(Long id, Long ownerId, CreateApartmentRequest request);
    void deleteApartment(Long id, Long ownerId);
}
