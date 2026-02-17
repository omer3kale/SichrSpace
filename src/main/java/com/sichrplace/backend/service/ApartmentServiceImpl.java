package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.ApartmentDto;
import com.sichrplace.backend.dto.CreateApartmentRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ApartmentServiceImpl implements ApartmentService {

    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;

    @Override
    public ApartmentDto createApartment(Long ownerId, CreateApartmentRequest request) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Owner not found"));

        if (owner.getRole() != User.UserRole.LANDLORD && owner.getRole() != User.UserRole.ADMIN) {
            throw new SecurityException("Only landlords can create apartment listings");
        }

        Apartment apartment = Apartment.builder()
                .owner(owner)
                .title(request.getTitle())
                .description(request.getDescription())
                .city(request.getCity())
                .district(request.getDistrict())
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .monthlyRent(request.getMonthlyRent())
                .depositAmount(request.getDepositAmount())
                .sizeSquareMeters(request.getSizeSquareMeters())
                .numberOfBedrooms(request.getNumberOfBedrooms())
                .numberOfBathrooms(request.getNumberOfBathrooms())
                .furnished(request.getFurnished())
                .petFriendly(request.getPetFriendly())
                .hasParking(request.getHasParking())
                .hasElevator(request.getHasElevator())
                .hasBalcony(request.getHasBalcony())
                .amenities(request.getAmenities())
                .availableFrom(request.getAvailableFrom())
                .status(Apartment.ApartmentStatus.AVAILABLE)
                .numberOfViews(0L)
                .build();

        apartment = apartmentRepository.save(apartment);
        log.info("Apartment created id={}, ownerId={}, city={}", apartment.getId(), ownerId, request.getCity());
        return ApartmentDto.fromEntity(apartment);
    }

    @Override
    public ApartmentDto getApartmentById(Long id) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));
        apartment.setNumberOfViews(apartment.getNumberOfViews() == null ? 1L : apartment.getNumberOfViews() + 1);
        apartmentRepository.save(apartment);
        return ApartmentDto.fromEntity(apartment);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ApartmentDto> searchApartments(String city, BigDecimal minPrice, BigDecimal maxPrice,
                                                Integer minBedrooms, Double minSize,
                                                Boolean furnished, Boolean petFriendly, Pageable pageable) {
        Specification<Apartment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), Apartment.ApartmentStatus.AVAILABLE));

            if (city != null && !city.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("city")), city.toLowerCase()));
            }
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("monthlyRent"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("monthlyRent"), maxPrice));
            }
            if (minBedrooms != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("numberOfBedrooms"), minBedrooms));
            }
            if (minSize != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("sizeSquareMeters"), minSize));
            }
            if (furnished != null) {
                predicates.add(cb.equal(root.get("furnished"), furnished));
            }
            if (petFriendly != null) {
                predicates.add(cb.equal(root.get("petFriendly"), petFriendly));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return apartmentRepository.findAll(spec, pageable).map(ApartmentDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ApartmentDto> getApartmentsByOwner(Long ownerId) {
        return apartmentRepository.findByOwnerId(ownerId)
                .stream()
                .map(ApartmentDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public ApartmentDto updateApartment(Long id, Long userId, CreateApartmentRequest request) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;
        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment update attempt userId={}, apartmentId={}", userId, id);
            throw new SecurityException("Not authorized to update this apartment");
        }

        apartment.setTitle(request.getTitle());
        apartment.setDescription(request.getDescription());
        apartment.setCity(request.getCity());
        apartment.setDistrict(request.getDistrict());
        apartment.setAddress(request.getAddress());
        apartment.setLatitude(request.getLatitude());
        apartment.setLongitude(request.getLongitude());
        apartment.setMonthlyRent(request.getMonthlyRent());
        apartment.setDepositAmount(request.getDepositAmount());
        apartment.setSizeSquareMeters(request.getSizeSquareMeters());
        apartment.setNumberOfBedrooms(request.getNumberOfBedrooms());
        apartment.setNumberOfBathrooms(request.getNumberOfBathrooms());
        apartment.setFurnished(request.getFurnished());
        apartment.setPetFriendly(request.getPetFriendly());
        apartment.setHasParking(request.getHasParking());
        apartment.setHasElevator(request.getHasElevator());
        apartment.setHasBalcony(request.getHasBalcony());
        apartment.setAmenities(request.getAmenities());
        apartment.setAvailableFrom(request.getAvailableFrom());

        apartment = apartmentRepository.save(apartment);
        log.info("Apartment updated id={}, by userId={}", id, userId);
        return ApartmentDto.fromEntity(apartment);
    }

    @Override
    public void deleteApartment(Long id, Long userId) {
        Apartment apartment = apartmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        boolean isAdmin = user.getRole() == User.UserRole.ADMIN;
        if (!isAdmin && !apartment.getOwner().getId().equals(userId)) {
            log.warn("Unauthorized apartment delete attempt userId={}, apartmentId={}", userId, id);
            throw new SecurityException("Not authorized to delete this apartment");
        }

        apartmentRepository.delete(apartment);
        log.info("Apartment deleted id={}, by userId={}", id, userId);
    }
}
