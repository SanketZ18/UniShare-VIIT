package com.unishare.controller;

import com.unishare.dto.ApiResponse;
import com.unishare.dto.resource.ResourceResponse;
import com.unishare.service.ResourceService;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ResourceResponse>>> getResources(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) Integer semester,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resources fetched successfully",
                resourceService.getResources(
                        subject,
                        semester,
                        type,
                        department,
                        year,
                        search,
                        userDetails.getUsername()
                )
        ));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ResourceResponse>> getResource(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                "Resource fetched successfully",
                resourceService.getResourceById(id, userDetails.getUsername())
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','DIRECTOR','HOD','STAFF')")
    public ResponseEntity<ApiResponse<Void>> deleteResource(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        resourceService.deleteResource(id, userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Resource deleted successfully", null));
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<org.springframework.core.io.Resource> downloadResource(
            @PathVariable String id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ResourceService.DownloadableResource downloadableResource = resourceService.download(id, userDetails.getUsername());
        
        org.springframework.core.io.Resource file = downloadableResource.file();
        long contentLength;
        try {
            contentLength = file.contentLength();
        } catch (IOException e) {
            contentLength = -1;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(downloadableResource.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(downloadableResource.fileName())
                        .build()
                        .toString())
                .contentLength(contentLength)
                .body(file);
    }
}
