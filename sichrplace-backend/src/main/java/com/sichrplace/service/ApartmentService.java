package com.sichrplace.service;

import com.sichrplace.entity.Apartment;
import com.sichrplace.repository.ApartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;

    public Page<Apartment> search(String city, BigDecimal minPrice, BigDecimal maxPrice,
                                   Integer minRooms, Integer maxRooms,
                                   Double minSize, Double maxSize,
                                   int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return apartmentRepository.searchApartments(city, minPrice, maxPrice, minRooms, maxRooms, minSize, maxSize, pageable);
    }

    public Page<Apartment> listActive(int page, int size) {
        return apartmentRepository.findByStatusOrderByCreatedAtDesc("active", PageRequest.of(page, size));
    }

    public Optional<Apartment> findById(UUID id) {
        return apartmentRepository.findById(id);
    }

    @Transactional
    public Apartment create(Apartment apartment) {
        return apartmentRepository.save(apartment);
    }

    @Transactional
    public Apartment update(Apartment apartment) {
        return apartmentRepository.save(apartment);
    }

    @Transactional
    public void delete(UUID id) {
        apartmentRepository.deleteById(id);
    }
}
