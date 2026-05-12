package com.unishare.service;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    StoredFile store(MultipartFile file);

    StoredFile store(byte[] content, String originalFileName, String contentType);

    org.springframework.core.io.Resource load(String storageFileName);
    
    boolean exists(String storageFileName);

    void delete(String storageFileName) throws IOException;

    record StoredFile(String storageFileName, String originalFileName, String contentType) {
    }
}
