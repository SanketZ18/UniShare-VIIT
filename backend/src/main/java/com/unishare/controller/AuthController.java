package com.unishare.controller;

import com.unishare.dto.ApiResponse;
import com.unishare.dto.UserProfileResponse;
import com.unishare.dto.ProfileUpdateRequest;
import com.unishare.dto.auth.AuthRequest;
import com.unishare.dto.auth.AuthResponse;
import com.unishare.dto.auth.RegisterRequest;
import com.unishare.service.AuthService;
import com.unishare.service.ExcelService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final ExcelService excelService;

    @GetMapping("/ping")
    public ResponseEntity<ApiResponse<String>> ping() {
        return ResponseEntity.ok(ApiResponse.success("Pong", "Service is up and running"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Login successful", authService.login(request)));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserProfileResponse>> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(ApiResponse.success("User registered successfully", authService.register(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> me(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                "Current profile fetched successfully",
                authService.getCurrentProfile(userDetails.getUsername())
        ));
    }

    @PostMapping("/bulk-register-students")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> bulkRegisterStudents(@RequestParam("file") MultipartFile file) {
        try {
            List<RegisterRequest> requests = excelService.parseStudentExcel(file.getInputStream());
            List<UserProfileResponse> profiles = authService.bulkRegister(requests);
            return ResponseEntity.ok(ApiResponse.success(profiles.size() + " students registered successfully", profiles));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to process Excel file: " + e.getMessage()));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody ProfileUpdateRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Profile updated successfully",
                authService.updateProfile(userDetails.getUsername(), request)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String id
    ) {
        authService.deleteAccount(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully", null));
    }

    @PostMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<Void>> toggleStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String id
    ) {
        authService.toggleUserStatus(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("User status updated", null));
    }

    @DeleteMapping("/bulk-delete-students")
    public ResponseEntity<ApiResponse<Void>> bulkDeleteStudents(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String batchYear
    ) {
        authService.bulkDeleteStudentsByBatch(userDetails.getUsername(), batchYear);
        return ResponseEntity.ok(ApiResponse.success("Bulk deletion successful", null));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserProfileResponse>>> getAllUsers(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success("Users fetched successfully", authService.getAllUsers(userDetails.getUsername())));
    }
}
