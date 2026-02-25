package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.StripeWebhookService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(StripeWebhookController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("StripeWebhookController")
class StripeWebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StripeWebhookService stripeWebhookService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("POST /api/payments/stripe/webhook — valid event → 200")
    void webhook_validEvent_returns200() throws Exception {
        doNothing().when(stripeWebhookService).handleStripeWebhook("test_payload", "test_sig");

        mockMvc.perform(post("/api/payments/stripe/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("test_payload")
                        .header("Stripe-Signature", "test_sig")
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));

        verify(stripeWebhookService).handleStripeWebhook("test_payload", "test_sig");
    }

    @Test
    @DisplayName("POST /api/payments/stripe/webhook — invalid signature → 400")
    void webhook_invalidSignature_returns400() throws Exception {
        doThrow(new IllegalArgumentException("Invalid Stripe webhook signature"))
                .when(stripeWebhookService).handleStripeWebhook("bad_payload", "bad_sig");

        mockMvc.perform(post("/api/payments/stripe/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("bad_payload")
                        .header("Stripe-Signature", "bad_sig")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.received").value(false))
                .andExpect(jsonPath("$.error").value("Invalid Stripe webhook signature"));
    }

    @Test
    @DisplayName("POST /api/payments/stripe/webhook — no auth required (permitAll)")
    void webhook_noAuthRequired() throws Exception {
        doNothing().when(stripeWebhookService).handleStripeWebhook(anyString(), anyString());

        mockMvc.perform(post("/api/payments/stripe/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")
                        .header("Stripe-Signature", "sig")
                        .with(csrf()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/payments/stripe/webhook — missing Stripe-Signature header → 400")
    void webhook_missingSignatureHeader_returns400() throws Exception {
        mockMvc.perform(post("/api/payments/stripe/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("payload")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.received").value(false))
                .andExpect(jsonPath("$.error").value("Missing Stripe-Signature header"));
    }

    @Test
    @DisplayName("POST /api/payments/stripe/webhook — blank Stripe-Signature header → 400")
    void webhook_blankSignatureHeader_returns400() throws Exception {
        mockMvc.perform(post("/api/payments/stripe/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("payload")
                        .header("Stripe-Signature", "   ")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.received").value(false))
                .andExpect(jsonPath("$.error").value("Missing Stripe-Signature header"));
    }
}
