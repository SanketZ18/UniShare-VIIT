package com.unishare.util;

import com.unishare.dto.StaffResponse;
import com.unishare.dto.StudentResponse;
import com.unishare.dto.UserProfileResponse;
import com.unishare.dto.resource.ResourceResponse;
import com.unishare.model.Resource;
import com.unishare.model.Staff;
import com.unishare.model.Student;
import com.unishare.model.UserAccount;
import com.unishare.model.enums.Department;

public final class PortalMapper {

    private PortalMapper() {
    }

    public static StudentResponse toStudentResponse(Student student) {
        return new StudentResponse(
                student.getId(),
                student.getPrn(),
                student.getFullName(),
                student.getEmail(),
                student.getMobile(),
                student.getGender(),
                student.getDepartment(),
                student.getYear(),
                student.getSemester(),
                student.getDivision(),
                student.getStatus(),
                student.getBirthDate(),
                student.getCreatedAt()
        );
    }

    public static StaffResponse toStaffResponse(Staff staff) {
        return new StaffResponse(
                staff.getId(),
                staff.getStaffId(),
                staff.getFullName(),
                staff.getEmail(),
                staff.getMobile(),
                staff.getGender(),
                staff.getDesignation(),
                staff.getDepartment(),
                staff.getSubjects(),
                staff.getStatus(),
                staff.getBirthDate(),
                staff.getCreatedAt()
        );
    }

    public static UserProfileResponse toUserProfile(UserAccount account, String fullName, Department department, String mobile, com.unishare.model.enums.Gender gender, java.time.LocalDate birthDate, String batchYear, Integer semester) {
        return new UserProfileResponse(
                account.getId(),
                account.getUserId(),
                fullName,
                account.getEmail(),
                mobile,
                gender,
                birthDate,
                account.getRole(),
                department,
                batchYear,
                semester,
                account.isActive()
        );
    }

    public static ResourceResponse toResourceResponse(Resource resource, boolean bookmarked) {
        return new ResourceResponse(
                resource.getId(),
                resource.getTitle(),
                resource.getDescription(),
                resource.getType(),
                resource.getSubject(),
                resource.getUploadedBy(),
                resource.getUploaderName(),
                resource.getFileUrl(),
                resource.getFileName(),
                resource.getContentType(),
                resource.getDepartment(),
                resource.getYear(),
                resource.getSemester(),
                resource.getDownloadCount(),
                bookmarked,
                resource.getStorageFileName() == null || resource.getStorageFileName().isBlank(),
                resource.getCreatedAt()
        );
    }

}
