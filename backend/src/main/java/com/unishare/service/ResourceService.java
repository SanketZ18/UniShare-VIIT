package com.unishare.service;

import com.unishare.dto.resource.ResourceResponse;
import com.unishare.dto.resource.ResourceUploadRequest;
import java.util.List;

public interface ResourceService {

    ResourceResponse upload(ResourceUploadRequest request, String uploaderEmail);

    List<ResourceResponse> getResources(
            String subject,
            Integer semester,
            String type,
            String department,
            Integer year,
            String search,
            String viewerEmail
    );

    ResourceResponse getResourceById(String id, String viewerEmail);

    List<ResourceResponse> getResourcesUploadedBy(String uploaderEmail);

    void deleteResource(String resourceId, String requesterEmail);

    DownloadableResource download(String resourceId, String viewerEmail);

    record DownloadableResource(
            org.springframework.core.io.Resource file,
            String fileName,
            String contentType,
            String storageName
    ) {
    }
}
