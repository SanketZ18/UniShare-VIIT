package com.unishare.model;

import com.unishare.model.enums.Department;
import com.unishare.model.enums.ResourceType;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "resources")
public class Resource {

    @Id
    private String id;
    private String title;
    private String description;
    private ResourceType type;
    private String subject;
    private String uploadedBy;
    private String uploaderName;
    @org.springframework.data.mongodb.core.index.Indexed(unique = true)
    private String resourceKey;

    private String sourceUrl;
    private String fileUrl;
    private String fileName;
    private String contentType;
    private String storageFileName;
    private Department department;
    private Integer year;
    private Integer semester;
    private long downloadCount;

    @CreatedDate
    private Instant createdAt;
}
