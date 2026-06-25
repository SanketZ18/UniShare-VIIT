package com.unishare.model;

import com.unishare.model.enums.Department;
import com.unishare.model.enums.Gender;
import com.unishare.model.enums.UserStatus;
import java.time.Instant;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "students")
public class Student {

    @Id
    private String id;

    @Indexed(unique = true)
    private String prn;
    private String fullName;

    @Indexed(unique = true)
    private String email;
    private String mobile;
    private Gender gender;
    private Department department;
    private Integer year;
    private Integer semester;
    private String division;
    private String batchYear;
    private UserStatus status;
    private LocalDate birthDate;

    @CreatedDate
    private Instant createdAt;
}
