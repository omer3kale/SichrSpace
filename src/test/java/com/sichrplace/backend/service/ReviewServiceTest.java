package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.CreateReviewRequest;
import com.sichrplace.backend.dto.ModerateReviewRequest;
import com.sichrplace.backend.dto.ReviewDto;
import com.sichrplace.backend.dto.ReviewStatsDto;
import com.sichrplace.backend.model.Apartment;
import com.sichrplace.backend.model.ApartmentReview;
import com.sichrplace.backend.model.BookingRequest;
import com.sichrplace.backend.model.Notification;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.model.ViewingRequest;
import com.sichrplace.backend.repository.ApartmentRepository;
import com.sichrplace.backend.repository.ApartmentReviewRepository;
import com.sichrplace.backend.repository.BookingRequestRepository;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.repository.ViewingRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReviewServiceImpl")
class ReviewServiceTest {

    @Mock private ApartmentReviewRepository reviewRepository;
    @Mock private ApartmentRepository apartmentRepository;
    @Mock private UserRepository userRepository;
    @Mock private ViewingRequestRepository viewingRequestRepository;
    @Mock private BookingRequestRepository bookingRequestRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks private ReviewServiceImpl reviewService;

    private User reviewer;
    private User owner;
    private User admin;
    private Apartment apartment;
    private CreateReviewRequest createRequest;

    @BeforeEach
    void setUp() {
        reviewer = User.builder().id(1L).firstName("Rev").lastName("Iewer").build();
        owner = User.builder().id(2L).firstName("Own").lastName("Er").build();
        admin = User.builder().id(3L).firstName("Ad").lastName("Min").build();

        apartment = Apartment.builder().id(10L).title("Apt").owner(owner).build();

        createRequest = CreateReviewRequest.builder()
                .rating(5)
                .title("Great")
                .comment("Very nice apartment and location")
                .landlordRating(5)
                .locationRating(4)
                .valueRating(4)
                .build();
    }

    @Test
    void createReview_success_setsPending_andNotifiesAdmins() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(reviewer));
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(reviewRepository.existsByApartmentIdAndReviewerId(10L, 1L)).thenReturn(false);
        when(viewingRequestRepository.existsByTenantIdAndApartmentIdAndStatus(
                1L, 10L, ViewingRequest.ViewingStatus.COMPLETED)).thenReturn(true);
        when(reviewRepository.save(any(ApartmentReview.class))).thenAnswer(inv -> {
            ApartmentReview r = inv.getArgument(0);
            r.setId(100L);
            return r;
        });

        ReviewDto dto = reviewService.createReview(1L, 10L, createRequest);

        assertEquals(100L, dto.getId());
        assertEquals("PENDING", dto.getStatus());
        verify(notificationService).createNotification(
                isNull(),
                eq(Notification.NotificationType.REVIEW_SUBMITTED),
                eq("New Review Pending"),
                anyString(),
                eq(Notification.NotificationPriority.NORMAL),
                eq("/admin/reviews")
        );
    }

    @Test
    void createReview_ownApartmentDenied() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(owner));
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));

        assertThrows(IllegalStateException.class, () -> reviewService.createReview(2L, 10L, createRequest));
    }

    @Test
    void createReview_duplicateDenied() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(reviewer));
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(reviewRepository.existsByApartmentIdAndReviewerId(10L, 1L)).thenReturn(true);

        assertThrows(IllegalStateException.class, () -> reviewService.createReview(1L, 10L, createRequest));
    }

    @Test
    void createReview_noCompletedViewingOrAcceptedBooking_denied() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(reviewer));
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(reviewRepository.existsByApartmentIdAndReviewerId(10L, 1L)).thenReturn(false);
        when(viewingRequestRepository.existsByTenantIdAndApartmentIdAndStatus(
                1L, 10L, ViewingRequest.ViewingStatus.COMPLETED)).thenReturn(false);
        when(bookingRequestRepository.existsByTenantIdAndApartmentIdAndStatus(
                1L, 10L, BookingRequest.BookingStatus.ACCEPTED)).thenReturn(false);

        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> reviewService.createReview(1L, 10L, createRequest));
        assertTrue(ex.getMessage().contains("completed viewing or accepted booking"));
    }

    @Test
    void createReview_acceptedBookingAloneIsEligible() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(reviewer));
        when(apartmentRepository.findById(10L)).thenReturn(Optional.of(apartment));
        when(reviewRepository.existsByApartmentIdAndReviewerId(10L, 1L)).thenReturn(false);
        when(viewingRequestRepository.existsByTenantIdAndApartmentIdAndStatus(
                1L, 10L, ViewingRequest.ViewingStatus.COMPLETED)).thenReturn(false);
        when(bookingRequestRepository.existsByTenantIdAndApartmentIdAndStatus(
                1L, 10L, BookingRequest.BookingStatus.ACCEPTED)).thenReturn(true);
        when(reviewRepository.save(any(ApartmentReview.class))).thenAnswer(inv -> {
            ApartmentReview r = inv.getArgument(0);
            r.setId(101L);
            return r;
        });

        ReviewDto dto = reviewService.createReview(1L, 10L, createRequest);
        assertEquals(101L, dto.getId());
    }

    @Test
    void createReview_userNotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> reviewService.createReview(1L, 10L, createRequest));
    }

    @Test
    void createReview_apartmentNotFound() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(reviewer));
        when(apartmentRepository.findById(10L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> reviewService.createReview(1L, 10L, createRequest));
    }

    @Test
    void updateReview_ownerCanEdit_andResetsPending() {
        ApartmentReview review = new ApartmentReview();
        review.setId(7L);
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        review.setStatus(ApartmentReview.ReviewStatus.APPROVED);

        when(reviewRepository.findById(7L)).thenReturn(Optional.of(review));
        when(reviewRepository.save(any(ApartmentReview.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewDto dto = reviewService.updateReview(1L, 7L, createRequest);

        assertEquals("PENDING", dto.getStatus());
    }

    @Test
    void updateReview_nonOwnerDenied() {
        ApartmentReview review = new ApartmentReview();
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        when(reviewRepository.findById(7L)).thenReturn(Optional.of(review));

        assertThrows(SecurityException.class, () -> reviewService.updateReview(2L, 7L, createRequest));
    }

    @Test
    void updateReview_notFound() {
        when(reviewRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> reviewService.updateReview(1L, 404L, createRequest));
    }

    @Test
    void deleteReview_nonOwnerDenied() {
        ApartmentReview review = new ApartmentReview();
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        when(reviewRepository.findById(7L)).thenReturn(Optional.of(review));

        assertThrows(SecurityException.class, () -> reviewService.deleteReview(2L, 7L));
    }

    @Test
    void deleteReview_success() {
        ApartmentReview review = new ApartmentReview();
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        when(reviewRepository.findById(7L)).thenReturn(Optional.of(review));

        reviewService.deleteReview(1L, 7L);

        verify(reviewRepository).delete(review);
    }

    @Test
    void deleteReview_notFound() {
        when(reviewRepository.findById(404L)).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> reviewService.deleteReview(1L, 404L));
    }

    @Test
    void getApprovedReviewsForApartment_mapsPage() {
        ApartmentReview review = new ApartmentReview();
        review.setId(1L);
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        review.setStatus(ApartmentReview.ReviewStatus.APPROVED);
        review.setRating(5);
        review.setTitle("T");
        review.setComment("C");

        Page<ApartmentReview> page = new PageImpl<>(List.of(review), PageRequest.of(0, 10), 1);
        when(reviewRepository.findByApartmentIdAndStatus(10L, ApartmentReview.ReviewStatus.APPROVED, PageRequest.of(0, 10)))
                .thenReturn(page);

        Page<ReviewDto> result = reviewService.getApprovedReviewsForApartment(10L, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getReviewStats_zeroReviews_returnsZeroedDto() {
        when(reviewRepository.findByApartmentIdAndStatus(eq(10L), eq(ApartmentReview.ReviewStatus.APPROVED), eq(Pageable.unpaged())))
                .thenReturn(new PageImpl<>(List.of(), Pageable.unpaged(), 0));

        ReviewStatsDto stats = reviewService.getReviewStats(10L);

        assertEquals(0, stats.getTotalReviews());
        assertEquals(0.0, stats.getAverageRating());
    }

    @Test
    void getReviewStats_nonZero_computesAggregates() {
        when(reviewRepository.findByApartmentIdAndStatus(eq(10L), eq(ApartmentReview.ReviewStatus.APPROVED), eq(Pageable.unpaged())))
                .thenReturn(new PageImpl<>(List.of(), Pageable.unpaged(), 2));
        when(reviewRepository.findAverageRatingByApartmentId(10L)).thenReturn(4.5);
        when(reviewRepository.findAverageLandlordRatingByApartmentId(10L)).thenReturn(4.0);
        when(reviewRepository.findAverageLocationRatingByApartmentId(10L)).thenReturn(3.5);
        when(reviewRepository.findAverageValueRatingByApartmentId(10L)).thenReturn(4.0);
        when(reviewRepository.countByApartmentIdAndRating(10L, 5)).thenReturn(1L);
        when(reviewRepository.countByApartmentIdAndRating(10L, 4)).thenReturn(1L);
        when(reviewRepository.countByApartmentIdAndRating(10L, 3)).thenReturn(0L);
        when(reviewRepository.countByApartmentIdAndRating(10L, 2)).thenReturn(0L);
        when(reviewRepository.countByApartmentIdAndRating(10L, 1)).thenReturn(0L);

        ReviewStatsDto stats = reviewService.getReviewStats(10L);

        assertEquals(2, stats.getTotalReviews());
        assertEquals(4.5, stats.getAverageRating());
        assertEquals(1, stats.getFiveStarCount());
    }

    @Test
    void getReviewStats_nonZero_nullAveragesFallbackToZero() {
        when(reviewRepository.findByApartmentIdAndStatus(eq(10L), eq(ApartmentReview.ReviewStatus.APPROVED), eq(Pageable.unpaged())))
                .thenReturn(new PageImpl<>(List.of(), Pageable.unpaged(), 1));
        when(reviewRepository.findAverageRatingByApartmentId(10L)).thenReturn(null);
        when(reviewRepository.findAverageLandlordRatingByApartmentId(10L)).thenReturn(null);
        when(reviewRepository.findAverageLocationRatingByApartmentId(10L)).thenReturn(null);
        when(reviewRepository.findAverageValueRatingByApartmentId(10L)).thenReturn(null);

        ReviewStatsDto stats = reviewService.getReviewStats(10L);

        assertEquals(0.0, stats.getAverageRating());
        assertEquals(0.0, stats.getAverageLandlordRating());
        assertEquals(0.0, stats.getAverageLocationRating());
        assertEquals(0.0, stats.getAverageValueRating());
    }

    @Test
    void getReviewsByReviewer_mapsPage() {
        ApartmentReview review = new ApartmentReview();
        review.setId(15L);
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        review.setStatus(ApartmentReview.ReviewStatus.PENDING);
        review.setRating(5);
        review.setTitle("x");
        review.setComment("y");
        when(reviewRepository.findByReviewerId(1L, PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(List.of(review), PageRequest.of(0, 5), 1));

        Page<ReviewDto> page = reviewService.getReviewsByReviewer(1L, PageRequest.of(0, 5));
        assertEquals(1, page.getTotalElements());
    }

    @Test
    void getPendingReviews_mapsPage() {
        ApartmentReview review = new ApartmentReview();
        review.setId(9L);
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        review.setStatus(ApartmentReview.ReviewStatus.PENDING);
        review.setRating(4);
        review.setTitle("T");
        review.setComment("C");

        when(reviewRepository.findByStatus(ApartmentReview.ReviewStatus.PENDING, PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(List.of(review), PageRequest.of(0, 5), 1));

        Page<ReviewDto> result = reviewService.getPendingReviews(PageRequest.of(0, 5));
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void moderateReview_success_notifiesReviewer() {
        ApartmentReview review = new ApartmentReview();
        review.setId(9L);
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        review.setStatus(ApartmentReview.ReviewStatus.PENDING);

        when(reviewRepository.findById(9L)).thenReturn(Optional.of(review));
        when(userRepository.findById(3L)).thenReturn(Optional.of(admin));
        when(reviewRepository.save(any(ApartmentReview.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewDto dto = reviewService.moderateReview(3L, 9L, new ModerateReviewRequest("APPROVED", "ok"));

        assertEquals("APPROVED", dto.getStatus());
        verify(notificationService).createNotification(
                eq(1L),
                eq(Notification.NotificationType.REVIEW_MODERATED),
                eq("Review Approved"),
                anyString(),
                eq(Notification.NotificationPriority.NORMAL),
                eq("/my-reviews")
        );
    }

    @Test
    void moderateReview_rejected_notifiesWithRejectedMessage() {
        ApartmentReview review = new ApartmentReview();
        review.setId(10L);
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        review.setStatus(ApartmentReview.ReviewStatus.PENDING);
        when(reviewRepository.findById(10L)).thenReturn(Optional.of(review));
        when(userRepository.findById(3L)).thenReturn(Optional.of(admin));
        when(reviewRepository.save(any(ApartmentReview.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewDto dto = reviewService.moderateReview(3L, 10L, new ModerateReviewRequest("REJECTED", "spam"));

        assertEquals("REJECTED", dto.getStatus());
        verify(notificationService).createNotification(
                eq(1L),
                eq(Notification.NotificationType.REVIEW_MODERATED),
                eq("Review Rejected"),
                contains("Reason: spam"),
                eq(Notification.NotificationPriority.NORMAL),
                eq("/my-reviews")
        );
    }

    @Test
    void moderateReview_notFoundBranches() {
        when(reviewRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
                () -> reviewService.moderateReview(3L, 99L, new ModerateReviewRequest("APPROVED", "ok")));

        ApartmentReview review = new ApartmentReview();
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        when(reviewRepository.findById(9L)).thenReturn(Optional.of(review));
        when(userRepository.findById(3L)).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class,
                () -> reviewService.moderateReview(3L, 9L, new ModerateReviewRequest("APPROVED", "ok")));
    }

    @Test
    void getLandlordReviewStats_zeroReviews_returnsZeroed() {
        when(reviewRepository.countApprovedByLandlordUserId(2L)).thenReturn(0L);

        ReviewStatsDto stats = reviewService.getLandlordReviewStats(2L);

        assertEquals(0, stats.getTotalReviews());
        assertEquals(0.0, stats.getAverageRating());
        assertNull(stats.getApartmentId());
    }

    @Test
    void getLandlordReviewStats_nonZero_computesAggregates() {
        when(reviewRepository.countApprovedByLandlordUserId(2L)).thenReturn(5L);
        when(reviewRepository.findAverageRatingByLandlordUserId(2L)).thenReturn(4.2);
        when(reviewRepository.findAverageLandlordRatingByLandlordUserId(2L)).thenReturn(3.8);

        ReviewStatsDto stats = reviewService.getLandlordReviewStats(2L);

        assertEquals(5, stats.getTotalReviews());
        assertEquals(4.2, stats.getAverageRating());
        assertEquals(3.8, stats.getAverageLandlordRating());
    }

    @Test
    void getApprovedReviewsForLandlord_mapsPage() {
        ApartmentReview review = new ApartmentReview();
        review.setId(20L);
        review.setReviewer(reviewer);
        review.setApartment(apartment);
        review.setStatus(ApartmentReview.ReviewStatus.APPROVED);
        review.setRating(4);
        review.setTitle("Good");
        review.setComment("Nice place");
        when(reviewRepository.findApprovedByLandlordUserId(2L, PageRequest.of(0, 10)))
                .thenReturn(new PageImpl<>(List.of(review), PageRequest.of(0, 10), 1));

        Page<ReviewDto> result = reviewService.getApprovedReviewsForLandlord(2L, PageRequest.of(0, 10));
        assertEquals(1, result.getTotalElements());
        assertEquals(20L, result.getContent().get(0).getId());
    }
}
