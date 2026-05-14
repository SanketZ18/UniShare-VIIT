package com.unishare.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.unishare.exception.BadRequestException;
import com.unishare.exception.ResourceNotFoundException;
import com.unishare.service.FileStorageService;
import com.unishare.util.FileNameSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryFileStorageService implements FileStorageService {

    private final Cloudinary cloudinary;

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "image/jpeg",
            "image/png",
            "image/webp"
    );


    @Override
    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A file is required");
        }
        if (file.getContentType() == null || !ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Only PDF and DOC/DOCX files are supported");
        }

        try {
            String originalFileName = FileNameSanitizer.sanitize(file.getOriginalFilename());
            String publicId = UUID.randomUUID().toString();
            
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", "auto",
                    "folder", "unishare/resources"
            ));

            String secureUrl = (String) uploadResult.get("secure_url");
            return new StoredFile(secureUrl, originalFileName, file.getContentType());
        } catch (IOException e) {
            log.error("Failed to upload file to Cloudinary", e);
            throw new IllegalStateException("Failed to store file in cloud storage", e);
        }
    }

    @Override
    public StoredFile store(byte[] content, String originalFileName, String contentType) {
        if (content == null || content.length == 0) {
            throw new BadRequestException("File content is required");
        }

        try {
            String sanitizedFileName = FileNameSanitizer.sanitize(originalFileName);
            String publicId = UUID.randomUUID().toString();

            Map uploadResult = cloudinary.uploader().upload(content, ObjectUtils.asMap(
                    "public_id", publicId,
                    "resource_type", "auto",
                    "folder", "unishare/resources"
            ));

            String secureUrl = (String) uploadResult.get("secure_url");
            return new StoredFile(secureUrl, sanitizedFileName, contentType);
        } catch (IOException e) {
            log.error("Failed to upload byte array to Cloudinary", e);
            throw new IllegalStateException("Failed to store file in cloud storage", e);
        }
    }

    @Override
    public org.springframework.core.io.Resource load(String storageFileName) {
        try {
            // storageFileName is the full URL from Cloudinary
            if (storageFileName == null || !storageFileName.startsWith("http")) {
                throw new ResourceNotFoundException("Cloud storage URL is missing or invalid");
            }
            return new UrlResource(storageFileName);
        } catch (MalformedURLException e) {
            log.error("Failed to load file from Cloudinary URL: {}", storageFileName, e);
            throw new IllegalStateException("Unable to load cloud resource", e);
        }
    }

    @Override
    public boolean exists(String storageFileName) {
        return storageFileName != null && storageFileName.startsWith("http");
    }

    @Override
    public void delete(String storageFileName) throws IOException {
        if (storageFileName != null && storageFileName.contains("unishare/resources/")) {
            try {
                // Extract public ID and resource type from URL
                // Example: https://res.cloudinary.com/cloud_name/raw/upload/v1/unishare/resources/uuid.pdf
                String[] parts = storageFileName.split("/");
                
                // Cloudinary URL structure: .../cloud_name/resource_type/upload/v123/folder/public_id.ext
                // In the example above: parts[3] is "raw", parts[parts.length-1] is "uuid.pdf"
                String resourceType = parts[3]; 
                String lastPart = parts[parts.length - 1];
                String publicId = "unishare/resources/" + lastPart.split("\\.")[0];
                
                log.info("Deleting from Cloudinary: publicId={}, resourceType={}", publicId, resourceType);
                cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("resource_type", resourceType));
            } catch (Exception e) {
                log.warn("Failed to delete file from Cloudinary: {}", storageFileName, e);
            }
        }
    }

}
