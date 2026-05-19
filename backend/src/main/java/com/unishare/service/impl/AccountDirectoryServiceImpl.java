package com.unishare.service.impl;

import com.unishare.dto.UserProfileResponse;
import com.unishare.exception.ResourceNotFoundException;
import com.unishare.model.Staff;
import com.unishare.model.Student;
import com.unishare.model.UserAccount;
import com.unishare.model.enums.Department;
import com.unishare.model.enums.Role;
import com.unishare.repository.StaffRepository;
import com.unishare.repository.StudentRepository;
import com.unishare.repository.UserAccountRepository;
import com.unishare.service.AccountDirectoryService;
import com.unishare.util.PortalMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccountDirectoryServiceImpl implements AccountDirectoryService {

    private final UserAccountRepository userAccountRepository;
    private final StudentRepository studentRepository;
    private final StaffRepository staffRepository;

    @Override
    public UserAccount getByEmail(String email) {
        return userAccountRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found"));
    }

    @Override
    public UserProfileResponse buildProfile(UserAccount account) {
        if (account.getRole() == Role.STUDENT) {
            Student student = studentRepository.findById(account.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
            return PortalMapper.toUserProfile(account, student.getFullName(), student.getDepartment(), student.getMobile(), student.getGender(), student.getBirthDate(), student.getBatchYear(), student.getSemester());
        }
        Staff staff = staffRepository.findById(account.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff profile not found"));
        return PortalMapper.toUserProfile(account, staff.getFullName(), staff.getDepartment(), staff.getMobile(), staff.getGender(), staff.getBirthDate(), null, null);
    }

    @Override
    public String getDisplayName(UserAccount account) {
        if (account.getRole() == Role.STUDENT) {
            Student student = studentRepository.findById(account.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
            return student.getFullName();
        }
        Staff staff = staffRepository.findById(account.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff profile not found"));
        return staff.getFullName();
    }

    @Override
    public Department getDepartment(UserAccount account) {
        if (account.getRole() == Role.STUDENT) {
            Student student = studentRepository.findById(account.getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Student profile not found"));
            return student.getDepartment();
        }
        Staff staff = staffRepository.findById(account.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Staff profile not found"));
        return staff.getDepartment();
    }
}
