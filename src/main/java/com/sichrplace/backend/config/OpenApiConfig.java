package com.sichrplace.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI sichrPlaceOpenAPI() {
        final String securitySchemeName = "bearerAuth";

        return new OpenAPI()
                .info(new Info()
                        .title("SichrPlace API")
                        .description("Apartment rental platform API – Spring Boot 3.x / Java 21 backend.\n\n"
                                + "**Authentication**: Acquire a JWT via `POST /api/auth/login`, then click "
                                + "\"Authorize\" and paste the `accessToken` value.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("SichrPlace")
                                .url("https://sichrplace.com")))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Paste the JWT access token obtained from POST /api/auth/login")));
    }
}
