package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.model.User;

import java.util.Map;

public interface UserService {
    UserAuthDto register(String email, String password, String firstName, String lastName, User.UserRole role);
    UserAuthDto login(String email, String password);
    UserDto getUserById(Long id);
    UserDto getUserByEmail(String email);
    UserDto updateUser(Long id, UserDto updateData);
    boolean emailExists(String email);

    /** Initiate password reset — generates token, returns it (console log in dev). */
    Map<String, String> forgotPassword(String email);

    /** Complete password reset — validates token, updates password. */
    void resetPassword(String token, String newPassword);

    /** Verify email address using the token sent at registration. */
    Map<String, String> verifyEmail(String token);

    /** Resend the email verification token for the given email. */
    Map<String, String> resendVerificationEmail(String email);
}
