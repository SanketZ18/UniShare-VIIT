package com.unishare.model;

import com.unishare.model.enums.Department;
import com.unishare.model.enums.Gender;
import com.unishare.model.enums.UserStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
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
@Document(collection = "staff")
public class Staff {

    @Id
    private String id;

    @Indexed(unique = true)
    private String staffId;
    private String fullName;

    @Indexed(unique = true)
    private String email;
    private String mobile;
    private Gender gender;
    private String designation;
    private Department department;
    @Builder.Default
    private List<String> subjects = new ArrayList<>();
    private UserStatus status;
    private LocalDate birthDate;

    @CreatedDate
    private Instant createdAt;
}
