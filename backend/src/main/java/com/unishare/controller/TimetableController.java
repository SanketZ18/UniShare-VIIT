package com.unishare.controller;

import com.unishare.dto.ApiResponse;
import com.unishare.model.Timetable;
import com.unishare.model.enums.Department;
import com.unishare.service.TimetableService;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/timetables")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','DIRECTOR','HOD')")
    public ResponseEntity<ApiResponse<Timetable>> saveTimetable(
            @RequestBody Timetable timetable,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Timetable saved successfully",
                timetableService.saveTimetable(timetable, userDetails.getUsername())
        ));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Timetable>> getTimetable(
            @RequestParam("department") Department department,
            @RequestParam("semester") Integer semester
    ) {
        Optional<Timetable> timetable = timetableService.getTimetable(department, semester);
        return ResponseEntity.ok(ApiResponse.success(
                "Timetable retrieved successfully",
                timetable.orElse(null)
        ));
    }
}
