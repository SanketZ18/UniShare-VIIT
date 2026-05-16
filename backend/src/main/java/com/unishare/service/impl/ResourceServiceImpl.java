package com.unishare.service.impl;

import com.unishare.dto.resource.ResourceResponse;
import com.unishare.dto.resource.ResourceUploadRequest;
import com.unishare.exception.ResourceNotFoundException;
import com.unishare.exception.UnauthorizedOperationException;
import com.unishare.model.Bookmark;
import com.unishare.model.DownloadLog;
import com.unishare.model.Resource;
import com.unishare.model.UserAccount;
import com.unishare.model.enums.Department;
import com.unishare.model.enums.ResourceType;
import com.unishare.model.enums.Role;
import com.unishare.repository.BookmarkRepository;
import com.unishare.repository.DownloadLogRepository;
import com.unishare.repository.ResourceRepository;
import com.unishare.service.AccountDirectoryService;
import com.unishare.service.FileStorageService;
import com.unishare.service.NotificationService;
import com.unishare.service.ResourceService;
import com.unishare.util.PortalMapper;
import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository resourceRepository;
    private final DownloadLogRepository downloadLogRepository;
    private final BookmarkRepository bookmarkRepository;
    private final AccountDirectoryService accountDirectoryService;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final MongoTemplate mongoTemplate;

    @Override
    public ResourceResponse upload(ResourceUploadRequest request, String uploaderEmail) {
        UserAccount uploader = accountDirectoryService.getByEmail(uploaderEmail);
        if (!(uploader.getRole() == Role.STAFF || uploader.getRole() == Role.HOD
                || uploader.getRole() == Role.DIRECTOR || uploader.getRole() == Role.SUPER_ADMIN)) {
            throw new UnauthorizedOperationException("Only authorized staff can upload resources");
        }

        FileStorageService.StoredFile storedFile = fileStorageService.store(request.getFile());

        Resource resource = resourceRepository.save(Resource.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .type(request.getType())
                .subject(request.getSubject())
                .uploadedBy(uploader.getId())
                .uploaderName(accountDirectoryService.getDisplayName(uploader))
                .fileName(storedFile.originalFileName())
                .contentType(storedFile.contentType())
                .storageFileName(storedFile.storageFileName())
                .department(request.getDepartment())
                .year(request.getYear())
                .semester(request.getSemester())
                .downloadCount(0L)
                .build());

        resource.setFileUrl("/api/resources/" + resource.getId() + "/download");
        resource = resourceRepository.save(resource);
        
        notificationService.createResourceNotification(
                resource.getId(), 
                resource.getTitle(), 
                resource.getDepartment(), 
                false
        );
        
        log.info("Resource {} uploaded by {}", resource.getId(), uploaderEmail);
        return PortalMapper.toResourceResponse(resource, false);
    }

    @Override
    public List<ResourceResponse> getResources(
            String subject,
            Integer semester,
            String type,
            String department,
            Integer year,
            String search,
            String viewerEmail
    ) {
        Query query = new Query().with(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (subject != null && !subject.isBlank()) {
            query.addCriteria(Criteria.where("subject").regex(subject, "i"));
        }
        if (semester != null) {
            query.addCriteria(Criteria.where("semester").is(semester));
        }
        if (type != null && !type.isBlank()) {
            query.addCriteria(Criteria.where("type").is(ResourceType.valueOf(type.toUpperCase())));
        }
        if (department != null && !department.isBlank()) {
            query.addCriteria(Criteria.where("department").is(Department.valueOf(department.toUpperCase())));
        }
        if (year != null) {
            query.addCriteria(Criteria.where("year").is(year));
        }
        if (search != null && !search.isBlank()) {
            query.addCriteria(new Criteria().orOperator(
                    Criteria.where("title").regex(search, "i"),
                    Criteria.where("description").regex(search, "i"),
                    Criteria.where("subject").regex(search, "i")
            ));
        }

        List<Resource> resources = mongoTemplate.find(query, Resource.class);
        
        // Filter out duplicates to ensure UI only shows one entry per synced item
        java.util.Map<String, Resource> uniqueResources = new java.util.LinkedHashMap<>();
        for (Resource res : resources) {
            String key = res.getResourceKey();
            
            // If it has a resourceKey, deduplicate by key. 
            // If it doesn't (older records), deduplicate by Title + Subject + Department + Semester
            if (key == null || key.isBlank()) {
                key = (res.getTitle() + "|" + res.getSubject() + "|" + res.getDepartment() + "|" + res.getSemester()).toLowerCase();
            }

            if (!uniqueResources.containsKey(key)) {
                uniqueResources.put(key, res);
            }
        }
        List<Resource> filteredResources = new java.util.ArrayList<>(uniqueResources.values());

        Set<String> bookmarkedIds = getBookmarkedIds(viewerEmail);
        return filteredResources.stream()
                .map(resource -> PortalMapper.toResourceResponse(resource, bookmarkedIds.contains(resource.getId())))
                .toList();
    }



    @Override
    public ResourceResponse getResourceById(String id, String viewerEmail) {
        Resource resource = getResourceEntity(id);
        Set<String> bookmarkedIds = getBookmarkedIds(viewerEmail);
        return PortalMapper.toResourceResponse(resource, bookmarkedIds.contains(resource.getId()));
    }

    @Override
    public List<ResourceResponse> getResourcesUploadedBy(String uploaderEmail) {
        UserAccount account = accountDirectoryService.getByEmail(uploaderEmail);
        return resourceRepository.findByUploadedBy(account.getId()).stream()
                .map(resource -> PortalMapper.toResourceResponse(resource, false))
                .toList();
    }

    @Override
    public void deleteResource(String resourceId, String requesterEmail) {
        UserAccount requester = accountDirectoryService.getByEmail(requesterEmail);
        Resource resource = getResourceEntity(resourceId);

        boolean sameUploader = requester.getId().equals(resource.getUploadedBy());
        boolean elevated = requester.getRole() == Role.SUPER_ADMIN || requester.getRole() == Role.DIRECTOR
                || requester.getRole() == Role.HOD;

        if (!sameUploader && !elevated) {
            throw new UnauthorizedOperationException("You are not allowed to delete this resource");
        }

        resourceRepository.deleteById(resourceId);
        try {
            if (resource.getStorageFileName() != null && !resource.getStorageFileName().isBlank()
                    && resourceRepository.countByStorageFileName(resource.getStorageFileName()) == 0) {
                fileStorageService.delete(resource.getStorageFileName());
            }
        } catch (IOException exception) {
            throw new IllegalStateException("Resource deleted but file cleanup failed", exception);
        }
    }

    @Override
    public DownloadableResource download(String resourceId, String viewerEmail) {
        Resource resource = getResourceEntity(resourceId);
        if (viewerEmail != null && !viewerEmail.isBlank()) {
            UserAccount viewer = accountDirectoryService.getByEmail(viewerEmail);
            resource.setDownloadCount(resource.getDownloadCount() + 1);
            resourceRepository.save(resource);
            downloadLogRepository.save(DownloadLog.builder()
                    .resourceId(resource.getId())
                    .userAccountId(viewer.getId())
                    .build());
        }

        String storageFileName = resource.getStorageFileName();
        String sourceUrl = resource.getSourceUrl();

        // Check if the file is missing in storage but we have a backup source URL (SPPU)
        boolean fileMissing = storageFileName == null || storageFileName.isBlank() || !fileStorageService.exists(storageFileName);

        if (fileMissing && sourceUrl != null && !sourceUrl.isBlank()) {
            log.info("Storage file missing for resource {}, falling back to sourceUrl: {}", resourceId, sourceUrl);
            try {
                return new DownloadableResource(
                        new org.springframework.core.io.UrlResource(sourceUrl),
                        resource.getFileName(),
                        resource.getContentType(),
                        sourceUrl // Redirect to original source
                );
            } catch (java.net.MalformedURLException e) {
                log.error("Failed to create UrlResource for fallback sourceUrl: {}", sourceUrl, e);
                throw new IllegalStateException("Invalid source URL for resource", e);
            }
        }

        return new DownloadableResource(
                fileStorageService.load(storageFileName),
                resource.getFileName(),
                resource.getContentType(),
                storageFileName
        );
    }



    Resource getResourceEntity(String resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }

    private Set<String> getBookmarkedIds(String viewerEmail) {
        if (viewerEmail == null || viewerEmail.isBlank()) {
            return Set.of();
        }
        UserAccount viewer = accountDirectoryService.getByEmail(viewerEmail);
        return bookmarkRepository.findByUserAccountId(viewer.getId()).stream()
                .map(Bookmark::getResourceId)
                .collect(Collectors.toSet());
    }
}
