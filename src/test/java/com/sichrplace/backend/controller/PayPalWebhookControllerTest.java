package com.sichrplace.backend.controller;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.security.JwtTokenProvider;
import com.sichrplace.backend.service.PayPalWebhookService;
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

@WebMvcTest(PayPalWebhookController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("PayPalWebhookController")
class PayPalWebhookControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PayPalWebhookService payPalWebhookService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("POST /api/payments/paypal/webhook — valid event → 200")
    void webhook_validEvent_returns200() throws Exception {
        String payload = "{\"event_type\":\"CHECKOUT.ORDER.APPROVED\",\"resource\":{\"id\":\"O-1\"}}";
        doNothing().when(payPalWebhookService).handlePayPalWebhook(payload);

        mockMvc.perform(post("/api/payments/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.received").value(true));

        verify(payPalWebhookService).handlePayPalWebhook(payload);
    }

    @Test
    @DisplayName("POST /api/payments/paypal/webhook — invalid payload → 400")
    void webhook_invalidPayload_returns400() throws Exception {
        String bad = "not_valid_json";
        doThrow(new IllegalArgumentException("Invalid PayPal webhook payload"))
                .when(payPalWebhookService).handlePayPalWebhook(bad);

        mockMvc.perform(post("/api/payments/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bad)
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.received").value(false))
                .andExpect(jsonPath("$.error").value("Invalid PayPal webhook payload"));
    }

    @Test
    @DisplayName("POST /api/payments/paypal/webhook — empty payload → 400")
    void webhook_emptyPayload_returns400() throws Exception {
        mockMvc.perform(post("/api/payments/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("   ")
                        .with(csrf()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.received").value(false))
                .andExpect(jsonPath("$.error").value("Empty webhook payload"));
    }

    @Test
    @DisplayName("POST /api/payments/paypal/webhook — no auth required (permitAll)")
    void webhook_noAuthRequired() throws Exception {
        String payload = "{\"event_type\":\"SOME.EVENT\"}";
        doNothing().when(payPalWebhookService).handlePayPalWebhook(payload);

        mockMvc.perform(post("/api/payments/paypal/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload)
                        .with(csrf()))
                .andExpect(status().isOk());
    }
}
