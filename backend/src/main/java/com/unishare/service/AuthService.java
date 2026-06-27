package com.unishare.service;

import com.unishare.dto.UserProfileResponse;
import com.unishare.dto.auth.AuthRequest;
import com.unishare.dto.auth.AuthResponse;
import com.unishare.dto.auth.RegisterRequest;
import java.util.List;

public interface AuthService {

    AuthResponse login(AuthRequest request);

    UserProfileResponse register(RegisterRequest request);

    List<UserProfileResponse> bulkRegister(List<RegisterRequest> requests);

    UserProfileResponse getCurrentProfile(String email);

    UserProfileResponse updateProfile(String email, com.unishare.dto.ProfileUpdateRequest request);

    void deleteAccount(String email, String targetId);
    
    void toggleUserStatus(String callerEmail, String targetId);

    void bulkDeleteStudentsByBatch(String callerEmail, String batchYear);

    List<UserProfileResponse> getAllUsers(String callerEmail);

    void bootstrapAdminIfNeeded();
}
