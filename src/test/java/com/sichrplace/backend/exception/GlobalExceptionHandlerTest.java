package com.sichrplace.backend.exception;

import com.sichrplace.backend.config.GlobalExceptionHandler;
import com.sichrplace.backend.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void validationError_returns400WithFieldErrors() throws Exception {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
        bindingResult.addError(new FieldError("request", "name", "name is required"));

        Method method = GlobalExceptionHandlerTest.class.getDeclaredMethod("validationMethod", String.class);
        MethodParameter parameter = new MethodParameter(method, 0);
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(parameter, bindingResult);

        ResponseEntity<ApiErrorResponse> response = handler.handleValidation(ex, request("/test/validate"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Validation Failed", response.getBody().getError());
        assertEquals("name is required", response.getBody().getFieldErrors().get("name"));
    }

    @Test
    void illegalArgument_returns400() {
        ResponseEntity<ApiErrorResponse> response =
                handler.handleIllegalArgument(new IllegalArgumentException("bad arg"), request("/test/illegal-arg"));

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Bad Request", response.getBody().getError());
    }

    @Test
    void illegalState_returns409() {
        ResponseEntity<ApiErrorResponse> response =
                handler.handleIllegalState(new IllegalStateException("bad state"), request("/test/illegal-state"));

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("Conflict", response.getBody().getError());
    }

    @Test
    void accessDenied_returns403() {
        ResponseEntity<ApiErrorResponse> response =
                handler.handleAccessDenied(new AccessDeniedException("forbidden"), request("/test/access-denied"));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Forbidden", response.getBody().getError());
    }

    @Test
    void runtimeException_returns500() {
        ResponseEntity<ApiErrorResponse> response =
                handler.handleGeneral(new RuntimeException("boom"), request("/test/runtime"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Internal Server Error", response.getBody().getError());
    }

    private HttpServletRequest request(String uri) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn(uri);
        return request;
    }

    @SuppressWarnings("unused")
    private void validationMethod(String name) {
    }
}
