package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.BookingRequestDto;
import com.sichrplace.backend.dto.CreateBookingRequestRequest;

import java.util.List;

public interface BookingRequestService {

    BookingRequestDto createBookingRequest(Long apartmentId, Long tenantId, CreateBookingRequestRequest request);

    List<BookingRequestDto> getBookingRequestsByTenant(Long tenantId);

    List<BookingRequestDto> getBookingRequestsByLandlord(Long landlordId);

    List<BookingRequestDto> getBookingRequestsByApartment(Long apartmentId, Long landlordId);

    BookingRequestDto acceptBookingRequest(Long bookingRequestId, Long landlordId);

    BookingRequestDto declineBookingRequest(Long bookingRequestId, Long landlordId, String reason);
}
