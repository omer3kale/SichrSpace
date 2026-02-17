package com.sichrplace.backend.service;

import com.sichrplace.backend.dto.AdminDashboardDto;
import com.sichrplace.backend.dto.UpdateUserRoleRequest;
import com.sichrplace.backend.dto.UpdateUserStatusRequest;
import com.sichrplace.backend.dto.UserDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface AdminService {

    AdminDashboardDto getDashboard();

    Page<UserDto> getAllUsers(Pageable pageable);

    UserDto updateUserRole(Long adminId, Long userId, UpdateUserRoleRequest request);

    UserDto updateUserStatus(Long adminId, Long userId, UpdateUserStatusRequest request);
}
