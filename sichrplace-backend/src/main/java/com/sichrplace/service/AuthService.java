package com.sichrplace.service;

import com.sichrplace.dto.AuthDto;
import com.sichrplace.entity.User;
import com.sichrplace.repository.UserRepository;
import com.sichrplace.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public AuthDto.AuthResponse login(AuthDto.LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElse(null);

        if (user == null) {
            return AuthDto.AuthResponse.builder()
                    .success(false).message("Invalid credentials").build();
        }

        if (user.getBlocked()) {
            return AuthDto.AuthResponse.builder()
                    .success(false).message("Account is blocked").build();
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
            if (user.getFailedLoginAttempts() >= 5) {
                user.setBlocked(true);
            }
            userRepository.save(user);
            return AuthDto.AuthResponse.builder()
                    .success(false).message("Invalid credentials").build();
        }

        // Reset failed attempts on success
        user.setFailedLoginAttempts(0);
        user.setLastLogin(OffsetDateTime.now());
        userRepository.save(user);

        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getEmail(), user.getRole(), user.getUsername());

        return AuthDto.AuthResponse.builder()
                .success(true)
                .token(token)
                .user(toUserInfo(user))
                .build();
    }

    @Transactional
    public AuthDto.AuthResponse register(AuthDto.RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase())) {
            return AuthDto.AuthResponse.builder()
                    .success(false).message("Email already exists").build();
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            return AuthDto.AuthResponse.builder()
                    .success(false).message("Username already taken").build();
        }

        String role = (request.getRole() != null && "admin".equals(request.getRole())) ? "admin" : "user";

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .gdprConsent(request.getGdprConsent() != null ? request.getGdprConsent() : false)
                .build();

        user = userRepository.save(user);

        String token = jwtTokenProvider.generateToken(
                user.getId(), user.getEmail(), user.getRole(), user.getUsername());

        log.info("New user registered: {}", user.getEmail());

        return AuthDto.AuthResponse.builder()
                .success(true)
                .token(token)
                .user(toUserInfo(user))
                .message("Registration successful")
                .build();
    }

    private AuthDto.UserInfo toUserInfo(User user) {
        return AuthDto.UserInfo.builder()
                .id(user.getId().toString())
                .email(user.getEmail())
                .username(user.getUsername())
                .role(user.getRole())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }
}
