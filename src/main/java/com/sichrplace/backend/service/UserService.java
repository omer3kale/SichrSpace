package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.UserDto;
import com.sichrplace.backend.dto.UserAuthDto;
import com.sichrplace.backend.model.User;

public interface UserService {
    UserAuthDto register(String email, String password, String firstName, String lastName, User.UserRole role);
    UserAuthDto login(String email, String password);
    UserDto getUserById(Long id);
    UserDto getUserByEmail(String email);
    UserDto updateUser(Long id, UserDto updateData);
    boolean emailExists(String email);
}
