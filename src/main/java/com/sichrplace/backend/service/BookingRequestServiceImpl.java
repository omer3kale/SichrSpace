package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.BookingRequestDto;
import com.sichrplace.backend.dto.CreateBookingRequestRequest;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.BookingRequest;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.BookingRequestRepository;
import com.sichrplace.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BookingRequestServiceImpl implements BookingRequestService {

    private final BookingRequestRepository bookingRequestRepository;
    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;

    @Override
    public BookingRequestDto createBookingRequest(Long apartmentId, Long tenantId,
                                                   CreateBookingRequestRequest request) {
        User tenant = userRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        if (tenant.getRole() != User.UserRole.TENANT) {
            throw new SecurityException("Only tenants can create booking requests");
        }

        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        if (apartment.getOwner().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Cannot book your own apartment");
        }

        BookingRequest br = BookingRequest.builder()
                .apartment(apartment)
                .tenant(tenant)
                .landlord(apartment.getOwner())
                .preferredMoveIn(request.getPreferredMoveIn())
                .preferredMoveOut(request.getPreferredMoveOut())
                .wouldExtendLater(request.isWouldExtendLater())
                .adultsJson(request.getAdultsJson())
                .childrenJson(request.getChildrenJson())
                .petsJson(request.getPetsJson())
                .institution(request.getInstitution())
                .detailedReason(request.getDetailedReason())
                .status(BookingRequest.BookingStatus.SUBMITTED)
                .build();

        // Parse optional enums
        if (request.getReasonType() != null) {
            br.setReasonType(BookingRequest.ReasonType.valueOf(request.getReasonType().toUpperCase(java.util.Locale.ROOT)));
        }
        if (request.getPayer() != null) {
            br.setPayer(BookingRequest.BookingPayer.valueOf(request.getPayer().toUpperCase(java.util.Locale.ROOT)));
        }

        br = bookingRequestRepository.save(br);
        log.info("BookingRequest created id={}, apartment={}, tenant={}", br.getId(), apartmentId, tenantId);
        return BookingRequestDto.fromEntity(br);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingRequestDto> getBookingRequestsByTenant(Long tenantId) {
        return bookingRequestRepository.findByTenantId(tenantId).stream()
                .map(BookingRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingRequestDto> getBookingRequestsByLandlord(Long landlordId) {
        return bookingRequestRepository.findByLandlordId(landlordId).stream()
                .map(BookingRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingRequestDto> getBookingRequestsByApartment(Long apartmentId, Long landlordId) {
        Apartment apartment = apartmentRepository.findById(apartmentId)
                .orElseThrow(() -> new IllegalArgumentException("Apartment not found"));

        if (!apartment.getOwner().getId().equals(landlordId)) {
            throw new SecurityException("Not authorized to view booking requests for this apartment");
        }

        return bookingRequestRepository.findByApartmentId(apartmentId).stream()
                .map(BookingRequestDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public BookingRequestDto acceptBookingRequest(Long bookingRequestId, Long landlordId) {
        BookingRequest br = bookingRequestRepository.findById(bookingRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Booking request not found"));

        if (!br.getLandlord().getId().equals(landlordId)) {
            throw new SecurityException("Not authorized to accept this booking request");
        }

        if (br.getStatus() != BookingRequest.BookingStatus.SUBMITTED) {
            throw new IllegalStateException(
                    "Cannot accept booking request in status " + br.getStatus());
        }

        br.setStatus(BookingRequest.BookingStatus.ACCEPTED);
        br = bookingRequestRepository.save(br);
        log.info("BookingRequest accepted id={}, by landlord={}", bookingRequestId, landlordId);
        return BookingRequestDto.fromEntity(br);
    }

    @Override
    public BookingRequestDto declineBookingRequest(Long bookingRequestId, Long landlordId, String reason) {
        BookingRequest br = bookingRequestRepository.findById(bookingRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Booking request not found"));

        if (!br.getLandlord().getId().equals(landlordId)) {
            throw new SecurityException("Not authorized to decline this booking request");
        }

        if (br.getStatus() != BookingRequest.BookingStatus.SUBMITTED) {
            throw new IllegalStateException(
                    "Cannot decline booking request in status " + br.getStatus());
        }

        br.setStatus(BookingRequest.BookingStatus.DECLINED);
        br.setDeclineReason(reason);
        br = bookingRequestRepository.save(br);
        log.info("BookingRequest declined id={}, by landlord={}", bookingRequestId, landlordId);
        return BookingRequestDto.fromEntity(br);
    }
}
