package com.sichrplace.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sichrplace.backend.dto.CreateReviewRequest;
import com.sichrplace.backend.dto.ModerateReviewRequest;
import com.sichrplace.backend.dto.ReviewDto;
import com.sichrplace.backend.dto.ReviewStatsDto;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.ReviewService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReviewController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ReviewController")
class ReviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ReviewService reviewService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    private UsernamePasswordAuthenticationToken tenantAuth() {
        return new UsernamePasswordAuthenticationToken(1L, null, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
    }

    private UsernamePasswordAuthenticationToken adminAuth() {
        return new UsernamePasswordAuthenticationToken(9L, null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    }

        @BeforeEach
        void setTenantAuth() {
                SecurityContextHolder.getContext().setAuthentication(tenantAuth());
        }

        @AfterEach
        void clearAuth() {
                SecurityContextHolder.clearContext();
        }

    private CreateReviewRequest validCreateRequest() {
        return CreateReviewRequest.builder()
                .rating(5)
                .title("Great place")
                .comment("Very clean and near transport")
                .pros("Location")
                .cons("None")
                .wouldRecommend(true)
                .build();
    }

    @Test
    void public_endpoints_return200() throws Exception {
        when(reviewService.getApprovedReviewsForApartment(eq(5L), any()))
                .thenReturn(new PageImpl<>(List.of(ReviewDto.builder().id(1L).title("Great").build())));
        when(reviewService.getReviewStats(5L))
                .thenReturn(ReviewStatsDto.builder().apartmentId(5L).averageRating(4.8).totalReviews(12).build());

        mockMvc.perform(get("/api/reviews/apartment/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(1));

        mockMvc.perform(get("/api/reviews/apartment/5/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apartmentId").value(5));
    }

    @Test
        void create_review_happy_400_403_404() throws Exception {
        when(reviewService.createReview(eq(1L), eq(5L), any(CreateReviewRequest.class)))
                .thenReturn(ReviewDto.builder().id(10L).title("Great place").build());

        mockMvc.perform(post("/api/reviews/apartment/5")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(10));

        CreateReviewRequest bad = CreateReviewRequest.builder().rating(0).title("x").comment("short").build();
        mockMvc.perform(post("/api/reviews/apartment/5")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bad)))
                .andExpect(status().isBadRequest());

        when(reviewService.createReview(eq(1L), eq(6L), any(CreateReviewRequest.class)))
                .thenThrow(new SecurityException("Only tenants can create reviews"));
        mockMvc.perform(post("/api/reviews/apartment/6")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isForbidden());

        when(reviewService.createReview(eq(1L), eq(7L), any(CreateReviewRequest.class)))
                .thenThrow(new IllegalArgumentException("Apartment not found"));
        mockMvc.perform(post("/api/reviews/apartment/7")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_delete_my_paths_and_errors() throws Exception {
        when(reviewService.updateReview(eq(1L), eq(11L), any(CreateReviewRequest.class)))
                .thenReturn(ReviewDto.builder().id(11L).title("Updated").build());
        when(reviewService.getReviewsByReviewer(eq(1L), any()))
                .thenReturn(new PageImpl<>(List.of(ReviewDto.builder().id(11L).build())));

        mockMvc.perform(put("/api/reviews/11")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated"));

        mockMvc.perform(patch("/api/reviews/11")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/reviews/11").with(csrf()))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));

        mockMvc.perform(get("/api/reviews/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(11));

        doThrow(new IllegalArgumentException("Review not found")).when(reviewService).deleteReview(1L, 55L);
        mockMvc.perform(delete("/api/reviews/55").with(csrf()))
                .andExpect(status().isNotFound());
    }

    @Test
        void moderation_paths_200_400_403_404() throws Exception {
        SecurityContextHolder.getContext().setAuthentication(adminAuth());
        when(reviewService.getPendingReviews(any()))
                .thenReturn(new PageImpl<>(List.of(ReviewDto.builder().id(3L).build())));
        when(reviewService.moderateReview(eq(9L), eq(3L), any(ModerateReviewRequest.class)))
                .thenReturn(ReviewDto.builder().id(3L).status("APPROVED").build());

        mockMvc.perform(get("/api/reviews/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(3));

        SecurityContextHolder.getContext().setAuthentication(tenantAuth());
        when(reviewService.getPendingReviews(any())).thenThrow(new SecurityException("Forbidden"));
        mockMvc.perform(get("/api/reviews/pending"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Forbidden"));

        SecurityContextHolder.getContext().setAuthentication(adminAuth());
        mockMvc.perform(post("/api/reviews/3/moderate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ModerateReviewRequest("APPROVED", "ok"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        mockMvc.perform(post("/api/reviews/3/moderate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ModerateReviewRequest("WRONG", "bad"))))
                .andExpect(status().isBadRequest());

        when(reviewService.moderateReview(eq(9L), eq(99L), any(ModerateReviewRequest.class)))
                .thenThrow(new IllegalArgumentException("Review not found"));
        mockMvc.perform(post("/api/reviews/99/moderate")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ModerateReviewRequest("APPROVED", "ok"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void landlord_endpoints_return200() throws Exception {
        when(reviewService.getLandlordReviewStats(2L))
                .thenReturn(ReviewStatsDto.builder().averageRating(4.5).totalReviews(3).build());
        when(reviewService.getApprovedReviewsForLandlord(eq(2L), any()))
                .thenReturn(new PageImpl<>(List.of(ReviewDto.builder().id(5L).title("Nice").build())));

        mockMvc.perform(get("/api/reviews/landlord/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").value(4.5))
                .andExpect(jsonPath("$.totalReviews").value(3));

        mockMvc.perform(get("/api/reviews/landlord/2/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(5));
    }

    @Test
    void review_eligibility_error_returns409() throws Exception {
        when(reviewService.createReview(eq(1L), eq(8L), any(CreateReviewRequest.class)))
                .thenThrow(new IllegalStateException("You can only review an apartment after a completed viewing or accepted booking"));

        mockMvc.perform(post("/api/reviews/apartment/8")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validCreateRequest())))
                .andExpect(status().isConflict());
    }
}
