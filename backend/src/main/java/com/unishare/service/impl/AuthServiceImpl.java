package com.unishare.service.impl;

import com.unishare.dto.UserProfileResponse;
import com.unishare.dto.ProfileUpdateRequest;
import com.unishare.dto.auth.AuthRequest;
import com.unishare.dto.auth.AuthResponse;
import com.unishare.dto.auth.RegisterRequest;
import com.unishare.exception.BadRequestException;
import com.unishare.exception.UnauthorizedOperationException;
import com.unishare.model.Staff;
import com.unishare.model.Student;
import com.unishare.model.UserAccount;
import com.unishare.model.enums.Department;
import com.unishare.model.enums.Role;
import com.unishare.repository.StaffRepository;
import com.unishare.repository.StudentRepository;
import com.unishare.repository.UserAccountRepository;
import com.unishare.security.JwtService;
import com.unishare.service.AccountDirectoryService;
import com.unishare.service.AuthService;
import com.unishare.service.ExcelService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserAccountRepository userAccountRepository;
    private final StudentRepository studentRepository;
    private final StaffRepository staffRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final AccountDirectoryService accountDirectoryService;
    private final ExcelService excelService;

    @Value("${app.bootstrap.admin.email:}")
    private String bootstrapAdminEmail;

    @Value("${app.bootstrap.admin.password:}")
    private String bootstrapAdminPassword;

    @Value("${app.bootstrap.admin.name:UniShare - Smart Academic Content Portal Admin}")
    private String bootstrapAdminName;

    @Override
    public AuthResponse login(AuthRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (org.springframework.security.authentication.DisabledException disabledException) {
            throw new BadRequestException("This account has been deactivated by the administration. Please contact your HOD or Senior Clerk.");
        } catch (Exception exception) {
            throw new BadCredentialsException("Invalid email or password");
        }

        UserAccount account = accountDirectoryService.getByEmail(request.getEmail());
        account.setLastLogin(Instant.now());
        userAccountRepository.save(account);

        String token = jwtService.generateToken(account);
        UserProfileResponse userProfile = accountDirectoryService.buildProfile(account);

        return new AuthResponse(token, Instant.now().plusMillis(jwtService.getExpirationMs()), userProfile);
    }

    @Override
    @Transactional
    public UserProfileResponse register(RegisterRequest request) {
        validateRegistrationRequest(request);

        Role creatorRole = resolveCreatorRole(request.getRole());
        if (userAccountRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new BadRequestException("An account already exists for this email");
        }

        if (request.getRole() == Role.STUDENT) {
            return createStudentAccount(request, creatorRole);
        }
        return createStaffAccount(request, creatorRole);
    }

    @Override
    @Transactional
    public List<UserProfileResponse> bulkRegister(List<RegisterRequest> requests) {
        Role creatorRole = resolveCreatorRole(Role.STUDENT); // Bulk is currently for students
        List<UserProfileResponse> profiles = new ArrayList<>();
        for (RegisterRequest request : requests) {
            try {
                if (!userAccountRepository.existsByEmailIgnoreCase(request.getEmail())) {
                    profiles.add(createStudentAccount(request, creatorRole));
                }
            } catch (Exception e) {
                log.warn("Bulk registration skipped for {}: {}", request.getEmail(), e.getMessage());
            }
        }
        return profiles;
    }

    @Override
    public UserProfileResponse getCurrentProfile(String email) {
        return accountDirectoryService.buildProfile(accountDirectoryService.getByEmail(email));
    }

    @Override
    @Transactional
    public UserProfileResponse updateProfile(String email, ProfileUpdateRequest request) {
        UserAccount account = accountDirectoryService.getByEmail(email);
        
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            if (request.getOldPassword() == null || request.getOldPassword().isBlank()) {
                throw new BadRequestException("Current password is required to set a new password");
            }
            if (!passwordEncoder.matches(request.getOldPassword(), account.getPassword())) {
                throw new BadRequestException("Current password does not match");
            }
            if (request.getPassword().contains(" ")) {
                throw new BadRequestException("Password cannot contain spaces");
            }
            account.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (account.getRole() == Role.STUDENT) {
            Student student = studentRepository.findById(account.getUserId())
                    .orElseThrow(() -> new BadRequestException("Student profile not found"));
            
            if (request.getFullName() != null) student.setFullName(request.getFullName());
            if (request.getMobile() != null) student.setMobile(request.getMobile());
            if (request.getEmail() != null) {
                String newEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
                if (!newEmail.equals(student.getEmail()) && userAccountRepository.existsByEmailIgnoreCase(newEmail)) {
                    throw new BadRequestException("Email already in use");
                }
                student.setEmail(newEmail);
                account.setEmail(newEmail);
            }
            if (request.getBirthDate() != null) student.setBirthDate(request.getBirthDate());
            if (request.getGender() != null) student.setGender(request.getGender());
            studentRepository.save(student);
        } else {
            Staff staff = staffRepository.findById(account.getUserId())
                    .orElseThrow(() -> new BadRequestException("Staff profile not found"));
            
            if (request.getFullName() != null) staff.setFullName(request.getFullName());
            if (request.getMobile() != null) staff.setMobile(request.getMobile());
            if (request.getEmail() != null) {
                String newEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
                if (!newEmail.equals(staff.getEmail()) && userAccountRepository.existsByEmailIgnoreCase(newEmail)) {
                    throw new BadRequestException("Email already in use");
                }
                staff.setEmail(newEmail);
                account.setEmail(newEmail);
            }
            if (request.getBirthDate() != null) staff.setBirthDate(request.getBirthDate());
            if (request.getGender() != null) staff.setGender(request.getGender());
            staffRepository.save(staff);
        }

        userAccountRepository.save(account);
        return accountDirectoryService.buildProfile(account);
    }

    @Override
    @Transactional
    public void deleteAccount(String callerEmail, String targetAccountId) {
        UserAccount caller = accountDirectoryService.getByEmail(callerEmail);
        UserAccount target = userAccountRepository.findById(targetAccountId)
                .orElseThrow(() -> new BadRequestException("Target account not found"));

        // Restrict deletion to HOD, SENIOR_CLERK, DIRECTOR, SUPER_ADMIN
        if (!List.of(Role.HOD, Role.SENIOR_CLERK, Role.DIRECTOR, Role.SUPER_ADMIN).contains(caller.getRole())) {
            throw new UnauthorizedOperationException("Only HODs, Clerks, or higher roles can delete accounts");
        }

        // Additional check: Cannot delete an account with a higher or equal role (except Super Admin)
        if (caller.getRole() != Role.SUPER_ADMIN && !canManageRole(caller.getRole(), target.getRole())) {
             throw new UnauthorizedOperationException("You do not have permission to delete an account with role " + target.getRole());
        }

        if (target.getRole() == Role.STUDENT) {
            studentRepository.deleteById(target.getUserId());
        } else {
            staffRepository.deleteById(target.getUserId());
        }
        userAccountRepository.delete(target);
        log.info("Account {} deleted by {}", target.getEmail(), callerEmail);
    }

    @Override
    @Transactional
    public void toggleUserStatus(String callerEmail, String targetAccountId) {
        UserAccount caller = accountDirectoryService.getByEmail(callerEmail);
        UserAccount target = userAccountRepository.findById(targetAccountId)
                .orElseThrow(() -> new BadRequestException("Target account not found"));

        if (!List.of(Role.HOD, Role.SENIOR_CLERK, Role.DIRECTOR, Role.SUPER_ADMIN).contains(caller.getRole())) {
            throw new UnauthorizedOperationException("Only HODs, Clerks, or higher roles can manage account status");
        }

        if (caller.getRole() != Role.SUPER_ADMIN && !canManageRole(caller.getRole(), target.getRole())) {
            throw new UnauthorizedOperationException("You do not have permission to manage account with role " + target.getRole());
        }

        target.setActive(!target.isActive());
        userAccountRepository.save(target);
        log.info("Account {} status toggled to {} by {}", target.getEmail(), target.isActive(), callerEmail);
    }

    @Override
    @Transactional
    public void bulkDeleteStudentsByBatch(String callerEmail, String batchYear) {
        UserAccount caller = accountDirectoryService.getByEmail(callerEmail);
        
        if (!List.of(Role.HOD, Role.SENIOR_CLERK, Role.DIRECTOR, Role.SUPER_ADMIN).contains(caller.getRole())) {
            throw new UnauthorizedOperationException("Only HODs, Clerks, or higher roles can perform bulk deletions");
        }

        List<Student> students = studentRepository.findByBatchYear(batchYear);
        if (students.isEmpty()) {
            throw new BadRequestException("No students found for batch " + batchYear);
        }

        for (Student student : students) {
            userAccountRepository.findByUserId(student.getId()).ifPresent(userAccountRepository::delete);
            studentRepository.delete(student);
        }
        
        log.info("Bulk deletion of {} students in batch {} performed by {}", students.size(), batchYear, callerEmail);
    }

    private boolean canManageRole(Role callerRole, Role targetRole) {
        return switch (callerRole) {
            case SUPER_ADMIN -> true;
            case DIRECTOR -> targetRole != Role.SUPER_ADMIN && targetRole != Role.DIRECTOR;
            case HOD -> targetRole == Role.STAFF || targetRole == Role.STUDENT;
            case SENIOR_CLERK -> targetRole == Role.STUDENT;
            default -> false;
        };
    }

    @Override
    public List<UserProfileResponse> getAllUsers() {
        return userAccountRepository.findAll().stream()
                .map(accountDirectoryService::buildProfile)
                .collect(Collectors.toList());
    }

    @Override
    public void bootstrapAdminIfNeeded() {
        if (bootstrapAdminEmail == null || bootstrapAdminEmail.isBlank() ||
                bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
            return;
        }

        // Bootstrap Super Admin
        try {
            if (!userAccountRepository.existsByEmailIgnoreCase(bootstrapAdminEmail.trim().toLowerCase(Locale.ROOT)) &&
                    !staffRepository.existsByStaffId("BOOTSTRAP-ADMIN")) {
                RegisterRequest request = new RegisterRequest();
                request.setRole(Role.SUPER_ADMIN);
                request.setEmail(bootstrapAdminEmail.trim().toLowerCase(Locale.ROOT));
                request.setPassword(bootstrapAdminPassword);
                request.setFullName(bootstrapAdminName);
                request.setMobile("9999999999");
                request.setGender(com.unishare.model.enums.Gender.OTHER);
                request.setDepartment(Department.COMMON);
                request.setStatus(com.unishare.model.enums.UserStatus.ACTIVE);
                request.setStaffId("BOOTSTRAP-ADMIN");
                request.setDesignation("Super Admin");
                createStaffAccount(request, Role.SUPER_ADMIN);
                log.info("Bootstrap super admin account created for {}", bootstrapAdminEmail);
            }
        } catch (Exception e) {
            log.error("Failed to bootstrap super admin account: {}", e.getMessage());
        }

        // Bootstrap Dummy HOD
        try {
            bootstrapDummyUser("hod@unishare.com", "hod123", "Dr. Dummy HOD", Role.HOD, "HOD-DUMMY", Department.MCA);
        } catch (Exception e) {
            log.error("Failed to bootstrap dummy HOD account: {}", e.getMessage());
        }
        
        // Bootstrap Dummy Senior Clerk
        try {
            bootstrapDummyUser("clerk@unishare.com", "clerk123", "Mr. Dummy Clerk", Role.SENIOR_CLERK, "CLERK-DUMMY", Department.MCA);
        } catch (Exception e) {
            log.error("Failed to bootstrap dummy clerk account: {}", e.getMessage());
        }
        
        // Bootstrap Dummy Director
        try {
            bootstrapDummyUser("director@unishare.com", "director123", "Prof. Dummy Director", Role.DIRECTOR, "DIR-DUMMY", Department.COMMON);
        } catch (Exception e) {
            log.error("Failed to bootstrap dummy director account: {}", e.getMessage());
        }
    }

    private void bootstrapDummyUser(String email, String password, String name, Role role, String staffId, Department dept) {
        if (!userAccountRepository.existsByEmailIgnoreCase(email.toLowerCase(Locale.ROOT)) &&
                !staffRepository.existsByStaffId(staffId)) {
            RegisterRequest request = new RegisterRequest();
            request.setRole(role);
            request.setEmail(email.toLowerCase(Locale.ROOT));
            request.setPassword(password);
            request.setFullName(name);
            request.setMobile("9876543210");
            request.setGender(com.unishare.model.enums.Gender.OTHER);
            request.setDepartment(dept);
            request.setStatus(com.unishare.model.enums.UserStatus.ACTIVE);
            request.setStaffId(staffId);
            request.setBirthDate(java.time.LocalDate.of(1990, 1, 1));
            createStaffAccount(request, Role.SUPER_ADMIN);
            log.info("Bootstrap dummy {} account created for {}", role, email);
        }
    }

    private UserProfileResponse createStudentAccount(RegisterRequest request, Role creatorRole) {
        if (request.getPrn() == null || request.getPrn().isBlank()) {
            throw new BadRequestException("PRN is required for student registration");
        }
        if (request.getDivision() == null || request.getDivision().isBlank()) {
            throw new BadRequestException("Division is required for student registration");
        }
        if (request.getYear() == null || request.getSemester() == null) {
            throw new BadRequestException("Year and semester are required for student registration");
        }
        if (studentRepository.existsByPrn(request.getPrn())) {
            throw new BadRequestException("A student already exists with this PRN");
        }

        Student student = studentRepository.save(Student.builder()
                .prn(request.getPrn())
                .fullName(request.getFullName())
                .email(request.getEmail().trim().toLowerCase(Locale.ROOT))
                .mobile(request.getMobile())
                .gender(request.getGender())
                .department(request.getDepartment())
                .year(request.getYear())
                .semester(request.getSemester())
                .division(request.getDivision())
                .batchYear(request.getBatchYear())
                .status(request.getStatus())
                .birthDate(request.getBirthDate())
                .build());

        UserAccount account = userAccountRepository.save(UserAccount.builder()
                .email(student.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.STUDENT)
                .userId(student.getId())
                .build());

        log.info("Student account created by role {} for {}", creatorRole, request.getEmail());
        return accountDirectoryService.buildProfile(account);
    }

    private UserProfileResponse createStaffAccount(RegisterRequest request, Role creatorRole) {
        String staffId = (request.getStaffId() == null || request.getStaffId().isBlank())
                ? request.getRole().name() + "-" + System.currentTimeMillis()
                : request.getStaffId();

        if (staffRepository.existsByStaffId(staffId)) {
            throw new BadRequestException("A staff member already exists with this ID");
        }

        Staff staff = staffRepository.save(Staff.builder()
                .staffId(staffId)
                .fullName(request.getFullName())
                .email(request.getEmail().trim().toLowerCase(Locale.ROOT))
                .mobile(request.getMobile())
                .gender(request.getGender())
                .designation(
                        request.getDesignation() == null || request.getDesignation().isBlank()
                                ? request.getRole().name().replace('_', ' ')
                                : request.getDesignation()
                )
                .department(request.getDepartment())
                .subjects(request.getSubjects())
                .status(request.getStatus())
                .birthDate(request.getBirthDate())
                .build());

        UserAccount account = userAccountRepository.save(UserAccount.builder()
                .email(staff.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .userId(staff.getId())
                .build());

        log.info("Staff account with role {} created by {}", request.getRole(), creatorRole);
        return accountDirectoryService.buildProfile(account);
    }

    private void validateRegistrationRequest(RegisterRequest request) {
        if (request.getPassword().contains(" ")) {
            throw new BadRequestException("Password cannot contain spaces");
        }
        if (request.getEmail() != null) {
            request.setEmail(request.getEmail().trim().toLowerCase(Locale.ROOT));
        }
    }

    private Role resolveCreatorRole(Role requestedRole) {
        if (userAccountRepository.count() == 0) {
            if (requestedRole != Role.SUPER_ADMIN) {
                throw new UnauthorizedOperationException("The first account must be a SUPER_ADMIN");
            }
            return Role.SUPER_ADMIN;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new UnauthorizedOperationException("Authentication is required to register new users");
        }

        UserAccount creator = accountDirectoryService.getByEmail(authentication.getName());
        if (!canCreateRole(creator.getRole(), requestedRole)) {
            throw new UnauthorizedOperationException("You are not allowed to create users with role " + requestedRole);
        }
        return creator.getRole();
    }

    private boolean canCreateRole(Role creatorRole, Role requestedRole) {
        return switch (creatorRole) {
            case SUPER_ADMIN -> true;
            case DIRECTOR -> requestedRole == Role.HOD || requestedRole == Role.STAFF
                    || requestedRole == Role.SENIOR_CLERK || requestedRole == Role.STUDENT;
            case HOD -> requestedRole == Role.STAFF || requestedRole == Role.STUDENT;
            case SENIOR_CLERK -> requestedRole == Role.STUDENT;
            default -> false;
        };
    }
}
