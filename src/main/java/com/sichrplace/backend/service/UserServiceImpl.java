package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.model.User;
import com.sichrplace.backend.repository.UserRepository;
import com.sichrplace.backend.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public UserAuthDto register(String email, String password, String firstName, String lastName, User.UserRole role) {
        log.info("Registration attempt for email={}", email);

        if (role == User.UserRole.ADMIN) {
            log.warn("Blocked attempt to self-register as ADMIN, email={}", email);
            throw new IllegalArgumentException("Cannot self-register as ADMIN");
        }

        if (userRepository.existsByEmail(email)) {
            log.warn("Registration failed – email already exists: {}", email);
            throw new IllegalArgumentException("Email already registered");
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(password))
                .firstName(firstName)
                .lastName(lastName)
                .role(role)
                .emailVerified(false)
                .isActive(true)
                .build();

        user = userRepository.save(user);
        log.info("User registered successfully id={}, role={}", user.getId(), role);

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        return UserAuthDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationMs())
                .build();
    }

    @Override
    public UserAuthDto login(String email, String password) {
        log.info("Login attempt for email={}", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Login failed – email not found: {}", email);
                    return new IllegalArgumentException("Invalid email or password");
                });

        if (!user.getIsActive()) {
            log.warn("Login failed – account deactivated, userId={}", user.getId());
            throw new IllegalArgumentException("Account is deactivated");
        }

        if (!passwordEncoder.matches(password, user.getPassword())) {
            log.warn("Login failed – bad password for userId={}", user.getId());
            throw new IllegalArgumentException("Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        log.info("Login successful userId={}, role={}", user.getId(), user.getRole());

        String accessToken = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        return UserAuthDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole().name())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationMs())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return UserDto.fromEntity(user);
    }

    @Override
    public UserDto updateUser(Long id, UserDto updateData) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (updateData.getFirstName() != null) {
            user.setFirstName(updateData.getFirstName());
        }
        if (updateData.getLastName() != null) {
            user.setLastName(updateData.getLastName());
        }
        if (updateData.getBio() != null) {
            user.setBio(updateData.getBio());
        }
        if (updateData.getPhone() != null) {
            user.setPhone(updateData.getPhone());
        }
        if (updateData.getCity() != null) {
            user.setCity(updateData.getCity());
        }
        if (updateData.getCountry() != null) {
            user.setCountry(updateData.getCountry());
        }

        user = userRepository.save(user);
        return UserDto.fromEntity(user);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }
}
