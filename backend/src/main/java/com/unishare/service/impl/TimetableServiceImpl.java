package com.unishare.service.impl;

import com.unishare.exception.UnauthorizedOperationException;
import com.unishare.model.Timetable;
import com.unishare.model.UserAccount;
import com.unishare.model.enums.Department;
import com.unishare.model.enums.Role;
import com.unishare.repository.TimetableRepository;
import com.unishare.service.AccountDirectoryService;
import com.unishare.service.TimetableService;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TimetableServiceImpl implements TimetableService {

    private final TimetableRepository timetableRepository;
    private final AccountDirectoryService accountDirectoryService;

    @Override
    public Timetable saveTimetable(Timetable timetable, String uploaderEmail) {
        UserAccount uploader = accountDirectoryService.getByEmail(uploaderEmail);
        if (!(uploader.getRole() == Role.HOD || uploader.getRole() == Role.SUPER_ADMIN || uploader.getRole() == Role.DIRECTOR)) {
            throw new UnauthorizedOperationException("Only HOD or higher can manage department timetables");
        }

        Optional<Timetable> existing = timetableRepository.findByDepartmentAndSemester(
                timetable.getDepartment(), timetable.getSemester()
        );

        Timetable toSave;
        if (existing.isPresent()) {
            toSave = existing.get();
            toSave.setSchedule(timetable.getSchedule());
            toSave.setUpdatedBy(uploader.getId());
            toSave.setUploaderName(accountDirectoryService.getDisplayName(uploader));
            toSave.setUpdatedAt(LocalDateTime.now());
        } else {
            toSave = Timetable.builder()
                    .department(timetable.getDepartment())
                    .semester(timetable.getSemester())
                    .schedule(timetable.getSchedule())
                    .updatedBy(uploader.getId())
                    .uploaderName(accountDirectoryService.getDisplayName(uploader))
                    .updatedAt(LocalDateTime.now())
                    .build();
        }

        log.info("Saving timetable for {} - Sem {} by {}", toSave.getDepartment(), toSave.getSemester(), uploaderEmail);
        return timetableRepository.save(toSave);
    }

    @Override
    public Optional<Timetable> getTimetable(Department department, Integer semester) {
        return timetableRepository.findByDepartmentAndSemester(department, semester);
    }
}
