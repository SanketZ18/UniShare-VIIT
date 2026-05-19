package com.unishare.repository;

import com.unishare.model.Timetable;
import com.unishare.model.enums.Department;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TimetableRepository extends MongoRepository<Timetable, String> {
    Optional<Timetable> findByDepartmentAndSemester(Department department, Integer semester);
}
