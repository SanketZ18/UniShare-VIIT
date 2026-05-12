package com.unishare.service.impl;

import com.unishare.exception.BadRequestException;
import com.unishare.exception.ResourceNotFoundException;
import com.unishare.service.FileStorageService;
import com.unishare.util.FileNameSanitizer;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class LocalFileStorageService implements FileStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private final Path uploadRoot;

    public LocalFileStorageService(@Value("${app.file.upload-dir}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @PostConstruct
    void init() {
        try {
            Files.createDirectories(uploadRoot);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to initialize upload directory", exception);
        }
    }

    @Override
    public StoredFile store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A file is required");
        }
        if (file.getContentType() == null || !ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new BadRequestException("Only PDF and DOC/DOCX files are supported");
        }
        String originalFileName = FileNameSanitizer.sanitize(file.getOriginalFilename());
        String storageFileName = UUID.randomUUID() + "-" + originalFileName;

        try {
            Files.copy(file.getInputStream(), uploadRoot.resolve(storageFileName), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to store file", exception);
        }

        return new StoredFile(storageFileName, originalFileName, file.getContentType());
    }

    @Override
    public StoredFile store(byte[] content, String originalFileName, String contentType) {
        if (content == null || content.length == 0) {
            throw new BadRequestException("File content is required");
        }
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new BadRequestException("Only PDF and DOC/DOCX files are supported");
        }

        String sanitizedFileName = FileNameSanitizer.sanitize(originalFileName);
        String storageFileName = UUID.randomUUID() + "-" + sanitizedFileName;

        try {
            Files.write(uploadRoot.resolve(storageFileName), content);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to store file", exception);
        }

        return new StoredFile(storageFileName, sanitizedFileName, contentType);
    }

    @Override
    public org.springframework.core.io.Resource load(String storageFileName) {
        try {
            Path filePath = uploadRoot.resolve(storageFileName).normalize();
            if (!Files.exists(filePath)) {
                throw new ResourceNotFoundException("Stored file not found");
            }
            return new UrlResource(filePath.toUri());
        } catch (MalformedURLException exception) {
            throw new IllegalStateException("Unable to load stored file", exception);
        }
    }

    @Override
    public boolean exists(String storageFileName) {
        if (storageFileName == null || storageFileName.isBlank()) {
            return false;
        }
        return Files.exists(uploadRoot.resolve(storageFileName).normalize());
    }

    @Override
    public void delete(String storageFileName) throws IOException {
        Files.deleteIfExists(uploadRoot.resolve(storageFileName).normalize());
    }
}
