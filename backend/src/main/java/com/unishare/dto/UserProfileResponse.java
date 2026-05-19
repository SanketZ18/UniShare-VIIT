package com.unishare.dto;

import com.unishare.model.enums.Department;
import com.unishare.model.enums.Role;

public record UserProfileResponse(
        String accountId,
        String profileId,
        String fullName,
        String email,
        String mobile,
        com.unishare.model.enums.Gender gender,
        java.time.LocalDate birthDate,
        Role role,
        Department department,
        String batchYear,
        Integer semester,
        boolean active
) {
}
