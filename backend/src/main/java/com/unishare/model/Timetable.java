package com.unishare.model;

import com.unishare.model.enums.Department;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "timetables")
public class Timetable {
    @Id
    private String id;
    
    private Department department;
    private Integer semester;
    
    private List<DaySchedule> schedule;
    
    private String updatedBy;
    private String uploaderName;
    
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DaySchedule {
        private String day; // "Monday", "Tuesday", etc.
        private List<LectureSlot> slots;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LectureSlot {
        private String time; // e.g., "09:00 AM - 10:00 AM"
        private String subject; // e.g., "Advanced Java"
        private String teacher; // e.g., "Prof. K. R. Patil"
        private String classroom; // e.g., "Classroom 302"
    }
}
