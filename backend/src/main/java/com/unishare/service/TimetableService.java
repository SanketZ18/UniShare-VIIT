package com.unishare.service;

import com.unishare.model.Timetable;
import com.unishare.model.enums.Department;
import java.util.Optional;

public interface TimetableService {
    Timetable saveTimetable(Timetable timetable, String uploaderEmail);
    Optional<Timetable> getTimetable(Department department, Integer semester);
}
