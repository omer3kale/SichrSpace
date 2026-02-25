package com.sichrplace.backend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration test for {@link ContentController}.
 * Verifies all content stub endpoints are publicly accessible and return 501 "coming-soon" JSON.
 * Satisfies ROADMAP_FTL Phase D §D1 requirement:
 * "Endpoint tests for all footer/header links to ensure none 404."
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("ContentController — /api/content")
class ContentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Nested
    @DisplayName("About page")
    class AboutTests {
        @Test
        @DisplayName("GET /api/content/about returns 501 coming-soon stub")
        void about_returnsComingSoon() throws Exception {
            mockMvc.perform(get("/api/content/about"))
                    .andExpect(status().isNotImplemented())
                    .andExpect(jsonPath("$.page").value("about"))
                    .andExpect(jsonPath("$.title").value("About SichrPlace"))
                    .andExpect(jsonPath("$.status").value("coming-soon"))
                    .andExpect(jsonPath("$.description").isNotEmpty())
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());
        }

        @Test
        @DisplayName("GET /api/content/about does not require authentication")
        void about_noAuthRequired() throws Exception {
            mockMvc.perform(get("/api/content/about"))
                    .andExpect(status().isNotImplemented());
        }
    }

    @Nested
    @DisplayName("FAQ page")
    class FaqTests {
        @Test
        @DisplayName("GET /api/content/faq returns 501 with FAQ items")
        void faq_returnsComingSoon() throws Exception {
            mockMvc.perform(get("/api/content/faq"))
                    .andExpect(status().isNotImplemented())
                    .andExpect(jsonPath("$.page").value("faq"))
                    .andExpect(jsonPath("$.title").value("Frequently Asked Questions"))
                    .andExpect(jsonPath("$.status").value("coming-soon"))
                    .andExpect(jsonPath("$.items").isArray())
                    .andExpect(jsonPath("$.items.length()").value(3))
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());
        }
    }

    @Nested
    @DisplayName("Customer Service page")
    class CustomerServiceTests {
        @Test
        @DisplayName("GET /api/content/customer-service returns 501 with contact info")
        void customerService_returnsComingSoon() throws Exception {
            mockMvc.perform(get("/api/content/customer-service"))
                    .andExpect(status().isNotImplemented())
                    .andExpect(jsonPath("$.page").value("customer-service"))
                    .andExpect(jsonPath("$.title").value("Customer Service"))
                    .andExpect(jsonPath("$.status").value("coming-soon"))
                    .andExpect(jsonPath("$.contact.email").value("support@sichrplace.com"))
                    .andExpect(jsonPath("$.contact.hours").isNotEmpty())
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());
        }
    }

    @Nested
    @DisplayName("Scam Stories page")
    class ScamStoriesTests {
        @Test
        @DisplayName("GET /api/content/scam-stories returns 501 with tips")
        void scamStories_returnsComingSoon() throws Exception {
            mockMvc.perform(get("/api/content/scam-stories"))
                    .andExpect(status().isNotImplemented())
                    .andExpect(jsonPath("$.page").value("scam-stories"))
                    .andExpect(jsonPath("$.title").value("Scam Awareness"))
                    .andExpect(jsonPath("$.status").value("coming-soon"))
                    .andExpect(jsonPath("$.description").isNotEmpty())
                    .andExpect(jsonPath("$.tips").isArray())
                    .andExpect(jsonPath("$.tips.length()").value(3))
                    .andExpect(jsonPath("$.timestamp").isNotEmpty());
        }

        @Test
        @DisplayName("Scam stories endpoint is not wired to apartments section (regression)")
        void scamStories_separateFromApartments() throws Exception {
            // Regression test: ensure scam-stories is at /api/content/scam-stories,
            // not at /api/apartments/scam-stories or similar
            mockMvc.perform(get("/api/content/scam-stories"))
                    .andExpect(status().isNotImplemented())
                    .andExpect(jsonPath("$.page").value("scam-stories"));
        }
    }

    @Nested
    @DisplayName("No-404 regression")
    class No404Tests {
        @Test
        @DisplayName("None of the content endpoints return 404")
        void allContentEndpoints_noneReturn404() throws Exception {
            String[] paths = {"/api/content/about", "/api/content/faq",
                    "/api/content/customer-service", "/api/content/scam-stories"};
            for (String path : paths) {
                mockMvc.perform(get(path))
                        .andExpect(status().isNotImplemented());
            }
        }
    }
}
